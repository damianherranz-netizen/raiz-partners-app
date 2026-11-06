import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Image, RefreshControl
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

type Product = {
  id: string
  name: string
  price_per_kg: number
  unit_type: string
  status: string
  images: string[] | null
  tipo_producto: string | null
}

const UNIDADES = [
  { value: 'kg',   label: '⚖️ Kilogramo' },
  { value: 'unit', label: '📦 Unidad' },
  { value: 'box',  label: '🗃️ Caja' },
  { value: 'litre',label: '🧴 Litro' },
]

const TIPOS_PRODUCTO = [
  { value: 'animal_vivo',  label: '🐄 Animal vivo' },
  { value: 'carne',        label: '🥩 Carne / Despiece' },
  { value: 'lacteo',       label: '🥛 Lácteo' },
  { value: 'cereal',       label: '🌾 Cereal / Grano' },
  { value: 'fruta',        label: '🍎 Fruta / Verdura' },
  { value: 'aceite',       label: '🫒 Aceite / Conserva' },
  { value: 'otro',         label: '📦 Otro producto' },
]

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([])
  const [showing, setShowing] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Campos básicos
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('kg')
  const [tipoProducto, setTipoProducto] = useState('otro')
  const [imageUris, setImageUris] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])

  // Campos trazabilidad animal
  const [crotal, setCrotal] = useState('')
  const [raza, setRaza] = useState('')
  const [pesoKg, setPesoKg] = useState('')
  const [edadMeses, setEdadMeses] = useState('')
  const [rega, setRega] = useState('')
  const [ultimaVacunacion, setUltimaVacunacion] = useState('')
  const [notasSanitarias, setNotasSanitarias] = useState('')
  const [transporteTipo, setTransporteTipo] = useState('estandar')
  const [transporteIncluido, setTransporteIncluido] = useState(false)
  const [transporteNotas, setTransporteNotas] = useState('')

  const [saving, setSaving] = useState(false)

  const esAnimal = tipoProducto === 'animal_vivo' || tipoProducto === 'carne'

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('products')
      .select('id, name, price_per_kg, unit_type, status, images, tipo_producto')
      .eq('producer_id', user.id)
      .order('created_at', { ascending: false })
    setProducts(data ?? [])
  }

  function resetForm() {
    setEditingId(null)
    setName(''); setPrice(''); setUnit('kg'); setTipoProducto('otro')
    setImageUris([]); setExistingImages([])
    setCrotal(''); setRaza(''); setPesoKg(''); setEdadMeses('')
    setRega(''); setUltimaVacunacion(''); setNotasSanitarias('')
  }

  function abrirFormNuevo() {
    resetForm()
    setShowing('form')
  }

  async function abrirFormEditar(p: Product) {
    resetForm()
    setEditingId(p.id)
    setName(p.name)
    setPrice(p.price_per_kg.toString())
    setUnit(p.unit_type)
    setTipoProducto(p.tipo_producto ?? 'otro')
    setExistingImages(p.images ?? [])

    // Cargar datos de trazabilidad
    const { data } = await supabase
      .from('products')
      .select('animal_crotal, animal_raza, animal_peso_kg, animal_edad_meses, animal_rega, animal_ultima_vacunacion, animal_notas_sanitarias, transporte_tipo, transporte_incluido, transporte_notas')
      .eq('id', p.id).single()
    if (data) {
      setTransporteTipo(data.transporte_tipo ?? 'estandar')
      setTransporteIncluido(data.transporte_incluido ?? false)
      setTransporteNotas(data.transporte_notas ?? '')
      setCrotal(data.animal_crotal ?? '')
      setRaza(data.animal_raza ?? '')
      setPesoKg(data.animal_peso_kg?.toString() ?? '')
      setEdadMeses(data.animal_edad_meses?.toString() ?? '')
      setRega(data.animal_rega ?? '')
      setUltimaVacunacion(data.animal_ultima_vacunacion ?? '')
      setNotasSanitarias(data.animal_notas_sanitarias ?? '')
    }
    setShowing('form')
  }

  async function pickImage() {
    if (imageUris.length + existingImages.length >= 4) {
      Alert.alert('Máximo 4 fotos', 'Elimina alguna foto antes de añadir otra.')
      return
    }
    Alert.alert('Añadir foto', '¿Cómo quieres añadirla?', [
      {
        text: '📷 Hacer foto',
        onPress: async () => {
          const permiso = await ImagePicker.requestCameraPermissionsAsync()
          if (!permiso.granted) {
            Alert.alert('Permiso necesario', 'Activa el acceso a la cámara en ajustes.')
            return
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [4, 3], quality: 0.7,
          })
          if (!result.canceled) setImageUris(prev => [...prev, result.assets[0].uri])
        }
      },
      {
        text: '🖼️ Galería',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: true, aspect: [4, 3], quality: 0.7,
          })
          if (!result.canceled) setImageUris(prev => [...prev, result.assets[0].uri])
        }
      },
      { text: 'Cancelar', style: 'cancel' }
    ])
  }

  async function uploadImage(uri: string, userId: string): Promise<string | null> {
    try {
      const { decode } = require('base64-arraybuffer')
      const FileSystem = require('expo-file-system/legacy')
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      })
      const arrayBuffer = decode(base64)
      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true })
      if (error) { console.log('Upload error:', error.message); return null }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      return data.publicUrl
    } catch (e: any) {
      console.log('Upload exception:', e.message)
      return null
    }
  }

  async function saveProduct() {
    if (!name || !price) {
      Alert.alert('Faltan datos', 'Añade el nombre y el precio')
      return
    }
    if (esAnimal && !crotal) {
      Alert.alert(
        'Número de crotal obligatorio',
        'Para vender animales en RAÍZ debes incluir el número de crotal. Es necesario para la trazabilidad y cumplimiento legal.'
      )
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newUrls: string[] = []
      for (const uri of imageUris) {
        const url = await uploadImage(uri, user.id)
        if (url) newUrls.push(url)
      }
      const allImages = [...existingImages, ...newUrls]

      const productData: any = {
        name,
        price_per_kg: parseFloat(price),
        unit_type: unit,
        images: allImages,
        status: 'pending_review',
        visible_publico: false,
        tipo_producto: tipoProducto,
        transporte_tipo: transporteTipo,
        transporte_incluido: transporteIncluido,
        transporte_notas: transporteNotas || null,
      }

      // Datos de trazabilidad animal
      if (esAnimal) {
        productData.animal_crotal = crotal || null
        productData.animal_raza = raza || null
        productData.animal_peso_kg = pesoKg ? parseFloat(pesoKg) : null
        productData.animal_edad_meses = edadMeses ? parseInt(edadMeses) : null
        productData.animal_rega = rega || null
        productData.animal_ultima_vacunacion = ultimaVacunacion || null
        productData.animal_notas_sanitarias = notasSanitarias || null
      }

      let error
      if (editingId) {
        const result = await supabase.from('products').update(productData).eq('id', editingId)
        error = result.error
      } else {
        const result = await supabase.from('products').insert({ ...productData, producer_id: user.id })
        error = result.error
      }

      if (error) {
        Alert.alert('Error', error.message)
      } else {
        if (!editingId) {
          const { data: nuevoProducto } = await supabase
            .from('products').select('id')
            .eq('producer_id', user.id).eq('name', name)
            .order('created_at', { ascending: false }).limit(1).single()
          if (nuevoProducto?.id) {
            supabase.functions.invoke('verify-product', {
              body: { product_id: nuevoProducto.id }
            }).then(() => loadProducts())
          }
        }
        Alert.alert(
          editingId ? '✅ Actualizado' : '✅ Enviado',
          editingId ? 'Cambios guardados correctamente.' : 'La IA está revisando tu producto.'
        )
        setShowing('list')
        loadProducts()
      }
    } catch (e: any) {
      Alert.alert('Error inesperado', e.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(id: string) {
    Alert.alert('Eliminar producto', '¿Seguro que quieres eliminar este producto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('products').delete().eq('id', id)
          if (error) Alert.alert('Error', error.message)
          else loadProducts()
        }
      }
    ])
  }

  // ── FORMULARIO ──────────────────────────────────────────────────────────────
  if (showing === 'form') {
    const totalFotos = existingImages.length + imageUris.length
    return (
      <View style={styles.flex}>
        <Header
          titulo={editingId ? 'Editar producto' : 'Nuevo producto'}
          accion={{ label: 'Cancelar', onPress: () => setShowing('list') }}
        />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Tipo de producto */}
          <View style={styles.campo}>
            <Text style={styles.label}>Tipo de producto</Text>
            <View style={styles.tipoGrid}>
              {TIPOS_PRODUCTO.map((t) => (
                <TouchableOpacity key={t.value}
                  style={[styles.tipoBtn, tipoProducto === t.value && styles.tipoBtnActivo]}
                  onPress={() => setTipoProducto(t.value)}>
                  <Text style={[styles.tipoText, tipoProducto === t.value && styles.tipoTextActivo]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Aviso trazabilidad */}
          {esAnimal && (
            <View style={styles.avisoAnimal}>
              <Text style={styles.avisoAnimalTitulo}>🐄 Información de trazabilidad</Text>
              <Text style={styles.avisoAnimalTexto}>
                Para vender animales en RAÍZ es obligatorio incluir el número de crotal y los datos sanitarios. Esto garantiza la trazabilidad y el cumplimiento de la normativa vigente.
              </Text>
            </View>
          )}

          {/* Fotos */}
          <View style={styles.campo}>
            <Text style={styles.label}>Fotos ({totalFotos}/4)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosScroll}>
              <View style={styles.fotosRow}>
                {existingImages.map((url, idx) => (
                  <View key={`e-${idx}`} style={styles.fotoWrap}>
                    <Image source={{ uri: url }} style={styles.fotoMini} />
                    <TouchableOpacity style={styles.fotoBorrar}
                      onPress={() => setExistingImages(prev => prev.filter((_, i) => i !== idx))}>
                      <Text style={styles.fotoBorrarText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {imageUris.map((uri, idx) => (
                  <View key={`n-${idx}`} style={styles.fotoWrap}>
                    <Image source={{ uri }} style={styles.fotoMini} />
                    <TouchableOpacity style={styles.fotoBorrar}
                      onPress={() => setImageUris(prev => prev.filter((_, i) => i !== idx))}>
                      <Text style={styles.fotoBorrarText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {totalFotos < 4 && (
                  <TouchableOpacity style={styles.fotoAdd} onPress={pickImage}>
                    <Text style={styles.fotoAddEmoji}>📷</Text>
                    <Text style={styles.fotoAddText}>Añadir</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>

          {/* Nombre */}
          <View style={styles.campo}>
            <Text style={styles.label}>Nombre del producto</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName}
              placeholder="Ej: Ternera Avileña — macho 18 meses"
              placeholderTextColor={C.textLight} autoCorrect={false} />
          </View>

          {/* Precio */}
          <View style={styles.campo}>
            <Text style={styles.label}>Precio (€)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice}
              placeholder="Ej: 12.50" placeholderTextColor={C.textLight}
              keyboardType="decimal-pad" />
          </View>

          {/* Unidad */}
          <View style={styles.campo}>
            <Text style={styles.label}>Unidad de venta</Text>
            <View style={styles.unidadGrid}>
              {UNIDADES.map((op) => (
                <TouchableOpacity key={op.value}
                  style={[styles.unidadBtn, unit === op.value && styles.unidadBtnActivo]}
                  onPress={() => setUnit(op.value)}>
                  <Text style={[styles.unidadText, unit === op.value && styles.unidadTextActivo]}>
                    {op.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* SECCIÓN TRAZABILIDAD ANIMAL */}
          {esAnimal && (
            <View style={styles.trazabilidadSection}>
              <Text style={styles.sectionTitulo}>🏷️ Datos del animal</Text>

              <View style={styles.campo}>
                <Text style={styles.label}>Número de crotal *</Text>
                <TextInput style={styles.input} value={crotal} onChangeText={setCrotal}
                  placeholder="Ej: ES280890000123"
                  placeholderTextColor={C.textLight} autoCapitalize="characters" autoCorrect={false} />
              </View>

              <View style={styles.campo}>
                <Text style={styles.label}>Raza</Text>
                <TextInput style={styles.input} value={raza} onChangeText={setRaza}
                  placeholder="Ej: Avileña Negra Ibérica, Churra..."
                  placeholderTextColor={C.textLight} autoCorrect={false} />
              </View>

              <View style={styles.camposRow}>
                <View style={[styles.campo, { flex: 1 }]}>
                  <Text style={styles.label}>Peso aprox. (kg)</Text>
                  <TextInput style={styles.input} value={pesoKg} onChangeText={setPesoKg}
                    placeholder="Ej: 350" placeholderTextColor={C.textLight}
                    keyboardType="decimal-pad" />
                </View>
                <View style={[styles.campo, { flex: 1 }]}>
                  <Text style={styles.label}>Edad (meses)</Text>
                  <TextInput style={styles.input} value={edadMeses} onChangeText={setEdadMeses}
                    placeholder="Ej: 18" placeholderTextColor={C.textLight}
                    keyboardType="number-pad" />
                </View>
              </View>

              <View style={styles.campo}>
                <Text style={styles.label}>Número REGA de la explotación</Text>
                <TextInput style={styles.input} value={rega} onChangeText={setRega}
                  placeholder="Ej: ES280890000123A"
                  placeholderTextColor={C.textLight} autoCapitalize="characters" autoCorrect={false} />
              </View>

              <View style={styles.campo}>
                <Text style={styles.label}>Última vacunación (fecha)</Text>
                <TextInput style={styles.input} value={ultimaVacunacion} onChangeText={setUltimaVacunacion}
                  placeholder="Ej: 2026-09-15 (AAAA-MM-DD)"
                  placeholderTextColor={C.textLight} autoCorrect={false} />
              </View>

              <View style={styles.campo}>
                <Text style={styles.label}>Notas sanitarias</Text>
                <TextInput style={[styles.input, styles.inputMulti]}
                  value={notasSanitarias} onChangeText={setNotasSanitarias}
                  placeholder="Estado sanitario, tratamientos recientes, certificaciones..."
                  placeholderTextColor={C.textLight} multiline numberOfLines={3} />
              </View>
            </View>
          )}

          {/* Transporte */}
          <View style={styles.trazabilidadSection}>
            <Text style={styles.sectionTitulo}>🚛 Transporte</Text>

            <View style={styles.campo}>
              <Text style={styles.label}>Tipo de transporte requerido</Text>
              <View style={styles.tipoGrid}>
                {[
                  { value: 'estandar',    label: '📦 Mensajería estándar' },
                  { value: 'especializado', label: '🚛 Transporte agrícola especializado' },
                  { value: 'recogida',    label: '🏡 Recogida en explotación' },
                  { value: 'negociable',  label: '🤝 A negociar' },
                ].map((op) => (
                  <TouchableOpacity key={op.value}
                    style={[styles.tipoBtn, transporteTipo === op.value && styles.tipoBtnActivo]}
                    onPress={() => setTransporteTipo(op.value)}>
                    <Text style={[styles.tipoText, transporteTipo === op.value && styles.tipoTextActivo]}>
                      {op.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setTransporteIncluido(!transporteIncluido)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.label}>Transporte incluido en el precio</Text>
                <Text style={{ fontSize: 12, color: C.textSub }}>
                  Si está incluido, tú gestionas el envío al comprador
                </Text>
              </View>
              <View style={[styles.toggle, transporteIncluido && styles.toggleActivo]}>
                <View style={[styles.toggleDot, transporteIncluido && styles.toggleDotActivo]} />
              </View>
            </TouchableOpacity>

            <View style={styles.campo}>
              <Text style={styles.label}>Notas de transporte (opcional)</Text>
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
                value={transporteNotas} onChangeText={setTransporteNotas}
                placeholder="Ej: Solo recogida en finca, avisar con 48h de antelación..."
                placeholderTextColor={C.textLight} multiline />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, saving && { opacity: 0.6 }]}
            onPress={saveProduct} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Publicar producto'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  // ── LISTADO ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.flex}>
      <Header titulo="Mis productos"
        subtitulo={`${products.length} productos`}
        accion={{ label: '+ Añadir', onPress: abrirFormNuevo }} />
      <ScrollView contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await loadProducts(); setRefreshing(false) }}
          tintColor={C.primary} />}>
        {products.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>📦</Text>
            <Text style={styles.vacioTitulo}>Aún no tienes productos</Text>
            <Text style={styles.vacioDesc}>Añade tu primer producto y empieza a vender.</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={abrirFormNuevo}>
              <Text style={styles.btnPrimaryText}>Añadir mi primer producto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.lista}>
            {products.map((p) => (
              <View key={p.id} style={styles.productoCard}>
                {p.images && p.images[0]
                  ? <Image source={{ uri: p.images[0] }} style={styles.productoImg} resizeMode="cover" />
                  : <View style={styles.productoImgEmpty}><Text style={{ fontSize: 24 }}>📦</Text></View>
                }
                <View style={styles.productoInfo}>
                  <Text style={styles.productoNombre}>{p.name}</Text>
                  <Text style={styles.productoPrecio}>{p.price_per_kg} € / {p.unit_type}</Text>
                  {p.tipo_producto && p.tipo_producto !== 'otro' && (
                    <Text style={styles.productoTipo}>
                      {TIPOS_PRODUCTO.find(t => t.value === p.tipo_producto)?.label ?? p.tipo_producto}
                    </Text>
                  )}
                </View>
                <View style={styles.cardAcciones}>
                  <View style={[styles.badge,
                    p.status === 'active' ? styles.badgeActivo :
                    p.status === 'rejected' ? styles.badgeRechazado : styles.badgePendiente]}>
                    <Text style={styles.badgeText}>
                      {p.status === 'active' ? '✓' : p.status === 'rejected' ? '✗' : '⏳'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.btnEditar} onPress={() => abrirFormEditar(p)}>
                    <Text style={styles.btnEditarText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnBorrar} onPress={() => deleteProduct(p.id)}>
                    <Text style={styles.btnBorrarText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: C.bg },
  container: { padding: 16, paddingBottom: 40, gap: 14 },
  campo:     { gap: 6 },
  label:     { fontSize: 14, fontWeight: '600', color: C.text },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: C.text,
  },
  inputMulti:   { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  camposRow:    { flexDirection: 'row', gap: 12 },
  tipoGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipoBtn:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  tipoBtnActivo:{ borderColor: C.primary, backgroundColor: C.primaryLight },
  tipoText:     { fontSize: 13, color: C.textSub, fontWeight: '500' },
  tipoTextActivo:{ fontSize: 13, color: C.primary, fontWeight: '700' },
  avisoAnimal: {
    backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A',
    borderRadius: 12, padding: 14, gap: 6,
  },
  avisoAnimalTitulo: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  avisoAnimalTexto:  { fontSize: 13, color: '#B45309', lineHeight: 18 },
  trazabilidadSection: {
    backgroundColor: C.white, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 16, gap: 14,
  },
  sectionTitulo: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  fotosScroll:  { marginTop: 4 },
  fotosRow:     { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  fotoWrap:     { position: 'relative' },
  fotoMini:     { width: 90, height: 90, borderRadius: 10 },
  fotoBorrar: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center',
  },
  fotoBorrarText: { color: C.white, fontSize: 12, fontWeight: '700' },
  fotoAdd: {
    width: 90, height: 90, borderRadius: 10,
    backgroundColor: C.white, borderWidth: 2, borderColor: C.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  fotoAddEmoji: { fontSize: 24 },
  fotoAddText:  { fontSize: 11, color: C.textSub },
  unidadGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unidadBtn:         { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  unidadBtnActivo:   { borderColor: C.primary, backgroundColor: C.primaryLight },
  unidadText:        { fontSize: 13, color: C.textSub, fontWeight: '500' },
  unidadTextActivo:  { fontSize: 13, color: C.primary, fontWeight: '700' },
  btnPrimary:     { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  btnPrimaryText: { color: C.white, fontSize: 17, fontWeight: '700' },
  vacio:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioEmoji: { fontSize: 48 },
  vacioTitulo:{ fontSize: 18, fontWeight: '700', color: C.text },
  vacioDesc:  { fontSize: 14, color: C.textSub, textAlign: 'center' },
  lista:      { gap: 10 },
  productoCard: {
    backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  productoImg:      { width: 72, height: 72, borderRadius: 10 },
  productoImgEmpty: { width: 72, height: 72, borderRadius: 10, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  productoInfo:   { flex: 1, gap: 3 },
  productoNombre: { fontSize: 15, fontWeight: '700', color: C.text },
  productoPrecio: { fontSize: 13, color: C.textSub },
  productoTipo:   { fontSize: 11, color: C.primary, fontWeight: '600' },
  cardAcciones:   { alignItems: 'flex-end', gap: 6 },
  badge:          { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeActivo:    { backgroundColor: '#DCFCE7' },
  badgePendiente: { backgroundColor: '#FEF9C3' },
  badgeRechazado: { backgroundColor: '#FEE2E2' },
  badgeText:      { fontSize: 11, fontWeight: '700', color: C.text },
  btnEditar: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  btnEditarText:  { fontSize: 16 },
  btnBorrar: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  btnBorrarText: { fontSize: 16 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, padding: 14, gap: 12,
  },
  toggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: C.border, justifyContent: 'center', padding: 2,
  },
  toggleActivo:    { backgroundColor: C.primary },
  toggleDot:       { width: 24, height: 24, borderRadius: 12, backgroundColor: C.white },
  toggleDotActivo: { alignSelf: 'flex-end' },
})