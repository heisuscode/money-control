import 'expo-sqlite/localStorage/install'
import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

// Mesmo projeto Supabase do site: login e dados são os mesmos nos dois.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL!
const chave = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const supabase = createClient(url, chave, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

AppState.addEventListener('change', (estado) => {
  if (estado === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
