import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Indica se as variáveis de ambiente do Supabase foram configuradas. */
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  // Aviso visível no console em dev; a UI mostra um banner de configuração.
  console.warn(
    '[MoneyControl] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes. ' +
      'Copie .env.example para .env.local e preencha. Veja o README.',
  )
}

// Cria o client mesmo sem env (com placeholders) para o app não quebrar no import;
// as chamadas falham de forma controlada e a UI orienta a configuração.
export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
