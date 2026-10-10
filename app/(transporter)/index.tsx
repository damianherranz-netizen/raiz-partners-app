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

export default function TransporterDashboard() {
  const { profile } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({ activos: 0, completados: 0 })
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ count: activos }, { count: completados }] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true })
        .eq('transporter_id', user.id).eq('status', 'shipped'),
      supabase.from('orders').select('*', { count: 'exact', head: true })
        .eq('transporter_id', user.id).eq('status', 'delivered'),
    ])
    setStats({ activos: activos ?? 0, completados: completados ?? 0 })
  }

  const nombre = profile?.full_name?.split(' ')[0] ?? 'transportista'

  return (
    <View style={styles.flex}>
      <Header titulo={`Hola, ${nombre} 👋`} subtitulo="Panel del transportista" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await loadStats(); setRefreshing(false) }}
          tintColor={C.transporter} />}
      >
        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: C.transporter }]}>
              {stats.activos}
            </Text>
            <Text style={styles.statLabel}>Servicios{'\n'}activos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: C.success }]}>
              {stats.completados}
            </Text>
            <Text style={styles.statLabel}>Servicios{'\n'}completados</Text>
          </View>
        </View>

        {/* Acciones */}
        <Text style={styles.seccionTitulo}>Acciones rápidas</Text>
        <View style={styles.accionesGrid}>
          {[
            { emoji: '📍', label: 'Ver solicitudes',  ruta: '/(transporter)/requests' },
            { emoji: '🚛', label: 'Mi flota',         ruta: '/(transporter)/fleet'    },
            { emoji: '👤', label: 'Mi perfil',        ruta: '/(transporter)/profile'  },
            { emoji: '📋', label: 'Mis servicios',    ruta: '/(transporter)/requests' },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.accionCard}
              onPress={() => router.push(a.ruta as any)} activeOpacity={0.75}>
              <Text style={styles.accionEmoji}>{a.emoji}</Text>
              <Text style={styles.accionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Zonas activas */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitulo}>🗺️ ¿Cómo funciona?</Text>
          <Text style={styles.bannerDesc}>
            Registra tu flota y tus zonas de cobertura. Los productores y proveedores
            de tu zona podrán contactarte para sus transportes especializados.
          </Text>
        </View>

        {/* Info documentación */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitulo}>📄 Documentación necesaria</Text>
          {[
            'Certificado ATP del vehículo',
            'Tarjeta de transporte vigente',
            'Seguro RC mínimo 1M€',
            'CAP del conductor',
          ].map((item) => (
            <View key={item} style={styles.infoItem}>
              <Text style={styles.infoDot}>✓</Text>
              <Text style={styles.infoTexto}>{item}</Text>
            </View>
          ))}
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
  statNum:       { fontSize: 36, fontWeight: '800' },
  statLabel:     { fontSize: 12, color: C.textSub, textAlign: 'center', lineHeight: 18 },
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
  banner: {
    backgroundColor: '#FAF5FF', borderWidth: 1,
    borderColor: '#E9D5FF', borderRadius: 16, padding: 18, gap: 8,
  },
  bannerTitulo: { fontSize: 15, fontWeight: '700', color: C.transporter },
  bannerDesc:   { fontSize: 13, color: C.textSub, lineHeight: 18 },
  infoCard: {
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, padding: 18, gap: 10,
  },
  infoTitulo: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  infoItem:   { flexDirection: 'row', gap: 10, alignItems: 'center' },
  infoDot:    { color: C.success, fontWeight: '700', fontSize: 14 },
  infoTexto:  { fontSize: 14, color: C.textSub },
})