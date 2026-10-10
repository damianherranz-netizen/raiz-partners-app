import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

const AMARILLO = '#F59E0B'
const AMARILLO_LIGHT = '#FFFBEB'
const AMARILLO_BORDER = '#FDE68A'

export default function ProfessionalDashboard() {
  const { profile, signOut } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({ mensajes: 0, visitas: 0 })
  const [refreshing, setRefreshing] = useState(false)
  const [perfilCompleto, setPerfilCompleto] = useState(false)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase
      .from('professionals')
      .select('id, specialty, phone')
      .eq('user_id', user.id).single()
    setPerfilCompleto(!!prof?.specialty && !!prof?.phone)

    const { count: mensajes } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false)
    setStats({ mensajes: mensajes ?? 0, visitas: 0 })
  }

  const nombre = profile?.full_name?.split(' ')[0] ?? 'profesional'

  return (
    <View style={styles.flex}>
      <Header titulo={`Hola, ${nombre} 👋`} subtitulo="Panel del profesional" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await loadStats(); setRefreshing(false) }}
          tintColor={AMARILLO} />}
      >
        {/* Aviso perfil incompleto */}
        {!perfilCompleto && (
          <TouchableOpacity
            style={styles.avisoCard}
            onPress={() => router.push('/(professional)/profile')}
          >
            <Text style={styles.avisoEmoji}>⚠️</Text>
            <View style={styles.avisoTexto}>
              <Text style={styles.avisoTitulo}>Completa tu perfil</Text>
              <Text style={styles.avisoDesc}>
                Los productores no pueden encontrarte hasta que añadas tu especialidad y contacto.
              </Text>
            </View>
            <Text style={styles.avisoFlecha}>→</Text>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: AMARILLO }]}>
              {stats.mensajes}
            </Text>
            <Text style={styles.statLabel}>Mensajes{'\n'}sin leer</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: C.success }]}>
              {perfilCompleto ? '✓' : '✗'}
            </Text>
            <Text style={styles.statLabel}>Perfil{'\n'}{perfilCompleto ? 'visible' : 'incompleto'}</Text>
          </View>
        </View>

        {/* Acciones */}
        <Text style={styles.seccionTitulo}>Acciones rápidas</Text>
        <View style={styles.accionesGrid}>
          {[
            { emoji: '👤', label: 'Mi perfil profesional', ruta: '/(professional)/profile' },
            { emoji: '💬', label: 'Mis mensajes',          ruta: '/(professional)/mensajes' },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.accionCard}
              onPress={() => router.push(a.ruta as any)} activeOpacity={0.75}>
              <Text style={styles.accionEmoji}>{a.emoji}</Text>
              <Text style={styles.accionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitulo}>🔍 Cómo te encuentran</Text>
          <Text style={styles.infoDesc}>
            Los ganaderos, agricultores y otros usuarios de RAÍZ buscan profesionales
            por especialidad y provincia. Completa tu perfil para aparecer en el directorio.
          </Text>
        </View>

        <View style={styles.especialidadesCard}>
          <Text style={styles.espTitulo}>Especialidades en el directorio</Text>
          {[
            '🏥 Veterinarios',
            '🌱 Ingenieros agrónomos',
            '🏗️ Arquitectos técnicos agrícolas',
            '💧 Ingenieros de acuíferos',
            '📋 Gestores PAC y subvenciones',
            '⚖️ Abogados rurales',
            '🌲 Técnicos forestales',
          ].map((esp) => (
            <View key={esp} style={styles.espItem}>
              <Text style={styles.espTexto}>{esp}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: C.bg },
  container: { padding: 20, paddingBottom: 40, gap: 20 },
  avisoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFBEB', borderWidth: 1.5,
    borderColor: '#FDE68A', borderRadius: 14, padding: 16,
  },
  avisoEmoji: { fontSize: 24 },
  avisoTexto: { flex: 1, gap: 3 },
  avisoTitulo:{ fontSize: 14, fontWeight: '700', color: '#92400E' },
  avisoDesc:  { fontSize: 12, color: '#B45309', lineHeight: 16 },
  avisoFlecha:{ fontSize: 18, color: AMARILLO },
  statsGrid:  { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statNum:   { fontSize: 36, fontWeight: '800' },
  statLabel: { fontSize: 12, color: C.textSub, textAlign: 'center', lineHeight: 18 },
  seccionTitulo: { fontSize: 16, fontWeight: '700', color: C.text },
  accionesGrid:  { flexDirection: 'row', gap: 12 },
  accionCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    padding: 20, alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  accionEmoji: { fontSize: 28 },
  accionLabel: { fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'center' },
  infoCard: {
    backgroundColor: '#FFFBEB', borderWidth: 1,
    borderColor: '#FDE68A', borderRadius: 16, padding: 18, gap: 8,
  },
  infoTitulo: { fontSize: 15, fontWeight: '700', color: '#92400E' },
  infoDesc:   { fontSize: 13, color: '#B45309', lineHeight: 18 },
  especialidadesCard: {
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, padding: 18, gap: 8,
  },
  espTitulo: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  espItem:   { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  espTexto:  { fontSize: 14, color: C.textSub },
})