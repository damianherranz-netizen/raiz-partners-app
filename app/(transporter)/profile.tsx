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

const PROVINCIAS_CYL = [
  'Ávila', 'Burgos', 'León', 'Palencia',
  'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'
]

const PROVINCIAS_EXTRA = [
  'Madrid', 'Toledo', 'Cáceres', 'Badajoz',
  'Zaragoza', 'La Rioja', 'Navarra', 'Cantabria', 'Asturias',
  'Galicia', 'Valencia', 'Murcia', 'Andalucía', 'Otras'
]

const TODAS_PROVINCIAS = [...PROVINCIAS_CYL, ...PROVINCIAS_EXTRA]

export default function TransporterProfileScreen() {
  const { profile, signOut } = useAuth()
  const [nombre, setNombre] = useState(profile?.full_name ?? '')
  const [telefono, setTelefono] = useState('')
  const [provincias, setProvincias] = useState<string[]>([])
  const [precioKm, setPrecioKm] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [atp, setAtp] = useState(false)
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
      .from('profiles_transporter')
      .select('phone, provinces, price_per_km, atp_verified, description, logo_url')
      .eq('id', user.id).single()
    if (data) {
      setTelefono(data.phone ?? '')
      setProvincias(data.provinces ?? [])
      setPrecioKm(data.price_per_km?.toString() ?? '')
      setAtp(data.atp_verified ?? false)
      setDescripcion(data.description ?? '')
      setLogoUrl(data.logo_url ?? null)
    }
  }

  function toggleProvincia(p: string) {
    setProvincias(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  async function pickLogo() {
    Alert.alert('Logo / Foto', '¿Cómo quieres añadirla?', [
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
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let finalLogoUrl = logoUrl
      if (logoUri) {
        const ext = logoUri.split('.').pop() ?? 'jpg'
        const path = `logos/transporter-${user.id}.${ext}`
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
      const { error } = await supabase.from('profiles_transporter').upsert({
        id: user.id,
        phone: telefono,
        provinces: provincias,
        price_per_km: precioKm ? parseFloat(precioKm) : null,
        atp_verified: atp,
        description: descripcion,
        logo_url: finalLogoUrl,
      })

      if (error) Alert.alert('Error', error.message)
      else {
        setLogoUrl(finalLogoUrl)
        setLogoUri(null)
        Alert.alert('✅ Guardado', 'Tu perfil ha sido actualizado')
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const provinciasAMostrar = mostrarMasProvincias ? TODAS_PROVINCIAS : PROVINCIAS_CYL

  return (
    <View style={styles.flex}>
      <Header titulo="Mi perfil" subtitulo="Datos del transportista" />
      <ScrollView contentContainerStyle={styles.container}>

        {/* Logo */}
        <View style={styles.logoSection}>
          <TouchableOpacity style={styles.logoBtn} onPress={pickLogo} activeOpacity={0.8}>
            {logoUri || logoUrl ? (
              <Image source={{ uri: logoUri ?? logoUrl ?? '' }} style={styles.logoImg} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoEmoji}>🚛</Text>
              </View>
            )}
            <View style={styles.logoCamara}>
              <Text style={{ fontSize: 14 }}>📷</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.logoTexto}>
            <Text style={styles.logoTitulo}>Foto o logo</Text>
            <Text style={styles.logoSub}>
              Visible para productores que busquen transporte
            </Text>
            {(logoUri || logoUrl) && (
              <TouchableOpacity onPress={() => { setLogoUri(null); setLogoUrl(null) }}>
                <Text style={styles.quitarLogo}>✕ Quitar imagen</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Rol */}
        <View style={styles.rolBadge}>
          <Text style={styles.rolEmoji}>🚛</Text>
          <View>
            <Text style={styles.rolTitulo}>Transportista</Text>
            <Text style={styles.rolSub}>Plan gratuito · RAÍZ Partners</Text>
          </View>
        </View>

        <View style={styles.form}>
          {/* Datos básicos */}
          {[
            { label: 'Nombre completo',         value: nombre,   set: setNombre,   placeholder: 'Tu nombre' },
            { label: 'Teléfono',                value: telefono, set: setTelefono, placeholder: '600 000 000', keyboard: 'phone-pad' },
            { label: 'Precio orientativo €/km', value: precioKm, set: setPrecioKm, placeholder: 'Ej: 1.50', keyboard: 'decimal-pad' },
          ].map((campo) => (
            <View style={styles.campo} key={campo.label}>
              <Text style={styles.label}>{campo.label}</Text>
              <TextInput
                style={styles.input}
                value={campo.value}
                onChangeText={campo.set}
                placeholder={campo.placeholder}
                placeholderTextColor={C.textLight}
                keyboardType={campo.keyboard as any ?? 'default'}
              />
            </View>
          ))}

          {/* Descripción */}
          <View style={styles.campo}>
            <Text style={styles.label}>Descripción del servicio</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Tipo de transporte, experiencia, servicios especiales..."
              placeholderTextColor={C.textLight}
              multiline numberOfLines={3}
            />
          </View>

          {/* Provincias múltiples */}
          <View style={styles.campo}>
            <Text style={styles.label}>Provincias donde operas</Text>
            <Text style={styles.sublabel}>
              {provincias.length > 0
                ? `${provincias.length} seleccionadas: ${provincias.join(', ')}`
                : 'Selecciona todas las que aplican'}
            </Text>
            <View style={styles.provinciasGrid}>
              {provinciasAMostrar.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.provinciaBtn,
                    provincias.includes(p) && styles.provinciaBtnActivo]}
                  onPress={() => toggleProvincia(p)}
                >
                  <Text style={[styles.provinciaText,
                    provincias.includes(p) && styles.provinciaTextActivo]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.masProvinciasBtn}
              onPress={() => setMostrarMasProvincias(!mostrarMasProvincias)}
            >
              <Text style={styles.masProvinciasText}>
                {mostrarMasProvincias ? '▲ Ver menos' : '▼ Ver más provincias'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Toggle ATP */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setAtp(!atp)}
            activeOpacity={0.8}
          >
            <View style={styles.toggleTexto}>
              <Text style={styles.toggleTitulo}>Certificado ATP</Text>
              <Text style={styles.toggleSub}>
                Vehículo certificado para transporte de productos perecederos
              </Text>
            </View>
            <View style={[styles.toggle, atp && styles.toggleActivo]}>
              <View style={[styles.toggleDot, atp && styles.toggleDotActivo]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnPrimary, saving && { opacity: 0.6 }]}
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
    backgroundColor: C.white, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, padding: 16,
  },
  logoBtn:     { position: 'relative' },
  logoImg:     { width: 72, height: 72, borderRadius: 14 },
  logoPlaceholder: {
    width: 72, height: 72, borderRadius: 14,
    backgroundColor: '#FAF5FF',
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
    backgroundColor: '#FAF5FF', borderWidth: 1,
    borderColor: '#E9D5FF', borderRadius: 14, padding: 16,
  },
  rolEmoji:  { fontSize: 28 },
  rolTitulo: { fontSize: 15, fontWeight: '700', color: C.transporter },
  rolSub:    { fontSize: 12, color: C.textSub, marginTop: 2 },
  form:      { gap: 14 },
  campo:     { gap: 6 },
  sublabel:  { fontSize: 12, color: C.textSub },
  label:     { fontSize: 14, fontWeight: '600', color: C.text },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: C.text,
  },
  inputMulti: { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  provinciasGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  provinciaBtn:        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  provinciaBtnActivo:  { borderColor: C.transporter, backgroundColor: '#FAF5FF' },
  provinciaText:       { fontSize: 13, color: C.textSub, fontWeight: '500' },
  provinciaTextActivo: { color: C.transporter, fontWeight: '700' },
  masProvinciasBtn:    { marginTop: 8, alignItems: 'center' },
  masProvinciasText:   { fontSize: 13, color: C.transporter, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.white, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 16, gap: 12,
  },
  toggleTexto: { flex: 1, gap: 3 },
  toggleTitulo:{ fontSize: 15, fontWeight: '600', color: C.text },
  toggleSub:   { fontSize: 12, color: C.textSub, lineHeight: 16 },
  toggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: C.border, justifyContent: 'center', padding: 2,
  },
  toggleActivo:    { backgroundColor: C.transporter },
  toggleDot:       { width: 24, height: 24, borderRadius: 12, backgroundColor: C.white },
  toggleDotActivo: { alignSelf: 'flex-end' },
  btnPrimary:     { backgroundColor: C.transporter, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  btnPrimaryText: { color: C.white, fontSize: 17, fontWeight: '700' },
  salirBtn: {
    borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  salirText: { color: C.danger, fontSize: 16, fontWeight: '600' },
})