import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { supabase } from '@/lib/supabase'
import { daysUntil } from '@/lib/format'
import type { Carteira, ContaVirtual, PagamentoFatura, Recorrencia } from '@/lib/types'
import { chaveFatura, iso, ocorrenciasPendentes, proximaOcorrencia, resumoCartao } from './logic'

export type CarteiraInput = Omit<Carteira, 'id' | 'usuario_id' | 'criado_em'>
export type RecorrenciaInput = Omit<Recorrencia, 'id' | 'usuario_id' | 'criado_em'>

interface FinanceiroCtx {
  loading: boolean
  erro: string | null
  carteiras: Carteira[]
  recorrencias: Recorrencia[]
  /** pagamentos por chave de fatura (`${cartaoId}_${fimCiclo}`) */
  pagamentosFatura: Record<string, PagamentoFatura>
  salvarCarteira: (dados: CarteiraInput, id?: string) => Promise<void>
  removerCarteira: (id: string) => Promise<void>
  salvarRecorrencia: (dados: RecorrenciaInput, id?: string) => Promise<Recorrencia>
  removerRecorrencia: (id: string) => Promise<void>
  pagarFatura: (cartaoId: string, fimCiclo: string, carteiraId: string | null, valor: number) => Promise<void>
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
  const { despesas, reload } = useData()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [carteiras, setCarteiras] = useState<Carteira[]>([])
  const [recorrencias, setRecorrencias] = useState<Recorrencia[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoFatura[]>([])
  const materializando = useRef(false)

  const carregar = useCallback(async () => {
    if (!user) return
    const [c, r, p] = await Promise.all([
      supabase.from('carteiras').select('*').eq('usuario_id', user.id).order('criado_em'),
      supabase.from('recorrencias').select('*').eq('usuario_id', user.id).order('criado_em'),
      supabase.from('pagamentos_fatura').select('*').eq('usuario_id', user.id),
    ])
    const falha = c.error ?? r.error ?? p.error
    if (falha) {
      console.error(falha)
      setErro('Carteiras e recorrências indisponíveis. Verifique se a migração 002 foi aplicada no Supabase.')
      return
    }
    setErro(null)
    setCarteiras((c.data ?? []) as Carteira[])
    setRecorrencias((r.data ?? []) as Recorrencia[])
    setPagamentos((p.data ?? []) as PagamentoFatura[])
  }, [user])

  useEffect(() => {
    limparPreviewLocal()
    setLoading(true)
    carregar().finally(() => setLoading(false))
  }, [carregar])

  // Lança como receita/despesa real cada ocorrência vencida das recorrências ativas.
  // A constraint única (recorrencia_id, data) torna isso seguro contra execuções
  // repetidas (StrictMode, duas abas abertas etc.).
  useEffect(() => {
    if (!user || loading || erro || materializando.current) return
    const pendentes = recorrencias
      .map((rec) => ({ rec, datas: ocorrenciasPendentes(rec) }))
      .filter((p) => p.datas.length > 0)
    if (!pendentes.length) return

    materializando.current = true
    ;(async () => {
      try {
        const agora = new Date().toISOString()
        const linhas = (tipo: 'receita' | 'despesa') =>
          pendentes
            .filter((p) => p.rec.tipo === tipo)
            .flatMap(({ rec, datas }) =>
              datas.map((data) => ({
                usuario_id: user.id,
                descricao: rec.descricao,
                valor: rec.valor,
                valor_original: rec.valor,
                valor_convertido: rec.valor,
                moeda_original: 'BRL',
                taxa: 1,
                taxa_timestamp: agora,
                data,
                categoria_id: rec.categoria_id,
                carteira_id: rec.carteira_id,
                recorrencia_id: rec.id,
              })),
            )
        for (const [tabela, tipo] of [['receitas', 'receita'], ['despesas', 'despesa']] as const) {
          const rows = linhas(tipo)
          if (!rows.length) continue
          const { error } = await supabase
            .from(tabela)
            .upsert(rows, { onConflict: 'recorrencia_id,data', ignoreDuplicates: true })
          if (error) throw error
        }
        await Promise.all(
          pendentes.map(({ rec, datas }) =>
            supabase.from('recorrencias').update({ ultima_execucao: datas[datas.length - 1] }).eq('id', rec.id),
          ),
        )
        await Promise.all([carregar(), reload(['receitas', 'despesas'])])
      } catch (e) {
        console.error('[recorrências] falha ao lançar ocorrências', e)
      } finally {
        materializando.current = false
      }
    })()
  }, [user, loading, erro, recorrencias, carregar, reload])

  const pagamentosFatura = useMemo(
    () => Object.fromEntries(pagamentos.map((p) => [chaveFatura(p.cartao_id, p.fim_ciclo), p])),
    [pagamentos],
  )

  const salvarCarteira = useCallback<FinanceiroCtx['salvarCarteira']>(
    async (dados, id) => {
      if (!user) return
      const { error } = id
        ? await supabase.from('carteiras').update(dados).eq('id', id)
        : await supabase.from('carteiras').insert({ ...dados, usuario_id: user.id })
      if (error) throw error
      await carregar()
    },
    [user, carregar],
  )

  const removerCarteira = useCallback<FinanceiroCtx['removerCarteira']>(
    async (id) => {
      // FKs: transações e recorrências perdem o vínculo (set null); pagamentos do cartão somem (cascade).
      const { error } = await supabase.from('carteiras').delete().eq('id', id)
      if (error) throw error
      await Promise.all([carregar(), reload(['receitas', 'despesas'])])
    },
    [carregar, reload],
  )

  const salvarRecorrencia = useCallback<FinanceiroCtx['salvarRecorrencia']>(
    async (dados, id) => {
      if (!user) throw new Error('Sessão expirada.')
      const { data, error } = id
        ? await supabase.from('recorrencias').update(dados).eq('id', id).select().single()
        : await supabase.from('recorrencias').insert({ ...dados, usuario_id: user.id }).select().single()
      if (error) throw error
      await carregar()
      return data as Recorrencia
    },
    [user, carregar],
  )

  const removerRecorrencia = useCallback<FinanceiroCtx['removerRecorrencia']>(
    async (id) => {
      // lançamentos já gerados ficam no histórico (recorrencia_id vira null)
      const { error } = await supabase.from('recorrencias').delete().eq('id', id)
      if (error) throw error
      await Promise.all([carregar(), reload(['receitas', 'despesas'])])
    },
    [carregar, reload],
  )

  const pagarFatura = useCallback<FinanceiroCtx['pagarFatura']>(
    async (cartaoId, fimCiclo, carteiraId, valor) => {
      if (!user) return
      const { error } = await supabase.from('pagamentos_fatura').insert({
        usuario_id: user.id,
        cartao_id: cartaoId,
        fim_ciclo: fimCiclo,
        carteira_id: carteiraId,
        valor,
        data: iso(new Date()),
      })
      if (error) throw error
      await carregar()
    },
    [user, carregar],
  )

  const contasVirtuais = useMemo<ContaVirtual[]>(() => {
    const status = (venc: string, paga: boolean): ContaVirtual['status'] =>
      paga ? 'pago' : daysUntil(venc) < 0 ? 'atrasado' : 'pendente'

    const faturas = carteiras
      .filter((c) => c.tipo === 'cartao_credito')
      .flatMap((c) => {
        const r = resumoCartao(c, despesas, pagamentosFatura)
        const fechadas = r.fechadas.map((f): ContaVirtual => {
          const venc = iso(f.ciclo.vencimento)
          return {
            id: `fatura_${f.chave}`,
            usuario_id: c.usuario_id,
            descricao: `Fatura ${c.nome}`,
            valor: f.total,
            vencimento: venc,
            status: status(venc, f.paga),
            pago_em: pagamentosFatura[f.chave]?.data ?? null,
            criado_em: venc,
            virtual: true,
            origem: 'fatura',
            cartaoId: c.id,
            fimCiclo: iso(f.ciclo.fim),
          }
        })
        if (r.aberta.total <= 0) return fechadas
        const venc = iso(r.aberta.ciclo.vencimento)
        const aberta: ContaVirtual = {
          id: `fatura_aberta_${c.id}`,
          usuario_id: c.usuario_id,
          descricao: `Fatura ${c.nome} (em aberto)`,
          valor: r.aberta.total,
          vencimento: venc,
          status: 'pendente',
          pago_em: null,
          criado_em: venc,
          virtual: true,
          origem: 'fatura',
          cartaoId: c.id,
          faturaAberta: true,
          fechaEm: iso(r.aberta.ciclo.fim),
        }
        return [...fechadas, aberta]
      })

    // Recorrências no cartão entram na fatura; aqui só as que saem de conta/dinheiro.
    const recorrentes = recorrencias
      .filter((r) => r.ativo && r.tipo === 'despesa')
      .filter((r) => carteiras.find((c) => c.id === r.carteira_id)?.tipo !== 'cartao_credito')
      .map((r): ContaVirtual => {
        const venc = iso(proximaOcorrencia(r))
        return {
          id: `rec_${r.id}_${venc}`,
          usuario_id: r.usuario_id,
          descricao: r.descricao,
          valor: Number(r.valor),
          vencimento: venc,
          status: status(venc, false),
          pago_em: null,
          criado_em: venc,
          virtual: true,
          origem: 'recorrencia',
          recorrenciaId: r.id,
        }
      })

    return [...faturas, ...recorrentes]
  }, [carteiras, recorrencias, despesas, pagamentosFatura])

  const value = useMemo<FinanceiroCtx>(
    () => ({
      loading,
      erro,
      carteiras,
      recorrencias,
      pagamentosFatura,
      salvarCarteira,
      removerCarteira,
      salvarRecorrencia,
      removerRecorrencia,
      pagarFatura,
      contasVirtuais,
    }),
    [loading, erro, carteiras, recorrencias, pagamentosFatura, salvarCarteira, removerCarteira, salvarRecorrencia, removerRecorrencia, pagarFatura, contasVirtuais],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useFinanceiro() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useFinanceiro deve ser usado dentro de FinanceiroProvider')
  return ctx
}
