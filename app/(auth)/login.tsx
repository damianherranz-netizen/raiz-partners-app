import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Faltan datos', 'Introduce tu email y contraseña')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Error al entrar', 'Email o contraseña incorrectos')
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

        <Text style={styles.titulo}>Bienvenido de vuelta</Text>
        <Text style={styles.subtitulo}>Entra en tu cuenta de RAÍZ Partners</Text>

        <View style={styles.form}>
          <View style={styles.campo}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Tu contraseña"
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>
              ¿No tienes cuenta?{' '}
              <Text style={styles.linkDestacado}>Regístrate gratis</Text>
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
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitulo: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 40,
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
    backgroundColor: '#166534',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 15, color: 'rgba(255,255,255,0.4)' },
  linkDestacado: { color: '#4ade80', fontWeight: '600' },
})