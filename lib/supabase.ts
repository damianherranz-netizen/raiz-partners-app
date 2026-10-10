import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://orijqummzkojxpkncemn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yaWpxdW1temtvanhwa25jZW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0ODkxNTcsImV4cCI6MjA5NDA2NTE1N30.RrkBpiKL_jxPI91v4brqUhwtLDHcZrzwA-QZKrCGWJ4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})