import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, RefreshControl, Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { getVerifiedSet } from '../lib/verified'
import { C } from '../lib/colors'
import Header from '../components/ui/Header'

type Anuncio = {
  key: string
  id: string
  kind: 'productor' | 'proveedor'
  seller_id: string
  name: string
  price: number | null
  unit_type: string
  status: string
  images: string[]
  description: string | null
  tipo_producto: string | null
  created_at: string
  raw: any
}

const MOTIVOS_RETIRAR = [
  'Datos del animal incompletos',
  'Producto no permitido',
  'Información falsa o engañosa',
  'Contiene datos de contacto',
]

const ESTADO: Record<string, string> = {
  active: 'Activo',
  pending_review: 'En revisión',
  rejected: 'Rechazado',
}

const TRANSPORTE: Record<string, string> = {
  estandar: 'Mensajería estándar',
  especializado: 'Transporte agrícola especializado',
  recogida: 'Recogida en explotación',
  negociable: 'A negociar',
}

function Dato({ label, valor }: { label: string; valor: any }) {
  if (valor === null || valor === undefined || valor === '') return null
  return (
    <View style={styles.fila}>
      <Text style={styles.etiqueta}>{label}</Text>
      <Text style={styles.valor}>{String(valor)}</Text>
    </View>
  )
}

