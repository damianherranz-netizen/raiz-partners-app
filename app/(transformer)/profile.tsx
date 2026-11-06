import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, Image
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

const ROJO = '#DC2626'
const ROJO_LIGHT = '#FEF2F2'

const TIPOS_TRANSFORMADOR = [
  { value: 'matadero',    label: '🥩 Matadero / Carnicería' },
  { value: 'queseria',    label: '🧀 Quesería / Lácteos' },
  { value: 'conservas',   label: '🍯 Conservas / Mermeladas' },
  { value: 'bodega',      label: '🍷 Bodega / Destilería' },
  { value: 'almazara',    label: '🫒 Almazara / Aceites' },
  { value: 'panaderia',   label: '🥖 Panadería / Pastelería' },
  { value: 'pescaderia',  label: '🐟 Pescadería / Marisquería' },
  { value: 'herbolario',  label: '🌿 Herboristería / Infusiones' },
  { value: 'otro',        label: '📦 Otro transformador' },
]

const PROVINCIAS = [
  'Ávila','Burgos','León','Palencia','Salamanca','Segovia','Soria','Valladolid','Zamora',
  'Madrid','Toledo','Cáceres','Badajoz','Zaragoza','La Rioja','Navarra','Cantabria',
  'Asturias','Galicia','Valencia','Murcia','Andalucía','Otras'
]

const CERTIFICACIONES = [
  { value: 'ifs',       label: 'IFS Food' },
  { value: 'brc',       label: 'BRC Global' },
  { value: 'ecologico', label: '🌿 Ecológico' },
  { value: 'iqnet',     label: 'IQNet' },
  { value: 'halal',     label: 'Halal' },
  { value: 'kosher',    label: 'Kosher' },
]

