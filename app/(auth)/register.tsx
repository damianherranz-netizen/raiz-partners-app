import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'

const PERFILES = [
  {
    id: 'producer',
    emoji: '🏡',
    nombre: 'Soy productor',
    desc: 'Ganadero, agricultor u hortelano. Quiero vender mi producción directamente.',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.2)',
  },
  {
    id: 'provider',
    emoji: '🏢',
    nombre: 'Soy proveedor',
    desc: 'Empresa de piensos, maquinaria, veterinaria u otros suministros agrícolas.',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.2)',
  },
   {
    id: 'transporter',
    emoji: '🚛',
    nombre: 'Soy transportista',
    desc: 'Transporte agrícola especializado — animales, maquinaria, forraje o pacas.',
    color: '#c084fc',
    bg: 'rgba(192,132,252,0.08)',
    border: 'rgba(192,132,252,0.2)',
  },
  {
    id: 'professional',
    emoji: '🎓',
    nombre: 'Soy profesional',
    desc: 'Veterinario, ingeniero agrónomo, arquitecto, gestor PAC u otro experto del sector.',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
  },
]

export default function RegisterScreen() {
  const router = useRouter()

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>¿Cómo vas a usar RAÍZ?</Text>
      <Text style={styles.subtitulo}>
        Elige tu perfil. Podrás cambiarlo más adelante si lo necesitas.
      </Text>

      <View style={styles.perfiles}>
        {PERFILES.map((perfil) => (
          <TouchableOpacity
            key={perfil.id}
            style={[styles.card, {
              backgroundColor: perfil.bg,
              borderColor: perfil.border,
            }]}
            onPress={() => router.push({
              pathname: '/(auth)/register-form',
              params: { role: perfil.id }
            })}
            activeOpacity={0.85}
          >
            <Text style={styles.cardEmoji}>{perfil.emoji}</Text>
            <View style={styles.cardTexto}>
              <Text style={[styles.cardNombre, { color: perfil.color }]}>
                {perfil.nombre}
              </Text>
              <Text style={styles.cardDesc}>{perfil.desc}</Text>
            </View>
            <Text style={[styles.cardFlecha, { color: perfil.color }]}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => router.push('/(auth)/login')}
        style={styles.linkBtn}
      >
        <Text style={styles.linkText}>
          ¿Ya tienes cuenta?{' '}
          <Text style={styles.linkDestacado}>Entrar</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#0f1f0c' },
  container: {
    flexGrow: 1,
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
    marginBottom: 36,
    lineHeight: 24,
  },
  perfiles: { gap: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  cardEmoji: { fontSize: 32 },
  cardTexto: { flex: 1, gap: 4 },
  cardNombre: { fontSize: 18, fontWeight: '700' },
  cardDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
  },
  cardFlecha: { fontSize: 20, fontWeight: '600' },
  linkBtn: { alignItems: 'center', paddingVertical: 24 },
  linkText: { fontSize: 15, color: 'rgba(255,255,255,0.4)' },
  linkDestacado: { color: '#4ade80', fontWeight: '600' },
})