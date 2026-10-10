import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

const SUPABASE_URL = 'https://orijqummzkojxpkncemn.supabase.co'
const BUCKET = 'documentos-raiz'

type Documento = {
  nombre: string
  archivo: string
  descripcion: string
}

type Categoria = {
  emoji: string
  titulo: string
  documentos: Documento[]
}

const CATEGORIAS: Categoria[] = [
  {
    emoji: '🐄',
    titulo: 'Ganadería',
    documentos: [
      { nombre: 'Ficha de explotación ganadera',          archivo: '02_Ficha_Explotacion_Ganadera.pdf',                   descripcion: 'Datos básicos de la explotación para registro oficial' },
      { nombre: 'Libro de medicamentos veterinarios',      archivo: '01_Libro_Registro_Medicamentos_Veterinarios.pdf',     descripcion: 'Registro obligatorio de tratamientos y medicamentos' },
      { nombre: 'Registro de movimientos de animales',     archivo: '07_Registro_Movimientos_Animales.pdf',                descripcion: 'Control de entradas y salidas de animales' },
      { nombre: 'Declaración de existencias ganaderas',   archivo: '03_Declaracion_Existencias_Ganaderas.pdf',            descripcion: 'Declaración anual de cabezas de ganado' },
      { nombre: 'Checklist bienestar animal',             archivo: '08_Checklist_Bienestar_Animal_por_Especie.pdf',       descripcion: 'Lista de verificación por especie para inspecciones' },
    ]
  },
  {
    emoji: '🌾',
    titulo: 'Agricultura',
    documentos: [
      { nombre: 'Cuaderno de explotación agrícola',       archivo: '06_Cuaderno_Explotacion_Agricola.pdf',               descripcion: 'Registro obligatorio de actividades agrícolas' },
      { nombre: 'Plan de fertilización simplificado',     archivo: '14_Plan_Fertilizacion_Simplificado.pdf',             descripcion: 'Planificación de abonado y fertilización de cultivos' },
    ]
  },
  {
    emoji: '🐝',
    titulo: 'Apicultura',
    documentos: [
      { nombre: 'Libro registro de colmenas',             archivo: '05_Registro_Apicola_Libro_Colmenas.pdf',             descripcion: 'Registro oficial de colmenas y actividad apícola' },
    ]
  },
  {
    emoji: '🏥',
    titulo: 'Sanidad',
    documentos: [
      { nombre: 'Checklist pre-inspección sanitaria',     archivo: '04_Checklist_PreInspeccion_Sanitaria.pdf',           descripcion: 'Preparación para inspecciones sanitarias oficiales' },
      { nombre: 'Plan APPCC simplificado',                archivo: '09_Plan_APPCC_Simplificado_Explotacion_Ganadera.pdf', descripcion: 'Análisis de peligros y puntos de control críticos' },
      { nombre: 'Calendario de vacunaciones',             archivo: '10_Calendario_Vacunaciones_Obligatorias.pdf',        descripcion: 'Vacunaciones obligatorias por especie y comunidad' },
    ]
  },
  {
    emoji: '📋',
    titulo: 'Trámites oficiales',
    documentos: [
      { nombre: 'Checklist Solicitud Única PAC',          archivo: '11_Checklist_Solicitud_Unica_PAC.pdf',               descripcion: 'Guía para la solicitud de ayudas directas PAC' },
      { nombre: 'Guía licencias de caza por CCAA',        archivo: '12_Guia_Licencias_Caza_por_CCAA.pdf',                descripcion: 'Requisitos por comunidad autónoma para caza' },
      { nombre: 'Inventario de trámites y enlaces',       archivo: '00_Inventario_Tramites_y_Enlaces_Oficiales.pdf',     descripcion: 'Directorio de gestiones y webs oficiales del sector' },
    ]
  },
  {
    emoji: '🚜',
    titulo: 'Maquinaria',
    documentos: [
      { nombre: 'Registro de maquinaria e inventario',    archivo: '13_Registro_Maquinaria_Inventario_Explotacion.pdf',  descripcion: 'Control del parque de maquinaria de la explotación' },
    ]
  },
]

