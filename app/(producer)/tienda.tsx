import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, Image, RefreshControl
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

type Producto = {
  id: string
  name: string
  price: number
  unit_type: string
  images: string[] | null
  description: string | null
}

const CATEGORIAS = ['Todo', 'Piensos', 'Semillas', 'Maquinaria', 'Herramientas', 'Veterinaria', 'Otros']

export default function TiendaScreen() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todo')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadProductos() }, [busqueda, categoria])

  async function loadProductos() {
    let query = supabase
      .from('provider_products')
      .select('id, name, price, unit_type, images, description')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50)

    if (busqueda.length > 2) {
      query = query.ilike('name', `%${busqueda}%`)
    }

    const { data } = await query
    setProductos(data ?? [])
    setLoading(false)
  }

  return (
    <View style={styles.flex}>
      <Header titulo="Tienda" subtitulo="Productos del sector" />

      <View style={styles.buscadorWrap}>
        <View style={styles.buscador}>
          <Text style={styles.buscadorIcono}>🔍</Text>
          <TextInput
            style={styles.buscadorInput}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar piensos, semillas, herramientas..."
            placeholderTextColor={C.textLight}
            autoCorrect={false}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Text style={styles.borrarBusqueda}>✕</Text>
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
            key={cat}
            style={[styles.catChip, categoria === cat && styles.catChipActivo]}
            onPress={() => setCategoria(cat)}
          >
            <Text style={[styles.catTexto, categoria === cat && styles.catTextoActivo]}>
              {cat}
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
            tintColor={C.primary} />
        }
      >
        {loading ? (
          <Text style={styles.cargando}>Cargando productos...</Text>
        ) : productos.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>🛍️</Text>
            <Text style={styles.vacioTitulo}>
              {busqueda ? 'Sin resultados' : 'Tienda en construcción'}
            </Text>
            <Text style={styles.vacioDesc}>
              {busqueda
                ? `No encontramos "${busqueda}". Prueba con otro término.`
                : 'Los proveedores están añadiendo sus productos. Vuelve pronto.'}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {productos.map((p) => (
              <View key={p.id} style={styles.productoCard}>
                {p.images && p.images[0] ? (
                  <Image source={{ uri: p.images[0] }} style={styles.productoImg} />
                ) : (
                  <View style={styles.productoImgPlaceholder}>
                    <Text style={{ fontSize: 32 }}>📦</Text>
                  </View>
                )}
                <View style={styles.productoInfo}>
                  <Text style={styles.productoNombre} numberOfLines={2}>{p.name}</Text>
                  {p.description && (
                    <Text style={styles.productoDesc} numberOfLines={1}>{p.description}</Text>
                  )}
                  <Text style={styles.productoPrecio}>
                    {p.price} € / {p.unit_type}
                  </Text>
                  <TouchableOpacity style={styles.btnComprar}>
                    <Text style={styles.btnComprarText}>Contactar</Text>
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
  flex:   { flex: 1, backgroundColor: C.bg },
  buscadorWrap: {
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  buscador: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
  },
  buscadorIcono:  { fontSize: 16 },
  buscadorInput:  { flex: 1, fontSize: 15, color: C.text },
  borrarBusqueda: { fontSize: 14, color: C.textLight, padding: 4 },
  categoriasScroll: { backgroundColor: C.white, maxHeight: 52 },
  categorias: {
    paddingHorizontal: 16, gap: 8,
    alignItems: 'center', paddingVertical: 10,
  },
  catChip:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  catChipActivo: { backgroundColor: C.primary, borderColor: C.primary },
  catTexto:      { fontSize: 13, color: C.textSub, fontWeight: '500' },
  catTextoActivo:{ color: C.white, fontWeight: '700' },
  container:  { padding: 16, paddingBottom: 40 },
  cargando:   { textAlign: 'center', color: C.textSub, marginTop: 40 },
  vacio:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioEmoji: { fontSize: 48 },
  vacioTitulo:{ fontSize: 18, fontWeight: '700', color: C.text },
  vacioDesc:  { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  grid:       { gap: 12 },
  productoCard: {
    backgroundColor: C.white, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  productoImg:            { width: 100, height: 110 },
  productoImgPlaceholder: { width: 100, height: 110, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  productoInfo:   { flex: 1, padding: 12, gap: 4 },
  productoNombre: { fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 20 },
  productoDesc:   { fontSize: 12, color: C.textLight },
  productoPrecio: { fontSize: 15, fontWeight: '800', color: C.primary },
  btnComprar: {
    backgroundColor: C.primaryLight, borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
    marginTop: 4, borderWidth: 1, borderColor: C.primaryBorder,
  },
  btnComprarText: { fontSize: 13, fontWeight: '700', color: C.primary },
})