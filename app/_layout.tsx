import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '../lib/auth'
import { CartProvider } from '../lib/cart'
import { supabase } from '../lib/supabase'
import { registerForPushNotifications, savePushToken } from '../lib/notifications'

const GRUPO_POR_ROL: Record<string, string> = {
  producer:     '(producer)',
  provider:     '(provider)',
  transporter:  '(transporter)',
  professional: '(professional)',
  transformer:  '(transformer)',
  admin:        '(producer)',
}

const RUTAS_LIBRES = [
  'verificacion', 'vendedor', 'admin-verificaciones',
  'admin-anuncios', 'admin-denuncias', 'admin-usuarios',
]

function RootLayoutNav() {
  const { session, profile, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  const [bloqueado, setBloqueado] = useState<boolean | null>(null)

  const grupo = segments[0] as string | undefined
  const rol: string | undefined =
    (profile as any)?.role ?? (profile as any)?.user_role
  const perfilEsDeEstaSesion =
    !!profile && !!session && (profile as any).id === session.user.id
  const destino = GRUPO_POR_ROL[rol ?? ''] ?? '(producer)'

  useEffect(() => {
    if (!session?.user) { setBloqueado(false); return }
    setBloqueado(null)
    supabase.rpc('my_block_status').then(({ data, error }) => {
      if (error) { setBloqueado(false); return }
      setBloqueado(!!(data && data[0] && data[0].blocked))
    })
  }, [session?.user?.id, grupo])

  useEffect(() => {
    if (loading) return

    if (!session) {
      if (grupo !== '(auth)') router.replace('/(auth)/welcome')
      return
    }

    if (bloqueado === null) return
    if (bloqueado) {
      if (grupo !== 'suspendido') router.replace('/suspendido' as any)
      return
    }

    if (!perfilEsDeEstaSesion) return
    if (grupo && RUTAS_LIBRES.includes(grupo)) return
    if (grupo !== destino) router.replace(`/${destino}` as any)
  }, [session, profile, loading, segments, bloqueado])

  useEffect(() => {
    if (!session?.user) return

    registerForPushNotifications().then((token) => {
      if (token && session.user) savePushToken(session.user.id, token)
    })

    let subA: any
    let subB: any
    try {
      const { Notifications: N } = require('../lib/notifications')
      if (N) {
        subA = N.addNotificationReceivedListener(() => {})
        subB = N.addNotificationResponseReceivedListener((response: any) => {
          const data = response.notification.request.content.data
          if (data?.type === 'message') router.push(`/${destino}/mensajes` as any)
        })
      }
    } catch (e) {
      console.log('Notificaciones no disponibles en Expo Go')
    }

    return () => {
      try { subA?.remove?.(); subB?.remove?.() } catch (e) {}
    }
  }, [session?.user?.id])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(producer)" />
      <Stack.Screen name="(provider)" />
      <Stack.Screen name="(transporter)" />
      <Stack.Screen name="(professional)" />
      <Stack.Screen name="(transformer)" />
      <Stack.Screen name="verificacion" />
      <Stack.Screen name="vendedor" />
      <Stack.Screen name="admin-verificaciones" />
      <Stack.Screen name="admin-anuncios" />
      <Stack.Screen name="admin-denuncias" />
      <Stack.Screen name="admin-usuarios" />
      <Stack.Screen name="suspendido" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <CartProvider>
        <RootLayoutNav />
      </CartProvider>
    </AuthProvider>
  )
}