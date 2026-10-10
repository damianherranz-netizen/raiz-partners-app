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

export default function ProviderProfileScreen() {
  const { profile, signOut } = useAuth()
  const [nombre, setNombre] = useState(profile?.full_name ?? '')
  const [telefono, setTelefono] = useState('')
  const [provincia, setProvincia] = useState('')
  const [web, setWeb] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [logoUri, setLogoUri] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.full_name) setNombre(profile.full_name)
  }, [profile?.full_name])

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles_provider')
      .select('phone, province, website, description, logo_url')
      .eq('id', user.id).single()
    if (data) {
      setTelefono(data.phone ?? '')
      setProvincia(data.province ?? '')
      setWeb(data.website ?? '')
      setDescripcion(data.description ?? '')
      setLogoUrl(data.logo_url ?? null)
    }
  }

  async function pickLogo() {
    Alert.alert('Logo de empresa', '¿Cómo quieres añadir el logo?', [
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
        const path = `logos/${user.id}.${ext}`
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
      const { error } = await supabase.from('profiles_provider').upsert({
        id: user.id,
        phone: telefono,
        province: provincia,
        website: web,
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

  return (
    <View style={styles.flex}>
      <Header titulo="Mi perfil" subtitulo="Datos de tu empresa" />
      <ScrollView contentContainerStyle={styles.container}>

        {/* Logo empresa */}
        <View style={styles.logoSection}>
          <TouchableOpacity style={styles.logoBtn} onPress={pickLogo} activeOpacity={0.8}>
            {logoUri || logoUrl ? (
              <Image
                source={{ uri: logoUri ?? logoUrl ?? '' }}
                style={styles.logoImg}
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoEmoji}>🏢</Text>
              </View>
            )}
            <View style={styles.logoCamara}>
              <Text style={{ fontSize: 14 }}>📷</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.logoTexto}>
            <Text style={styles.logoTitulo}>Logo de empresa</Text>
            <Text style={styles.logoSub}>
              Visible para los productores que compran tus productos
            </Text>
            {(logoUri || logoUrl) && (
              <TouchableOpacity
                onPress={() => { setLogoUri(null); setLogoUrl(null) }}
                style={styles.quitarLogoBtn}
              >
                <Text style={styles.quitarLogoText}>✕ Quitar logo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.rolBadge}>
          <Text style={styles.rolEmoji}>🏢</Text>
          <View>
            <Text style={styles.rolTitulo}>Proveedor</Text>
            <Text style={styles.rolSub}>Plan gratuito · RAÍZ Partners</Text>
          </View>
        </View>

        <View style={styles.form}>
          {[
            { label: 'Nombre / Empresa',   value: nombre,      set: setNombre,      placeholder: 'Nombre o razón social' },
            { label: 'Teléfono',           value: telefono,    set: setTelefono,    placeholder: '600 000 000', keyboard: 'phone-pad' },
            { label: 'Provincia',          value: provincia,   set: setProvincia,   placeholder: 'Ej: Salamanca' },
            { label: 'Página web',         value: web,         set: setWeb,         placeholder: 'www.tuempresa.es' },
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
                autoCapitalize="none"
              />
            </View>
          ))}

          <View style={styles.campo}>
            <Text style={styles.label}>Descripción de la empresa</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="¿Qué productos ofrecéis? ¿En qué zonas operáis?"
              placeholderTextColor={C.textLight}
              multiline numberOfLines={3}
            />
          </View>

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
  logoBtn:    { position: 'relative' },
  logoImg:    { width: 72, height: 72, borderRadius: 14 },
  logoPlaceholder: {
    width: 72, height: 72, borderRadius: 14,
    backgroundColor: '#EFF6FF',
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
  rolBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#EFF6FF', borderWidth: 1,
    borderColor: '#BFDBFE', borderRadius: 14, padding: 16,
  },
  rolEmoji:  { fontSize: 28 },
  rolTitulo: { fontSize: 15, fontWeight: '700', color: C.info },
  rolSub:    { fontSize: 12, color: C.textSub, marginTop: 2 },
  form:      { gap: 14 },
  campo:     { gap: 6 },
  label:     { fontSize: 14, fontWeight: '600', color: C.text },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: C.text,
  },
  inputMulti: { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  btnPrimary:     { backgroundColor: C.info, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  btnPrimaryText: { color: C.white, fontSize: 17, fontWeight: '700' },
  salirBtn: {
    borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  salirText: { color: C.danger, fontSize: 16, fontWeight: '600' },
  quitarLogoBtn: { marginTop: 4 },
  quitarLogoText: { fontSize: 13, color: C.danger, fontWeight: '600' },
})