import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.top}>
        <Text style={styles.logo}>🌱</Text>
        <Text style={styles.nombre}>RAÍZ Partners</Text>
        <Text style={styles.eslogan}>Todo el sector primario.{'\n'}En una sola plataforma.</Text>
      </View>

      <View style={styles.pills}>
        <View style={styles.pill}>
          <View style={[styles.dot, { backgroundColor: '#4ade80' }]} />
          <Text style={styles.pillText}>Productores del campo</Text>
        </View>
        <View style={styles.pill}>
          <View style={[styles.dot, { backgroundColor: '#60a5fa' }]} />
          <Text style={styles.pillText}>Empresas proveedoras</Text>
        </View>
        <View style={styles.pill}>
          <View style={[styles.dot, { backgroundColor: '#c084fc' }]} />
          <Text style={styles.pillText}>Transportistas agrícolas</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Crear mi cuenta gratis</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryText}>Ya tengo cuenta — Entrar</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Al registrarte aceptas los{' '}
          <Text style={styles.legalLink}>términos de uso</Text>
          {' '}y la{' '}
          <Text style={styles.legalLink}>política de privacidad</Text>
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1f0c',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  top: {
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  nombre: {
    fontWeight: '800',
    fontSize: 32,
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  eslogan: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 26,
  },
  pills: {
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '500',
  },
  bottom: {
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#166534',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 17,
    fontWeight: '500',
  },
  legal: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  legalLink: {
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'underline',
  },
})