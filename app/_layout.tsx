import { useEffect, useRef } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
import { AuthProvider, useAuth } from '../lib/auth'
import {
  registerForPushNotifications,
  savePushToken,
  deletePushToken
} from '../lib/notifications'

function RootLayoutNav() {
  const { session, profile, loading, signOut } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  const notificationListener = useRef<any>()
  const responseListener = useRef<any>()

  useEffect(() => {
    if (loading) return

    const inAuth = segments[0] === '(auth)'

    if (!session && !inAuth) {
      router.replace('/(auth)/welcome')
    } else if (session && profile && inAuth) {
      const role = profile.user_role
      if (role === 'producer')        router.replace('/(producer)')
      else if (role === 'provider')   router.replace('/(provider)')
      else if (role === 'transporter') router.replace('/(transporter)')
      else if (role === 'professional')  router.replace('/(professional)')
      else                             router.replace('/(producer)')
    }
  }, [session, profile, loading])

  // Registrar notificaciones cuando hay sesión
  useEffect(() => {
    if (!session?.user) return

    // Registrar token
    registerForPushNotifications().then((token) => {
      if (token && session.user) {
        savePushToken(session.user.id, token)
      }
    })

    // Solo activar listeners si Notifications está disponible
    try {
      const { Notifications: N } = require('../lib/notifications')
      if (N) {
        notificationListener.current = N.addNotificationReceivedListener(
          (notification: any) => {
            console.log('Notificación recibida:', notification)
          }
        )
        responseListener.current = N.addNotificationResponseReceivedListener(
          (response: any) => {
            const data = response.notification.request.content.data
            if (data?.type === 'message') {
              const role = profile?.user_role ?? 'producer'
              if (role === 'producer')         router.push('/(producer)/mensajes')
              else if (role === 'provider')    router.push('/(provider)/mensajes')
              else if (role === 'transporter') router.push('/(transporter)/mensajes')
            }
          }
        )
      }
    } catch (e) {
      console.log('Listeners de notificaciones no disponibles en Expo Go')
    }

    return () => {
      try {
        const { Notifications: N } = require('../lib/notifications')
        if (N) {
          if (notificationListener.current)
            N.removeNotificationSubscription(notificationListener.current)
          if (responseListener.current)
            N.removeNotificationSubscription(responseListener.current)
        }
      } catch (e) {}
    }
  }, [session])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(producer)" />
      <Stack.Screen name="(provider)" />
      <Stack.Screen name="(transporter)" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <RootLayoutNav />
    </AuthProvider>
  )
}