export default function DocumentosScreen() {
  const [descargando, setDescargando] = useState<string | null>(null)
  const [expandida, setExpandida] = useState<string | null>('Ganadería')

  async function descargarYAbrir(doc: Documento) {
    if (descargando) return
    setDescargando(doc.archivo)

    try {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${doc.archivo}`
      const destino = `${FileSystem.documentDirectory}${doc.archivo}`

      // Comprobar si ya está descargado
      const info = await FileSystem.getInfoAsync(destino)

      if (!info.exists) {
        const descarga = await FileSystem.downloadAsync(url, destino)
        if (descarga.status !== 200) {
          Alert.alert('Error', 'No se pudo descargar el documento. Comprueba tu conexión.')
          return
        }
      }

      // Abrir con el visor del sistema
      const puedeCompartir = await Sharing.isAvailableAsync()
      if (puedeCompartir) {
        await Sharing.shareAsync(destino, {
          mimeType: 'application/pdf',
          dialogTitle: doc.nombre,
        })
      } else {
        Alert.alert('Sin visor de PDF', 'Instala un lector de PDF en tu dispositivo para abrir este documento.')
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setDescargando(null)
    }
  }

  return (
    <View style={styles.flex}>
      <Header titulo="Documentos" subtitulo="Formularios y guías del sector" />
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>
            📥 Toca cualquier documento para descargarlo y abrirlo. Se guardan en tu móvil para consultarlos sin conexión.
          </Text>
        </View>

        {CATEGORIAS.map((cat) => {
          const abierta = expandida === cat.titulo
          return (
            <View key={cat.titulo} style={styles.categoria}>
              <TouchableOpacity
                style={styles.catHeader}
                onPress={() => setExpandida(abierta ? null : cat.titulo)}
                activeOpacity={0.75}
              >
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text style={styles.catTitulo}>{cat.titulo}</Text>
                <Text style={styles.catCount}>{cat.documentos.length} docs</Text>
                <Text style={styles.catFlecha}>{abierta ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {abierta && (
                <View style={styles.catDocs}>
                  {cat.documentos.map((doc) => {
                    const cargando = descargando === doc.archivo
                    return (
                      <TouchableOpacity
                        key={doc.archivo}
                        style={styles.docCard}
                        onPress={() => descargarYAbrir(doc)}
                        activeOpacity={0.75}
                        disabled={!!descargando}
                      >
                        <View style={styles.docIcono}>
                          <Text style={styles.docIconoText}>📄</Text>
                        </View>
                        <View style={styles.docInfo}>
                          <Text style={styles.docNombre}>{doc.nombre}</Text>
                          <Text style={styles.docDesc}>{doc.descripcion}</Text>
                        </View>
                        <View style={styles.docAccion}>
                          {cargando ? (
                            <ActivityIndicator size="small" color={C.primary} />
                          ) : (
                            <Text style={styles.docDescargar}>↓</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </View>
          )
        })}

        <View style={styles.footer}>
          <Text style={styles.footerTexto}>
            Documentos elaborados por RAÍZ Consultoría Agraria como referencia orientativa.
            Consulta siempre con tu organización agraria o administración para trámites oficiales.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: C.bg },
  container: { padding: 16, paddingBottom: 40, gap: 12 },
  aviso: {
    backgroundColor: C.primaryLight, borderWidth: 1,
    borderColor: C.primaryBorder, borderRadius: 12, padding: 14,
  },
  avisoTexto: { fontSize: 13, color: C.primary, lineHeight: 18 },
  categoria: {
    backgroundColor: C.white, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  catHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 10,
  },
  catEmoji:  { fontSize: 22 },
  catTitulo: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text },
  catCount:  { fontSize: 12, color: C.textLight },
  catFlecha: { fontSize: 14, color: C.textLight, marginLeft: 4 },
  catDocs:   { borderTopWidth: 1, borderTopColor: C.border },
  docCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  docIcono: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  docIconoText: { fontSize: 18 },
  docInfo:      { flex: 1, gap: 3 },
  docNombre:    { fontSize: 14, fontWeight: '600', color: C.text, lineHeight: 18 },
  docDesc:      { fontSize: 12, color: C.textSub, lineHeight: 16 },
  docAccion:    { width: 32, alignItems: 'center' },
  docDescargar: { fontSize: 20, color: C.primary, fontWeight: '700' },
  footer: {
    padding: 16, backgroundColor: C.white,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    marginTop: 4,
  },
  footerTexto: { fontSize: 12, color: C.textLight, lineHeight: 18, textAlign: 'center' },
})