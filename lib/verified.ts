import { supabase } from './supabase'

export async function getVerifiedSet(ids: (string | undefined | null)[]): Promise<Set<string>> {
  const uniq = Array.from(new Set(ids.filter(Boolean) as string[]))
  if (uniq.length === 0) return new Set()
  const { data, error } = await supabase.rpc('verified_sellers', { ids: uniq })
  if (error) { console.log('verified_sellers:', error.message); return new Set() }
  return new Set((data ?? []) as string[])
}