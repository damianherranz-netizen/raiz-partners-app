import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useCart } from '../lib/cart'
import { C } from '../lib/colors'
import Header from './ui/Header'

export default function CartScreen() {
  const router = useRouter()
  const { items, setQty, remove, clear, total, count } = useCart()

  const porVendedor = items.reduce<Record<string, typeof items>>((acc, i) => {
    const k = i.seller_name ?? 'Vendedor'
    ;(acc[k] = acc[k] ?? []).push(i)
    return acc
  }, {})

  return (
    <View style={styles.flex}>
      <Header
        titulo="Mi carrito"
        subtitulo={`${count} artículos`}
        accion={{ label: '← Volver', onPress: () => router.back() }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {items.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={{ fontSize: 48 }}>🛒</Text>
            <Text style={styles.vacioTitulo}>Tu carrito está vacío</Text>
            <Text style={styles.vacioDesc}>Añade productos desde la tienda.</Text>
          </View>
        ) : (
          <>
            {Object.entries(porVendedor).map(([vendedor, lista]) => (
              <View key={vendedor} style={styles.grupo}>
                <Text style={styles.vendedor}>🏢 {vendedor}</Text>
                {lista.map((i) => (
                  <View key={i.key} style={styles.item}>
                    {i.image
                      ? <Image source={{ uri: i.image }} style={styles.img} />
                      : <View style={[styles.img, styles.imgVacia]}><Text style={{ fontSize: 22 }}>📦</Text></View>}
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.nombre} numberOfLines={2}>{i.name}</Text>
                      <Text style={styles.precio}>{i.price} € / {i.unit_type}</Text>
                      {i.unico ? (
                        <Text style={styles.unico}>Pieza única · cantidad 1</Text>
                      ) : (
                        <View style={styles.qtyRow}>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(i.key, i.qty - 1)}>
                            <Text style={styles.qtyBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.qty}>{i.qty}</Text>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(i.key, i.qty + 1)}>
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => remove(i.key)} style={styles.borrar}>
                      <Text style={{ fontSize: 18 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}

            <View style={styles.resumen}>
              <View style={styles.resumenRow}>
                <Text style={styles.resumenLabel}>Subtotal</Text>
                <Text style={styles.resumenValor}>{total.toFixed(2)} €</Text>
              </View>
              <Text style={styles.resumenNota}>
                El transporte se calcula en el siguiente paso según el tipo de producto.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.btnPagar}
              onPress={() => Alert.alert('Próximamente', 'Dirección de envío y pago seguro llegan en la próxima versión.')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPagarText}>Continuar con el pedido</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => Alert.alert('Vaciar carrito', '¿Seguro?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Vaciar', style: 'destructive', onPress: clear },
            ])}>
              <Text style={styles.vaciar}>Vaciar carrito</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  container: { padding: 16, paddingBottom: 40, gap: 14 },
  vacio: { alignItems: 'center', paddingTop: 60, gap: 10 },
  vacioTitulo: { fontSize: 18, fontWeight: '700', color: C.text },
  vacioDesc: { fontSize: 14, color: C.textSub },
  grupo: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, gap: 12 },
  vendedor: { fontSize: 14, fontWeight: '700', color: C.textSub },
  item: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  img: { width: 64, height: 64, borderRadius: 10 },
  imgVacia: { backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: 14, fontWeight: '700', color: C.text },
  precio: { fontSize: 13, color: C.textSub },
  unico: { fontSize: 12, color: C.primary, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 18, color: C.text },
  qty: { fontSize: 15, fontWeight: '700', color: C.text, minWidth: 20, textAlign: 'center' },
  borrar: { padding: 6 },
  resumen: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, gap: 8 },
  resumenRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resumenLabel: { fontSize: 16, color: C.textSub },
  resumenValor: { fontSize: 20, fontWeight: '800', color: C.text },
  resumenNota: { fontSize: 12, color: C.textLight, lineHeight: 16 },
  btnPagar: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  btnPagarText: { color: C.white, fontSize: 17, fontWeight: '700' },
  vaciar: { textAlign: 'center', color: C.danger, fontSize: 14, fontWeight: '600', paddingVertical: 8 },
})