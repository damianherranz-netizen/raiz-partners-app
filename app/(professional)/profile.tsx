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

const AMARILLO = '#F59E0B'

const ESPECIALIDADES = [
  { value: 'veterinario',    label: '🏥 Veterinario/a' },
  { value: 'agronomo',       label: '🌱 Ingeniero/a agrónomo' },
  { value: 'arquitecto',     label: '🏗️ Arquitecto/a técnico agrícola' },
  { value: 'acuiferos',      label: '💧 Ingeniero/a de acuíferos' },
  { value: 'gestor_pac',     label: '📋 Gestor/a PAC y subvenciones' },
  { value: 'abogado_rural',  label: '⚖️ Abogado/a rural' },
  { value: 'forestal',       label: '🌲 Técnico/a forestal' },
  { value: 'zootecnico',     label: '🐄 Zootécnico/a' },
  { value: 'otro',           label: '🔧 Otro profesional del campo' },
]

const PROVINCIAS_CYL = [
  'Ávila','Burgos','León','Palencia',
  'Salamanca','Segovia','Soria','Valladolid','Zamora'
]
const PROVINCIAS_EXTRA = [
  'Madrid','Toledo','Cáceres','Badajoz','Zaragoza',
  'La Rioja','Navarra','Cantabria','Asturias',
  'Galicia','Valencia','Murcia','Andalucía','Otras'
]
const TODAS_PROVINCIAS = [...PROVINCIAS_CYL, ...PROVINCIAS_EXTRA]

