import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useCart } from '../../lib/cart'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

const ROJO = '#DC2626'
const ROJO_LIGHT = '#FEF2F2'

const ACCIONES = [
  { emoji: '🛍️', label: 'Comprar productos', ruta: '/(transformer)/tienda' },
  { emoji: '🛒', label: 'Mi carrito',         ruta: '/(transformer)/carrito' },
  { emoji: '💬', label: 'Mis mensajes',       ruta: '/(transformer)/mensajes' },
  { emoji: '👤', label: 'Mi perfil',          ruta: '/(transformer)/profile' },
  { emoji: '✅', label: 'Verificar cuenta', ruta: '/verificacion' },
]

export default function TransformerDashboard() {
  const { profile } = useAuth()
  const cart = useCart()
  const router = useRouter()
  const [mensajes, setMensajes] = useState(0)
  const [perfilCompleto, setPerfilCompleto] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase
      .from('profiles_transformer')
      .select('company_name, phone, transformer_types')
      .eq('id', user.id).single()
    setPerfilCompleto(!!prof?.phone && (prof?.transformer_types?.length ?? 0) > 0)

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false)
    setMensajes(count ?? 0)
  }

  const nombre = profile?.full_name?.split(' ')[0] ?? 'transformador'

  return (
    <View style={styles.flex}>
      <Header titulo={`Hola, ${nombre} 👋`} subtitulo="Panel del transformador" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadStats(); setRefreshing(false) }}
            tintColor={ROJO}
          />
        }
      >
        {!perfilCompleto && (
          <TouchableOpacity
            style={styles.avisoCard}
            onPress={() => router.push('/(transformer)/profile')}
          >
            <Text style={styles.avisoEmoji}>⚠️</Text>
            <View style={styles.avisoTexto}>
              <Text style={styles.avisoTitulo}>Completa tu perfil</Text>
              <Text style={styles.avisoDesc}>
                Añade tu tipo de actividad y contacto para empezar a comprar.
              </Text>
            </View>
            <Text style={styles.avisoFlecha}>→</Text>
          </TouchableOpacity>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: ROJO }]}>{mensajes}</Text>
            <Text style={styles.statLabel}>Mensajes{'\n'}sin leer</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: ROJO }]}>{cart.count}</Text>
            <Text style={styles.statLabel}>Artículos{'\n'}en el carrito</Text>
          </View>
        </View>

        <Text style={styles.seccionTitulo}>Acciones rápidas</Text>
        <View style={styles.accionesGrid}>
          {ACCIONES.map((a) => (
            <TouchableOpacity
              key={a.ruta}
              style={styles.accionCard}
              onPress={() => router.push(a.ruta as any)}
              activeOpacity={0.75}
            >
              <Text style={styles.accionEmoji}>{a.emoji}</Text>
              <Text style={styles.accionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitulo}>🚀 Próximamente en RAÍZ</Text>
          <Text style={styles.infoDesc}>
            En la segunda fase podrás vender tus productos transformados directamente
            a consumidores finales, del campo a su casa, pasando por tu empresa.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: C.bg },
  container: { padding: 20, paddingBottom: 40, gap: 20 },
  avisoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A',
    borderRadius: 14, padding: 16,
  },
  avisoEmoji:  { fontSize: 24 },
  avisoTexto:  { flex: 1, gap: 3 },
  avisoTitulo: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  avisoDesc:   { fontSize: 12, color: '#B45309', lineHeight: 16 },
  avisoFlecha: { fontSize: 18, color: '#F59E0B' },
  statsGrid:   { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statNum:   { fontSize: 36, fontWeight: '800' },
  statLabel: { fontSize: 12, color: C.textSub, textAlign: 'center', lineHeight: 18 },
  seccionTitulo: { fontSize: 16, fontWeight: '700', color: C.text },
  accionesGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  accionCard: {
    width: '47%', backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    padding: 20, alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  accionEmoji: { fontSize: 28 },
  accionLabel: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'center' },
  infoCard: {
    backgroundColor: ROJO_LIGHT, borderWidth: 1,
    borderColor: '#FECACA', borderRadius: 16, padding: 18, gap: 8,
  },
  infoTitulo: { fontSize: 15, fontWeight: '700', color: ROJO },
  infoDesc:   { fontSize: 13, color: '#7F1D1D', lineHeight: 18 },
})