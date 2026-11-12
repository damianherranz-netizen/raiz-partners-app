import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Image, RefreshControl
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

type ProviderProduct = {
  id: string
  name: string
  price: number
  unit_type: string
  status: string
  images: string[] | null
  description: string | null
  review_notes?: string | null
}

const UNIDADES = [
  { value: 'kg',    label: '⚖️ Kg' },
  { value: 'unit',  label: '📦 Unidad' },
  { value: 'litre', label: '🧴 Litro' },
  { value: 'hour',  label: '⏱️ Hora' },
  { value: 'day',   label: '📅 Día' },
  { value: 'month', label: '🗓️ Mes' },
]

export default function CatalogScreen() {
  const [products, setProducts] = useState<ProviderProduct[]>([])
  const [showing, setShowing] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('kg')
  const [description, setDescription] = useState('')
  const [imageUris, setImageUris] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('provider_products')
      .select('id, name, price, unit_type, status, images, description, review_notes')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false })
    setProducts(data ?? [])
  }

  function abrirFormNuevo() {
    setEditingId(null)
    setName(''); setPrice(''); setUnit('kg')
    setDescription(''); setImageUris([]); setExistingImages([])
    setShowing('form')
  }

  function abrirFormEditar(p: ProviderProduct) {
    setEditingId(p.id)
    setName(p.name)
    setPrice(p.price.toString())
    setUnit(p.unit_type)
    setDescription(p.description ?? '')
    setExistingImages(p.images ?? [])
    setImageUris([])
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
          if (!permiso.granted) return
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
      const path = `provider-${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      })

      const arrayBuffer = decode(base64)

      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true })

      if (error) {
        console.log('Upload error:', error.message)
        return null
      }

      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      return data.publicUrl
    } catch (e: any) {
      console.log('Upload exception:', e.message)
      return null
    }
  }

  async function saveProduct() {
    const { ensureVerified } = require('../../lib/verification')
    if (!(await ensureVerified())) return
    if (!name || !price) {
      Alert.alert('Faltan datos', 'Añade el nombre y el precio')
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

      const productData = {
        name,
        price: parseFloat(price),
        unit_type: unit,
        description,
        images: allImages,
        status: 'active',
      }

      let error
      if (editingId) {
        const result = await supabase
          .from('provider_products')
          .update(productData)
          .eq('id', editingId)
        error = result.error
      } else {
        const result = await supabase
          .from('provider_products')
          .insert({ ...productData, provider_id: user.id })
        error = result.error
      }

      if (error) {
        Alert.alert('Error', error.message)
      } else {
        Alert.alert(
          editingId ? '✅ Actualizado' : '✅ Producto añadido',
          editingId ? 'Los cambios han sido guardados.' : 'Ya está visible para los productores.'
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
    Alert.alert(
      'Eliminar producto',
      '¿Seguro que quieres eliminar este producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('provider_products').delete().eq('id', id)
            if (error) Alert.alert('Error', error.message)
            else loadProducts()
          }
        }
      ]
    )
  }

  if (showing === 'form') {
    const totalFotos = existingImages.length + imageUris.length
    return (
      <View style={styles.flex}>
        <Header
          titulo={editingId ? 'Editar producto' : 'Nuevo producto'}
          accion={{ label: 'Cancelar', onPress: () => setShowing('list') }}
        />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <View style={styles.campo}>
            <Text style={styles.label}>Fotos del producto ({totalFotos}/4)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosScroll}>
              <View style={styles.fotosRow}>
                {existingImages.map((url, idx) => (
                  <View key={`e-${idx}`} style={styles.fotoWrap}>
                    <Image source={{ uri: url }} style={styles.fotoMini} />
                    <TouchableOpacity
                      style={styles.fotoBorrar}
                      onPress={() => setExistingImages(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <Text style={styles.fotoBorrarText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {imageUris.map((uri, idx) => (
                  <View key={`n-${idx}`} style={styles.fotoWrap}>
                    <Image source={{ uri }} style={styles.fotoMini} />
                    <TouchableOpacity
                      style={styles.fotoBorrar}
                      onPress={() => setImageUris(prev => prev.filter((_, i) => i !== idx))}
                    >
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

          <View style={styles.campo}>
            <Text style={styles.label}>Nombre del producto</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName}
              placeholder="Ej: Pienso vacuno engorde 30kg"
              placeholderTextColor={C.textLight} autoCorrect={false} />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput style={[styles.input, styles.inputMulti]}
              value={description} onChangeText={setDescription}
              placeholder="Composición, beneficios, presentación..."
              placeholderTextColor={C.textLight} multiline numberOfLines={3} />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Precio (€)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice}
              placeholder="Ej: 24.50" placeholderTextColor={C.textLight}
              keyboardType="decimal-pad" />
          </View>

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

          <TouchableOpacity
            style={[styles.btnPrimary, saving && { opacity: 0.6 }]}
            onPress={saveProduct} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Añadir al catálogo'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      <Header titulo="Mi catálogo"
        subtitulo={`${products.length} productos`}
        accion={{ label: '+ Añadir', onPress: abrirFormNuevo }} />
      <ScrollView contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await loadProducts(); setRefreshing(false) }}
          tintColor={C.info} />}>
        {products.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>📋</Text>
            <Text style={styles.vacioTitulo}>Tu catálogo está vacío</Text>
            <Text style={styles.vacioDesc}>Añade productos para que los productores te encuentren.</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={abrirFormNuevo}>
              <Text style={styles.btnPrimaryText}>Añadir primer producto</Text>
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
                  {p.description && (
                    <Text style={styles.productoDesc} numberOfLines={1}>{p.description}</Text>
                  )}
                  <Text style={styles.productoPrecio}>{p.price} € / {p.unit_type}</Text>
                  {p.status === 'rejected' && p.review_notes ? (
                    <Text style={styles.motivo}>
                      Motivo: {p.review_notes.replace('Retirado por RAÍZ: ', '')}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.cardAcciones}>
                  <View style={[styles.badge,
                    p.status === 'active' ? styles.badgeActivo
                    : p.status === 'rejected' ? styles.badgeRechazado : styles.badgePendiente]}>
                    <Text style={styles.badgeText}>
                      {p.status === 'active' ? '✓ Activo' : p.status === 'rejected' ? '✗ Retirado' : '⏳'}
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
  unidadGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unidadBtn:        { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  unidadBtnActivo:  { borderColor: C.info, backgroundColor: '#EFF6FF' },
  unidadText:       { fontSize: 13, color: C.textSub, fontWeight: '500' },
  unidadTextActivo: { fontSize: 13, color: C.info, fontWeight: '700' },
  btnPrimary:     { backgroundColor: C.info, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
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
  productoImgEmpty: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  productoInfo:   { flex: 1, gap: 3 },
  productoNombre: { fontSize: 15, fontWeight: '700', color: C.text },
  productoDesc:   { fontSize: 12, color: C.textLight },
  productoPrecio: { fontSize: 13, color: C.textSub },
  motivo:         { fontSize: 12, color: '#991B1B', fontWeight: '600', lineHeight: 16 },
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
  btnEditarText: { fontSize: 16 },
  btnBorrar: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  btnBorrarText: { fontSize: 16 },
})