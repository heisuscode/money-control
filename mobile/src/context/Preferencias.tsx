import { createContext, useContext, useState, type ReactNode } from 'react'
import { formatCurrency } from '@/lib/format'

// Preferências do aparelho (não vão para o banco): guardadas no localStorage do
// expo-sqlite, instalado em ~/lib/supabase.

export interface ConfigLembretes {
  ativo: boolean
  /** hora do aviso (0–23) */
  hora: number
  /** quantos dias antes do vencimento */
  antecedencia: number
}

interface Prefs {
  ocultarValores: boolean
  lembretes: ConfigLembretes
  /** já passou pela tela "Ativar lembretes" */
  lembretesApresentados: boolean
}

const PADRAO: Prefs = {
  ocultarValores: false,
  lembretes: { ativo: true, hora: 9, antecedencia: 1 },
  lembretesApresentados: false,
}
const CHAVE = 'mc_prefs'

function ler(): Prefs {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return PADRAO
    const salvo = JSON.parse(bruto) as Partial<Prefs>
    return { ...PADRAO, ...salvo, lembretes: { ...PADRAO.lembretes, ...salvo.lembretes } }
  } catch {
    return PADRAO
  }
}

interface PrefsCtx extends Prefs {
  mudar: (parcial: Partial<Prefs>) => void
  /** formata em reais respeitando "ocultar valores" */
  dinheiro: (valor: number) => string
}

const Ctx = createContext<PrefsCtx | null>(null)

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(ler)

  function mudar(parcial: Partial<Prefs>) {
    setPrefs((atual) => {
      const novo = { ...atual, ...parcial }
      try {
        localStorage.setItem(CHAVE, JSON.stringify(novo))
      } catch {
        /* sem armazenamento: vale só nesta sessão */
      }
      return novo
    })
  }

  const dinheiro = (valor: number) => (prefs.ocultarValores ? 'R$ ••••' : formatCurrency(valor))

  return <Ctx.Provider value={{ ...prefs, mudar, dinheiro }}>{children}</Ctx.Provider>
}

export function usePreferencias() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePreferencias deve ser usado dentro de PreferenciasProvider')
  return ctx
}
