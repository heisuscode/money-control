import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import type { Categoria, Conta, Meta, Movimentacao, Notificacao } from '@/lib/types'
import { fetchRates, type RateMap } from '@/lib/exchange'
import { daysUntil } from '@/lib/format'
import { runNotificationEngine } from '@/lib/notifications'

interface DataCtx {
  loading: boolean
  error: string | null
  categorias: Categoria[]
  receitas: Movimentacao[]
  despesas: Movimentacao[]
  contas: Conta[]
  metas: Meta[]
  notificacoes: Notificacao[]
  rates: RateMap
  refreshAll: () => Promise<void>
  refreshRates: () => Promise<void>
  reload: (
    keys?: Array<'categorias' | 'receitas' | 'despesas' | 'contas' | 'metas' | 'notificacoes'>,
  ) => Promise<void>
}

const Ctx = createContext<DataCtx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [receitas, setReceitas] = useState<Movimentacao[]>([])
  const [despesas, setDespesas] = useState<Movimentacao[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [metas, setMetas] = useState<Meta[]>([])
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [rates, setRates] = useState<RateMap>({})

  const loadCategorias = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('usuario_id', uid)
      .order('is_padrao', { ascending: false })
      .order('nome')
    if (error) throw error
    setCategorias((data ?? []) as Categoria[])
  }, [])

  const loadMov = useCallback(
    async (uid: string, table: 'receitas' | 'despesas') => {
      const { data, error } = await supabase
        .from(table)
        .select('*, categoria:categorias(*)')
        .eq('usuario_id', uid)
        .order('data', { ascending: false })
      if (error) throw error
      const rows = (data ?? []).map((r) => ({
        ...r,
        tipo: table === 'receitas' ? 'receita' : 'despesa',
      })) as Movimentacao[]
      if (table === 'receitas') setReceitas(rows)
      else setDespesas(rows)
    },
    [],
  )

  const syncContaStatus = useCallback(async (rows: Conta[]) => {
    // RN03: contas pendentes cujo vencimento passou viram "atrasado".
    const toUpdate = rows.filter(
      (c) => c.status === 'pendente' && daysUntil(c.vencimento) < 0,
    )
    if (toUpdate.length) {
      await Promise.all(
        toUpdate.map((c) =>
          supabase.from('contas').update({ status: 'atrasado' }).eq('id', c.id),
        ),
      )
      return rows.map((c) =>
        toUpdate.find((u) => u.id === c.id) ? { ...c, status: 'atrasado' as const } : c,
      )
    }
    return rows
  }, [])

  const loadContas = useCallback(
    async (uid: string) => {
      const { data, error } = await supabase
        .from('contas')
        .select('*')
        .eq('usuario_id', uid)
        .order('vencimento')
      if (error) throw error
      const synced = await syncContaStatus((data ?? []) as Conta[])
      setContas(synced)
    },
    [syncContaStatus],
  )

  const loadMetas = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('metas')
      .select('*')
      .eq('usuario_id', uid)
      .order('criado_em', { ascending: false })
    if (error) throw error
    setMetas((data ?? []) as Meta[])
  }, [])

  const loadNotificacoes = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('usuario_id', uid)
      .order('criado_em', { ascending: false })
    if (error) throw error
    setNotificacoes((data ?? []) as Notificacao[])
  }, [])

  const refreshRates = useCallback(async () => {
    const r = await fetchRates(true).catch(() => ({}) as RateMap)
    setRates(r)
  }, [])

  const refreshAll = useCallback(async () => {
    if (!user || !configured) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await fetchRates().catch(() => ({}) as RateMap)
      setRates(r)
      await Promise.all([
        loadCategorias(user.id),
        loadMov(user.id, 'receitas'),
        loadMov(user.id, 'despesas'),
        loadContas(user.id),
        loadMetas(user.id),
        loadNotificacoes(user.id),
      ])
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [user, configured, loadCategorias, loadMov, loadContas, loadMetas, loadNotificacoes])

  const reload: DataCtx['reload'] = useCallback(
    async (keys) => {
      if (!user) return
      const all = !keys
      const jobs: Promise<unknown>[] = []
      if (all || keys?.includes('categorias')) jobs.push(loadCategorias(user.id))
      if (all || keys?.includes('receitas')) jobs.push(loadMov(user.id, 'receitas'))
      if (all || keys?.includes('despesas')) jobs.push(loadMov(user.id, 'despesas'))
      if (all || keys?.includes('contas')) jobs.push(loadContas(user.id))
      if (all || keys?.includes('metas')) jobs.push(loadMetas(user.id))
      if (all || keys?.includes('notificacoes')) jobs.push(loadNotificacoes(user.id))
      await Promise.all(jobs)
    },
    [user, loadCategorias, loadMov, loadContas, loadMetas, loadNotificacoes],
  )

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, configured])

  // Motor de notificações inteligentes (RF09): roda quando os dados mudam.
  useEffect(() => {
    if (!user || loading) return
    runNotificationEngine({
      uid: user.id,
      contas,
      metas,
      despesas,
      categorias,
      existentes: notificacoes,
    }).then((created) => {
      if (created) loadNotificacoes(user.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, contas, metas, despesas, categorias])

  return (
    <Ctx.Provider
      value={{
        loading,
        error,
        categorias,
        receitas,
        despesas,
        contas,
        metas,
        notificacoes,
        rates,
        refreshAll,
        refreshRates,
        reload,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useData() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData deve ser usado dentro de DataProvider')
  return ctx
}
