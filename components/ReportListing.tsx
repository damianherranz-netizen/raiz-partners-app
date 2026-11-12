import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput,
  Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native'
import { supabase } from '../lib/supabase'
import { C } from '../lib/colors'

const MOTIVOS = [
  'Información falsa o engañosa',
  'Animal sin datos o dudoso (crotal, sanidad)',
  'Producto no permitido o ilegal',
  'Contiene datos de contacto',
  'Precio o condiciones abusivos',
  'Otro motivo',
]

export default function ReportListing({
  kind, listingId,
}: { kind: 'productor' | 'proveedor'; listingId: string }) {
  const [visible, setVisible] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!motivo) {
      Alert.alert('Elige un motivo', 'Selecciona el motivo de la denuncia.')
      return
    }
    setEnviando(true)
    const { error } = await supabase.rpc('report_listing', {
      p_kind: kind,
      p_id: listingId,
      p_reason: motivo,
      p_details: detalle.trim() || null,
    })
    setEnviando(false)
    if (error) {
      Alert.alert('No se pudo enviar', error.message)
      return
    }
    setVisible(false)
    setMotivo('')
    setDetalle('')
    Alert.alert(
      'Gracias',
      'Revisaremos el anuncio. El vendedor no sabrá quién lo ha denunciado.'
    )
  }

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.link} activeOpacity={0.7}>
        <Text style={styles.linkTexto}>🚩 Denunciar este anuncio</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView
          style={styles.fondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.hoja}>
            <View style={styles.cabecera}>
              <Text style={styles.titulo}>Denunciar anuncio</Text>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.cerrar}>
                <Text style={styles.cerrarTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
              <Text style={styles.sub}>¿Qué le pasa a este anuncio?</Text>
              {MOTIVOS.map((m) => (
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
    </>
  )
}

const styles = StyleSheet.create({
  link: { alignItems: 'center', paddingVertical: 10 },
  linkTexto: { fontSize: 13, color: '#991B1B', fontWeight: '600' },
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