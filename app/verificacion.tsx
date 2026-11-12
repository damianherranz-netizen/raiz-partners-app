import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Image
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { validarNif } from '../lib/nif'
import { C } from '../lib/colors'
import Header from '../components/ui/Header'

type Estado = 'none' | 'pending' | 'approved' | 'rejected' | 'revoked'
type DocSlot = { key: string; label: string; required: boolean }
type Cfg = {
  titulo: string
  taxLabel: string
  registryLabel: string
  registryRequired: boolean
  extraLabel?: string
  docs: DocSlot[]
}

const CONFIG: Record<string, Cfg> = {
  producer: {
    titulo: 'Productor / ganadero',
    taxLabel: 'NIF o NIE del titular',
    registryLabel: 'Código REGA de la explotación',
    registryRequired: true,
    extraLabel: 'Registro sanitario (solo si envasas o transformas)',
    docs: [
      { key: 'id', label: 'DNI o NIE (foto legible)', required: true },
      { key: 'rega', label: 'Documento de la explotación: REGA o libro de registro', required: true },
      { key: 'sanitary', label: 'Registro sanitario (si envasas o transformas)', required: false },
    ],
  },
  provider: {
    titulo: 'Empresa proveedora',
    taxLabel: 'CIF de la empresa',
    registryLabel: 'Registro sectorial (piensos, fitosanitarios, veterinaria...)',
    registryRequired: false,
    docs: [
      { key: 'cif', label: 'Tarjeta o certificado de CIF', required: true },
      { key: 'activity', label: 'Alta de actividad (modelo 036 o 037)', required: true },
      { key: 'sector', label: 'Registro sectorial según tus productos', required: false },
    ],
  },
  transporter: {
    titulo: 'Transportista',
    taxLabel: 'NIF o CIF',
    registryLabel: 'Nº de autorización de transporte',
    registryRequired: true,
    docs: [
      { key: 'transport_card', label: 'Autorización o tarjeta de transporte', required: true },
      { key: 'insurance', label: 'Seguro de mercancías y responsabilidad civil', required: true },
      { key: 'atp', label: 'Certificado ATP (si transportas perecederos)', required: false },
      { key: 'animals', label: 'Autorización de transporte de animales (si aplica)', required: false },
    ],
  },
  professional: {
    titulo: 'Profesional',
    taxLabel: 'NIF',
    registryLabel: 'Nº de colegiado',
    registryRequired: true,
    extraLabel: 'Colegio profesional',
    docs: [
      { key: 'id', label: 'DNI o NIE (foto legible)', required: true },
      { key: 'colegiado', label: 'Certificado de colegiación', required: true },
    ],
  },
  transformer: {
    titulo: 'Industria transformadora',
    taxLabel: 'CIF de la empresa',
    registryLabel: 'Nº de registro sanitario (RGSEAA)',
    registryRequired: true,
    docs: [
      { key: 'cif', label: 'Tarjeta o certificado de CIF', required: true },
      { key: 'sanitary', label: 'Registro sanitario', required: true },
      { key: 'cert', label: 'Certificaciones (opcional)', required: false },
    ],
  },
}

