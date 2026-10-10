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

type Stats = {
  productos: number
  pedidosPendientes: number
}

export default function ProducerDashboard() {
  const { profile } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ productos: 0, pedidosPendientes: 0 })
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ count: productos }, { count: pedidos }] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true })
        .eq('producer_id', user.id),
      supabase.from('orders').select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('producer_id', user.id),
    ])
    setStats({ productos: productos ?? 0, pedidosPendientes: pedidos ?? 0 })
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadStats()
    setRefreshing(false)
  }

  const nombre = profile?.full_name?.split(' ')[0] ?? 'productor'

  return (
    <View style={styles.flex}>
      <Header
        titulo={`Hola, ${nombre} 👋`}
        subtitulo="Panel del productor"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={C.primary} />
        }
      >
        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.productos}</Text>
            <Text style={styles.statLabel}>Productos{'\n'}activos</Text>
          </View>
          <View style={[styles.statCard,
            stats.pedidosPendientes > 0 && styles.statCardAlerta]}>
            <Text style={[styles.statNum,
              stats.pedidosPendientes > 0 && { color: C.warning }]}>
              {stats.pedidosPendientes}
            </Text>
            <Text style={styles.statLabel}>Pedidos{'\n'}pendientes</Text>
          </View>
        </View>

        {/* Acciones rápidas */}
        <Text style={styles.seccionTitulo}>Acciones rápidas</Text>
        <View style={styles.accionesGrid}>
          {[
            { emoji: '➕', label: 'Añadir producto',  ruta: '/(producer)/products' },
            { emoji: '🛍️', label: 'Buscar en tienda', ruta: '/(producer)/tienda'   },
            { emoji: '🧾', label: 'Mis pedidos',      ruta: '/(producer)/orders'   },
            { emoji: '💶', label: 'Subvenciones',     ruta: '/(producer)/subvenciones' },
          ].map((accion) => (
            <TouchableOpacity
              key={accion.label}
              style={styles.accionCard}
              onPress={() => router.push(accion.ruta as any)}
              activeOpacity={0.75}
            >
              <Text style={styles.accionEmoji}>{accion.emoji}</Text>
              <Text style={styles.accionLabel}>{accion.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Banner subvenciones */}
        <TouchableOpacity
          style={styles.banner}
          onPress={() => router.push('/(producer)/subvenciones')}
          activeOpacity={0.85}
        >
          <View style={styles.bannerTexto}>
            <Text style={styles.bannerTitulo}>💶 Subvenciones disponibles</Text>
            <Text style={styles.bannerDesc}>
              Hay ayudas activas para tu explotación. Consulta las que te corresponden.
            </Text>
          </View>
          <Text style={styles.bannerFlecha}>→</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: C.bg },
  scroll:    { flex: 1 },
  container: { padding: 20, paddingBottom: 40, gap: 20 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 8, elevation: 2,
  },
  statCardAlerta: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  statNum:   { fontSize: 36, fontWeight: '800', color: C.primary },
  statLabel: { fontSize: 12, color: C.textSub, textAlign: 'center', lineHeight: 18 },
  seccionTitulo: {
    fontSize: 16, fontWeight: '700', color: C.text,
  },
  accionesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  accionCard: {
    width: '47%', backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    padding: 20, alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 8, elevation: 2,
  },
  accionEmoji: { fontSize: 28 },
  accionLabel: {
    fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'center',
  },
  banner: {
    backgroundColor: C.primaryLight, borderWidth: 1,
    borderColor: C.primaryBorder, borderRadius: 16,
    padding: 18, flexDirection: 'row',
    alignItems: 'center', gap: 12,
  },
  bannerTexto:  { flex: 1, gap: 4 },
  bannerTitulo: { fontSize: 15, fontWeight: '700', color: C.primary },
  bannerDesc:   { fontSize: 13, color: C.textSub, lineHeight: 18 },
  bannerFlecha: { fontSize: 20, color: C.primary },
})