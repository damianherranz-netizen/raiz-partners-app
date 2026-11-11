import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Dimensions, Alert
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { getVerifiedSet } from '../../lib/verified'
import { useCart } from '../../lib/cart'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

const { width } = Dimensions.get('window')

type Producto = {
  id: string
  name: string
  price_per_kg: number
  price: number
  unit_type: string
  images: string[]
  status: string
  provider_id: string
  tipo_producto: string | null
  animal_crotal: string | null
  animal_raza: string | null
  animal_peso_kg: number | null
  animal_edad_meses: number | null
  animal_rega: string | null
  animal_ultima_vacunacion: string | null
  animal_notas_sanitarias: string | null
  transporte_tipo: string | null
  transporte_incluido: boolean | null
  transporte_notas: string | null
  profiles: { full_name: string | null } | null
}

const TIPOS_LABEL: Record<string, string> = {
  animal_vivo: '🐄 Animal vivo',
  carne:       '🥩 Carne / Despiece',
  lacteo:      '🥛 Lácteo',
  cereal:      '🌾 Cereal / Grano',
  fruta:       '🍎 Fruta / Verdura',
  aceite:      '🫒 Aceite / Conserva',
  otro:        '📦 Otro producto',
}

const TRANSPORTE_LABEL: Record<string, string> = {
  estandar:      '📦 Mensajería estándar (SEUR u otros)',
  especializado: '🚛 Transporte agrícola especializado',
  recogida:      '🏡 Recogida en explotación',
  negociable:    '🤝 A negociar con el vendedor',
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export default function ProductoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [producto, setProducto] = useState<Producto | null>(null)
  const [fotoActiva, setFotoActiva] = useState(0)
  const [loading, setLoading] = useState(true)
  const [verificado, setVerificado] = useState(false)
  useEffect(() => {
    const sid = producto?.provider_id
    if (!sid) return
    getVerifiedSet([sid]).then(s => setVerificado(s.has(sid)))
  }, [producto?.provider_id])
  const cart = useCart()

  useEffect(() => {
    if (id) loadProducto()
  }, [id])

  async function loadProducto() {
    const { data, error } = await supabase
      .from('provider_products')
      .select('*')
      .eq('id', id)
      .single()

    if (data) {
      const { data: perfil } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.provider_id)
        .single()
      setProducto({ ...data, profiles: perfil } as any)
    }
    setLoading(false)
  }

  async function contactarProveedor() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !producto) return

    const { data: convExistente } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant_1.eq.${user.id},participant_2.eq.${producto.provider_id}),` +
        `and(participant_1.eq.${producto.provider_id},participant_2.eq.${user.id})`
      )
      .single()

    if (convExistente) {
      router.push('/(producer)/mensajes')
      return
    }

    const { error } = await supabase.from('conversations').insert({
      participant_1: user.id,
      participant_2: producto.provider_id,
      last_message: `Interesado en: ${producto.name}`,
      last_message_at: new Date().toISOString(),
    })

    if (!error) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant_1.eq.${user.id},participant_2.eq.${producto.provider_id}),` +
          `and(participant_1.eq.${producto.provider_id},participant_2.eq.${user.id})`
        )
        .single()

      if (conv) {
        await supabase.from('messages').insert({
          id: generateUUID(),
          conversation_id: conv.id,
          sender_id: user.id,
          receiver_id: producto.provider_id,
          content: `Hola, estoy interesado en "${producto.name}" (${producto.price_per_kg}€/${producto.unit_type}). ¿Podría darme más información?`,
          read: false,
        })
      }
      router.push('/(producer)/mensajes')
    }
  }

  if (loading) {
    return (
      <View style={styles.flex}>
        <Header titulo="Producto" accion={{ label: '← Volver', onPress: () => router.back() }} />
        <View style={styles.centered}><Text style={styles.centeredText}>Cargando...</Text></View>
      </View>
    )
  }

  if (!producto) {
    return (
      <View style={styles.flex}>
        <Header titulo="Producto" accion={{ label: '← Volver', onPress: () => router.back() }} />
        <View style={styles.centered}><Text style={styles.centeredText}>Producto no encontrado</Text></View>
      </View>
    )
  }

  const fotos = producto.images?.length > 0 ? producto.images : []
  const esAnimal = producto.tipo_producto === 'animal_vivo' || producto.tipo_producto === 'carne'
  const tieneTransporte = producto.transporte_tipo && producto.transporte_tipo !== 'estandar'

  return (
    <View style={styles.flex}>
      <Header
        titulo={producto.name}
        accion={{ label: '← Volver', onPress: () => router.back() }}
      />
      <ScrollView contentContainerStyle={styles.container}>

        {/* Carrusel fotos */}
        {fotos.length > 0 ? (
          <View style={styles.carruselWrap}>
            <Image source={{ uri: fotos[fotoActiva] }} style={styles.fotoGrande} resizeMode="cover" />
            {fotos.length > 1 && (
              <View style={styles.miniaturas}>
                {fotos.map((foto, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setFotoActiva(idx)}
                    style={[styles.miniatura, fotoActiva === idx && styles.miniaturaActiva]}
                  >
                    <Image source={{ uri: foto }} style={styles.miniaturaImg} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.fotoPills}>
              {fotos.map((_, idx) => (
                <View key={idx} style={[styles.pill, fotoActiva === idx && styles.pillActivo]} />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.sinFoto}>
            <Text style={{ fontSize: 48 }}>📦</Text>
            <Text style={styles.sinFotoText}>Sin fotos disponibles</Text>
          </View>
        )}

        {/* Info principal */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.nombre}>{producto.name}</Text>
            {producto.tipo_producto && (
              <View style={styles.tipoBadge}>
                <Text style={styles.tipoBadgeText}>
                  {TIPOS_LABEL[producto.tipo_producto] ?? producto.tipo_producto}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.precio}>{(producto as any).price} € / {producto.unit_type}</Text>
          {producto.profiles?.full_name && (
            <Text style={styles.proveedor}>🏢 {producto.profiles.full_name}{verificado ? '   ✓ Vendedor verificado' : ''}</Text>
          )}
        </View>

        {/* Trazabilidad animal */}
        {esAnimal && (
          <View style={styles.seccionCard}>
            <Text style={styles.seccionTitulo}>🏷️ Datos del animal</Text>

            {producto.animal_crotal && (
              <View style={styles.datoRow}>
                <Text style={styles.datoLabel}>Número de crotal</Text>
                <Text style={styles.datoValor}>{producto.animal_crotal}</Text>
              </View>
            )}
            {producto.animal_raza && (
              <View style={styles.datoRow}>
                <Text style={styles.datoLabel}>Raza</Text>
                <Text style={styles.datoValor}>{producto.animal_raza}</Text>
              </View>
            )}
            {producto.animal_peso_kg && (
              <View style={styles.datoRow}>
                <Text style={styles.datoLabel}>Peso aproximado</Text>
                <Text style={styles.datoValor}>{producto.animal_peso_kg} kg</Text>
              </View>
            )}
            {producto.animal_edad_meses && (
              <View style={styles.datoRow}>
                <Text style={styles.datoLabel}>Edad</Text>
                <Text style={styles.datoValor}>{producto.animal_edad_meses} meses</Text>
              </View>
            )}
            {producto.animal_rega && (
              <View style={styles.datoRow}>
                <Text style={styles.datoLabel}>REGA explotación</Text>
                <Text style={styles.datoValor}>{producto.animal_rega}</Text>
              </View>
            )}
            {producto.animal_ultima_vacunacion && (
              <View style={styles.datoRow}>
                <Text style={styles.datoLabel}>Última vacunación</Text>
                <Text style={styles.datoValor}>{producto.animal_ultima_vacunacion}</Text>
              </View>
            )}
            {producto.animal_notas_sanitarias && (
              <View style={styles.datoBlock}>
                <Text style={styles.datoLabel}>Notas sanitarias</Text>
                <Text style={styles.datoTexto}>{producto.animal_notas_sanitarias}</Text>
              </View>
            )}
          </View>
        )}

        {/* Transporte */}
        <View style={styles.seccionCard}>
          <Text style={styles.seccionTitulo}>🚛 Transporte</Text>

          <View style={styles.datoRow}>
            <Text style={styles.datoLabel}>Tipo de transporte</Text>
            <Text style={styles.datoValor}>
              {TRANSPORTE_LABEL[producto.transporte_tipo ?? 'estandar']}
            </Text>
          </View>

          <View style={styles.datoRow}>
            <Text style={styles.datoLabel}>Incluido en el precio</Text>
            <View style={[styles.incluidoBadge,
              producto.transporte_incluido ? styles.incluidoSi : styles.incluidoNo]}>
              <Text style={styles.incluidoText}>
                {producto.transporte_incluido ? '✓ Sí incluido' : '✗ No incluido'}
              </Text>
            </View>
          </View>

          {producto.transporte_tipo === 'especializado' && !producto.transporte_incluido && (
            <View style={styles.avisoTransporte}>
              <Text style={styles.avisoTransporteTexto}>
                🚛 Este producto requiere transporte especializado. Puedes encontrar transportistas agrícolas en el directorio de RAÍZ Partners.
              </Text>
              <TouchableOpacity
                style={styles.btnTransportista}
                onPress={() => router.push('/(producer)/profesionales')}
              >
                <Text style={styles.btnTransportistaText}>Ver transportistas →</Text>
              </TouchableOpacity>
            </View>
          )}

          {producto.transporte_notas && (
            <View style={styles.datoBlock}>
              <Text style={styles.datoLabel}>Notas</Text>
              <Text style={styles.datoTexto}>{producto.transporte_notas}</Text>
            </View>
          )}
        </View>

        {/* Botones */}
        <View style={styles.acciones}>
          <TouchableOpacity
            style={styles.btnContactar}
            onPress={contactarProveedor}
            activeOpacity={0.85}
          >
            <Text style={styles.btnContactarText}>💬 Contactar al proveedor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnCarrito}
            onPress={() => {
              const ok = cart.add({
                id: producto.id,
                tipo: 'proveedor',
                name: producto.name,
                price: (producto as any).price,
                unit_type: producto.unit_type,
                image: fotos[0] ?? null,
                seller_id: producto.provider_id,
                seller_name: producto.profiles?.full_name ?? null,
                unico: false,
              })
              Alert.alert(
                ok ? '🛒 Añadido' : 'Ya en el carrito',
                ok ? 'Producto añadido al carrito.' : 'Este artículo ya está en tu carrito.',
                [
                  { text: 'Seguir mirando', style: 'cancel' },
                  { text: 'Ver carrito', onPress: () => router.push('/(producer)/carrito') },
                ]
              )
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.btnCarritoText}>🛒 Añadir al carrito</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 40 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  centeredText: { fontSize: 16, color: C.textSub },

  carruselWrap: { position: 'relative', backgroundColor: C.white },
  fotoGrande:   { width: width, height: width * 0.75 },
  miniaturas:   { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: C.white },
  miniatura:    { width: 60, height: 60, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  miniaturaActiva: { borderColor: C.primary },
  miniaturaImg: { width: '100%', height: '100%' },
  fotoPills:    { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8, position: 'absolute', bottom: 8, width: '100%' },
  pill:         { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  pillActivo:   { backgroundColor: C.white, width: 18 },
  sinFoto:      { height: 200, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', gap: 8 },
  sinFotoText:  { fontSize: 14, color: C.textSub },

  infoCard: {
    backgroundColor: C.white, padding: 20,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 8,
  },
  infoRow:    { gap: 6 },
  nombre:     { fontSize: 22, fontWeight: '800', color: C.text },
  tipoBadge:  { backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  tipoBadgeText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  precio:     { fontSize: 26, fontWeight: '800', color: C.primary },
  proveedor:  { fontSize: 14, color: C.textSub },

  seccionCard: {
    backgroundColor: C.white, marginTop: 8,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border,
    padding: 20, gap: 12,
  },
  seccionTitulo: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  datoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  datoLabel: { fontSize: 14, color: C.textSub, flex: 1 },
  datoValor: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1, textAlign: 'right' },
  datoBlock: { paddingVertical: 8, gap: 6 },
  datoTexto: { fontSize: 14, color: C.text, lineHeight: 20 },

  incluidoBadge:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  incluidoSi:      { backgroundColor: '#DCFCE7' },
  incluidoNo:      { backgroundColor: '#FEE2E2' },
  incluidoText:    { fontSize: 13, fontWeight: '700', color: C.text },

  avisoTransporte: {
    backgroundColor: '#FFF7ED', borderRadius: 10,
    borderWidth: 1, borderColor: '#FED7AA', padding: 14, gap: 10,
  },
  avisoTransporteTexto: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  btnTransportista: { alignSelf: 'flex-start' },
  btnTransportistaText: { fontSize: 13, fontWeight: '700', color: C.primary },

  acciones:        { padding: 16, gap: 12, marginTop: 8 },
  btnContactar: {
    backgroundColor: C.white, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.primary,
  },
  btnContactarText: { fontSize: 16, fontWeight: '700', color: C.primary },
  btnCarrito: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnCarritoText: { fontSize: 16, fontWeight: '700', color: C.white },
})