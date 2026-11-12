import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, RefreshControl
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { C } from '../lib/colors'
import Header from '../components/ui/Header'

type Informe = {
  id: string
  kind: 'user' | 'message'
  reason: string
  details: string | null
  message_text: string | null
  context: { from: string; text: string; at: string }[] | null
  created_at: string
}

type Denunciado = {
  reported_id: string
  reported_name: string | null
  reported_email: string
  reported_role: string
  already_blocked: boolean
  num_reports: number
  reports: Informe[]
  last_at: string
}

type Bloqueo = {
  id: string
  user_id: string
  email: string
  full_name: string | null
  role: string
  reason: string
  created_at: string
}

type Encontrado = {
  user_id: string
  email: string
  full_name: string | null
  role: string
  blocked: boolean
}

const MOTIVOS_BLOQUEO = [
  'Acoso o trato abusivo',
  'Intento de fraude o estafa',
  'Cerrar tratos fuera de RAÍZ',
  'Incumplimiento de las condiciones',
]

export default function AdminUsuarios() {
  const router = useRouter()
  const [tab, setTab] = useState<'denuncias' | 'bloqueados'>('denuncias')
  const [denuncias, setDenuncias] = useState<Denunciado[]>([])
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sinPermiso, setSinPermiso] = useState(false)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [email, setEmail] = useState('')
  const [encontrado, setEncontrado] = useState<Encontrado | null>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const r1 = await supabase.rpc('admin_open_user_reports')
    if (r1.error) {
      if (r1.error.message.includes('Sin permiso')) setSinPermiso(true)
      else Alert.alert('No se pudieron cargar las denuncias', r1.error.message)
      setLoading(false)
      return
    }
    setDenuncias((r1.data ?? []) as Denunciado[])
    const r2 = await supabase.rpc('admin_active_blocks')
    if (r2.error) Alert.alert('No se pudieron cargar los bloqueos', r2.error.message)
    else setBloqueos((r2.data ?? []) as Bloqueo[])
    setLoading(false)
  }

  async function ejecutar(fn: string, args: any): Promise<boolean> {
    setProcesando(true)
    const { error } = await supabase.rpc(fn, args)
    setProcesando(false)
    if (error) { Alert.alert('No se pudo guardar', error.message); return false }
    setMotivo('')
    setAbierta(null)
    setEncontrado(null)
    await cargar()
    return true
  }

  function bloquear(userId: string, nombre: string) {
    if (motivo.trim().length < 3) {
      Alert.alert('Falta el motivo', 'Escribe o elige el motivo. El usuario lo verá.')
      return
    }
    Alert.alert(
      'Bloquear usuario',
      `${nombre} perderá el acceso a la app y sus anuncios se retirarán. Solo podrá contactar contigo por email.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear', style: 'destructive',
          onPress: () => ejecutar('admin_block_user', { p_user: userId, p_reason: motivo.trim() }),
        },
      ]
    )
  }

  function descartar(d: Denunciado) {
    ejecutar('admin_dismiss_user_reports', { p_user: d.reported_id, p_notes: motivo.trim() || null })
  }

  function levantar(b: Bloqueo) {
    if (motivo.trim().length < 3) {
      Alert.alert('Falta el motivo', 'Anota por qué levantas el bloqueo.')
      return
    }
    Alert.alert(
      'Levantar bloqueo',
      'Podrá volver a usar la app y sus anuncios retirados por la suspensión se restaurarán.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Levantar', onPress: () => ejecutar('admin_unblock_user', { p_user: b.user_id, p_notes: motivo.trim() }) },
      ]
    )
  }

  async function buscar() {
    const e = email.trim()
    if (e.length < 5) return
    const { data, error } = await supabase.rpc('admin_find_user', { p_email: e })
    if (error) { Alert.alert('No se pudo buscar', error.message); return }
    if (!data || data.length === 0) {
      Alert.alert('No encontrado', 'No hay ningún usuario con ese email.')
      return
    }
    setEncontrado(data[0] as Encontrado)
    setMotivo('')
  }

  function cambiarTab(t: 'denuncias' | 'bloqueados') {
    setTab(t)
    setAbierta(null)
    setMotivo('')
  }

  const volver = { label: '← Volver', onPress: () => router.back() }

  if (sinPermiso) {
    return (
      <View style={styles.flex}>
        <Header titulo="Usuarios" accion={volver} />
        <View style={styles.centrado}>
          <Text style={{ fontSize: 40 }}>🔒</Text>
          <Text style={styles.sub}>Esta pantalla es solo para administradores.</Text>
        </View>
      </View>
    )
  }

  const chipsMotivo = (
    <View style={styles.chips}>
      {MOTIVOS_BLOQUEO.map((m) => (
        <TouchableOpacity key={m} style={styles.chip} onPress={() => setMotivo(m)}>
          <Text style={styles.chipTexto}>{m}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  return (
    <View style={styles.flex}>
      <Header
        titulo="Usuarios y bloqueos"
        subtitulo={`${denuncias.length} denunciados · ${bloqueos.length} bloqueados`}
        accion={volver}
      />
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'denuncias' && styles.tabOn]}
          onPress={() => cambiarTab('denuncias')}>
          <Text style={[styles.tabTexto, tab === 'denuncias' && styles.tabTextoOn]}>
            Denuncias ({denuncias.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'bloqueados' && styles.tabOn]}
          onPress={() => cambiarTab('bloqueados')}>
          <Text style={[styles.tabTexto, tab === 'bloqueados' && styles.tabTextoOn]}>
            Bloqueos ({bloqueos.length})
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
        ) : tab === 'denuncias' ? (
          denuncias.length === 0 ? (
            <View style={styles.centrado}>
              <Text style={{ fontSize: 40 }}>✅</Text>
              <Text style={styles.sub}>No hay denuncias de usuarios ni de mensajes.</Text>
            </View>
          ) : denuncias.map((d) => {
            const open = abierta === d.reported_id
            const nombre = d.reported_name ?? d.reported_email
            return (
              <View key={d.reported_id} style={styles.card}>
                <TouchableOpacity style={styles.resumen} activeOpacity={0.8}
                  onPress={() => { setAbierta(open ? null : d.reported_id); setMotivo('') }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.nombre}>{nombre}</Text>
                    <Text style={styles.sub2}>{d.reported_email}</Text>
                    <Text style={styles.sub2}>
                      {d.reported_role}{d.already_blocked ? ' · ya bloqueado' : ''}
                    </Text>
                  </View>
                  <View style={styles.contador}>
                    <Text style={styles.contadorTexto}>{d.num_reports}</Text>
                  </View>
                </TouchableOpacity>

                {open && (
                  <View style={styles.detalle}>
                    {(d.reports ?? []).map((r) => (
                      <View key={r.id} style={styles.informe}>
                        <Text style={styles.informeTipo}>
                          {r.kind === 'message' ? '💬 Mensaje denunciado' : '👤 Usuario denunciado'}
                          {' · '}{new Date(r.created_at).toLocaleDateString('es-ES')}
                        </Text>
                        <Text style={styles.informeMotivo}>{r.reason}</Text>
                        {r.details ? <Text style={styles.comentario}>“{r.details}”</Text> : null}
                        {r.message_text ? (
                          <View style={styles.mensajeBox}>
                            <Text style={styles.mensajeLabel}>Mensaje</Text>
                            <Text style={styles.mensajeTexto}>{r.message_text}</Text>
                          </View>
                        ) : null}
                        {(r.context ?? []).length > 1 ? (
                          <View style={styles.contextoBox}>
                            <Text style={styles.mensajeLabel}>Contexto (hasta 5 mensajes anteriores)</Text>
                            {(r.context ?? []).map((c, i) => (
                              <Text key={i} style={styles.contextoLinea}>
                                {c.from === 'denunciado' ? 'Denunciado' : 'Denunciante'}: {c.text}
                              </Text>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    ))}

                    <Text style={styles.seccion}>Motivo (solo si bloqueas)</Text>
                    {chipsMotivo}
                    <TextInput style={styles.input} value={motivo} onChangeText={setMotivo}
                      placeholder="El usuario verá este mensaje" placeholderTextColor={C.textLight}
                      multiline />

                    <View style={styles.botones}>
                      <TouchableOpacity style={[styles.btn, styles.btnDescartar, procesando && { opacity: 0.6 }]}
                        disabled={procesando} onPress={() => descartar(d)}>
                        <Text style={styles.btnDescartarTexto}>Descartar</Text>
                      </TouchableOpacity>
                      {!d.already_blocked && (
                        <TouchableOpacity style={[styles.btn, styles.btnBloquear, procesando && { opacity: 0.6 }]}
                          disabled={procesando} onPress={() => bloquear(d.reported_id, nombre)}>
                          <Text style={styles.btnBloquearTexto}>Bloquear usuario</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )
          })
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.detalleSinBorde}>
                <Text style={styles.seccion}>Bloquear a un usuario por su email</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail}
                  placeholder="email@ejemplo.com" placeholderTextColor={C.textLight}
                  autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
                <TouchableOpacity style={[styles.btn, styles.btnDescartar]} onPress={buscar}>
                  <Text style={styles.btnDescartarTexto}>Buscar</Text>
                </TouchableOpacity>

                {encontrado && (
                  <View style={styles.encontrado}>
                    <Text style={styles.nombre}>{encontrado.full_name ?? encontrado.email}</Text>
                    <Text style={styles.sub2}>{encontrado.email} · {encontrado.role}</Text>
                    {encontrado.blocked ? (
                      <Text style={styles.informeMotivo}>Este usuario ya está bloqueado.</Text>
                    ) : (
                      <>
                        {chipsMotivo}
                        <TextInput style={styles.input} value={motivo} onChangeText={setMotivo}
                          placeholder="El usuario verá este mensaje" placeholderTextColor={C.textLight}
                          multiline />
                        <TouchableOpacity
                          style={[styles.btn, styles.btnBloquear, procesando && { opacity: 0.6 }]}
                          disabled={procesando}
                          onPress={() => bloquear(encontrado.user_id, encontrado.full_name ?? encontrado.email)}>
                          <Text style={styles.btnBloquearTexto}>Bloquear usuario</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.seccion}>Bloqueos activos ({bloqueos.length})</Text>
            {bloqueos.length === 0 ? (
              <Text style={styles.sub}>No hay usuarios bloqueados.</Text>
            ) : bloqueos.map((b) => {
              const open = abierta === b.id
              return (
                <View key={b.id} style={styles.card}>
                  <TouchableOpacity style={styles.resumen} activeOpacity={0.8}
                    onPress={() => { setAbierta(open ? null : b.id); setMotivo('') }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.nombre}>{b.full_name ?? b.email}</Text>
                      <Text style={styles.sub2}>{b.email} · {b.role}</Text>
                      <Text style={styles.sub2}>
                        {new Date(b.created_at).toLocaleDateString('es-ES')} · {b.reason}
                      </Text>
                    </View>
                    <Text style={styles.flecha}>{open ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {open && (
                    <View style={styles.detalle}>
                      <Text style={styles.seccion}>Motivo para levantarlo</Text>
                      <TextInput style={styles.input} value={motivo} onChangeText={setMotivo}
                        placeholder="Ej: resuelto por email" placeholderTextColor={C.textLight}
                        multiline />
                      <TouchableOpacity
                        style={[styles.btn, styles.btnDescartar, procesando && { opacity: 0.6 }]}
                        disabled={procesando} onPress={() => levantar(b)}>
                        <Text style={styles.btnDescartarTexto}>Levantar bloqueo</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )
            })}
          </>
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
  contador: {
    minWidth: 32, height: 32, borderRadius: 16, backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  contadorTexto: { fontSize: 14, fontWeight: '800', color: '#991B1B' },
  detalle: { padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: C.border },
  detalleSinBorde: { padding: 14, gap: 10 },
  encontrado: { gap: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.border },
  informe: { backgroundColor: C.bg, borderRadius: 10, padding: 10, gap: 4 },
  informeTipo: { fontSize: 11, color: C.textSub, fontWeight: '600' },
  informeMotivo: { fontSize: 14, fontWeight: '700', color: '#991B1B' },
  comentario: { fontSize: 13, color: C.textSub, fontStyle: 'italic', lineHeight: 18 },
  mensajeBox: { backgroundColor: '#FEF9C3', borderRadius: 8, padding: 8, gap: 2 },
  mensajeLabel: { fontSize: 11, fontWeight: '700', color: C.textSub },
  mensajeTexto: { fontSize: 13, color: C.text, lineHeight: 18 },
  contextoBox: { backgroundColor: C.white, borderRadius: 8, padding: 8, gap: 2, borderWidth: 1, borderColor: C.border },
  contextoLinea: { fontSize: 12, color: C.textSub, lineHeight: 17 },
  seccion: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  chipTexto: { fontSize: 12, color: C.text },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.text, minHeight: 52,
  },
  botones: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnDescartar: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  btnDescartarTexto: { color: C.text, fontWeight: '700', fontSize: 15 },
  btnBloquear: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  btnBloquearTexto: { color: '#991B1B', fontWeight: '700', fontSize: 15 },
})