export default function ProfessionalProfileScreen() {
  const { profile, signOut } = useAuth()
  const [nombre, setNombre] = useState(profile?.full_name ?? '')
  const [specialty, setSpecialty] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [web, setWeb] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [provincias, setProvincias] = useState<string[]>([])
  const [logoUri, setLogoUri] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [mostrarMas, setMostrarMas] = useState(false)

  useEffect(() => {
    if (profile?.full_name) setNombre(profile.full_name)
  }, [profile?.full_name])

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('professionals')
      .select('*')
      .eq('user_id', user.id).single()
    if (data) {
      setSpecialty(data.specialty ?? '')
      setLicenseNumber(data.license_number ?? '')
      setTelefono(data.phone ?? '')
      setEmail(data.email ?? '')
      setWeb(data.website ?? '')
      setDescripcion(data.description ?? '')
      setProvincias(data.provinces ?? [])
      setLogoUrl(data.logo_url ?? null)
    }
  }

  function toggleProvincia(p: string) {
    setProvincias(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  async function pickLogo() {
    Alert.alert('Foto de perfil', '¿Cómo quieres añadirla?', [
      {
        text: '📷 Hacer foto',
        onPress: async () => {
          const permiso = await ImagePicker.requestCameraPermissionsAsync()
          if (!permiso.granted) return
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
          })
          if (!result.canceled) setLogoUri(result.assets[0].uri)
        }
      },
      {
        text: '🖼️ Elegir de galería',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
          })
          if (!result.canceled) setLogoUri(result.assets[0].uri)
        }
      },
      { text: 'Cancelar', style: 'cancel' }
    ])
  }

  async function saveProfile() {
    if (!specialty) {
      Alert.alert('Especialidad requerida', 'Selecciona tu especialidad profesional')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let finalLogoUrl = logoUrl
      if (logoUri) {
        const ext = logoUri.split('.').pop() ?? 'jpg'
        const path = `logos/professional-${user.id}.${ext}`
        const response = await fetch(logoUri)
        const arrayBuffer = await response.arrayBuffer()
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('product-images').getPublicUrl(path)
          finalLogoUrl = urlData.publicUrl
        }
      }

      await supabase.from('profiles').update({ full_name: nombre }).eq('id', user.id)

      const { error } = await supabase.from('professionals').upsert({
        user_id: user.id,
        full_name: nombre,
        specialty,
        license_number: licenseNumber,
        phone: telefono,
        email,
        website: web,
        description: descripcion,
        provinces: provincias,
        logo_url: finalLogoUrl,
        active: true,
      }, { onConflict: 'user_id' })

      if (error) Alert.alert('Error', error.message)
      else {
        setLogoUrl(finalLogoUrl)
        setLogoUri(null)
        Alert.alert('✅ Perfil guardado', 'Ya apareces en el directorio de RAÍZ.')
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const provinciasAMostrar = mostrarMas ? TODAS_PROVINCIAS : PROVINCIAS_CYL

  return (
    <View style={styles.flex}>
      <Header titulo="Mi perfil profesional" subtitulo="Visible en el directorio RAÍZ" />
      <ScrollView contentContainerStyle={styles.container}>

        {/* Foto perfil */}
        <View style={styles.logoSection}>
          <TouchableOpacity style={styles.logoBtn} onPress={pickLogo} activeOpacity={0.8}>
            {logoUri || logoUrl ? (
              <Image source={{ uri: logoUri ?? logoUrl ?? '' }} style={styles.logoImg} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoEmoji}>👤</Text>
              </View>
            )}
            <View style={styles.logoCamara}>
              <Text style={{ fontSize: 14 }}>📷</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.logoTexto}>
            <Text style={styles.logoTitulo}>Foto de perfil</Text>
            <Text style={styles.logoSub}>
              Los productores verán tu foto en el directorio
            </Text>
            {(logoUri || logoUrl) && (
              <TouchableOpacity onPress={() => { setLogoUri(null); setLogoUrl(null) }}>
                <Text style={styles.quitarLogo}>✕ Quitar foto</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Badge */}
        <View style={styles.rolBadge}>
          <Text style={styles.rolEmoji}>🎓</Text>
          <View>
            <Text style={styles.rolTitulo}>Profesional RAÍZ</Text>
            <Text style={styles.rolSub}>Directorio de expertos del sector primario</Text>
          </View>
        </View>

        <View style={styles.form}>

          {/* Nombre */}
          <View style={styles.campo}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput style={styles.input} value={nombre}
              onChangeText={setNombre} placeholder="Tu nombre y apellidos"
              placeholderTextColor={C.textLight} />
          </View>

          {/* Especialidad */}
          <View style={styles.campo}>
            <Text style={styles.label}>Especialidad *</Text>
            <View style={styles.espGrid}>
              {ESPECIALIDADES.map((e) => (
                <TouchableOpacity key={e.value}
                  style={[styles.espBtn, specialty === e.value && styles.espBtnActivo]}
                  onPress={() => setSpecialty(e.value)}>
                  <Text style={[styles.espText, specialty === e.value && styles.espTextActivo]}>
                    {e.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Número colegiado */}
          <View style={styles.campo}>
            <Text style={styles.label}>Número de colegiado (opcional)</Text>
            <TextInput style={styles.input} value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="Ej: AV-1234"
              placeholderTextColor={C.textLight} autoCorrect={false} />
          </View>

          {/* Contacto */}
          {[
            { label: 'Teléfono',   value: telefono, set: setTelefono, placeholder: '600 000 000', keyboard: 'phone-pad' },
            { label: 'Email profesional', value: email, set: setEmail, placeholder: 'tu@email.com' },
            { label: 'Web (opcional)',    value: web,   set: setWeb,   placeholder: 'www.tupagina.es' },
          ].map((campo) => (
            <View style={styles.campo} key={campo.label}>
              <Text style={styles.label}>{campo.label}</Text>
              <TextInput style={styles.input} value={campo.value}
                onChangeText={campo.set} placeholder={campo.placeholder}
                placeholderTextColor={C.textLight}
                keyboardType={campo.keyboard as any ?? 'default'}
                autoCapitalize="none" autoCorrect={false} />
            </View>
          ))}

          {/* Descripción */}
          <View style={styles.campo}>
            <Text style={styles.label}>Descripción de tu servicio</Text>
            <TextInput style={[styles.input, styles.inputMulti]}
              value={descripcion} onChangeText={setDescripcion}
              placeholder="Experiencia, servicios que ofreces, zonas donde operas..."
              placeholderTextColor={C.textLight} multiline numberOfLines={3} />
          </View>

          {/* Provincias */}
          <View style={styles.campo}>
            <Text style={styles.label}>Provincias donde ofreces servicio</Text>
            <Text style={styles.sublabel}>
              {provincias.length > 0
                ? `${provincias.length} seleccionadas: ${provincias.join(', ')}`
                : 'Selecciona todas las que aplican'}
            </Text>
            <View style={styles.provGrid}>
              {provinciasAMostrar.map((p) => (
                <TouchableOpacity key={p}
                  style={[styles.provBtn, provincias.includes(p) && styles.provBtnActivo]}
                  onPress={() => toggleProvincia(p)}>
                  <Text style={[styles.provText, provincias.includes(p) && styles.provTextActivo]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.masBtn}
              onPress={() => setMostrarMas(!mostrarMas)}>
              <Text style={styles.masBtnText}>
                {mostrarMas ? '▲ Ver menos' : '▼ Ver más provincias'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, saving && { opacity: 0.6 }]}
            onPress={saveProfile} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>
              {saving ? 'Guardando...' : 'Guardar y publicar en directorio'}
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
    backgroundColor: C.white, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, padding: 16,
  },
  logoBtn:     { position: 'relative' },
  logoImg:     { width: 72, height: 72, borderRadius: 36 },
  logoPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFFBEB',
    alignItems: 'center', justifyContent: 'center',
  },
  logoEmoji:  { fontSize: 32 },
  logoCamara: {
    position: 'absolute', bottom: -4, right: -4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  logoTexto:  { flex: 1, gap: 4 },
  logoTitulo: { fontSize: 15, fontWeight: '700', color: C.text },
  logoSub:    { fontSize: 12, color: C.textSub, lineHeight: 16 },
  quitarLogo: { fontSize: 13, color: C.danger, fontWeight: '600', marginTop: 4 },
  rolBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFBEB', borderWidth: 1,
    borderColor: '#FDE68A', borderRadius: 14, padding: 16,
  },
  rolEmoji:  { fontSize: 28 },
  rolTitulo: { fontSize: 15, fontWeight: '700', color: '#92400E' },
  rolSub:    { fontSize: 12, color: '#B45309', marginTop: 2 },
  form:      { gap: 14 },
  campo:     { gap: 6 },
  sublabel:  { fontSize: 12, color: C.textSub },
  label:     { fontSize: 14, fontWeight: '600', color: C.text },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: C.text,
  },
  inputMulti:     { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  espGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  espBtn:         { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  espBtnActivo:   { borderColor: AMARILLO, backgroundColor: '#FFFBEB' },
  espText:        { fontSize: 13, color: C.textSub, fontWeight: '500' },
  espTextActivo:  { color: '#92400E', fontWeight: '700' },
  provGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  provBtn:        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  provBtnActivo:  { borderColor: AMARILLO, backgroundColor: '#FFFBEB' },
  provText:       { fontSize: 13, color: C.textSub, fontWeight: '500' },
  provTextActivo: { color: '#92400E', fontWeight: '700' },
  masBtn:         { marginTop: 8, alignItems: 'center' },
  masBtnText:     { fontSize: 13, color: AMARILLO, fontWeight: '600' },
  btnPrimary:     { backgroundColor: AMARILLO, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  btnPrimaryText: { color: C.white, fontSize: 17, fontWeight: '700' },
  salirBtn: {
    borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  salirText: { color: C.danger, fontSize: 16, fontWeight: '600' },
})