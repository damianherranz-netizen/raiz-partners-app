import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, Image, RefreshControl
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

const ROJO = '#DC2626'

type Producto = {
  id: string
  name: string
  price: number
  unit_type: string
  images: string[] | null
  description: string | null
  tipo: 'proveedor' | 'productor'
  tipo_producto?: string | null
}

const CATEGORIAS = [
  { value: 'todo',      label: 'Todo' },
  { value: 'animales',  label: '🐄 Animales' },
  { value: 'insumos',   label: '🌾 Insumos' },
  { value: 'maquinaria',label: '🚜 Maquinaria' },
  { value: 'otros',     label: '📦 Otros' },
]

export default function TransformerTiendaScreen() {
  const router = useRouter()
  const [productos, setProductos] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('todo')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadProductos() }, [busqueda])

  async function loadProductos() {
    setLoading(true)

    // Productos de proveedores
    let q1 = supabase
      .from('provider_products')
      .select('id, name, price, unit_type, images, description')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(30)
    if (busqueda.length > 2) q1 = q1.ilike('name', `%${busqueda}%`)
    const { data: provData } = await q1

    // Productos de productores (animales, carne, etc.)
    let q2 = supabase
      .from('products')
      .select('id, name, price_per_kg, unit_type, images, tipo_producto')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(30)
    if (busqueda.length > 2) q2 = q2.ilike('name', `%${busqueda}%`)
    const { data: prodData } = await q2

    const proveedorItems: Producto[] = (provData ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      unit_type: p.unit_type,
      images: p.images,
      description: p.description,
      tipo: 'proveedor',
    }))

    const productorItems: Producto[] = (prodData ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price_per_kg,
      unit_type: p.unit_type,
      images: p.images,
      description: null,
      tipo: 'productor',
      tipo_producto: p.tipo_producto,
    }))

    let todos = [...productorItems, ...proveedorItems]

    // Filtro por categoría
    if (categoria === 'animales') {
      todos = todos.filter(p =>
        p.tipo === 'productor' &&
        (p.tipo_producto === 'animal_vivo' || p.tipo_producto === 'carne')
      )
    } else if (categoria === 'insumos') {
      todos = todos.filter(p => p.tipo === 'proveedor')
    } else if (categoria === 'maquinaria') {
      todos = todos.filter(p =>
        p.tipo === 'proveedor' &&
        p.name?.toLowerCase().includes('maquinaria')
      )
    } else if (categoria === 'otros') {
      todos = todos.filter(p =>
        p.tipo === 'productor' &&
        p.tipo_producto !== 'animal_vivo' &&
        p.tipo_producto !== 'carne'
      )
    }

    setProductos(todos)
    setLoading(false)
  }

  useEffect(() => { loadProductos() }, [categoria])

  return (
    <View style={styles.flex}>
      <Header
        titulo="Comprar"
        subtitulo="Productos del campo"
        accion={{ label: '🛒 Carrito', onPress: () => router.push('/(transformer)/carrito') }}
      />

      <View style={styles.buscadorWrap}>
        <View style={styles.buscador}>
          <Text style={styles.buscadorIcono}>🔍</Text>
          <TextInput
            style={styles.buscadorInput}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar animales, insumos, maquinaria..."
            placeholderTextColor={C.textLight}
            autoCorrect={false}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Text style={styles.borrar}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categorias}
        style={styles.categoriasScroll}
      >
        {CATEGORIAS.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.catChip, categoria === cat.value && styles.catChipActivo]}
            onPress={() => setCategoria(cat.value)}
          >
            <Text style={[styles.catTexto, categoria === cat.value && styles.catTextoActivo]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await loadProductos()
              setRefreshing(false)
            }}
            tintColor={ROJO} />
        }
      >
        {loading ? (
          <Text style={styles.cargando}>Cargando productos...</Text>
        ) : productos.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>🛍️</Text>
            <Text style={styles.vacioTitulo}>Sin resultados</Text>
            <Text style={styles.vacioDesc}>Prueba con otro término o categoría.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {productos.map((p) => (
              <TouchableOpacity
                key={`${p.tipo}-${p.id}`}
                style={styles.productoCard}
                onPress={() => router.push({
                  pathname: '/(transformer)/producto-detalle',
                  params: { id: p.id, tipo: p.tipo }
                })}
                activeOpacity={0.85}
              >
                {p.images && p.images[0] ? (
                  <Image source={{ uri: p.images[0] }} style={styles.productoImg} resizeMode="cover" />
                ) : (
                  <View style={styles.productoImgPlaceholder}>
                    <Text style={{ fontSize: 32 }}>
                      {p.tipo === 'productor' ? '🐄' : '📦'}
                    </Text>
                  </View>
                )}
                <View style={styles.productoInfo}>
                  <View style={styles.tipoBadgeRow}>
                    <View style={[styles.tipoBadge,
                      p.tipo === 'productor' ? styles.tipoBadgeProductor : styles.tipoBadgeProveedor]}>
                      <Text style={styles.tipoBadgeText}>
                        {p.tipo === 'productor' ? '🌾 Productor' : '🏢 Proveedor'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.productoNombre} numberOfLines={2}>{p.name}</Text>
                  {p.description && (
                    <Text style={styles.productoDesc} numberOfLines={1}>{p.description}</Text>
                  )}
                  <Text style={styles.productoPrecio}>
                    {p.price} € / {p.unit_type}
                  </Text>
                  <View style={styles.btnVerMas}>
                    <Text style={styles.btnVerMasText}>Ver producto →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: C.bg },
  buscadorWrap: {
    backgroundColor: C.white, paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  buscador: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
  },
  buscadorIcono:  { fontSize: 16 },
  buscadorInput:  { flex: 1, fontSize: 15, color: C.text },
  borrar:         { fontSize: 14, color: C.textLight, padding: 4 },
  categoriasScroll: { backgroundColor: C.white, maxHeight: 52 },
  categorias: {
    paddingHorizontal: 16, gap: 8,
    alignItems: 'center', paddingVertical: 10,
  },
  catChip:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  catChipActivo: { backgroundColor: ROJO, borderColor: ROJO },
  catTexto:      { fontSize: 13, color: C.textSub, fontWeight: '500' },
  catTextoActivo:{ color: C.white, fontWeight: '700' },
  container:  { padding: 16, paddingBottom: 40 },
  cargando:   { textAlign: 'center', color: C.textSub, marginTop: 40 },
  vacio:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioEmoji: { fontSize: 48 },
  vacioTitulo:{ fontSize: 18, fontWeight: '700', color: C.text },
  vacioDesc:  { fontSize: 14, color: C.textSub, textAlign: 'center' },
  grid:       { gap: 12 },
  productoCard: {
    backgroundColor: C.white, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  productoImg:            { width: 100, height: 120 },
  productoImgPlaceholder: { width: 100, height: 120, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  productoInfo:    { flex: 1, padding: 12, gap: 4 },
  tipoBadgeRow:    { flexDirection: 'row' },
  tipoBadge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tipoBadgeProductor: { backgroundColor: '#DCFCE7' },
  tipoBadgeProveedor: { backgroundColor: '#EFF6FF' },
  tipoBadgeText:   { fontSize: 11, fontWeight: '600', color: C.text },
  productoNombre:  { fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 20 },
  productoDesc:    { fontSize: 12, color: C.textLight },
  productoPrecio:  { fontSize: 15, fontWeight: '800', color: ROJO },
  btnVerMas: {
    backgroundColor: '#FEF2F2', borderRadius: 8,
    paddingVertical: 6, alignItems: 'center',
    marginTop: 4, borderWidth: 1, borderColor: '#FECACA',
  },
  btnVerMasText: { fontSize: 12, fontWeight: '700', color: ROJO },
})