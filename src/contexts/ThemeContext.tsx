import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'

interface ThemeCtx {
  pref: ThemePref
  /** tema efetivo aplicado (resolve 'system') */
  resolved: 'light' | 'dark'
  setPref: (p: ThemePref) => void
  toggle: () => void
}

const Ctx = createContext<ThemeCtx | null>(null)
const KEY = 'mc_theme'

function systemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(
    () => (localStorage.getItem(KEY) as ThemePref) || 'light',
  )
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    pref === 'system' ? (systemDark() ? 'dark' : 'light') : pref,
  )

  useEffect(() => {
    const apply = () => {
      const next = pref === 'system' ? (systemDark() ? 'dark' : 'light') : pref
      setResolved(next)
      document.documentElement.classList.toggle('dark', next === 'dark')
    }
    apply()
    if (pref === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [pref])

  const setPref = (p: ThemePref) => {
    localStorage.setItem(KEY, p)
    setPrefState(p)
  }

  const toggle = () => setPref(resolved === 'dark' ? 'light' : 'dark')

  return <Ctx.Provider value={{ pref, resolved, setPref, toggle }}>{children}</Ctx.Provider>
}

export function useTheme() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  return ctx
}
