import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, RefreshControl
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { C } from '../lib/colors'
import Header from '../components/ui/Header'

type Denuncia = {
  kind: 'productor' | 'proveedor'
  listing_id: string
  name: string | null
  seller_id: string | null
  seller_name: string | null
  listing_status: string | null
  image: string | null
  num_reports: number
  reasons: string[] | null
  details: string[] | null
  last_at: string
}

const MOTIVOS_RETIRAR = [
  'Datos del animal incompletos',
  'Producto no permitido',
  'Información falsa o engañosa',
  'Contiene datos de contacto',
]

export default function AdminDenuncias() {
  const router = useRouter()
  const [items, setItems] = useState<Denuncia[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sinPermiso, setSinPermiso] = useState(false)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data, error } = await supabase.rpc('admin_open_reports')
    if (error) {
      if (error.message.includes('Sin permiso')) setSinPermiso(true)
      else Alert.alert('No se pudieron cargar las denuncias', error.message)
      setLoading(false)
      return
    }
    setItems((data ?? []) as Denuncia[])
    setLoading(false)
  }

  async function resolver(d: Denuncia, accion: 'dismiss' | 'remove') {
    if (accion === 'remove' && motivo.trim().length < 3) {
      Alert.alert('Falta el motivo', 'Escribe o elige el motivo. El vendedor lo verá.')
      return
    }
    setProcesando(true)
    const { error } = await supabase.rpc('admin_resolve_reports', {
      p_kind: d.kind,
      p_id: d.listing_id,
      p_action: accion,
      p_notes: motivo.trim() || null,
    })
    setProcesando(false)
    if (error) { Alert.alert('No se pudo guardar', error.message); return }
    setMotivo('')
    setAbierta(null)
    await cargar()
  }

  function confirmarRetirar(d: Denuncia) {
    Alert.alert(
      'Retirar anuncio',
      'Dejará de verse en la tienda y el vendedor no podrá reactivarlo. Las denuncias se darán por resueltas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Retirar', style: 'destructive', onPress: () => resolver(d, 'remove') },
      ]
    )
  }

  const volver = { label: '← Volver', onPress: () => router.back() }

  if (sinPermiso) {
    return (
      <View style={styles.flex}>
        <Header titulo="Denuncias" accion={volver} />
        <View style={styles.centrado}>
          <Text style={{ fontSize: 40 }}>🔒</Text>
          <Text style={styles.sub}>Esta pantalla es solo para administradores.</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      <Header titulo="Denuncias" subtitulo={`${items.length} anuncios denunciados`} accion={volver} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={C.primary}
            onRefresh={async () => { setRefreshing(true); await cargar(); setRefreshing(false) }} />
        }
      >
        {loading ? (
          <Text style={styles.sub}>Cargando...</Text>
        ) : items.length === 0 ? (
          <View style={styles.centrado}>
            <Text style={{ fontSize: 40 }}>✅</Text>
            <Text style={styles.sub}>No hay denuncias abiertas.</Text>
          </View>
        ) : items.map((d) => {
          const key = `${d.kind}-${d.listing_id}`
          const open = abierta === key
          return (
            <View key={key} style={styles.card}>
              <TouchableOpacity style={styles.resumen} activeOpacity={0.8}
                onPress={() => { setAbierta(open ? null : key); setMotivo('') }}>
                {d.image
                  ? <Image source={{ uri: d.image }} style={styles.img} resizeMode="cover" />
                  : <View style={[styles.img, styles.imgVacia]}><Text style={{ fontSize: 22 }}>📦</Text></View>}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.nombre} numberOfLines={2}>{d.name ?? 'Anuncio eliminado'}</Text>
                  <Text style={styles.sub2}>
                    {d.kind === 'productor' ? '🌾' : '🏢'} {d.seller_name ?? 'Vendedor desconocido'}
                  </Text>
                  <Text style={styles.sub2}>
                    {d.listing_status === 'rejected' ? 'Ya retirado' : 'Visible ahora'}
                  </Text>
                </View>
                <View style={styles.contador}>
                  <Text style={styles.contadorTexto}>{d.num_reports}</Text>
                </View>
              </TouchableOpacity>

              {open && (
                <View style={styles.detalle}>
                  <Text style={styles.seccion}>Motivos denunciados</Text>
                  <View style={styles.chips}>
                    {(d.reasons ?? []).map((r) => (
                      <View key={r} style={styles.chipFijo}>
                        <Text style={styles.chipTexto}>{r}</Text>
                      </View>
                    ))}
                  </View>

                  {(d.details ?? []).length > 0 && (
                    <>
                      <Text style={styles.seccion}>Comentarios</Text>
                      {(d.details ?? []).map((t, i) => (
                        <Text key={i} style={styles.comentario}>“{t}”</Text>
                      ))}
                    </>
                  )}

                  <TouchableOpacity style={styles.btnVer}
                    onPress={() => router.push('/admin-anuncios' as any)}>
                    <Text style={styles.btnVerTexto}>Ver el anuncio en "Todos los anuncios"</Text>
                  </TouchableOpacity>

                  <Text style={styles.seccion}>Motivo (solo si lo retiras)</Text>
                  <View style={styles.chips}>
                    {MOTIVOS_RETIRAR.map((m) => (
                      <TouchableOpacity key={m} style={styles.chip} onPress={() => setMotivo(m)}>
                        <Text style={styles.chipTexto}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput style={styles.input} value={motivo} onChangeText={setMotivo}
                    placeholder="El vendedor verá este mensaje" placeholderTextColor={C.textLight}
                    multiline />

                  <View style={styles.botones}>
                    <TouchableOpacity style={[styles.btn, styles.btnDescartar, procesando && { opacity: 0.6 }]}
                      disabled={procesando} onPress={() => resolver(d, 'dismiss')}>
                      <Text style={styles.btnDescartarTexto}>Descartar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.btnRetirar, procesando && { opacity: 0.6 }]}
                      disabled={procesando} onPress={() => confirmarRetirar(d)}>
                      <Text style={styles.btnRetirarTexto}>Retirar anuncio</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  container: { padding: 16, paddingBottom: 40, gap: 12 },
  centrado: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  sub: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  sub2: { fontSize: 12, color: C.textSub },
  card: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  resumen: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  img: { width: 60, height: 60, borderRadius: 10 },
  imgVacia: { backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: 14, fontWeight: '700', color: C.text },
  contador: {
    minWidth: 32, height: 32, borderRadius: 16, backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  contadorTexto: { fontSize: 14, fontWeight: '800', color: '#991B1B' },
  detalle: { padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: C.border },
  seccion: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  chipFijo: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FEF9C3' },
  chipTexto: { fontSize: 12, color: C.text },
  comentario: { fontSize: 13, color: C.textSub, lineHeight: 18, fontStyle: 'italic' },
  btnVer: { paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 10 },
  btnVerTexto: { fontSize: 13, color: C.primary, fontWeight: '700' },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.text, minHeight: 52,
  },
  botones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnDescartar: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  btnDescartarTexto: { color: C.text, fontWeight: '700', fontSize: 15 },
  btnRetirar: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  btnRetirarTexto: { color: '#991B1B', fontWeight: '700', fontSize: 15 },
})