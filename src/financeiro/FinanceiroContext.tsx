import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { runNotificationEngine } from '@/lib/notifications'
import { supabase } from '@/lib/supabase'
import type { Carteira, ContaVirtual, PagamentoFatura, Recorrencia } from '@/lib/types'
import * as api from './api'
import { indexarPagamentos, montarContasVirtuais, type PagamentosDaFatura } from './contasVirtuais'

export type { CarteiraInput, RecorrenciaInput } from './api'

interface FinanceiroCtx {
  loading: boolean
  erro: string | null
  carteiras: Carteira[]
  recorrencias: Recorrencia[]
  /** pagamentos agrupados por chave de fatura (`${cartaoId}_${fimCiclo}`) */
  pagamentosFatura: Record<string, PagamentosDaFatura>
  /** todos os pagamentos de fatura (para o saldo das contas pagadoras) */
  pagamentos: PagamentoFatura[]
  salvarCarteira: (dados: api.CarteiraInput, id?: string) => Promise<void>
  removerCarteira: (id: string) => Promise<void>
  salvarRecorrencia: (dados: api.RecorrenciaInput, id?: string) => Promise<Recorrencia>
  removerRecorrencia: (id: string) => Promise<void>
  pagarFatura: (cartaoId: string, fimCiclo: string, carteiraId: string | null, valor: number) => Promise<void>
  registrarTransacao: (t: api.NovaTransacao) => Promise<void>
  /** Faturas de cartão + próxima ocorrência das recorrências que saem de conta/dinheiro. */
  contasVirtuais: ContaVirtual[]
}

const Ctx = createContext<FinanceiroCtx | null>(null)

// Chaves da pré-visualização antiga (dados só no navegador), substituída pelo Supabase.
function limparPreviewLocal() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('mc_preview__'))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    // sem localStorage: nada a limpar
  }
}

export function FinanceiroProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { despesas, notificacoes, loading: dadosCarregando, reload } = useData()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [carteiras, setCarteiras] = useState<Carteira[]>([])
  const [recorrencias, setRecorrencias] = useState<Recorrencia[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoFatura[]>([])
  const lancando = useRef(false)

  const carregar = useCallback(async () => {
    if (!user) return
    try {
      const dados = await api.carregarFinanceiro(supabase, user.id)
      setErro(null)
      setCarteiras(dados.carteiras)
      setRecorrencias(dados.recorrencias)
      setPagamentos(dados.pagamentos)
    } catch (e) {
      console.error(e)
      setErro('Carteiras e recorrências indisponíveis. Verifique se as migrações do Supabase foram aplicadas.')
    }
  }, [user])

  useEffect(() => {
    limparPreviewLocal()
    setLoading(true)
    carregar().finally(() => setLoading(false))
  }, [carregar])

  // Carteiras criadas em outra aba/aparelho (ex.: no celular) aparecem ao voltar para esta.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') carregar()
    }
    window.addEventListener('focus', aoVoltar)
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      window.removeEventListener('focus', aoVoltar)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [carregar])

  // Lança como receita/despesa real cada ocorrência vencida (inclui parcelas).
  useEffect(() => {
    if (!user || loading || erro || lancando.current) return
    lancando.current = true
    api
      .lancarRecorrenciasPendentes(supabase, user.id, recorrencias)
      .then((n) => (n ? Promise.all([carregar(), reload(['receitas', 'despesas'])]) : undefined))
      .catch((e) => console.error('[recorrências] falha ao lançar ocorrências', e))
      .finally(() => {
        lancando.current = false
      })
  }, [user, loading, erro, recorrencias, carregar, reload])

  const pagamentosFatura = useMemo(() => indexarPagamentos(pagamentos), [pagamentos])

  const salvarCarteira = useCallback<FinanceiroCtx['salvarCarteira']>(
    async (dados, id) => {
      if (!user) return
      await api.salvarCarteira(supabase, user.id, dados, id)
      await carregar()
    },
    [user, carregar],
  )

  const removerCarteira = useCallback<FinanceiroCtx['removerCarteira']>(
    async (id) => {
      await api.removerCarteira(supabase, id)
      await Promise.all([carregar(), reload(['receitas', 'despesas'])])
    },
    [carregar, reload],
  )

  const salvarRecorrencia = useCallback<FinanceiroCtx['salvarRecorrencia']>(
    async (dados, id) => {
      if (!user) throw new Error('Sessão expirada.')
      const rec = await api.salvarRecorrencia(supabase, user.id, dados, id)
      await carregar()
      return rec
    },
    [user, carregar],
  )

  const removerRecorrencia = useCallback<FinanceiroCtx['removerRecorrencia']>(
    async (id) => {
      await api.removerRecorrencia(supabase, id)
      await Promise.all([carregar(), reload(['receitas', 'despesas'])])
    },
    [carregar, reload],
  )

  const pagarFatura = useCallback<FinanceiroCtx['pagarFatura']>(
    async (cartaoId, fimCiclo, carteiraId, valor) => {
      if (!user) return
      await api.pagarFatura(supabase, user.id, cartaoId, fimCiclo, carteiraId, valor)
      await carregar()
    },
    [user, carregar],
  )

  const registrarTransacao = useCallback<FinanceiroCtx['registrarTransacao']>(
    async (t) => {
      if (!user) throw new Error('Sessão expirada. Faça login novamente.')
      await api.registrarTransacao(supabase, user.id, t)
      await Promise.all([carregar(), reload([t.tipo === 'receita' ? 'receitas' : 'despesas'])])
    },
    [user, carregar, reload],
  )

  const contasVirtuais = useMemo(
    () => montarContasVirtuais(carteiras, recorrencias, despesas, pagamentosFatura),
    [carteiras, recorrencias, despesas, pagamentosFatura],
  )

  // Avisos de vencimento também para faturas e recorrências (o motor do DataContext
  // só enxerga as contas cadastradas). As chaves por id+vencimento evitam repetir.
  useEffect(() => {
    if (!user || loading || erro || dadosCarregando) return
    runNotificationEngine({
      uid: user.id,
      contas: contasVirtuais,
      metas: [],
      despesas: [],
      categorias: [],
      existentes: notificacoes,
    }).then((criou) => {
      if (criou) reload(['notificacoes'])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, erro, dadosCarregando, contasVirtuais])

  const value = useMemo<FinanceiroCtx>(
    () => ({
      loading,
      erro,
      carteiras,
      recorrencias,
      pagamentosFatura,
      pagamentos,
      salvarCarteira,
      removerCarteira,
      salvarRecorrencia,
      removerRecorrencia,
      pagarFatura,
      registrarTransacao,
      contasVirtuais,
    }),
    [loading, erro, carteiras, recorrencias, pagamentosFatura, pagamentos, salvarCarteira, removerCarteira, salvarRecorrencia, removerRecorrencia, pagarFatura, registrarTransacao, contasVirtuais],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useFinanceiro() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useFinanceiro deve ser usado dentro de FinanceiroProvider')
  return ctx
}
