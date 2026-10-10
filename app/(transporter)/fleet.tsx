import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

const TIPOS_VEHICULO = [
  { value: 'refrigerated_van',  label: '❄️ Furgón refrigerado' },
  { value: 'livestock_truck',   label: '🐄 Camión ganadero' },
  { value: 'flatbed_truck',     label: '🏗️ Camión plataforma' },
  { value: 'agricultural',      label: '🚜 Vehículo agrícola' },
  { value: 'van',               label: '📦 Furgoneta' },
]

const SERVICIOS = [
  { value: 'animals',      label: '🐄 Animales vivos' },
  { value: 'machinery',    label: '🚜 Maquinaria agrícola' },
  { value: 'fodder',       label: '🌾 Forraje y pacas' },
  { value: 'fresh',        label: '❄️ Productos frescos' },
  { value: 'bulk',         label: '📦 Granel y suministros' },
]

export default function FleetScreen() {
  const [showing, setShowing] = useState<'list' | 'form'>('list')
  const [vehiculos, setVehiculos] = useState<any[]>([])
  const [matricula, setMatricula] = useState('')
  const [tipo, setTipo] = useState('refrigerated_van')
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([])
  const [precioKm, setPrecioKm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadFlota() }, [])

  async function deleteVehiculo(index: number) {
    Alert.alert(
      'Eliminar vehículo',
      '¿Seguro que quieres eliminar este vehículo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const nuevaFlota = vehiculos.filter((_, i) => i !== index)
            const { error } = await supabase.from('profiles_transporter').upsert({
              id: user.id,
              vehicles: nuevaFlota,
            })
            if (error) Alert.alert('Error', error.message)
            else setVehiculos(nuevaFlota)
          }
        }
      ]
    )
  }

  async function loadFlota() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles_transporter')
      .select('vehicles, service_types, price_per_km')
      .eq('id', user.id).single()
    if (data?.vehicles) setVehiculos(data.vehicles)
  }

  function toggleServicio(val: string) {
    setServiciosSeleccionados(prev =>
      prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]
    )
  }

  async function saveVehiculo() {
    if (!matricula) {
      Alert.alert('Falta la matrícula', 'Introduce la matrícula del vehículo')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const nuevoVehiculo = { matricula, tipo, servicios: serviciosSeleccionados }
      const nuevaFlota = [...vehiculos, nuevoVehiculo]
      const { error } = await supabase.from('profiles_transporter').upsert({
        id: user.id,
        vehicles: nuevaFlota,
        service_types: serviciosSeleccionados,
        price_per_km: precioKm ? parseFloat(precioKm) : null,
      })
      if (error) Alert.alert('Error', error.message)
      else {
        Alert.alert('✅ Vehículo añadido', 'Tu flota ha sido actualizada.')
        setMatricula(''); setTipo('refrigerated_van')
        setServiciosSeleccionados([]); setPrecioKm('')
        setVehiculos(nuevaFlota); setShowing('list')
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  if (showing === 'form') {
    return (
      <View style={styles.flex}>
        <Header titulo="Añadir vehículo"
          accion={{ label: 'Cancelar', onPress: () => setShowing('list') }} />
        <ScrollView contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">

          <View style={styles.campo}>
            <Text style={styles.label}>Matrícula</Text>
            <TextInput style={styles.input} value={matricula}
              onChangeText={setMatricula} placeholder="Ej: 1234 ABC"
              placeholderTextColor={C.textLight}
              autoCapitalize="characters" autoCorrect={false} />
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Tipo de vehículo</Text>
            <View style={styles.opcionesGrid}>
              {TIPOS_VEHICULO.map((t) => (
                <TouchableOpacity key={t.value}
                  style={[styles.opcionBtn, tipo === t.value && styles.opcionBtnActivo]}
                  onPress={() => setTipo(t.value)}>
                  <Text style={[styles.opcionText, tipo === t.value && styles.opcionTextActivo]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Servicios que ofreces</Text>
            <Text style={styles.sublabel}>Selecciona todos los que aplican</Text>
            <View style={styles.opcionesGrid}>
              {SERVICIOS.map((s) => (
                <TouchableOpacity key={s.value}
                  style={[styles.opcionBtn,
                    serviciosSeleccionados.includes(s.value) && styles.opcionBtnActivo]}
                  onPress={() => toggleServicio(s.value)}>
                  <Text style={[styles.opcionText,
                    serviciosSeleccionados.includes(s.value) && styles.opcionTextActivo]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.campo}>
            <Text style={styles.label}>Precio orientativo (€/km)</Text>
            <TextInput style={styles.input} value={precioKm}
              onChangeText={setPrecioKm} placeholder="Ej: 1.50"
              placeholderTextColor={C.textLight} keyboardType="decimal-pad" />
          </View>

          <TouchableOpacity
            style={[styles.btnPrimary, saving && { opacity: 0.6 }]}
            onPress={saveVehiculo} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>
              {saving ? 'Guardando...' : 'Añadir a mi flota'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.flex}>
      <Header titulo="Mi flota"
        subtitulo={`${vehiculos.length} vehículos`}
        accion={{ label: '+ Añadir', onPress: () => setShowing('form') }} />
      <ScrollView contentContainerStyle={styles.container}>
        {vehiculos.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>🚛</Text>
            <Text style={styles.vacioTitulo}>Tu flota está vacía</Text>
            <Text style={styles.vacioDesc}>
              Añade tus vehículos para que los productores puedan contratarte.
            </Text>
            <TouchableOpacity style={styles.btnPrimary}
              onPress={() => setShowing('form')}>
              <Text style={styles.btnPrimaryText}>Añadir primer vehículo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.lista}>
            {vehiculos.map((v, i) => {
              const tipoInfo = TIPOS_VEHICULO.find(t => t.value === v.tipo)
              return (
                <View key={i} style={styles.vehiculoCard}>
                  <Text style={styles.vehiculoEmoji}>
                    {tipoInfo?.label.split(' ')[0] ?? '🚛'}
                  </Text>
                  <View style={styles.vehiculoInfo}>
                    <Text style={styles.vehiculoMatricula}>{v.matricula}</Text>
                    <Text style={styles.vehiculoTipo}>
                      {tipoInfo?.label.split(' ').slice(1).join(' ') ?? v.tipo}
                    </Text>
                    {v.servicios?.length > 0 && (
                      <Text style={styles.vehiculoServicios}>
                        {v.servicios.map((s: string) =>
                          SERVICIOS.find(x => x.value === s)?.label.split(' ')[0]
                        ).join(' ')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.cardAcciones}>
                    <View style={styles.badgeActivo}>
                      <Text style={styles.badgeActivoText}>Activo</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.btnBorrar}
                      onPress={() => deleteVehiculo(i)}
                    >
                      <Text style={styles.btnBorrarText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: C.bg },
  container: { padding: 16, paddingBottom: 40, gap: 16 },
  campo:     { gap: 8 },
  sublabel:  { fontSize: 12, color: C.textLight, marginTop: -4 },
  label:     { fontSize: 14, fontWeight: '600', color: C.text },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: C.text,
  },
  opcionesGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  opcionBtn:       { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  opcionBtnActivo: { borderColor: C.transporter, backgroundColor: '#FAF5FF' },
  opcionText:      { fontSize: 13, color: C.textSub, fontWeight: '500' },
  opcionTextActivo:{ fontSize: 13, color: C.transporter, fontWeight: '700' },
  btnPrimary:     { backgroundColor: C.transporter, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  btnPrimaryText: { color: C.white, fontSize: 17, fontWeight: '700' },
  vacio:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioEmoji: { fontSize: 48 },
  vacioTitulo:{ fontSize: 18, fontWeight: '700', color: C.text },
  vacioDesc:  { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  lista:      { gap: 10 },
  vehiculoCard: {
    backgroundColor: C.white, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  vehiculoEmoji:      { fontSize: 28 },
  vehiculoInfo:       { flex: 1, gap: 3 },
  vehiculoMatricula:  { fontSize: 16, fontWeight: '800', color: C.text },
  vehiculoTipo:       { fontSize: 13, color: C.textSub },
  vehiculoServicios:  { fontSize: 13, color: C.transporter, fontWeight: '600' },
  cardAcciones:       { alignItems: 'flex-end', gap: 6 },
  badgeActivo:        { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeActivoText:    { fontSize: 12, fontWeight: '700', color: '#166534' },
  btnBorrar: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  btnBorrarText: { fontSize: 16 },
})