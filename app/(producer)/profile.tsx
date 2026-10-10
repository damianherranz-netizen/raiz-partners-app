import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert
} from 'react-native'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

export default function ProfileScreen() {
  const { profile, signOut } = useAuth()
  const [nombre, setNombre] = useState(profile?.full_name ?? '')

  useEffect(() => {
    if (profile?.full_name) setNombre(profile.full_name)
  }, [profile?.full_name])
  const [telefono, setTelefono] = useState('')
  const [provincia, setProvincia] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles_producer')
      .select('phone, province')
      .eq('id', user.id).single()
    if (data) {
      setTelefono(data.phone ?? '')
      setProvincia(data.province ?? '')
    }
  }

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('profiles').update({ full_name: nombre }).eq('id', user.id)
    await supabase.from('profiles_producer')
      .upsert({ id: user.id, phone: telefono, province: provincia })
    setSaving(false)
    Alert.alert('✅ Guardado', 'Tu perfil ha sido actualizado')
  }

  return (
    <View style={styles.flex}>
      <Header titulo="Mi perfil" subtitulo="Datos de tu explotación" />
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.rolBadge}>
          <Text style={styles.rolEmoji}>🏡</Text>
          <View>
            <Text style={styles.rolTitulo}>Productor</Text>
            <Text style={styles.rolSub}>Plan gratuito · RAÍZ Partners</Text>
          </View>
        </View>

        <View style={styles.form}>
          {[
            { label: 'Nombre completo',  value: nombre,   set: setNombre,    placeholder: 'Tu nombre' },
            { label: 'Teléfono',         value: telefono, set: setTelefono,  placeholder: '600 000 000', keyboard: 'phone-pad' },
            { label: 'Provincia',        value: provincia, set: setProvincia, placeholder: 'Ej: Ávila' },
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

          <TouchableOpacity
            style={[styles.btnPrimary, saving && { opacity: 0.6 }]}
            onPress={saveProfile} disabled={saving} activeOpacity={0.85}
          >
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
  rolBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.primaryLight, borderWidth: 1,
    borderColor: C.primaryBorder, borderRadius: 14, padding: 16,
  },
  rolEmoji:  { fontSize: 28 },
  rolTitulo: { fontSize: 15, fontWeight: '700', color: C.primary },
  rolSub:    { fontSize: 12, color: C.textSub, marginTop: 2 },
  form:  { gap: 14 },
  campo: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: C.text },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: C.text,
  },
  btnPrimary: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginTop: 4,
  },
  btnPrimaryText: { color: C.white, fontSize: 17, fontWeight: '700' },
  salirBtn: {
    borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  salirText: { color: C.danger, fontSize: 16, fontWeight: '600' },
})