import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

export default function ProviderDashboard() {
  const { profile, signOut } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({ productos: 0, pedidos: 0 })
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ count: productos }, { count: pedidos }] = await Promise.all([
      supabase.from('provider_products').select('*', { count: 'exact', head: true })
        .eq('provider_id', user.id),
      supabase.from('orders').select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('provider_id', user.id),
    ])
    setStats({ productos: productos ?? 0, pedidos: pedidos ?? 0 })
  }

  const nombre = profile?.full_name?.split(' ')[0] ?? 'proveedor'

  return (
    <View style={styles.flex}>
      <Header titulo={`Hola, ${nombre} 👋`} subtitulo="Panel del proveedor" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await loadStats(); setRefreshing(false) }}
          tintColor={C.info} />}
      >
        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: C.info }]}>{stats.productos}</Text>
            <Text style={styles.statLabel}>Productos{'\n'}en catálogo</Text>
          </View>
          <View style={[styles.statCard, stats.pedidos > 0 && styles.statCardAlerta]}>
            <Text style={[styles.statNum, { color: C.warning }]}>{stats.pedidos}</Text>
            <Text style={styles.statLabel}>Pedidos{'\n'}pendientes</Text>
          </View>
        </View>

        {/* Acciones */}
        <Text style={styles.seccionTitulo}>Acciones rápidas</Text>
        <View style={styles.accionesGrid}>
          {[
            { emoji: '➕', label: 'Añadir producto',  ruta: '/(provider)/catalog'  },
            { emoji: '🧾', label: 'Ver pedidos',      ruta: '/(provider)/orders'   },
            { emoji: '👤', label: 'Mi perfil',        ruta: '/(provider)/profile'  },
            { emoji: '📊', label: 'Mis ventas',       ruta: '/(provider)/orders'   },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.accionCard}
              onPress={() => router.push(a.ruta as any)} activeOpacity={0.75}>
              <Text style={styles.accionEmoji}>{a.emoji}</Text>
              <Text style={styles.accionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitulo}>🏢 Bienvenido a RAÍZ Partners</Text>
          <Text style={styles.bannerDesc}>
            Miles de productores buscan exactamente los productos que ofreces.
            Añade tu catálogo y empieza a vender.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: C.bg },
  container: { padding: 20, paddingBottom: 40, gap: 20 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statCardAlerta: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  statNum:        { fontSize: 36, fontWeight: '800' },
  statLabel:      { fontSize: 12, color: C.textSub, textAlign: 'center', lineHeight: 18 },
  seccionTitulo:  { fontSize: 16, fontWeight: '700', color: C.text },
  accionesGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  accionCard: {
    width: '47%', backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    padding: 20, alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  accionEmoji: { fontSize: 28 },
  accionLabel: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'center' },
  banner: {
    backgroundColor: '#EFF6FF', borderWidth: 1,
    borderColor: '#BFDBFE', borderRadius: 16, padding: 18, gap: 8,
  },
  bannerTitulo: { fontSize: 15, fontWeight: '700', color: C.info },
  bannerDesc:   { fontSize: 13, color: C.textSub, lineHeight: 18 },
})