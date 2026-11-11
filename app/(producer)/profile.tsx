import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

const PROVINCIAS = [
  'Ávila','Burgos','León','Palencia','Salamanca','Segovia','Soria','Valladolid','Zamora',
  'Madrid','Toledo','Cáceres','Badajoz','Zaragoza','La Rioja','Navarra','Cantabria',
  'Asturias','Galicia','Valencia','Murcia','Andalucía','Otras',
]

export default function ProducerProfileScreen() {
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const [nombre, setNombre] = useState(profile?.full_name ?? '')
  const [explotacion, setExplotacion] = useState('')
  const [provincia, setProvincia] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [cp, setCp] = useState('')
  const [telefono, setTelefono] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [verificada, setVerificada] = useState(false)
  const [mostrarMas, setMostrarMas] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles_producer')
      .select('farm_name, province, municipality, postal_code, phone, description')
      .eq('id', user.id)
      .maybeSingle()
    if (data) {
      setExplotacion(data.farm_name ?? '')
      setProvincia(data.province && data.province !== 'Sin especificar' ? data.province : '')
      setMunicipio(data.municipality ?? '')
      setCp(data.postal_code && data.postal_code !== '00000' ? data.postal_code : '')
      setTelefono(data.phone ?? '')
      setDescripcion(data.description ?? '')
    }
    const { data: v } = await supabase
      .from('seller_verifications')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle()
    setVerificada(!!v)
  }

  async function guardar() {
    if (!provincia) {
      Alert.alert('Falta la provincia', 'Selecciona la provincia de tu explotación.')
      return
    }
    if (!/^\d{5}$/.test(cp.trim())) {
      Alert.alert('Código postal', 'Escribe un código postal de 5 cifras.')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesión no válida')

      const r1 = await supabase
        .from('profiles')
        .update({ full_name: nombre.trim() })
        .eq('id', user.id)
        .select('id')
      if (r1.error) throw new Error(r1.error.message)
      if (!r1.data || r1.data.length === 0) throw new Error('No se pudo actualizar tu nombre')

      const r2 = await supabase
        .from('profiles_producer')
        .upsert({
          id: user.id,
          farm_name: explotacion.trim() || nombre.trim() || 'Mi explotación',
          province: provincia,
          municipality: municipio.trim() || null,
          postal_code: cp.trim(),
          phone: telefono.trim() || null,
          description: descripcion.trim() || null,
        }, { onConflict: 'id' })
        .select('id')
      if (r2.error) throw new Error(r2.error.message)
      if (!r2.data || r2.data.length === 0) throw new Error('No se pudo guardar tu explotación')

      Alert.alert('✅ Guardado', 'Tu perfil se ha actualizado.')
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e.message)
    } finally {
      setSaving(false)
    }
  }

  const lista = mostrarMas ? PROVINCIAS : PROVINCIAS.slice(0, 9)

  return (
    <View style={styles.flex}>
      <Header titulo="Mi perfil" subtitulo="Datos de tu explotación" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.badge}>
          <Text style={{ fontSize: 28 }}>🌾</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.badgeTitulo}>Productor</Text>
            <Text style={styles.badgeSub}>Plan gratuito · RAÍZ Partners</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.verif, verificada && styles.verifOk]}
          onPress={() => router.push('/verificacion' as any)} activeOpacity={0.85}>
          <Text style={styles.verifTexto}>
            {verificada ? '✓ Cuenta verificada' : '⚠️ Verificar mi cuenta para poder publicar'}
          </Text>
        </TouchableOpacity>

        <View style={styles.campo}>
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput style={styles.input} value={nombre} onChangeText={setNombre}
            placeholder="Tu nombre y apellidos" placeholderTextColor={C.textLight} />
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Nombre de la explotación</Text>
          <TextInput style={styles.input} value={explotacion} onChangeText={setExplotacion}
            placeholder="Ej: Ganadería El Robledal" placeholderTextColor={C.textLight} />
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Provincia *</Text>
          <View style={styles.grid}>
            {lista.map((p) => (
              <TouchableOpacity key={p}
                style={[styles.chip, provincia === p && styles.chipOn]}
                onPress={() => setProvincia(p)}>
                <Text style={[styles.chipTexto, provincia === p && styles.chipTextoOn]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => setMostrarMas(!mostrarMas)}>
            <Text style={styles.mas}>{mostrarMas ? '▲ Ver menos' : '▼ Ver más provincias'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Municipio</Text>
          <TextInput style={styles.input} value={municipio} onChangeText={setMunicipio}
            placeholder="Ej: Navalperal de Pinares" placeholderTextColor={C.textLight} />
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Código postal *</Text>
          <TextInput style={styles.input} value={cp} onChangeText={setCp}
            placeholder="05240" placeholderTextColor={C.textLight}
            keyboardType="number-pad" maxLength={5} />
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput style={styles.input} value={telefono} onChangeText={setTelefono}
            placeholder="600 000 000" placeholderTextColor={C.textLight} keyboardType="phone-pad" />
          <Text style={styles.nota}>Solo lo ve el equipo de RAÍZ. No se muestra a otros usuarios.</Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Descripción de la explotación</Text>
          <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            value={descripcion} onChangeText={setDescripcion} multiline
            placeholder="Tipo de ganado o cultivos, forma de trabajo, certificaciones..."
            placeholderTextColor={C.textLight} />
        </View>

        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]}
          onPress={guardar} disabled={saving} activeOpacity={0.85}>
          <Text style={styles.btnTexto}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.salir} onPress={signOut} activeOpacity={0.85}>
          <Text style={styles.salirTexto}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  container: { padding: 16, paddingBottom: 40, gap: 14 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    backgroundColor: C.primaryLight, borderRadius: 14, borderWidth: 1, borderColor: C.primaryBorder,
  },
  badgeTitulo: { fontSize: 15, fontWeight: '700', color: C.primary },
  badgeSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  verif: { backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A', borderRadius: 12, padding: 14 },
  verifOk: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  verifTexto: { fontSize: 14, fontWeight: '700', color: C.text },
  campo: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: C.text },
  nota: { fontSize: 12, color: C.textSub },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: C.text,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white,
  },
  chipOn: { borderColor: C.primary, backgroundColor: C.primaryLight },
  chipTexto: { fontSize: 13, color: C.textSub, fontWeight: '500' },
  chipTextoOn: { color: C.primary, fontWeight: '700' },
  mas: { fontSize: 13, color: C.primary, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  btn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  btnTexto: { color: C.white, fontSize: 17, fontWeight: '700' },
  salir: {
    borderWidth: 1, borderColor: '#FECACA', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', backgroundColor: '#FEF2F2',
  },
  salirTexto: { color: C.danger, fontSize: 16, fontWeight: '600' },
})