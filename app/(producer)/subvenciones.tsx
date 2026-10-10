import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

const SUBVENCIONES = [
  {
    importe: 'Hasta 100.000 €',
    nombre: 'Incorporación de jóvenes ganaderos',
    requisito: 'Para menores de 40 años que se instalen por primera vez.',
    plazo: 'Convocatoria abierta',
    activa: true,
    url: 'https://www.jcyl.es',
  },
  {
    importe: 'Hasta 60%',
    nombre: 'Modernización de infraestructuras colectivas',
    requisito: 'Para SAT y cooperativas con inversión mínima 50.000€.',
    plazo: 'Convocatoria abierta',
    activa: true,
    url: 'https://www.jcyl.es',
  },
  {
    importe: 'Hasta 200.000 €',
    nombre: 'Fondos LEADER — proyectos rurales',
    requisito: 'Municipios menores de 5.000 habitantes.',
    plazo: 'Convocatoria abierta',
    activa: true,
    url: 'https://www.redr.es',
  },
  {
    importe: 'Variable',
    nombre: 'PAC 2026 — Solicitud Única',
    requisito: 'Agricultores y ganaderos activos con declaración anual.',
    plazo: 'Plazo anual — consultar fecha',
    activa: true,
    url: 'https://www.mapa.gob.es',
  },
  {
    importe: '50% adicional',
    nombre: 'Ayuda trashumancia CyL',
    requisito: 'Ganaderos con ruta de trashumancia activa.',
    plazo: 'Convocatoria abierta',
    activa: true,
    url: 'https://www.jcyl.es',
  },
  {
    importe: 'Hasta 85.000 €',
    nombre: 'Seguro Agrario Combinado',
    requisito: 'Cualquier explotación ganadera o agrícola activa.',
    plazo: 'Solicitud continua',
    activa: true,
    url: 'https://www.agroseguro.es',
  },
]

export default function SubvencionesScreen() {
  return (
    <View style={styles.flex}>
      <Header
        titulo="Subvenciones"
        subtitulo="Ayudas activas para tu explotación"
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>
            🔔 Actualizado mensualmente. Consulta los requisitos exactos antes de solicitar.
          </Text>
        </View>

        {SUBVENCIONES.map((s) => (
          <View key={s.nombre} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.importe}>{s.importe}</Text>
              <View style={[styles.badge, s.activa ? styles.badgeActiva : styles.badgeCerrada]}>
                <Text style={styles.badgeText}>{s.activa ? 'Activa' : 'Cerrada'}</Text>
              </View>
            </View>
            <Text style={styles.nombre}>{s.nombre}</Text>
            <Text style={styles.requisito}>{s.requisito}</Text>
            <View style={styles.cardBottom}>
              <Text style={styles.plazo}>📅 {s.plazo}</Text>
              <TouchableOpacity
                style={styles.btnInfo}
                onPress={() => Linking.openURL(s.url)}
              >
                <Text style={styles.btnInfoText}>Más info →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.consultoria}>
          <Text style={styles.consultoriaTitulo}>¿Necesitas ayuda para solicitarlas?</Text>
          <Text style={styles.consultoriaDesc}>
            RAÍZ Consultoría Agraria te ayuda a gestionar las subvenciones sin coste adicional.
          </Text>
          <TouchableOpacity
            style={styles.btnConsultoria}
            onPress={() => Linking.openURL('mailto:hola@raizmarket.es')}
          >
            <Text style={styles.btnConsultoriaText}>Contactar con asesoría</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: C.bg },
  container: { padding: 16, paddingBottom: 40, gap: 12 },
  aviso: {
    backgroundColor: C.primaryLight, borderRadius: 12,
    borderWidth: 1, borderColor: C.primaryBorder, padding: 14,
  },
  avisoTexto: { fontSize: 13, color: C.primary, lineHeight: 18 },
  card: {
    backgroundColor: C.white, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, padding: 16, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  importe:  { fontSize: 20, fontWeight: '800', color: C.primary },
  badge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeActiva:  { backgroundColor: '#DCFCE7' },
  badgeCerrada: { backgroundColor: '#FEE2E2' },
  badgeText:    { fontSize: 12, fontWeight: '700', color: C.text },
  nombre:    { fontSize: 15, fontWeight: '700', color: C.text },
  requisito: { fontSize: 13, color: C.textSub, lineHeight: 18 },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 4,
  },
  plazo:       { fontSize: 12, color: C.textLight },
  btnInfo:     { paddingVertical: 4 },
  btnInfoText: { fontSize: 13, fontWeight: '700', color: C.primary },
  consultoria: {
    backgroundColor: C.primary, borderRadius: 16,
    padding: 20, gap: 8, marginTop: 8,
  },
  consultoriaTitulo: { fontSize: 16, fontWeight: '800', color: C.white },
  consultoriaDesc:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  btnConsultoria: {
    backgroundColor: C.white, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  btnConsultoriaText: { fontSize: 14, fontWeight: '700', color: C.primary },
})