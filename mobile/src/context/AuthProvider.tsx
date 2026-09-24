import type { Session } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '~/lib/supabase'

interface AuthCtx {
  sessao: Session | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<string | null>
  entrarComGoogle: () => Promise<string | null>
  sair: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

// Endereço para onde o Google/Supabase devolve o usuário: moneycontrol://auth-callback
// no APK e exp://<ip>:8081/--/auth-callback no Expo Go. Precisa estar liberado em
// Supabase → Authentication → URL Configuration → Redirect URLs.
export const URL_RETORNO_LOGIN = Linking.createURL('auth-callback')

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova))
    return () => data.subscription.unsubscribe()
  }, [])

  async function entrar(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (!error) return null
    return error.message.includes('Invalid login') ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar. Tente de novo.'
  }

  async function entrarComGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: URL_RETORNO_LOGIN, skipBrowserRedirect: true },
    })
    if (error || !data.url) return 'Não foi possível iniciar o login com Google.'

    const resultado = await WebBrowser.openAuthSessionAsync(data.url, URL_RETORNO_LOGIN)
    if (resultado.type !== 'success') return null // usuário fechou o navegador

    const { queryParams } = Linking.parse(resultado.url)
    const codigo = typeof queryParams?.code === 'string' ? queryParams.code : null
    if (!codigo) {
      const erro = queryParams?.error_description ?? queryParams?.error
      return erro ? `Login com Google recusado: ${String(erro)}` : 'O Google não devolveu o login. Tente de novo.'
    }
    const troca = await supabase.auth.exchangeCodeForSession(codigo)
    return troca.error ? 'Não foi possível concluir o login com Google.' : null
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  return <Ctx.Provider value={{ sessao, carregando, entrar, entrarComGoogle, sair }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
