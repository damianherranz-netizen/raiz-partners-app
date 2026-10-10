import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

type Solicitud = {
  id: string
  created_at: string
  status: string
  total_amount: number
  delivery_address: string | null
  origin_province: string | null
}

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'Pendiente',  bg: '#FEF9C3', color: '#854D0E' },
  confirmed: { label: 'Confirmado', bg: '#FAF5FF', color: '#6D28D9' },
  shipped:   { label: 'En ruta',    bg: '#FAF5FF', color: '#6D28D9' },
  delivered: { label: 'Entregado',  bg: '#DCFCE7', color: '#166534' },
  cancelled: { label: 'Cancelado',  bg: '#FEE2E2', color: '#991B1B' },
}

export default function RequestsScreen() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'completados'>('todos')

  useEffect(() => { loadSolicitudes() }, [])

  async function loadSolicitudes() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('orders')
      .select('id, created_at, status, total_amount, delivery_address')
      .order('created_at', { ascending: false })
      .limit(50)
    setSolicitudes((data as any) ?? [])
  }

  const filtradas = solicitudes.filter((s) => {
    if (filtro === 'activos')     return ['pending','confirmed','shipped'].includes(s.status)
    if (filtro === 'completados') return s.status === 'delivered'
    return true
  })

  return (
    <View style={styles.flex}>
      <Header titulo="Solicitudes" subtitulo={`${filtradas.length} servicios`} />

      {/* Filtros */}
      <View style={styles.filtros}>
        {([
          { key: 'todos',       label: 'Todos' },
          { key: 'activos',     label: 'Activos' },
          { key: 'completados', label: 'Completados' },
        ] as const).map((f) => (
          <TouchableOpacity key={f.key}
            style={[styles.filtroBtn, filtro === f.key && styles.filtroBtnActivo]}
            onPress={() => setFiltro(f.key)}>
            <Text style={[styles.filtroText, filtro === f.key && styles.filtroTextActivo]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await loadSolicitudes(); setRefreshing(false) }}
          tintColor={C.transporter} />}>

        {filtradas.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>📍</Text>
            <Text style={styles.vacioTitulo}>Sin solicitudes aún</Text>
            <Text style={styles.vacioDesc}>
              Completa tu perfil y añade tu flota para empezar a recibir
              solicitudes de transporte de tu zona.
            </Text>
          </View>
        ) : (
          <View style={styles.lista}>
            {filtradas.map((s) => {
              const st = STATUS[s.status] ?? { label: s.status, bg: C.bg, color: C.text }
              const fecha = new Date(s.created_at).toLocaleDateString('es-ES',
                { day: 'numeric', month: 'short', year: 'numeric' })
              return (
                <View key={s.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardId}>#{s.id.slice(-6).toUpperCase()}</Text>
                    <View style={[styles.badge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardImporte}>{s.total_amount?.toFixed(2)} €</Text>
                  <Text style={styles.cardFecha}>📅 {fecha}</Text>
                  {s.delivery_address && (
                    <Text style={styles.cardDireccion}>📍 {s.delivery_address}</Text>
                  )}
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: C.bg },
  filtros: {
    flexDirection: 'row', gap: 8, padding: 16,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  filtroBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 100, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.white,
  },
  filtroBtnActivo: { backgroundColor: C.transporter, borderColor: C.transporter },
  filtroText:      { fontSize: 13, color: C.textSub, fontWeight: '500' },
  filtroTextActivo:{ color: C.white, fontWeight: '700' },
  container: { padding: 16, paddingBottom: 40 },
  vacio:     { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioEmoji:  { fontSize: 48 },
  vacioTitulo: { fontSize: 18, fontWeight: '700', color: C.text },
  vacioDesc:   { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  lista: { gap: 10 },
  card: {
    backgroundColor: C.white, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, padding: 16, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardId:        { fontSize: 13, fontWeight: '700', color: C.textSub },
  cardImporte:   { fontSize: 22, fontWeight: '800', color: C.transporter },
  cardFecha:     { fontSize: 13, color: C.textLight },
  cardDireccion: { fontSize: 13, color: C.textSub, marginTop: 2 },
  badge:         { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:     { fontSize: 12, fontWeight: '700' },
})