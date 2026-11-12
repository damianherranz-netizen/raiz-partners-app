import { Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from './supabase'

export async function ensureVerified(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: prof } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (prof?.role === 'admin') return true

  const { data: v } = await supabase
    .from('seller_verifications')
    .select('status, review_notes')
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const status = v?.status ?? 'none'
  if (status === 'approved') return true

  const mensaje =
    status === 'pending'
      ? 'Tu verificación está en revisión. Podrás publicar cuando se apruebe.'
      : status === 'revoked'
      ? `Tu verificación fue retirada: ${v?.review_notes ?? 'contacta con RAÍZ.'}`
      : status === 'rejected'
      ? `Tu verificación fue rechazada: ${v?.review_notes ?? 'revisa tus datos y vuelve a enviarla.'}`
      : 'Para publicar en RAÍZ debes verificar tu cuenta con tus datos fiscales y registros.'

  Alert.alert('Verifica tu cuenta', mensaje, [
    { text: 'Ahora no', style: 'cancel' },
    {
      text: status === 'pending' ? 'Ver estado' : 'Verificar ahora',
      onPress: () => router.push('/verificacion' as any),
    },
  ])
  return false
}