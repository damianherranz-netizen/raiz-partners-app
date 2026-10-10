import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, RefreshControl, Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

const AMARILLO = '#F59E0B'

type Professional = {
  id: string
  user_id: string
  full_name: string
  specialty: string
  license_number: string | null
  provinces: string[] | null
  phone: string | null
  email: string | null
  description: string | null
  logo_url: string | null
  verified: boolean
}

const ESPECIALIDADES = [
  { value: '',              label: 'Todos' },
  { value: 'veterinario',   label: '🏥 Veterinario' },
  { value: 'agronomo',      label: '🌱 Agrónomo' },
  { value: 'arquitecto',    label: '🏗️ Arquitecto' },
  { value: 'acuiferos',     label: '💧 Acuíferos' },
  { value: 'gestor_pac',    label: '📋 Gestor PAC' },
  { value: 'abogado_rural', label: '⚖️ Abogado' },
  { value: 'forestal',      label: '🌲 Forestal' },
  { value: 'zootecnico',    label: '🐄 Zootécnico' },
  { value: 'otro',          label: '🔧 Otro' },
]

const SPECIALTY_LABEL: Record<string, string> = {
  veterinario:   '🏥 Veterinario/a',
  agronomo:      '🌱 Ingeniero/a agrónomo',
  arquitecto:    '🏗️ Arquitecto/a técnico',
  acuiferos:     '💧 Ingeniero/a acuíferos',
  gestor_pac:    '📋 Gestor/a PAC',
  abogado_rural: '⚖️ Abogado/a rural',
  forestal:      '🌲 Técnico/a forestal',
  zootecnico:    '🐄 Zootécnico/a',
  otro:          '🔧 Profesional del campo',
}

