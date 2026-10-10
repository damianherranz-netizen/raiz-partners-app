import { Platform } from 'react-native'
import { supabase } from './supabase'

// Las notificaciones push remotas no funcionan en Expo Go desde SDK 53
// Funcionarán correctamente en el build de producción (EAS Build)
let Notifications: any = null
let Device: any = null

try {
  Notifications = require('expo-notifications')
  Device = require('expo-device')

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
} catch (e) {
  console.log('expo-notifications no disponible en este entorno')
}

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Notifications || !Device) return null
    if (!Device.isDevice) return null

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return null

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('mensajes', {
        name: 'Mensajes RAÍZ',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#166534',
        sound: 'default',
      })
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'raiz-partners-app',
    })
    return tokenData.data
  } catch (e) {
    console.log('Push notifications no disponibles en Expo Go — funcionarán en el build')
    return null
  }
}

export async function savePushToken(userId: string, token: string) {
  try {
    await supabase.from('push_tokens').upsert({
      user_id: userId,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,token' })
  } catch (e) {
    console.log('Error guardando token:', e)
  }
}

export async function deletePushToken(userId: string) {
  try {
    await supabase.from('push_tokens').delete().eq('user_id', userId)
  } catch (e) {
    console.log('Error eliminando token:', e)
  }
}

export { Notifications }