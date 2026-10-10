import { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { C } from '../../lib/colors'
import Header from '../../components/ui/Header'

type Conversacion = {
  id: string
  participant_1: string
  participant_2: string
  last_message: string | null
  last_message_at: string | null
  other_name: string
}

type Mensaje = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read: boolean
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export default function MensajesScreen() {
  const { profile } = useAuth()
  const [vista, setVista] = useState<'lista' | 'chat'>('lista')
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [convActiva, setConvActiva] = useState<Conversacion | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (userId) loadConversaciones()
  }, [userId])

  useEffect(() => {
    if (!convActiva) return
    loadMensajes(convActiva.id)

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convActiva.id)
        .order('created_at', { ascending: true })

      if (data) {
        setMensajes(prev => {
          const prevIds = new Set(prev.map(m => m.id))
          const nuevos = data.filter((m: Mensaje) => !prevIds.has(m.id))
          if (nuevos.length === 0) return prev
          return [...prev, ...nuevos].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        })
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
      }
    }, 3000)

    return () => { clearInterval(interval) }
  }, [convActiva])

  async function loadConversaciones() {
    if (!userId) return
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (!data) { setConversaciones([]); return }

    const enriquecidas = await Promise.all(data.map(async (conv) => {
      const otherId = conv.participant_1 === userId
        ? conv.participant_2 : conv.participant_1
      const { data: perfil } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', otherId).single()
      return {
        ...conv,
        other_name: perfil?.full_name ?? 'Usuario RAÍZ',
      }
    }))
    setConversaciones(enriquecidas)
  }

  async function loadMensajes(convId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMensajes(data ?? [])
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 200)
  }

  async function enviarMensaje() {
    if (!texto.trim() || !convActiva || !userId || enviando) return
    const contenido = texto.trim()
    const msgId = generateUUID()
    setTexto('')
    setEnviando(true)

    const mensajeLocal: Mensaje = {
      id: msgId,
      conversation_id: convActiva.id,
      sender_id: userId,
      content: contenido,
      created_at: new Date().toISOString(),
      read: false,
    }

    setMensajes(prev => [...prev, mensajeLocal])
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)

    try {
      const receiverId = convActiva.participant_1 === userId
        ? convActiva.participant_2
        : convActiva.participant_1

      const { error } = await supabase.from('messages').insert({
        id: msgId,
        conversation_id: convActiva.id,
        sender_id: userId,
        receiver_id: receiverId,
        content: contenido,
        read: false,
      })

      console.log('INSERT MENSAJE - error:', JSON.stringify(error))
      console.log('INSERT MENSAJE - receiverId:', receiverId)
      console.log('INSERT MENSAJE - convActiva:', JSON.stringify(convActiva))

      if (!error) {
        await supabase.from('conversations').update({
          last_message: contenido,
          last_message_at: new Date().toISOString(),
        }).eq('id', convActiva.id)
        loadConversaciones()
      }
    } catch (e: any) {
      console.log('CATCH ERROR:', e?.message, JSON.stringify(e))
    } finally {
      setEnviando(false)
    }
  }

  if (vista === 'chat' && convActiva) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity
            onPress={() => { setVista('lista'); setConvActiva(null); setMensajes([]) }}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <View style={styles.chatAvatar}>
              <Text style={styles.chatAvatarLetra}>
                {convActiva.other_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.chatNombre}>{convActiva.other_name}</Text>
              <Text style={styles.chatEstado}>RAÍZ Partners</Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContainer}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {mensajes.length === 0 && (
            <View style={styles.chatVacio}>
              <Text style={styles.chatVacioTexto}>
                Inicio de la conversación con {convActiva.other_name}
              </Text>
            </View>
          )}
          {mensajes.map((m, idx) => {
            const esMio = m.sender_id === userId
            const hora = new Date(m.created_at).toLocaleTimeString('es-ES',
              { hour: '2-digit', minute: '2-digit' })
            const mostrarFecha = idx === 0 || (
              new Date(m.created_at).toDateString() !==
              new Date(mensajes[idx - 1].created_at).toDateString()
            )
            return (
              <View key={m.id}>
                {mostrarFecha && (
                  <View style={styles.fechaSeparador}>
                    <Text style={styles.fechaTexto}>
                      {new Date(m.created_at).toLocaleDateString('es-ES',
                        { day: 'numeric', month: 'long' })}
                    </Text>
                  </View>
                )}
                <View style={[
                  styles.burbujaRow,
                  esMio ? styles.burbujaRowPropia : styles.burbujaRowAjena
                ]}>
                  {!esMio && (
                    <View style={styles.miniAvatar}>
                      <Text style={styles.miniAvatarLetra}>
                        {convActiva.other_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={[
                    styles.burbuja,
                    esMio ? styles.burbujaPropia : styles.burbujaAjena
                  ]}>
                    <Text style={[
                      styles.burbujaTexto,
                      esMio ? styles.burbujaTextoPropio : styles.burbujaTextoAjeno
                    ]}>
                      {m.content}
                    </Text>
                    <Text style={[
                      styles.burbujaHora,
                      esMio ? styles.burbujaHoraPropia : styles.burbujaHoraAjena
                    ]}>
                      {hora}{esMio && ' ✓'}
                    </Text>
                  </View>
                </View>
              </View>
            )
          })}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputChat}
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={C.textLight}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!texto.trim() || enviando) && styles.sendBtnDisabled]}
            onPress={enviarMensaje}
            disabled={!texto.trim() || enviando}
            activeOpacity={0.8}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    )
  }

  return (
    <View style={styles.flex}>
      <Header
        titulo="Mensajes"
        subtitulo={`${conversaciones.length} conversaciones`}
      />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true)
            await loadConversaciones()
            setRefreshing(false)
          }}
          tintColor={C.primary} />}
      >
        {conversaciones.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>💬</Text>
            <Text style={styles.vacioTitulo}>Sin mensajes aún</Text>
            <Text style={styles.vacioDesc}>
              Cuando contactes con alguien en RAÍZ la conversación aparecerá aquí.
            </Text>
          </View>
        ) : (
          <View style={styles.lista}>
            {conversaciones.map((conv) => {
              const hora = conv.last_message_at
                ? new Date(conv.last_message_at).toLocaleTimeString('es-ES',
                    { hour: '2-digit', minute: '2-digit' })
                : ''
              return (
                <TouchableOpacity
                  key={conv.id}
                  style={styles.convCard}
                  onPress={() => { setConvActiva(conv); setVista('chat') }}
                  activeOpacity={0.75}
                >
                  <View style={styles.convAvatar}>
                    <Text style={styles.convAvatarLetra}>
                      {conv.other_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.convInfo}>
                    <View style={styles.convTop}>
                      <Text style={styles.convNombre}>{conv.other_name}</Text>
                      <Text style={styles.convHora}>{hora}</Text>
                    </View>
                    <Text style={styles.convUltimo} numberOfLines={1}>
                      {conv.last_message ?? 'Nueva conversación'}
                    </Text>
                  </View>
                  <Text style={styles.convFlecha}>›</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  container: { padding: 16, paddingBottom: 40 },
  vacio:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  vacioEmoji: { fontSize: 48 },
  vacioTitulo:{ fontSize: 18, fontWeight: '700', color: C.text },
  vacioDesc:  { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
  lista:      { gap: 2 },
  convCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, borderRadius: 14,
    padding: 14, gap: 12, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  convAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  convAvatarLetra: { fontSize: 20, fontWeight: '700', color: C.primary },
  convInfo:   { flex: 1, gap: 4 },
  convTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convNombre: { fontSize: 15, fontWeight: '700', color: C.text },
  convHora:   { fontSize: 11, color: C.textLight },
  convUltimo: { fontSize: 13, color: C.textSub },
  convFlecha: { fontSize: 20, color: C.textLight },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, paddingHorizontal: 16,
    paddingTop: 52, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    gap: 12,
  },
  backBtn:        { padding: 4 },
  backText:       { fontSize: 15, color: C.primary, fontWeight: '600' },
  chatHeaderInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  chatAvatarLetra: { fontSize: 16, fontWeight: '700', color: C.primary },
  chatNombre:      { fontSize: 15, fontWeight: '700', color: C.text },
  chatEstado:      { fontSize: 11, color: C.textLight },
  chatScroll:      { flex: 1, backgroundColor: '#F0F4F0' },
  chatContainer:   { padding: 16, paddingBottom: 8, gap: 4 },
  chatVacio:       { alignItems: 'center', paddingVertical: 32 },
  chatVacioTexto: {
    fontSize: 13, color: C.textLight,
    textAlign: 'center', fontStyle: 'italic',
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
  },
  fechaSeparador: { alignItems: 'center', marginVertical: 12 },
  fechaTexto: {
    fontSize: 12, color: C.textLight,
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10,
  },
  burbujaRow:       { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 2 },
  burbujaRowPropia: { justifyContent: 'flex-end' },
  burbujaRowAjena:  { justifyContent: 'flex-start', gap: 6 },
  miniAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  miniAvatarLetra: { fontSize: 12, fontWeight: '700', color: C.primary },
  burbuja: {
    maxWidth: '75%', borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  burbujaPropia:      { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  burbujaAjena:       { backgroundColor: C.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  burbujaTexto:       { fontSize: 15, lineHeight: 21 },
  burbujaTextoPropio: { color: C.white },
  burbujaTextoAjeno:  { color: C.text },
  burbujaHora:        { fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
  burbujaHoraPropia:  { color: 'rgba(255,255,255,0.65)' },
  burbujaHoraAjena:   { color: C.textLight },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 12, gap: 10,
    backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  inputChat: {
    flex: 1, backgroundColor: C.bg,
    borderRadius: 22, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: C.text, maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: C.border },
  sendIcon: { color: C.white, fontSize: 16, marginLeft: 2 },
})