export default function VerificacionScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rol, setRol] = useState('producer')
  const [estado, setEstado] = useState<Estado>('none')
  const [notas, setNotas] = useState<string | null>(null)
  const [fecha, setFecha] = useState<string | null>(null)
  const [taxId, setTaxId] = useState('')
  const [registry, setRegistry] = useState('')
  const [extra, setExtra] = useState('')
  const [uris, setUris] = useState<Record<string, string>>({})
  const [acepto, setAcepto] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const cfg = CONFIG[rol] ?? CONFIG.producer

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: prof } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    setRol(prof?.role ?? 'producer')
    const { data: v } = await supabase
      .from('seller_verifications')
      .select('status, review_notes, submitted_at')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (v) {
      setEstado(v.status as Estado)
      setNotas(v.review_notes)
      setFecha(v.submitted_at)
    }
    setLoading(false)
  }

  function pick(key: string) {
    Alert.alert('Añadir documento', 'Haz la foto con buena luz y que se lea todo el texto.', [
      {
        text: '📷 Hacer foto',
        onPress: async () => {
          const permiso = await ImagePicker.requestCameraPermissionsAsync()
          if (!permiso.granted) return
          const r = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 })
          if (!r.canceled) setUris(prev => ({ ...prev, [key]: r.assets[0].uri }))
        },
      },
      {
        text: '🖼️ Galería',
        onPress: async () => {
          const r = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any, allowsEditing: false, quality: 0.8,
          })
          if (!r.canceled) setUris(prev => ({ ...prev, [key]: r.assets[0].uri }))
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  async function enviar() {
    const tax = taxId.trim().toUpperCase()
    if (!validarNif(tax)) {
      Alert.alert('Revisa el NIF/CIF', 'El NIF, NIE o CIF no es válido. Revisa los números y la letra, sin espacios ni guiones.')
      return
    }
    if (cfg.registryRequired && registry.trim().length < 3) {
      Alert.alert('Falta un dato', `Rellena: ${cfg.registryLabel}`)
      return
    }
    const falta = cfg.docs.find(d => d.required && !uris[d.key])
    if (falta) {
      Alert.alert('Falta un documento', falta.label)
      return
    }
    if (!acepto) {
      Alert.alert('Confirmación necesaria', 'Debes confirmar que los datos son ciertos.')
      return
    }

    setEnviando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { decode } = require('base64-arraybuffer')
      const FileSystem = require('expo-file-system/legacy')

      const documents: { type: string; path: string }[] = []
      for (const d of cfg.docs) {
        const uri = uris[d.key]
        if (!uri) continue
        const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase()
        const path = `${user.id}/${d.key}-${Date.now()}.${ext}`
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        const { error } = await supabase.storage
          .from('verification-docs')
          .upload(path, decode(base64), {
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            upsert: false,
          })
        if (error) throw new Error(`No se pudo subir "${d.label}": ${error.message}`)
        documents.push({ type: d.key, path })
      }

      const { error } = await supabase.from('seller_verifications').insert({
        user_id: user.id,
        role: rol,
        tax_id: tax,
        registry_number: registry.trim() || null,
        registry_extra: extra.trim() || null,
        documents,
      })
      if (error) throw new Error(error.message)

      setEstado('pending')
      setFecha(new Date().toISOString())
    } catch (e: any) {
      Alert.alert('No se pudo enviar', e.message)
    } finally {
      setEnviando(false)
    }
  }

  const volver = { label: '← Volver', onPress: () => router.back() }

  if (loading) {
    return (
      <View style={styles.flex}>
        <Header titulo="Verificación" accion={volver} />
        <View style={styles.centrado}><Text style={styles.sub}>Cargando...</Text></View>
      </View>
    )
  }

  if (estado === 'approved') {
    return (
      <View style={styles.flex}>
        <Header titulo="Verificación" accion={volver} />
        <View style={styles.centrado}>
          <Text style={{ fontSize: 56 }}>✅</Text>
          <Text style={styles.tituloGrande}>Cuenta verificada</Text>
          <Text style={styles.sub}>Ya puedes publicar productos en RAÍZ.</Text>
        </View>
      </View>
    )
  }

  if (estado === 'pending') {
    return (
      <View style={styles.flex}>
        <Header titulo="Verificación" accion={volver} />
        <View style={styles.centrado}>
          <Text style={{ fontSize: 56 }}>⏳</Text>
          <Text style={styles.tituloGrande}>En revisión</Text>
          <Text style={styles.sub}>
            Un miembro del equipo de RAÍZ revisa tus documentos
            {fecha ? ` (enviados el ${new Date(fecha).toLocaleDateString('es-ES')})` : ''}.
            Vuelve a esta pantalla para ver el resultado.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      <Header titulo="Verificar mi cuenta" subtitulo={cfg.titulo} accion={volver} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {(estado === 'rejected' || estado === 'revoked') && (
          <View style={styles.rechazo}>
            <Text style={styles.rechazoTitulo}>
              {estado === 'revoked' ? 'Verificación retirada' : 'Verificación rechazada'}
            </Text>
            <Text style={styles.rechazoTexto}>{notas ?? 'Revisa los datos y vuelve a enviarla.'}</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.infoTexto}>
            Verificamos a todos los que venden en RAÍZ para dar confianza a los compradores.
            Tus documentos son privados: solo los ve el equipo de RAÍZ y no se muestran a otros usuarios.
            La verificación confirma tu identidad y tus registros, no garantiza la calidad de cada producto.
          </Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>{cfg.taxLabel} *</Text>
          <TextInput style={styles.input} value={taxId} onChangeText={setTaxId}
            placeholder="Sin espacios ni guiones" placeholderTextColor={C.textLight}
            autoCapitalize="characters" autoCorrect={false} />
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>
            {cfg.registryLabel}{cfg.registryRequired ? ' *' : ' (opcional)'}
          </Text>
          <TextInput style={styles.input} value={registry} onChangeText={setRegistry}
            placeholderTextColor={C.textLight} autoCapitalize="characters" autoCorrect={false} />
        </View>

        {cfg.extraLabel ? (
          <View style={styles.campo}>
            <Text style={styles.label}>{cfg.extraLabel}</Text>
            <TextInput style={styles.input} value={extra} onChangeText={setExtra}
              placeholderTextColor={C.textLight} autoCorrect={false} />
          </View>
        ) : null}

        <Text style={styles.seccion}>Documentos</Text>
        {cfg.docs.map((d) => (
          <TouchableOpacity key={d.key} style={styles.docCard} onPress={() => pick(d.key)} activeOpacity={0.8}>
            {uris[d.key]
              ? <Image source={{ uri: uris[d.key] }} style={styles.docImg} />
              : <View style={[styles.docImg, styles.docVacio]}><Text style={{ fontSize: 24 }}>📄</Text></View>}
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.docLabel}>{d.label}{d.required ? ' *' : ''}</Text>
              <Text style={styles.docEstado}>
                {uris[d.key] ? '✓ Añadido. Toca para cambiarlo' : 'Toca para añadir una foto'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.acepto} onPress={() => setAcepto(!acepto)} activeOpacity={0.8}>
          <View style={[styles.check, acepto && styles.checkOn]}>
            {acepto ? <Text style={{ color: C.white, fontWeight: '700' }}>✓</Text> : null}
          </View>
          <Text style={styles.aceptoTexto}>
            Declaro que los datos y documentos son ciertos y autorizo a RAÍZ a verificarlos y a mostrar el nombre de mi explotación o empresa, mi provincia y mi municipio en mi perfil público de vendedor.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, enviando && { opacity: 0.6 }]}
          onPress={enviar} disabled={enviando} activeOpacity={0.85}>
          <Text style={styles.btnTexto}>{enviando ? 'Enviando...' : 'Enviar para verificación'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  container: { padding: 16, paddingBottom: 40, gap: 14 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  tituloGrande: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  info: { backgroundColor: C.primaryLight, borderRadius: 12, padding: 14 },
  infoTexto: { fontSize: 13, color: C.text, lineHeight: 19 },
  rechazo: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, gap: 4 },
  rechazoTitulo: { fontSize: 14, fontWeight: '700', color: '#991B1B' },
  rechazoTexto: { fontSize: 13, color: '#991B1B', lineHeight: 18 },
  campo: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: C.text },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: C.text,
  },
  seccion: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 4 },
  docCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12,
  },
  docImg: { width: 64, height: 64, borderRadius: 10 },
  docVacio: { backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  docLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  docEstado: { fontSize: 12, color: C.textSub },
  acepto: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 4 },
  check: {
    width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.white,
  },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  aceptoTexto: { flex: 1, fontSize: 13, color: C.textSub, lineHeight: 18 },
  btn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  btnTexto: { color: C.white, fontSize: 17, fontWeight: '700' },
})