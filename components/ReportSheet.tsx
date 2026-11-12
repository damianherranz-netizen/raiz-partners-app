import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native'
import { C } from '../lib/colors'

type Props = {
  visible: boolean
  titulo: string
  motivos: string[]
  onClose: () => void
  onSubmit: (motivo: string, detalle: string) => Promise<string | null>
}

export default function ReportSheet({ visible, titulo, motivos, onClose, onSubmit }: Props) {
  const [motivo, setMotivo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!motivo) {
      Alert.alert('Elige un motivo', 'Selecciona el motivo de la denuncia.')
      return
    }
    setEnviando(true)
    const error = await onSubmit(motivo, detalle.trim())
    setEnviando(false)
    if (error) {
      Alert.alert('No se pudo enviar', error)
      return
    }
    setMotivo('')
    setDetalle('')
    onClose()
    Alert.alert('Gracias', 'Revisaremos la denuncia. El otro usuario no sabrá quién la ha hecho.')
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.fondo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.hoja}>
          <View style={styles.cabecera}>
            <Text style={styles.titulo}>{titulo}</Text>
            <TouchableOpacity onPress={onClose} style={styles.cerrar}>
              <Text style={styles.cerrarTexto}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
            <Text style={styles.sub}>¿Qué ha pasado?</Text>
            {motivos.map((m) => (
              <TouchableOpacity key={m} style={[styles.opcion, motivo === m && styles.opcionOn]}
                onPress={() => setMotivo(m)} activeOpacity={0.8}>
                <Text style={[styles.opcionTexto, motivo === m && styles.opcionTextoOn]}>{m}</Text>
              </TouchableOpacity>
            ))}
            <TextInput style={styles.input} value={detalle} onChangeText={setDetalle}
              placeholder="Detalles (opcional)" placeholderTextColor={C.textLight}
              multiline maxLength={500} />
            <TouchableOpacity style={[styles.btn, enviando && { opacity: 0.6 }]}
              onPress={enviar} disabled={enviando} activeOpacity={0.85}>
              <Text style={styles.btnTexto}>{enviando ? 'Enviando...' : 'Enviar denuncia'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  hoja: {
    backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '85%',
  },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titulo: { fontSize: 18, fontWeight: '800', color: C.text },
  cerrar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  cerrarTexto: { fontSize: 16, color: C.textSub },
  sub: { fontSize: 14, color: C.textSub },
  opcion: { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 14, backgroundColor: C.white },
  opcionOn: { borderColor: '#991B1B', backgroundColor: '#FEF2F2' },
  opcionTexto: { fontSize: 14, color: C.text },
  opcionTextoOn: { fontWeight: '700', color: '#991B1B' },
  input: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, minHeight: 64,
    textAlignVertical: 'top',
  },
  btn: { backgroundColor: '#991B1B', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnTexto: { color: C.white, fontSize: 16, fontWeight: '700' },
})