export default function TransformerProfileScreen() {
  const { profile, signOut } = useAuth()
  const [nombre, setNombre] = useState(profile?.full_name ?? '')
  const [empresa, setEmpresa] = useState('')
  const [cif, setCif] = useState('')
  const [telefono, setTelefono] = useState('')
  const [web, setWeb] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [registroSanitario, setRegistroSanitario] = useState('')
  const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>([])
  const [certificaciones, setCertificaciones] = useState<string[]>([])
  const [provincias, setProvincias] = useState<string[]>([])
  const [vendeConsumidor, setVendeConsumidor] = useState(false)
  const [pedidoMinimo, setPedidoMinimo] = useState('')
  const [logoUri, setLogoUri] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [mostrarMasProvincias, setMostrarMasProvincias] = useState(false)

  useEffect(() => {
    if (profile?.full_name) setNombre(profile.full_name)
  }, [profile?.full_name])

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles_transformer')
      .select('*')
      .eq('id', user.id).single()
    if (data) {
      setEmpresa(data.company_name ?? '')
      setCif(data.cif ?? '')
      setTelefono(data.phone ?? '')
      setWeb(data.website ?? '')
      setDescripcion(data.description ?? '')
      setRegistroSanitario(data.registration_number ?? '')
      setTiposSeleccionados(data.transformer_types ?? [])
      setCertificaciones(data.certifications ?? [])
      setProvincias(data.provinces ?? [])
      setVendeConsumidor(data.sells_to_consumer ?? false)
      setPedidoMinimo(data.minimum_order?.toString() ?? '')
      setLogoUrl(data.logo_url ?? null)
    }
  }

  function toggleTipo(v: string) {
    setTiposSeleccionados(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }
  function toggleCert(v: string) {
    setCertificaciones(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }
  function toggleProvincia(v: string) {
    setProvincias(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  async function pickLogo() {
    Alert.alert('Logo / Foto', '¿Cómo quieres añadirla?', [
      {
        text: '📷 Hacer foto',
        onPress: async () => {
          const permiso = await ImagePicker.requestCameraPermissionsAsync()
          if (!permiso.granted) return
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
          if (!result.canceled) setLogoUri(result.assets[0].uri)
        }
      },
      {
        text: '🖼️ Galería',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any, allowsEditing: true, aspect: [1, 1], quality: 0.8
          })
          if (!result.canceled) setLogoUri(result.assets[0].uri)
        }
      },
      { text: 'Cancelar', style: 'cancel' }
    ])
  }

  async function saveProfile() {
    if (tiposSeleccionados.length === 0) {
      Alert.alert('Tipo de actividad requerido', 'Selecciona al menos un tipo de transformador.')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let finalLogoUrl = logoUrl
      if (logoUri) {
        const { decode } = require('base64-arraybuffer')
        const FileSystem = require('expo-file-system/legacy')
        const ext = logoUri.split('.').pop() ?? 'jpg'
        const path = `logos/transformer-${user.id}.${ext}`
        const base64 = await FileSystem.readAsStringAsync(logoUri, { encoding: FileSystem.EncodingType.Base64 })
        const arrayBuffer = decode(base64)
        const { error: uploadError } = await supabase.storage
          .from('product-images').upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path)
          finalLogoUrl = urlData.publicUrl
        }
      }

      await supabase.from('profiles').update({ full_name: nombre }).eq('id', user.id)
      const { error } = await supabase.from('profiles_transformer').upsert({
        id: user.id,
        company_name: empresa || nombre,
        cif,
        phone: telefono,
        website: web,
        description: descripcion,
        registration_number: registroSanitario,
        transformer_types: tiposSeleccionados,
        certifications: certificaciones,
        provinces: provincias,
        sells_to_consumer: vendeConsumidor,
        minimum_order: pedidoMinimo ? parseFloat(pedidoMinimo) : null,
        logo_url: finalLogoUrl,
      }, { onConflict: 'id' })

      if (error) Alert.alert('Error', error.message)
      else {
        setLogoUrl(finalLogoUrl); setLogoUri(null)
        Alert.alert('✅ Guardado', 'Tu perfil ha sido actualizado.')
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const provinciasAMostrar = mostrarMasProvincias ? PROVINCIAS : PROVINCIAS.slice(0, 9)

  return (
    <View style={styles.flex}>
      <Header titulo="Mi perfil" subtitulo="Datos de tu empresa transformadora" />
      <ScrollView contentContainerStyle={styles.container}>

        {/* Logo */}
        <View style={styles.logoSection}>
          <TouchableOpacity style={styles.logoBtn} onPress={pickLogo} activeOpacity={0.8}>
            {logoUri || logoUrl ? (
              <Image source={{ uri: logoUri ?? logoUrl ?? '' }} style={styles.logoImg} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={{ fontSize: 32 }}>🏭</Text>
              </View>
            )}
            <View style={styles.logoCamara}><Text style={{ fontSize: 14 }}>📷</Text></View>
          </TouchableOpacity>
          <View style={styles.logoTexto}>
            <Text style={styles.logoTitulo}>Logo de empresa</Text>
            <Text style={styles.logoSub}>Visible para productores y compradores</Text>
            {(logoUri || logoUrl) && (
              <TouchableOpacity onPress={() => { setLogoUri(null); setLogoUrl(null) }}>
                <Text style={styles.quitarLogo}>✕ Quitar logo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Badge */}
        <View style={styles.rolBadge}>
          <Text style={styles.rolEmoji}>🏭</Text>
          <View>
            <Text style={styles.rolTitulo}>Industria Transformadora</Text>
            <Text style={styles.rolSub}>Plan gratuito · RAÍZ Partners</Text>
          </View>
        </View>

        <View style={styles.form}>

          {/* Datos básicos */}
          {[
            { label: 'Nombre / Razón social', value: empresa,   set: setEmpresa,   placeholder: 'Ej: Carnicería García S.L.' },
            { label: 'CIF',                   value: cif,       set: setCif,       placeholder: 'Ej: B12345678' },
            { label: 'Teléfono',              value: telefono,  set: setTelefono,  placeholder: '600 000 000', keyboard: 'phone-pad' },
            { label: 'Web (opcional)',         value: web,       set: setWeb,       placeholder: 'www.tuempresa.es' },
            { label: 'Registro sanitario',    value: registroSanitario, set: setRegistroSanitario, placeholder: 'Nº registro sanitario' },
          ].map((campo) => (
            <View style={styles.campo} key={campo.label}>
              <Text style={styles.label}>{campo.label}</Text>
              <TextInput style={styles.input} value={campo.value} onChangeText={campo.set}
                placeholder={campo.placeholder} placeholderTextColor={C.textLight}
                keyboardType={campo.keyboard as any ?? 'default'}
                autoCapitalize="none" autoCorrect={false} />
            </View>
          ))}

          {/* Descripción */}
          <View style={styles.campo}>
            <Text style={styles.label}>Descripción de la actividad</Text>
            <TextInput style={[styles.input, styles.inputMulti]}
              value={descripcion} onChangeText={setDescripcion}
              placeholder="Tipo de productos que elaboráis, capacidad, zona de distribución..."
              placeholderTextColor={C.textLight} multiline numberOfLines={3} />
          </View>

          {/* Tipos de transformador */}
          <View style={styles.campo}>
            <Text style={styles.label}>Tipo de actividad *</Text>
            <Text style={styles.sublabel}>Selecciona todos los que aplican</Text>
            <View style={styles.opcionesGrid}>
              {TIPOS_TRANSFORMADOR.map((t) => (
                <TouchableOpacity key={t.value}
                  style={[styles.opcionBtn, tiposSeleccionados.includes(t.value) && styles.opcionBtnActivo]}
                  onPress={() => toggleTipo(t.value)}>
                  <Text style={[styles.opcionText, tiposSeleccionados.includes(t.value) && styles.opcionTextActivo]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Certificaciones */}
          <View style={styles.campo}>
            <Text style={styles.label}>Certificaciones (opcional)</Text>
            <View style={styles.opcionesGrid}>
              {CERTIFICACIONES.map((c) => (
                <TouchableOpacity key={c.value}
                  style={[styles.opcionBtn, certificaciones.includes(c.value) && styles.opcionBtnActivo]}
                  onPress={() => toggleCert(c.value)}>
                  <Text style={[styles.opcionText, certificaciones.includes(c.value) && styles.opcionTextActivo]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Provincias */}
          <View style={styles.campo}>
            <Text style={styles.label}>Provincias de operación</Text>
            <Text style={styles.sublabel}>
              {provincias.length > 0 ? `${provincias.length} seleccionadas` : 'Selecciona las que aplican'}
            </Text>
            <View style={styles.opcionesGrid}>
              {provinciasAMostrar.map((p) => (
                <TouchableOpacity key={p}
                  style={[styles.opcionBtn, provincias.includes(p) && styles.opcionBtnActivo]}
                  onPress={() => toggleProvincia(p)}>
                  <Text style={[styles.opcionText, provincias.includes(p) && styles.opcionTextActivo]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.masBtn}
              onPress={() => setMostrarMasProvincias(!mostrarMasProvincias)}>
              <Text style={styles.masBtnText}>
                {mostrarMasProvincias ? '▲ Ver menos' : '▼ Ver más provincias'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Toggle venta a consumidor */}
          <TouchableOpacity style={styles.toggleRow} onPress={() => setVendeConsumidor(!vendeConsumidor)} activeOpacity={0.8}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.toggleTitulo}>Venta al consumidor final (fase 2)</Text>
              <Text style={styles.toggleSub}>
                Activa esto si quieres vender directamente a particulares cuando RAÍZ abra al público
              </Text>
            </View>
            <View style={[styles.toggle, vendeConsumidor && styles.toggleActivo]}>
              <View style={[styles.toggleDot, vendeConsumidor && styles.toggleDotActivo]} />
            </View>
          </TouchableOpacity>

          {vendeConsumidor && (
            <View style={styles.campo}>
              <Text style={styles.label}>Pedido mínimo (€)</Text>
              <TextInput style={styles.input} value={pedidoMinimo} onChangeText={setPedidoMinimo}
                placeholder="Ej: 30" placeholderTextColor={C.textLight} keyboardType="decimal-pad" />
            </View>
          )}

          <TouchableOpacity style={[styles.btnPrimary, saving && { opacity: 0.6 }]}
            onPress={saveProfile} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.salirBtn} onPress={signOut} activeOpacity={0.85}>
          <Text style={styles.salirText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: C.bg },
  container: { padding: 16, paddingBottom: 40, gap: 16 },
  logoSection: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16,
  },
  logoBtn:     { position: 'relative' },
  logoImg:     { width: 72, height: 72, borderRadius: 14 },
  logoPlaceholder: { width: 72, height: 72, borderRadius: 14, backgroundColor: ROJO_LIGHT, alignItems: 'center', justifyContent: 'center' },
  logoCamara: {
    position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center',
  },
  logoTexto:  { flex: 1, gap: 4 },
  logoTitulo: { fontSize: 15, fontWeight: '700', color: C.text },
  logoSub:    { fontSize: 12, color: C.textSub, lineHeight: 16 },
  quitarLogo: { fontSize: 13, color: C.danger, fontWeight: '600', marginTop: 4 },
  rolBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: ROJO_LIGHT, borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, padding: 16,
  },
  rolEmoji:  { fontSize: 28 },
  rolTitulo: { fontSize: 15, fontWeight: '700', color: ROJO },
  rolSub:    { fontSize: 12, color: C.textSub, marginTop: 2 },
  form:      { gap: 14 },
  campo:     { gap: 6 },
  sublabel:  { fontSize: 12, color: C.textSub },
  label:     { fontSize: 14, fontWeight: '600', color: C.text },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: C.text,
  },
  inputMulti:      { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  opcionesGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  opcionBtn:       { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  opcionBtnActivo: { borderColor: ROJO, backgroundColor: ROJO_LIGHT },
  opcionText:      { fontSize: 13, color: C.textSub, fontWeight: '500' },
  opcionTextActivo:{ fontSize: 13, color: ROJO, fontWeight: '700' },
  masBtn:          { marginTop: 8, alignItems: 'center' },
  masBtnText:      { fontSize: 13, color: ROJO, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12,
  },
  toggleTitulo: { fontSize: 15, fontWeight: '600', color: C.text },
  toggleSub:    { fontSize: 12, color: C.textSub, lineHeight: 16 },
  toggle:         { width: 48, height: 28, borderRadius: 14, backgroundColor: C.border, justifyContent: 'center', padding: 2 },
  toggleActivo:   { backgroundColor: ROJO },
  toggleDot:      { width: 24, height: 24, borderRadius: 12, backgroundColor: C.white },
  toggleDotActivo:{ alignSelf: 'flex-end' },
  btnPrimary:     { backgroundColor: ROJO, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  btnPrimaryText: { color: C.white, fontSize: 17, fontWeight: '700' },
  salirBtn: { borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: ROJO_LIGHT },
  salirText: { color: C.danger, fontSize: 16, fontWeight: '600' },
})