export default function ProfesionalesScreen() {
  const router = useRouter()
  const [profesionales, setProfesionales] = useState<Professional[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [especialidad, setEspecialidad] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  useEffect(() => { loadProfesionales() }, [especialidad, busqueda])

  async function loadProfesionales() {
    setLoading(true)
    let query = supabase
      .from('professionals')
      .select('*')
      .eq('active', true)
      .order('verified', { ascending: false })
      .order('created_at', { ascending: false })

    if (especialidad) {
      query = query.eq('specialty', especialidad)
    }
    if (busqueda.length > 2) {
      query = query.or(
        `full_name.ilike.%${busqueda}%,description.ilike.%${busqueda}%`
      )
    }

    const { data } = await query.limit(50)
    setProfesionales(data ?? [])
    setLoading(false)
  }

  async function contactar(prof: Professional) {
    if (!userId) return
    try {
      // Buscar conversación existente
      const { data: convExistente } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant_1.eq.${userId},participant_2.eq.${prof.user_id}),` +
          `and(participant_1.eq.${prof.user_id},participant_2.eq.${userId})`
        )
        .single()

      if (convExistente) {
        router.push('/(producer)/mensajes')
        return
      }

      // Crear nueva conversación
      const { error } = await supabase.from('conversations').insert({
        participant_1: userId,
        participant_2: prof.user_id,
        last_message: null,
        last_message_at: new Date().toISOString(),
      })

      if (error) Alert.alert('Error', error.message)
      else router.push('/(producer)/mensajes')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  return (
    <View style={styles.flex}>
      <Header titulo="Profesionales" subtitulo="Expertos del sector primario" />

      {/* Buscador */}
      <View style={styles.buscadorWrap}>
        <View style={styles.buscador}>
          <Text style={styles.buscadorIcono}>🔍</Text>
          <TextInput
            style={styles.buscadorInput}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre o descripción..."
            placeholderTextColor={C.textLight}
            autoCorrect={false}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Text style={styles.borrar}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtro especialidad */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtros}
        style={styles.filtrosScroll}
      >
        {ESPECIALIDADES.map((e) => (
          <TouchableOpacity
            key={e.value}
            style={[styles.filtroBtn, especialidad === e.value && styles.filtroBtnActivo]}
            onPress={() => setEspecialidad(e.value)}
          >
            <Text style={[styles.filtroText, especialidad === e.value && styles.filtroTextActivo]}>
              {e.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true)
            await loadProfesionales()
            setRefreshing(false)
          }}
          tintColor={AMARILLO} />}
      >
        {loading ? (
          <Text style={styles.cargando}>Cargando profesionales...</Text>
        ) : profesionales.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>🎓</Text>
            <Text style={styles.vacioTitulo}>
              {busqueda || especialidad ? 'Sin resultados' : 'Directorio en construcción'}
            </Text>
            <Text style={styles.vacioDesc}>
              {busqueda || especialidad
                ? 'Prueba con otro término o especialidad.'
                : 'Los profesionales del sector se están registrando. Vuelve pronto.'}
            </Text>
          </View>
        ) : (
          <View style={styles.lista}>
            {profesionales.map((prof) => (
              <View key={prof.id} style={styles.card}>
                <View style={styles.cardTop}>
                  {/* Avatar */}
                  {prof.logo_url ? (
                    <Image source={{ uri: prof.logo_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarLetra}>
                        {prof.full_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {/* Info */}
                  <View style={styles.cardInfo}>
                    <View style={styles.cardNombreRow}>
                      <Text style={styles.cardNombre}>{prof.full_name}</Text>
                      {prof.verified && (
                        <View style={styles.verificadoBadge}>
                          <Text style={styles.verificadoText}>✓ Verificado</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardEspecialidad}>
                      {SPECIALTY_LABEL[prof.specialty] ?? prof.specialty}
                    </Text>
                    {prof.license_number && (
                      <Text style={styles.cardColegiado}>
                        Nº colegiado: {prof.license_number}
                      </Text>
                    )}
                    {prof.provinces && prof.provinces.length > 0 && (
                      <Text style={styles.cardProvincias}>
                        📍 {prof.provinces.slice(0, 3).join(' · ')}
                        {prof.provinces.length > 3 ? ` +${prof.provinces.length - 3}` : ''}
                      </Text>
                    )}
                  </View>
                </View>

                {prof.description && (
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {prof.description}
                  </Text>
                )}

                {/* Acciones */}
                <View style={styles.cardBtns}>
                  {prof.phone && (
                    <View style={styles.cardContacto}>
                      <Text style={styles.cardContactoText}>📞 {prof.phone}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.btnContactar}
                    onPress={() => contactar(prof)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnContactarText}>💬 Escribir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex:          { flex: 1, backgroundColor: C.bg },
  buscadorWrap:  {
    backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  buscador: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
  },
  buscadorIcono: { fontSize: 16 },
  buscadorInput: { flex: 1, fontSize: 15, color: C.text },
  borrar:        { fontSize: 14, color: C.textLight, padding: 4 },
  filtrosScroll: { backgroundColor: C.white, maxHeight: 52 },
  filtros: {
    paddingHorizontal: 16, gap: 8,
    alignItems: 'center', paddingVertical: 10,
  },
  filtroBtn:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  filtroBtnActivo: { backgroundColor: AMARILLO, borderColor: AMARILLO },
  filtroText:      { fontSize: 13, color: C.textSub, fontWeight: '500' },
  filtroTextActivo:{ color: C.white, fontWeight: '700' },
  container:  { padding: 16, paddingBottom: 40, gap: 12 },
  cargando:   { textAlign: 'center', color: C.textSub, marginTop: 40 },
  vacio:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioEmoji: { fontSize: 48 },
  vacioTitulo:{ fontSize: 18, fontWeight: '700', color: C.text },
  vacioDesc:  { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  lista:      { gap: 12 },
  card: {
    backgroundColor: C.white, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTop:     { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar:      { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FFFBEB',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetra:    { fontSize: 22, fontWeight: '700', color: AMARILLO },
  cardInfo:       { flex: 1, gap: 3 },
  cardNombreRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardNombre:     { fontSize: 16, fontWeight: '700', color: C.text },
  verificadoBadge:{ backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  verificadoText: { fontSize: 11, fontWeight: '700', color: '#166534' },
  cardEspecialidad:{ fontSize: 13, color: AMARILLO, fontWeight: '600' },
  cardColegiado:  { fontSize: 12, color: C.textLight },
  cardProvincias: { fontSize: 12, color: C.textSub },
  cardDesc:       { fontSize: 13, color: C.textSub, lineHeight: 18 },
  cardBtns:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardContacto:   { flex: 1 },
  cardContactoText:{ fontSize: 13, color: C.textSub },
  btnContactar: {
    backgroundColor: AMARILLO, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  btnContactarText: { fontSize: 14, fontWeight: '700', color: C.white },
})