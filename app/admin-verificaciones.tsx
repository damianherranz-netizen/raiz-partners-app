import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, RefreshControl
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { validarNif } from '../lib/nif'
import { C } from '../lib/colors'
import Header from '../components/ui/Header'

type Pendiente = {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: string
  tax_id: string
  registry_number: string | null
  registry_extra: string | null
  documents: { type: string; path: string }[] | null
  submitted_at: string
  tax_id_otra_cuenta: boolean
  rechazos_previos: number
}

type Aprobado = {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: string
  tax_id: string
  registry_number: string | null
  reviewed_at: string | null
  review_notes: string | null
}

const DOC_LABEL: Record<string, string> = {
  id: 'DNI o NIE',
  rega: 'REGA / explotación',
  sanitary: 'Registro sanitario',
  cif: 'CIF',
  activity: 'Alta de actividad',
  sector: 'Registro sectorial',
  transport_card: 'Autorización de transporte',
  insurance: 'Seguro',
  atp: 'Certificado ATP',
  animals: 'Transporte de animales',
  colegiado: 'Colegiación',
  cert: 'Certificaciones',
}

const MOTIVOS_RECHAZO = [
  'Documento ilegible o cortado',
  'El nombre no coincide con el NIF',
  'REGA o registro no válido',
  'Falta un documento obligatorio',
]

const MOTIVOS_REVOCAR = [
  'Cuenta de prueba',
  'Datos no verificables',
  'Incumplimiento de las condiciones',
  'A petición del vendedor',
]

