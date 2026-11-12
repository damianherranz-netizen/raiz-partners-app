import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { C } from '../lib/colors'

const EMAIL = 'hola@raizmarket.es'

export default function Suspendido() {
  const router = useRouter()
  const { signOut } = useAuth()
  const [motivo, setMotivo] = useState<string | null>(null)
  const [comprobando, setComprobando] = useState(false)

  useEffect(() => {
    supabase.rpc('my_block_status').then(({ data }) => {
      if (data && data[0]) setMotivo(data[0].reason ?? null)
    })
  }, [])

  async function comprobar() {
    setComprobando(true)
    const { data, error } = await supabase.rpc('my_block_status')
    setComprobando(false)
    if (error) { Alert.alert('No se pudo comprobar', error.message); return }
    if (data && data[0] && data[0].blocked) {
      Alert.alert('Cuenta suspendida', 'Tu cuenta sigue suspendida.')
    } else {
      router.replace('/(auth)/welcome' as any)
    }
  }

  function escribir() {
    Linking.openURL(`mailto:${EMAIL}?subject=${encodeURIComponent('Cuenta suspendida en RAÍZ')}`)
  }

  return (
    <View style={styles.flex}>
      <View style={styles.centro}>
        <Text style={{ fontSize: 56 }}>🔒</Text>
        <Text style={styles.titulo}>Cuenta suspendida</Text>
        {motivo ? (
          <View style={styles.motivoBox}>
            <Text style={styles.motivoLabel}>Motivo</Text>
            <Text style={styles.motivoTexto}>{motivo}</Text>
          </View>
        ) : null}
        <Text style={styles.texto}>
          Si crees que es un error o quieres resolverlo, escríbenos a {EMAIL}. Es el único canal para revisar tu caso y levantar la suspensión.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={escribir} activeOpacity={0.85}>
          <Text style={styles.btnTexto}>✉️ Escribir a RAÍZ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn2, comprobando && { opacity: 0.6 }]}
          onPress={comprobar} disabled={comprobando} activeOpacity={0.85}>
          <Text style={styles.btn2Texto}>{comprobando ? 'Comprobando...' : 'Comprobar de nuevo'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.salir}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  titulo: { fontSize: 24, fontWeight: '800', color: C.text },
  motivoBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, alignSelf: 'stretch', gap: 4 },
  motivoLabel: { fontSize: 12, fontWeight: '700', color: '#991B1B' },
  motivoTexto: { fontSize: 14, color: '#991B1B', lineHeight: 20 },
  texto: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  btn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignSelf: 'stretch', alignItems: 'center' },
  btnTexto: { color: C.white, fontSize: 16, fontWeight: '700' },
  btn2: {
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 14, paddingVertical: 14,
    alignSelf: 'stretch', alignItems: 'center', backgroundColor: C.white,
  },
  btn2Texto: { color: C.primary, fontSize: 15, fontWeight: '700' },
  salir: { color: C.danger, fontSize: 14, fontWeight: '600', paddingVertical: 8 },
})