export default function AdminAnuncios() {
  const router = useRouter()
  const [items, setItems] = useState<Anuncio[]>([])
  const [nombres, setNombres] = useState<Record<string, string>>({})
  const [verificados, setVerificados] = useState<Set<string>>(new Set())
  const [filtro, setFiltro] = useState<'todos' | 'productor' | 'proveedor'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sinPermiso, setSinPermiso] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const adm = await supabase.rpc('is_admin')
    if (adm.error || adm.data !== true) {
      setSinPermiso(true)
      setLoading(false)
      return
    }

    const r1 = await supabase.from('products').select('*')
      .order('created_at', { ascending: false }).limit(100)
    const r2 = await supabase.from('provider_products').select('*')
      .order('created_at', { ascending: false }).limit(100)
    if (r1.error) Alert.alert('No se pudieron cargar los anuncios de productores', r1.error.message)
    if (r2.error) Alert.alert('No se pudieron cargar los anuncios de proveedores', r2.error.message)

    const a: Anuncio[] = (r1.data ?? []).map((p: any) => ({
      key: `productor-${p.id}`, id: p.id, kind: 'productor', seller_id: p.producer_id,
      name: p.name, price: p.price_per_kg ?? null, unit_type: p.unit_type ?? '',
      status: p.status ?? '', images: p.images ?? [], description: p.description ?? null,
      tipo_producto: p.tipo_producto ?? null, created_at: p.created_at, raw: p,
    }))
    const b: Anuncio[] = (r2.data ?? []).map((p: any) => ({
      key: `proveedor-${p.id}`, id: p.id, kind: 'proveedor', seller_id: p.provider_id,
      name: p.name, price: p.price ?? null, unit_type: p.unit_type ?? '',
      status: p.status ?? '', images: p.images ?? [], description: p.description ?? null,
      tipo_producto: null, created_at: p.created_at, raw: p,
    }))
    const todos = [...a, ...b].sort((x, y) => (y.created_at ?? '').localeCompare(x.created_at ?? ''))
    setItems(todos)

    const ids = Array.from(new Set(todos.map(t => t.seller_id).filter(Boolean)))
    if (ids.length > 0) {
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids)
      const mapa: Record<string, string> = {}
      ;(data ?? []).forEach((p: any) => { mapa[p.id] = p.full_name ?? 'Sin nombre' })
      setNombres(mapa)
      setVerificados(await getVerifiedSet(ids))
    }
    setLoading(false)
  }

  async function moderar(a: Anuncio, retirar: boolean) {
    if (retirar && motivo.trim().length < 3) {
      Alert.alert('Falta el motivo', 'Escribe o elige el motivo de la retirada.')
      return
    }
    setProcesando(true)
    const { error } = await supabase.rpc('admin_moderate_listing', {
      p_kind: a.kind,
      p_id: a.id,
      p_reject: retirar,
      p_notes: retirar ? motivo.trim() : null,
    })
    setProcesando(false)
    if (error) { Alert.alert('No se pudo guardar', error.message); return }
    setMotivo('')
    await cargar()
  }

  function confirmarRetirar(a: Anuncio) {
    Alert.alert(
      'Retirar anuncio',
      'Dejará de verse en la tienda y en el perfil del vendedor. El vendedor no podrá reactivarlo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Retirar', style: 'destructive', onPress: () => moderar(a, true) },
      ]
    )
  }

  const lista = useMemo(() => items.filter(i =>
    (filtro === 'todos' || i.kind === filtro) &&
    (busqueda.trim().length < 2 || i.name.toLowerCase().includes(busqueda.trim().toLowerCase()))
  ), [items, filtro, busqueda])

  const volver = { label: '← Volver', onPress: () => router.back() }

  if (sinPermiso) {
    return (
      <View style={styles.flex}>
        <Header titulo="Anuncios" accion={volver} />
        <View style={styles.centrado}>
          <Text style={{ fontSize: 40 }}>🔒</Text>
          <Text style={styles.sub}>Esta pantalla es solo para administradores.</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      <Header titulo="Todos los anuncios" subtitulo={`${lista.length} de ${items.length}`} accion={volver} />

      <View style={styles.barra}>
        <TextInput style={styles.buscador} value={busqueda} onChangeText={setBusqueda}
          placeholder="Buscar por nombre del anuncio" placeholderTextColor={C.textLight}
          autoCorrect={false} />
        <View style={styles.chips}>
          {([
            ['todos', 'Todos'],
            ['productor', '🌾 Productores'],
            ['proveedor', '🏢 Proveedores'],
          ] as const).map(([v, l]) => (
            <TouchableOpacity key={v} style={[styles.chip, filtro === v && styles.chipOn]}
              onPress={() => setFiltro(v)}>
              <Text style={[styles.chipTexto, filtro === v && styles.chipTextoOn]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={C.primary}
            onRefresh={async () => { setRefreshing(true); await cargar(); setRefreshing(false) }} />
        }
      >
        {loading ? (
          <Text style={styles.sub}>Cargando...</Text>
        ) : lista.length === 0 ? (
          <Text style={styles.sub}>No hay anuncios con ese filtro.</Text>
        ) : lista.map((a) => {
          const open = abierto === a.key
          const esAnimal = a.tipo_producto === 'animal_vivo' || a.tipo_producto === 'carne'
          const verif = verificados.has(a.seller_id)
          return (
            <View key={a.key} style={styles.card}>
              <TouchableOpacity style={styles.resumen} activeOpacity={0.8}
                onPress={() => { setAbierto(open ? null : a.key); setMotivo('') }}>
                {a.images[0]
                  ? <Image source={{ uri: a.images[0] }} style={styles.img} resizeMode="cover" />
                  : <View style={[styles.img, styles.imgVacia]}><Text style={{ fontSize: 22 }}>📦</Text></View>}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.nombre} numberOfLines={2}>{a.name}</Text>
                  <Text style={styles.precio}>
                    {a.price !== null ? `${a.price} € / ${a.unit_type}` : 'Sin precio'}
                  </Text>
                  <Text style={styles.sub2} numberOfLines={1}>
                    {a.kind === 'productor' ? '🌾' : '🏢'} {nombres[a.seller_id] ?? '...'}
                    {verif ? '  ✓ verificado' : '  · sin verificar'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[styles.estado, a.status === 'active' ? styles.estadoOk
                    : a.status === 'rejected' ? styles.estadoMal : styles.estadoPend]}>
                    <Text style={styles.estadoTexto}>{ESTADO[a.status] ?? (a.status || '—')}</Text>
                  </View>
                  <Text style={styles.flecha}>{open ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {open && (
                <View style={styles.detalle}>
                  {a.images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {a.images.map((u, i) => (
                          <Image key={i} source={{ uri: u }} style={styles.foto} resizeMode="cover" />
                        ))}
                      </View>
                    </ScrollView>
                  )}
                  <Dato label="Publicado" valor={a.created_at ? new Date(a.created_at).toLocaleString('es-ES') : null} />
                  <Dato label="Descripción" valor={a.description} />
                  <Dato label="Tipo de producto" valor={a.tipo_producto} />

                  {esAnimal && (
                    <>
                      <Text style={styles.seccion}>Datos del animal</Text>
                      <Dato label="Crotal" valor={a.raw.animal_crotal} />
                      <Dato label="Raza" valor={a.raw.animal_raza} />
                      <Dato label="Peso" valor={a.raw.animal_peso_kg ? `${a.raw.animal_peso_kg} kg` : null} />
                      <Dato label="Edad" valor={a.raw.animal_edad_meses ? `${a.raw.animal_edad_meses} meses` : null} />
                      <Dato label="REGA origen" valor={a.raw.animal_rega} />
                      <Dato label="Última vacunación" valor={a.raw.animal_ultima_vacunacion} />
                      <Dato label="Notas sanitarias" valor={a.raw.animal_notas_sanitarias} />
                    </>
                  )}

                  <Text style={styles.seccion}>Transporte</Text>
                  <Dato label="Tipo" valor={TRANSPORTE[a.raw.transporte_tipo ?? 'estandar'] ?? a.raw.transporte_tipo} />
                  <Dato label="Incluido" valor={a.raw.transporte_incluido ? 'Sí' : 'No'} />
                  <Dato label="Notas" valor={a.raw.transporte_notas} />

                  {a.raw.review_notes ? (
                    <View style={styles.aviso}>
                      <Text style={styles.avisoTexto}>Nota: {a.raw.review_notes}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.seccion}>Moderación</Text>
                  {a.status === 'rejected' ? (
                    <TouchableOpacity style={[styles.btn, procesando && { opacity: 0.6 }]}
                      disabled={procesando} onPress={() => moderar(a, false)}>
                      <Text style={styles.btnTexto}>Restaurar anuncio (pasa a activo)</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <View style={styles.chips}>
                        {MOTIVOS_RETIRAR.map((m) => (
                          <TouchableOpacity key={m} style={styles.chip} onPress={() => setMotivo(m)}>
                            <Text style={styles.chipTexto}>{m}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TextInput style={styles.input} value={motivo} onChangeText={setMotivo}
                        placeholder="Motivo de la retirada" placeholderTextColor={C.textLight} multiline />
                      <TouchableOpacity style={[styles.btnRetirar, procesando && { opacity: 0.6 }]}
                        disabled={procesando} onPress={() => confirmarRetirar(a)}>
                        <Text style={styles.btnRetirarTexto}>Retirar anuncio</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {verif && (
                    <TouchableOpacity style={styles.btn}
                      onPress={() => router.push({ pathname: '/vendedor', params: { id: a.seller_id } } as any)}>
                      <Text style={styles.btnTexto}>Ver perfil público del vendedor</Text>
                    </TouchableOpacity>
                  )}
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
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  sub: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  sub2: { fontSize: 12, color: C.textSub },
  barra: { backgroundColor: C.white, padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  buscador: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.text, minHeight: 52,
  },
  btnRetirar: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  btnRetirarTexto: { color: '#991B1B', fontWeight: '700', fontSize: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipTexto: { fontSize: 13, color: C.textSub, fontWeight: '500' },
  chipTextoOn: { color: C.white, fontWeight: '700' },
  card: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  resumen: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  img: { width: 60, height: 60, borderRadius: 10 },
  imgVacia: { backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: 14, fontWeight: '700', color: C.text },
  precio: { fontSize: 13, fontWeight: '800', color: C.primary },
  flecha: { fontSize: 12, color: C.textLight },
  estado: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  estadoOk: { backgroundColor: '#DCFCE7' },
  estadoMal: { backgroundColor: '#FEE2E2' },
  estadoPend: { backgroundColor: '#FEF9C3' },
  estadoTexto: { fontSize: 11, fontWeight: '700', color: C.text },
  detalle: { padding: 14, gap: 8, borderTopWidth: 1, borderTopColor: C.border },
  foto: { width: 160, height: 120, borderRadius: 10 },
  seccion: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 6 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  etiqueta: { fontSize: 13, color: C.textSub, fontWeight: '600', flex: 1 },
  valor: { fontSize: 13, fontWeight: '600', color: C.text, flex: 2, textAlign: 'right' },
  aviso: { backgroundColor: '#FEF9C3', borderRadius: 10, padding: 10 },
  avisoTexto: { fontSize: 12, color: C.text, lineHeight: 17 },
  btn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnTexto: { color: C.white, fontWeight: '700', fontSize: 14 },
})