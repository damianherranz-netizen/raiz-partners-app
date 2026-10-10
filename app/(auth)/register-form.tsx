import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../lib/supabase'

const LABELS: Record<string, { titulo: string; color: string }> = {
  producer:    { titulo: 'Registro como productor',    color: '#4ade80' },
  provider:    { titulo: 'Registro como proveedor',    color: '#60a5fa' },
  transporter: { titulo: 'Registro como transportista', color: '#c084fc' },
}

export default function RegisterFormScreen() {
  const router = useRouter()
  const { role } = useLocalSearchParams<{ role: string }>()
  const label = LABELS[role] ?? LABELS.producer

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [provincia, setProvincia] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (!nombre || !email || !password || !provincia) {
      Alert.alert('Faltan datos', 'Rellena todos los campos para continuar')
      return
    }
    if (password.length < 6) {
      Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: nombre,
          user_role: role,
          province: provincia,
        }
      }
    })
    setLoading(false)
    if (error) {
      Alert.alert('Error al registrarte', error.message)
    } else {
      Alert.alert(
        '¡Cuenta creada! 🌱',
        'Revisa tu email para confirmar tu cuenta y luego entra.',
        [{ text: 'Entrar', onPress: () => router.replace('/(auth)/login') }]
      )
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>{label.titulo}</Text>
        <Text style={styles.subtitulo}>
          Solo 4 datos para empezar. El resto lo completas desde tu panel.
        </Text>

        <View style={styles.form}>
          {[
            { label: 'Nombre completo o empresa', value: nombre, set: setNombre, placeholder: 'Ej: Juan García Martín', tipo: 'default' },
            { label: 'Email', value: email, set: setEmail, placeholder: 'tu@email.com', tipo: 'email-address' },
            { label: 'Contraseña', value: password, set: setPassword, placeholder: 'Mínimo 6 caracteres', tipo: 'default', secure: true },
            { label: 'Provincia', value: provincia, set: setProvincia, placeholder: 'Ej: Ávila', tipo: 'default' },
          ].map((campo) => (
            <View style={styles.campo} key={campo.label}>
              <Text style={styles.label}>{campo.label}</Text>
              <TextInput
                style={styles.input}
                value={campo.value}
                onChangeText={campo.set}
                placeholder={campo.placeholder}
                placeholderTextColor="#6b7280"
                keyboardType={campo.tipo as any}
                autoCapitalize={campo.tipo === 'email-address' ? 'none' : 'words'}
                autoCorrect={false}
                secureTextEntry={campo.secure}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: '#166534' }, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>
              {loading ? 'Creando cuenta...' : 'Crear mi cuenta gratis'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f1f0c',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  back: { marginBottom: 32 },
  backText: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitulo: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 36,
    lineHeight: 22,
  },
  form: { gap: 16 },
  campo: { gap: 8 },
  label: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  btnPrimary: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
})