export default function AdminVerificaciones() {
  const router = useRouter()
  const [tab, setTab] = useState<'pendientes' | 'verificados'>('pendientes')
  const [items, setItems] = useState<Pendiente[]>([])
  const [aprobados, setAprobados] = useState<Aprobado[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sinPermiso, setSinPermiso] = useState(false)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [urls, setUrls] = useState<Record<string, { type: string; url: string | null }[]>>({})
  const [motivo, setMotivo] = useState('')
  const [decidiendo, setDecidiendo] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const r1 = await supabase.rpc('admin_pending_verifications')
    if (r1.error) {
      if (r1.error.message.includes('Sin permiso')) setSinPermiso(true)
      else Alert.alert('No se pudo cargar', r1.error.message)
      setLoading(false)
      return
    }
    setItems((r1.data ?? []) as Pendiente[])

    const r2 = await supabase.rpc('admin_approved_verifications')
    if (r2.error) Alert.alert('No se pudieron cargar los verificados', r2.error.message)
    else setAprobados((r2.data ?? []) as Aprobado[])
    setLoading(false)
  }

  function cambiarTab(t: 'pendientes' | 'verificados') {
    setTab(t)
    setAbierta(null)
    setMotivo('')
  }

  async function abrirPendiente(it: Pendiente) {
    if (abierta === it.id) { setAbierta(null); return }
    setAbierta(it.id)
    setMotivo('')
    if (urls[it.id]) return
    const docs = it.documents ?? []
    const paths = docs.map(d => d.path)
    if (paths.length === 0) { setUrls(prev => ({ ...prev, [it.id]: [] })); return }
    const { data, error } = await supabase.storage
      .from('verification-docs')
      .createSignedUrls(paths, 600)
    if (error) { Alert.alert('No se pudieron abrir los documentos', error.message); return }
    const lista = docs.map((d, i) => ({ type: d.type, url: data?.[i]?.signedUrl ?? null }))
    setUrls(prev => ({ ...prev, [it.id]: lista }))
  }

  function abrirAprobado(a: Aprobado) {
    if (abierta === a.id) { setAbierta(null); return }
    setAbierta(a.id)
    setMotivo('')
  }

  async function decidir(it: Pendiente, aprobar: boolean) {
    if (!aprobar && motivo.trim().length < 3) {
      Alert.alert('Falta el motivo', 'Escribe o elige el motivo del rechazo. Lo verá el usuario.')
      return
    }
    setDecidiendo(true)
    const { error } = await supabase.rpc('admin_decide_verification', {
      vid: it.id,
      approve: aprobar,
      notes: aprobar ? null : motivo.trim(),
    })
    setDecidiendo(false)
    if (error) { Alert.alert('No se pudo guardar', error.message); return }
    await cargar()
    setAbierta(null)
    setMotivo('')
  }

  function confirmarAprobar(it: Pendiente) {
    Alert.alert(
      'Aprobar vendedor',
      `Vas a verificar a ${it.full_name ?? it.email}. Mostrará la insignia de vendedor verificado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aprobar', onPress: () => decidir(it, true) },
      ]
    )
  }

  function confirmarRevocar(a: Aprobado) {
    if (motivo.trim().length < 3) {
      Alert.alert('Falta el motivo', 'Escribe o elige el motivo. El vendedor lo verá.')
      return
    }
    Alert.alert(
      'Revocar verificación',
      `${a.full_name ?? a.email} perderá la insignia y no podrá publicar ni editar anuncios. Sus anuncios actuales no se retiran.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Revocar', style: 'destructive', onPress: () => revocar(a) },
      ]
    )
  }

  async function revocar(a: Aprobado) {
    setDecidiendo(true)
    const { error } = await supabase.rpc('admin_revoke_verification', {
      vid: a.id,
      notes: motivo.trim(),
    })
    setDecidiendo(false)
    if (error) { Alert.alert('No se pudo revocar', error.message); return }
    await cargar()
    setAbierta(null)
    setMotivo('')
  }

  const volver = { label: '← Volver', onPress: () => router.back() }

  if (sinPermiso) {
    return (
      <View style={styles.flex}>
        <Header titulo="Verificaciones" accion={volver} />
        <View style={styles.centrado}>
          <Text style={{ fontSize: 40 }}>🔒</Text>
          <Text style={styles.sub}>Esta pantalla es solo para administradores.</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      <Header
        titulo="Verificaciones"
        subtitulo={`${items.length} pendientes · ${aprobados.length} verificados`}
        accion={volver}
      />

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'pendientes' && styles.tabOn]}
          onPress={() => cambiarTab('pendientes')}>
          <Text style={[styles.tabTexto, tab === 'pendientes' && styles.tabTextoOn]}>
            Pendientes ({items.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'verificados' && styles.tabOn]}
          onPress={() => cambiarTab('verificados')}>
          <Text style={[styles.tabTexto, tab === 'verificados' && styles.tabTextoOn]}>
            Verificados ({aprobados.length})
          </Text>
        </TouchableOpacity>
      </View>

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
        ) : tab === 'pendientes' ? (
          items.length === 0 ? (
            <View style={styles.centrado}>
              <Text style={{ fontSize: 40 }}>✅</Text>
              <Text style={styles.sub}>No hay verificaciones pendientes.</Text>
            </View>
          ) : items.map((it) => {
            const nifOk = validarNif(it.tax_id)
            const abiertaEsta = abierta === it.id
            return (
              <View key={it.id} style={styles.card}>
                <TouchableOpacity onPress={() => abrirPendiente(it)} activeOpacity={0.8} style={styles.resumen}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.nombre}>{it.full_name ?? it.email}</Text>
                    <Text style={styles.sub2}>{it.email}</Text>
                    <Text style={styles.sub2}>
                      {it.role} · {new Date(it.submitted_at).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                  <Text style={styles.flecha}>{abiertaEsta ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {abiertaEsta && (
                  <View style={styles.detalle}>
                    <View style={styles.fila}>
                      <Text style={styles.etiqueta}>NIF / CIF</Text>
                      <Text style={styles.valor}>{it.tax_id}</Text>
                    </View>
                    <View style={[styles.aviso, nifOk ? styles.avisoOk : styles.avisoMal]}>
                      <Text style={styles.avisoTexto}>
                        {nifOk ? '✓ El formato y la letra de control son correctos'
                               : '✗ El formato o la letra de control no son válidos'}
                      </Text>
                    </View>
                    {it.tax_id_otra_cuenta && (
                      <View style={[styles.aviso, styles.avisoMal]}>
                        <Text style={styles.avisoTexto}>⚠️ Este NIF ya figura en otra cuenta</Text>
                      </View>
                    )}
                    {it.rechazos_previos > 0 && (
                      <View style={[styles.aviso, styles.avisoAmarillo]}>
                        <Text style={styles.avisoTexto}>
                          Ya fue rechazada {it.rechazos_previos} {it.rechazos_previos === 1 ? 'vez' : 'veces'}
                        </Text>
                      </View>
                    )}
                    {it.registry_number ? (
                      <View style={styles.fila}>
                        <Text style={styles.etiqueta}>Registro</Text>
                        <Text style={styles.valor}>{it.registry_number}</Text>
                      </View>
                    ) : null}
                    {it.registry_extra ? (
                      <View style={styles.fila}>
                        <Text style={styles.etiqueta}>Dato adicional</Text>
                        <Text style={styles.valor}>{it.registry_extra}</Text>
                      </View>
                    ) : null}

                    <Text style={styles.seccion}>Documentos</Text>
                    {!urls[it.id] ? (
                      <Text style={styles.sub2}>Cargando documentos...</Text>
                    ) : urls[it.id].length === 0 ? (
                      <Text style={styles.sub2}>Esta solicitud no tiene documentos.</Text>
                    ) : urls[it.id].map((d, i) => (
                      <View key={i} style={{ gap: 6 }}>
                        <Text style={styles.etiqueta}>{DOC_LABEL[d.type] ?? d.type}</Text>
                        {d.url
                          ? <Image source={{ uri: d.url }} style={styles.doc} resizeMode="contain" />
                          : <Text style={styles.sub2}>No se pudo abrir este documento</Text>}
                      </View>
                    ))}
                    <Text style={styles.nota}>
                      Compara el nombre y el número del documento con el NIF y el registro escritos. Los enlaces caducan a los 10 minutos.
                    </Text>

                    <Text style={styles.seccion}>Motivo (solo si rechazas)</Text>
                    <View style={styles.chips}>
                      {MOTIVOS_RECHAZO.map((m) => (
                        <TouchableOpacity key={m} style={styles.chip} onPress={() => setMotivo(m)}>
                          <Text style={styles.chipTexto}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput style={styles.input} value={motivo} onChangeText={setMotivo}
                      placeholder="El usuario verá este mensaje" placeholderTextColor={C.textLight}
                      multiline />

                    <View style={styles.botones}>
                      <TouchableOpacity style={[styles.btn, styles.btnRechazar, decidiendo && { opacity: 0.6 }]}
                        disabled={decidiendo} onPress={() => decidir(it, false)}>
                        <Text style={styles.btnRechazarTexto}>Rechazar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btn, styles.btnAprobar, decidiendo && { opacity: 0.6 }]}
                        disabled={decidiendo} onPress={() => confirmarAprobar(it)}>
                        <Text style={styles.btnAprobarTexto}>Aprobar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )
          })
        ) : (
          aprobados.length === 0 ? (
            <View style={styles.centrado}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text style={styles.sub}>No hay vendedores verificados además de tu cuenta.</Text>
            </View>
          ) : aprobados.map((a) => {
            const abiertaEsta = abierta === a.id
            const esPrueba = a.tax_id === 'PRUEBA'
            return (
              <View key={a.id} style={styles.card}>
                <TouchableOpacity onPress={() => abrirAprobado(a)} activeOpacity={0.8} style={styles.resumen}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.nombre}>{a.full_name ?? a.email}</Text>
                    <Text style={styles.sub2}>{a.email}</Text>
                    <Text style={styles.sub2}>
                      {a.role} · verificado {a.reviewed_at ? new Date(a.reviewed_at).toLocaleDateString('es-ES') : ''}
                    </Text>
                    {esPrueba && (
                      <View style={[styles.aviso, styles.avisoAmarillo, { alignSelf: 'flex-start', paddingVertical: 4 }]}>
                        <Text style={styles.avisoTexto}>Cuenta de prueba</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.flecha}>{abiertaEsta ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {abiertaEsta && (
                  <View style={styles.detalle}>
                    <View style={styles.fila}>
                      <Text style={styles.etiqueta}>NIF / CIF</Text>
                      <Text style={styles.valor}>{a.tax_id}</Text>
                    </View>
                    {a.registry_number ? (
                      <View style={styles.fila}>
                        <Text style={styles.etiqueta}>Registro</Text>
                        <Text style={styles.valor}>{a.registry_number}</Text>
                      </View>
                    ) : null}

                    <Text style={styles.seccion}>Motivo de la revocación</Text>
                    <View style={styles.chips}>
                      {MOTIVOS_REVOCAR.map((m) => (
                        <TouchableOpacity key={m} style={styles.chip} onPress={() => setMotivo(m)}>
                          <Text style={styles.chipTexto}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput style={styles.input} value={motivo} onChangeText={setMotivo}
                      placeholder="El vendedor verá este mensaje" placeholderTextColor={C.textLight}
                      multiline />
                    <Text style={styles.nota}>
                      Pierde la insignia y no podrá publicar ni editar anuncios. Sus anuncios actuales siguen visibles.
                    </Text>

                    <TouchableOpacity
                      style={[styles.btn, styles.btnRechazar, decidiendo && { opacity: 0.6 }]}
                      disabled={decidiendo} onPress={() => confirmarRevocar(a)}>
                      <Text style={styles.btnRechazarTexto}>Revocar verificación</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })
        )}
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
  tabs: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: C.border, backgroundColor: C.white,
  },
  tabOn: { backgroundColor: C.primary, borderColor: C.primary },
  tabTexto: { fontSize: 13, fontWeight: '600', color: C.textSub },
  tabTextoOn: { color: C.white, fontWeight: '700' },
  card: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  resumen: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  nombre: { fontSize: 15, fontWeight: '700', color: C.text },
  flecha: { fontSize: 14, color: C.textLight },
  detalle: { padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: C.border },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  etiqueta: { fontSize: 13, color: C.textSub, fontWeight: '600' },
  valor: { fontSize: 14, fontWeight: '700', color: C.text, flexShrink: 1, textAlign: 'right' },
  aviso: { borderRadius: 10, padding: 10 },
  avisoOk: { backgroundColor: '#DCFCE7' },
  avisoMal: { backgroundColor: '#FEE2E2' },
  avisoAmarillo: { backgroundColor: '#FEF9C3' },
  avisoTexto: { fontSize: 13, fontWeight: '600', color: C.text },
  seccion: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 4 },
  doc: { width: '100%', height: 260, backgroundColor: '#F3F4F6', borderRadius: 10 },
  nota: { fontSize: 12, color: C.textSub, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  chipTexto: { fontSize: 12, color: C.text },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, minHeight: 56,
  },
  botones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnRechazar: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  btnRechazarTexto: { color: '#991B1B', fontWeight: '700', fontSize: 15 },
  btnAprobar: { backgroundColor: C.primary },
  btnAprobarTexto: { color: C.white, fontWeight: '700', fontSize: 15 },
})