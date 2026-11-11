import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { C } from '../lib/colors'
import Header from '../components/ui/Header'

type Perfil = {
  seller_id: string
  role: string
  display_name: string | null
  province: string | null
  municipality: string | null
  description: string | null
  logo_url: string | null
  member_since: string | null
  verified_at: string | null
  checks: string[] | null
}

type Anuncio = {
  id: string
  kind: 'productor' | 'proveedor'
  name: string
  price: number
  unit_type: string
  image: string | null
}

const ROL_LABEL: Record<string, string> = {
  producer: '🌾 Productor',
  provider: '🏢 Empresa proveedora',
  transformer: '🏭 Industria transformadora',
}

export default function VendedorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { profile } = useAuth()
  const miRol: string = (profile as any)?.role ?? (profile as any)?.user_role ?? ''
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) cargar() }, [id])

  async function cargar() {
    const r1 = await supabase.rpc('public_seller_profile', { uid: id })
    if (r1.error) console.log('public_seller_profile:', r1.error.message)
    const r2 = await supabase.rpc('public_seller_listings', { uid: id })
    if (r2.error) console.log('public_seller_listings:', r2.error.message)
    setPerfil(((r1.data ?? [])[0] as Perfil) ?? null)
    setAnuncios((r2.data ?? []) as Anuncio[])
    setLoading(false)
  }

  function abrir(a: Anuncio) {
    const esProductor = miRol === 'producer' || miRol === 'admin'
    if (miRol === 'transformer') {
      router.push({
        pathname: '/(transformer)/producto-detalle',
        params: { id: a.id, tipo: a.kind },
      } as any)
    } else if (esProductor && a.kind === 'proveedor') {
      router.push({ pathname: '/(producer)/producto-detalle', params: { id: a.id } } as any)
    } else {
      Alert.alert('No disponible', 'Este anuncio aún no se puede abrir desde tu panel.')
    }
  }

  const volver = { label: '← Volver', onPress: () => router.back() }

  if (loading) {
    return (
      <View style={styles.flex}>
        <Header titulo="Vendedor" accion={volver} />
        <View style={styles.centrado}><Text style={styles.sub}>Cargando...</Text></View>
      </View>
    )
  }

  if (!perfil) {
    return (
      <View style={styles.flex}>
        <Header titulo="Vendedor" accion={volver} />
        <View style={styles.centrado}>
          <Text style={{ fontSize: 40 }}>🔒</Text>
          <Text style={styles.sub}>Este vendedor no tiene un perfil público verificado.</Text>
        </View>
      </View>
    )
  }

  const nombre = perfil.display_name ?? 'Vendedor'
  const ubicacion = [perfil.municipality, perfil.province].filter(Boolean).join(', ')
  const mes = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : ''

  return (
    <View style={styles.flex}>
      <Header titulo="Perfil del vendedor" accion={volver} />
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.cabecera}>
          {perfil.logo_url
            ? <Image source={{ uri: perfil.logo_url }} style={styles.logo} />
            : <View style={[styles.logo, styles.logoVacio]}>
                <Text style={styles.inicial}>{nombre.charAt(0).toUpperCase()}</Text>
              </View>}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.nombre}>{nombre}</Text>
            <Text style={styles.rol}>{ROL_LABEL[perfil.role] ?? perfil.role}</Text>
            {ubicacion ? <Text style={styles.sub2}>📍 {ubicacion}</Text> : null}
          </View>
        </View>

        <View style={styles.verif}>
          <Text style={styles.verifTitulo}>✓ Vendedor verificado</Text>
          <Text style={styles.verifTexto}>
            Verificado en {mes(perfil.verified_at)}
            {perfil.checks && perfil.checks.length > 0 ? `: ${perfil.checks.join(', ')}` : ''}.
          </Text>
          <Text style={styles.verifNota}>
            La verificación confirma identidad y registros. No garantiza la calidad de cada producto.
          </Text>
        </View>

        {perfil.description ? (
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>Sobre este vendedor</Text>
            <Text style={styles.texto}>{perfil.description}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Miembro de RAÍZ</Text>
          <Text style={styles.texto}>Desde {mes(perfil.member_since)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Valoraciones</Text>
          <Text style={styles.texto}>
            Aún sin valoraciones. Los compradores podrán valorar a este vendedor después de cada compra.
          </Text>
        </View>

        <Text style={styles.seccion}>Anuncios activos ({anuncios.length})</Text>
        {anuncios.length === 0 ? (
          <Text style={styles.sub2}>Este vendedor no tiene anuncios activos ahora mismo.</Text>
        ) : anuncios.map((a) => (
          <TouchableOpacity key={`${a.kind}-${a.id}`} style={styles.anuncio}
            onPress={() => abrir(a)} activeOpacity={0.85}>
            {a.image
              ? <Image source={{ uri: a.image }} style={styles.anuncioImg} resizeMode="cover" />
              : <View style={[styles.anuncioImg, styles.logoVacio]}><Text style={{ fontSize: 24 }}>📦</Text></View>}
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.anuncioNombre} numberOfLines={2}>{a.name}</Text>
              <Text style={styles.anuncioPrecio}>{a.price} € / {a.unit_type}</Text>
            </View>
            <Text style={styles.flecha}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  container: { padding: 16, paddingBottom: 40, gap: 14 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  sub: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  sub2: { fontSize: 13, color: C.textSub },
  cabecera: {
    flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: C.white,
    borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16,
  },
  logo: { width: 72, height: 72, borderRadius: 36 },
  logoVacio: { backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  inicial: { fontSize: 28, fontWeight: '800', color: C.primary },
  nombre: { fontSize: 18, fontWeight: '800', color: C.text },
  rol: { fontSize: 13, color: C.primary, fontWeight: '600' },
  verif: { backgroundColor: '#DCFCE7', borderRadius: 14, padding: 14, gap: 4 },
  verifTitulo: { fontSize: 15, fontWeight: '800', color: '#166534' },
  verifTexto: { fontSize: 13, color: '#166534', lineHeight: 18 },
  verifNota: { fontSize: 12, color: '#166534', opacity: 0.8, lineHeight: 17 },
  card: {
    backgroundColor: C.white, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 16, gap: 6,
  },
  cardTitulo: { fontSize: 14, fontWeight: '700', color: C.text },
  texto: { fontSize: 14, color: C.textSub, lineHeight: 20 },
  seccion: { fontSize: 16, fontWeight: '700', color: C.text, marginTop: 4 },
  anuncio: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white,
    borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12,
  },
  anuncioImg: { width: 64, height: 64, borderRadius: 10 },
  anuncioNombre: { fontSize: 14, fontWeight: '700', color: C.text },
  anuncioPrecio: { fontSize: 14, fontWeight: '800', color: C.primary },
  flecha: { fontSize: 22, color: C.textLight },
})