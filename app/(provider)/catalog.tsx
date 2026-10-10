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
}

export default function CatalogScreen() {
  const [products, setProducts] = useState<ProviderProduct[]>([])
  const [showing, setShowing] = useState<'list' | 'form'>('list')
  const [refreshing, setRefreshing] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('kg')
  const [description, setDescription] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadProducts() }, [])

  async function deleteProduct(id: string) {
    Alert.alert(
      'Eliminar producto',
      '¿Seguro que quieres eliminar este producto? No se puede deshacer.',
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

  async function deleteProduct(id: string) {
    Alert.alert(
      'Eliminar producto',
      '¿Seguro que quieres eliminar este producto? No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('products').delete().eq('id', id)
            if (error) Alert.alert('Error', error.message)
            else loadProducts()
          }
        }
      ]
    )
  }

  async function deleteProduct(id: string) {
    Alert.alert(
      'Eliminar producto',
      '¿Seguro que quieres eliminar este producto? No se puede deshacer.',
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

  async function loadProducts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('provider_products')
      .select('id, name, price, unit_type, status, images, description')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false })
    setProducts(data ?? [])
  }

  async function pickImage() {
    Alert.alert('Añadir foto', '¿Cómo quieres añadir la foto?', [
      {
        text: '📷 Hacer foto ahora',
        onPress: async () => {
          const permiso = await ImagePicker.requestCameraPermissionsAsync()
          if (!permiso.granted) {
            Alert.alert('Permiso necesario', 'Activa el acceso a la cámara en ajustes.')
            return
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [4, 3], quality: 0.8,
          })
          if (!result.canceled) setImageUri(result.assets[0].uri)
        }
      },
      {
        text: '🖼️ Elegir de la galería',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [4, 3], quality: 0.8,
          })
          if (!result.canceled) setImageUri(result.assets[0].uri)
        }
      },
      { text: 'Cancelar', style: 'cancel' }
    ])
  }

  async function saveProduct() {
    if (!name || !price) {
      Alert.alert('Faltan datos', 'Añade el nombre y el precio')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let imageUrl = null
      if (imageUri) {
        const ext = imageUri.split('.').pop() ?? 'jpg'
        const path = `provider-${user.id}/${Date.now()}.${ext}`
        const response = await fetch(imageUri)
        const arrayBuffer = await response.arrayBuffer()
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: false })
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('product-images').getPublicUrl(path)
          imageUrl = urlData.publicUrl
        }
      }

      const { error } = await supabase.from('provider_products').insert({
        provider_id: user.id,
        name,
        price: parseFloat(price),
        unit_type: unit,
        description,
        images: imageUrl ? [imageUrl] : [],
        status: 'active',
      })

      if (error) {
        Alert.alert('Error', error.message)
      } else {
        Alert.alert('✅ Producto añadido', 'Ya está visible para los productores.')
        setName(''); setPrice(''); setUnit('kg')
        setDescription(''); setImageUri(null)
        setShowing('list'); loadProducts()
      }
    } catch (e: any) {
      Alert.alert('Error inesperado', e.message)
    } finally {
      setSaving(false)
    }
  }

  if (showing === 'form') {
    return (
      <View style={styles.flex}>
        <Header titulo="Nuevo producto"
          accion={{ label: 'Cancelar', onPress: () => setShowing('list') }} />
        <ScrollView contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.fotoBtn} onPress={pickImage} activeOpacity={0.8}>
            {imageUri ? (
              <View>
                <Image source={{ uri: imageUri }} style={styles.fotoPreview} />
                <TouchableOpacity style={styles.fotoBorrar} onPress={() => setImageUri(null)}>
                  <Text style={styles.fotoBorrarText}>✕ Quitar foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.fotoPlaceholder}>
                <Text style={styles.fotoEmoji}>📷</Text>
                <Text style={styles.fotoTexto}>Toca para añadir una foto</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.campo}>
            <Text style={styles.label}>Nombre del producto</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName}
              placeholder="Ej: Pienso vacuno engorde 20kg"
              placeholderTextColor={C.textLight} autoCorrect={false} />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput style={[styles.input, styles.inputMulti]}
              value={description} onChangeText={setDescription}
              placeholder="Composición, beneficios, uso recomendado..."
              placeholderTextColor={C.textLight}
              multiline numberOfLines={3} autoCorrect={false} />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Precio (€)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice}
              placeholder="Ej: 24.50" placeholderTextColor={C.textLight}
              keyboardType="decimal-pad" autoCorrect={false} />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Unidad de venta</Text>
            <View style={styles.unidadGrid}>
              {[
                { value: 'kg',    label: '⚖️ Kg' },
                { value: 'unit',  label: '📦 Unidad' },
                { value: 'box',   label: '🗃️ Saco' },
                { value: 'litre', label: '🧴 Litro' },
              ].map((op) => (
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
              {saving ? 'Guardando...' : 'Añadir al catálogo'}
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
        accion={{ label: '+ Añadir', onPress: () => setShowing('form') }} />
      <ScrollView contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await loadProducts(); setRefreshing(false) }}
          tintColor={C.info} />}>
        {products.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>📋</Text>
            <Text style={styles.vacioTitulo}>Tu catálogo está vacío</Text>
            <Text style={styles.vacioDesc}>
              Añade tus productos y serán visibles para miles de productores.
            </Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowing('form')}>
              <Text style={styles.btnPrimaryText}>Añadir primer producto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.lista}>
            {products.map((p) => (
              <View key={p.id} style={styles.productoCard}>
                {p.images && p.images[0]
                  ? <Image source={{ uri: p.images[0] }} style={styles.productoImg} />
                  : <View style={styles.productoImgEmpty}>
                      <Text style={{ fontSize: 24 }}>📦</Text>
                    </View>
                }
                <View style={styles.productoInfo}>
                  <Text style={styles.productoNombre}>{p.name}</Text>
                  {p.description && (
                    <Text style={styles.productoDesc} numberOfLines={1}>{p.description}</Text>
                  )}
                  <Text style={styles.productoPrecio}>{p.price} € / {p.unit_type}</Text>
                </View>
                <View style={styles.cardAcciones}>
                  <View style={[styles.badge,
                    p.status === 'active' ? styles.badgeActivo : styles.badgePendiente]}>
                    <Text style={styles.badgeText}>
                      {p.status === 'active' ? '✓ Activo' : '⏳ Revisando'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.btnBorrar}
                    onPress={() => deleteProduct(p.id)}
                  >
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
  container: { padding: 16, paddingBottom: 40, gap: 12 },
  fotoBtn:   { borderRadius: 16, overflow: 'hidden', marginBottom: 4 },
  fotoPreview: { width: '100%', height: 200, borderRadius: 16 },
  fotoPlaceholder: {
    height: 160, backgroundColor: C.white,
    borderWidth: 2, borderColor: C.border, borderRadius: 16,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  fotoEmoji: { fontSize: 32 },
  fotoTexto: { color: C.textSub, fontSize: 15 },
  fotoBorrar: {
    backgroundColor: '#FEE2E2', borderRadius: 8,
    padding: 10, alignItems: 'center', marginTop: 8,
  },
  fotoBorrarText: { color: C.danger, fontWeight: '600', fontSize: 14 },
  campo:  { gap: 6 },
  label:  { fontSize: 14, fontWeight: '600', color: C.text },
  input:  {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: C.text,
  },
  inputMulti: { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  unidadGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  unidadBtn:        { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  unidadBtnActivo:  { borderColor: C.info, backgroundColor: '#EFF6FF' },
  unidadText:       { fontSize: 14, color: C.textSub, fontWeight: '500' },
  unidadTextActivo: { fontSize: 14, color: C.info, fontWeight: '700' },
  btnPrimary:     { backgroundColor: C.info, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
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
  productoImg:      { width: 56, height: 56, borderRadius: 10 },
  productoImgEmpty: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  productoInfo:   { flex: 1, gap: 3 },
  productoNombre: { fontSize: 15, fontWeight: '700', color: C.text },
  productoDesc:   { fontSize: 12, color: C.textLight },
  productoPrecio: { fontSize: 13, color: C.textSub },
  badge:          { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  badgeActivo:    { backgroundColor: '#DCFCE7' },
  badgePendiente: { backgroundColor: '#FEF9C3' },
  badgeText:      { fontSize: 11, fontWeight: '700', color: C.text },
  cardAcciones:   { alignItems: 'flex-end', gap: 6 },
  btnBorrar: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  btnBorrarText: { fontSize: 16 },
})