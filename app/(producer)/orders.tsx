import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

type Order = {
  id: string
  created_at: string
  status: string
  total_amount: number
  delivery_address: string | null
}

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'Pendiente',  bg: '#FEF9C3', color: '#854D0E' },
  confirmed: { label: 'Confirmado', bg: '#DCFCE7', color: '#166534' },
  shipped:   { label: 'Enviado',    bg: '#DBEAFE', color: '#1E40AF' },
  delivered: { label: 'Entregado',  bg: '#DCFCE7', color: '#166534' },
  cancelled: { label: 'Cancelado',  bg: '#FEE2E2', color: '#991B1B' },
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadOrders() }, [])

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('id, created_at, status, total_amount, delivery_address')
      .order('created_at', { ascending: false })
      .limit(50)
    setOrders(data ?? [])
  }

  return (
    <View style={styles.flex}>
      <Header titulo="Mis pedidos" subtitulo={`${orders.length} pedidos`} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadOrders(); setRefreshing(false) }}
            tintColor={C.primary} />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>🧾</Text>
            <Text style={styles.vacioTitulo}>Aún no tienes pedidos</Text>
            <Text style={styles.vacioDesc}>
              Cuando alguien compre tu producto aparecerá aquí.
            </Text>
          </View>
        ) : (
          <View style={styles.lista}>
            {orders.map((o) => {
              const st = STATUS[o.status] ?? { label: o.status, bg: C.bg, color: C.text }
              const fecha = new Date(o.created_at).toLocaleDateString('es-ES',
                { day: 'numeric', month: 'short', year: 'numeric' })
              return (
                <View key={o.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardId}>#{o.id.slice(-6).toUpperCase()}</Text>
                    <View style={[styles.badge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardImporte}>{o.total_amount?.toFixed(2)} €</Text>
                  <Text style={styles.cardFecha}>{fecha}</Text>
                  {o.delivery_address && (
                    <Text style={styles.cardDireccion}>📍 {o.delivery_address}</Text>
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
  container: { padding: 16, paddingBottom: 40 },
  vacio: { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioEmoji:  { fontSize: 48 },
  vacioTitulo: { fontSize: 18, fontWeight: '700', color: C.text },
  vacioDesc:   { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  lista: { gap: 10 },
  card: {
    backgroundColor: C.white, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, padding: 16, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardId:       { fontSize: 13, fontWeight: '700', color: C.textSub },
  cardImporte:  { fontSize: 22, fontWeight: '800', color: C.primary },
  cardFecha:    { fontSize: 13, color: C.textLight },
  cardDireccion:{ fontSize: 13, color: C.textSub, marginTop: 4 },
  badge:        { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:    { fontSize: 12, fontWeight: '700' },
})