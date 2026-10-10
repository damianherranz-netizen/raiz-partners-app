import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { C } from '../../lib/colors'

type Props = {
  titulo: string
  subtitulo?: string
  accion?: { label: string; onPress: () => void }
}

export default function Header({ titulo, subtitulo, accion }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.logoRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoEmoji}>🌱</Text>
        </View>
        <Text style={styles.logoNombre}>RAÍZ</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.textos}>
          <Text style={styles.titulo}>{titulo}</Text>
          {subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
        </View>
        {accion && (
          <TouchableOpacity style={styles.accionBtn} onPress={accion.onPress}>
            <Text style={styles.accionText}>{accion.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.white,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 18 },
  logoNombre: {
    fontSize: 16,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  textos: { gap: 2 },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  subtitulo: {
    fontSize: 13,
    color: C.textSub,
  },
  accionBtn: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  accionText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 14,
  },
})