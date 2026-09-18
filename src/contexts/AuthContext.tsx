import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Usuario } from '@/lib/types'

interface AuthCtx {
  session: Session | null
  user: User | null
  perfil: Usuario | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (nome: string, email: string, password: string) => Promise<{ needsConfirm: boolean }>
  signInWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshPerfil: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadPerfil(uid: string) {
    const { data } = await supabase.from('usuarios').select('*').eq('id', uid).maybeSingle()
    setPerfil(data as Usuario | null)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) loadPerfil(data.session.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess)
      if (sess?.user) loadPerfil(sess.user.id)
      else setPerfil(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn: AuthCtx['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp: AuthCtx['signUp'] = async (nome, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    })
    if (error) throw error
    // Se a confirmação de e-mail estiver ativa, não há sessão imediata.
    return { needsConfirm: !data.session }
  }

  const signInWithGoogle: AuthCtx['signInWithGoogle'] = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) throw error
  }

  const resetPassword: AuthCtx['resetPassword'] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar-senha?step=nova`,
    })
    if (error) throw error
  }

  const updatePassword: AuthCtx['updatePassword'] = async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  const signOut: AuthCtx['signOut'] = async () => {
    await supabase.auth.signOut()
    setPerfil(null)
  }

  const refreshPerfil = async () => {
    if (session?.user) await loadPerfil(session.user.id)
  }

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        perfil,
        loading,
        configured: isSupabaseConfigured,
        signIn,
        signUp,
        signInWithGoogle,
        resetPassword,
        updatePassword,
        signOut,
        refreshPerfil,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
