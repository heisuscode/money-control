import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import * as api from '@/financeiro/api'
import { indexarPagamentos, montarContasVirtuais } from '@/financeiro/contasVirtuais'
import { daysUntil } from '@/lib/format'
import type {
  Carteira,
  Categoria,
  Conta,
  ContaVirtual,
  Movimentacao,
  PagamentoFatura,
  Recorrencia,
} from '@/lib/types'
import { supabase } from '~/lib/supabase'
import { agendarLembretes } from '~/lib/lembretes'
import { useAuth } from './AuthProvider'

interface DadosCtx {
  carregando: boolean
  erro: string | null
  categorias: Categoria[]
  receitas: Movimentacao[]
  despesas: Movimentacao[]
  contas: Conta[]
  carteiras: Carteira[]
  recorrencias: Recorrencia[]
  pagamentosFatura: Record<string, PagamentoFatura>
  contasVirtuais: ContaVirtual[]
  recarregar: () => Promise<void>
  registrarTransacao: (t: api.NovaTransacao) => Promise<void>
  excluirTransacao: (m: Movimentacao) => Promise<void>
  salvarCarteira: (dados: api.CarteiraInput, id?: string) => Promise<void>
  pagarFatura: (cartaoId: string, fimCiclo: string, carteiraId: string | null, valor: number) => Promise<void>
  marcarContaPaga: (id: string) => Promise<void>
}

const Ctx = createContext<DadosCtx | null>(null)

async function carregarMovimentacoes(uid: string, tabela: 'receitas' | 'despesas') {
  const { data, error } = await supabase
    .from(tabela)
    .select('*, categoria:categorias(*)')
    .eq('usuario_id', uid)
    .order('data', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({ ...r, tipo: tabela === 'receitas' ? 'receita' : 'despesa' })) as Movimentacao[]
}

export function DadosProvider({ children }: { children: ReactNode }) {
  const { sessao } = useAuth()
  const uid = sessao?.user.id
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [receitas, setReceitas] = useState<Movimentacao[]>([])
  const [despesas, setDespesas] = useState<Movimentacao[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [carteiras, setCarteiras] = useState<Carteira[]>([])
  const [recorrencias, setRecorrencias] = useState<Recorrencia[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoFatura[]>([])
  const lancando = useRef(false)

  const recarregar = useCallback(async () => {
    if (!uid) return
    try {
      const [cats, rec, des, cts, fin] = await Promise.all([
        supabase.from('categorias').select('*').eq('usuario_id', uid).order('nome'),
        carregarMovimentacoes(uid, 'receitas'),
        carregarMovimentacoes(uid, 'despesas'),
        supabase.from('contas').select('*').eq('usuario_id', uid).order('vencimento'),
        api.carregarFinanceiro(supabase, uid),
      ])
      if (cats.error) throw cats.error
      if (cts.error) throw cts.error
      setCategorias((cats.data ?? []) as Categoria[])
      setReceitas(rec)
      setDespesas(des)
      // conta pendente com vencimento passado aparece como atrasada (como no site)
      setContas(
        ((cts.data ?? []) as Conta[]).map((c) =>
          c.status === 'pendente' && daysUntil(c.vencimento) < 0 ? { ...c, status: 'atrasado' } : c,
        ),
      )
      setCarteiras(fin.carteiras)
      setRecorrencias(fin.recorrencias)
      setPagamentos(fin.pagamentos)
      setErro(null)
    } catch (e) {
      console.error(e)
      setErro('Não foi possível carregar seus dados. Verifique a conexão e puxe para atualizar.')
    }
  }, [uid])

  useEffect(() => {
    setCarregando(true)
    recarregar().finally(() => setCarregando(false))
  }, [recarregar])

  // Volta ao app: busca de novo (algo pode ter sido lançado pelo site).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') recarregar()
    })
    return () => sub.remove()
  }, [recarregar])

  // Recorrências e parcelas vencidas viram lançamentos reais (mesma regra do site).
  useEffect(() => {
    if (!uid || carregando || erro || lancando.current) return
    lancando.current = true
    api
      .lancarRecorrenciasPendentes(supabase, uid, recorrencias)
      .then((n) => (n ? recarregar() : undefined))
      .catch((e) => console.error('[recorrências]', e))
      .finally(() => {
        lancando.current = false
      })
  }, [uid, carregando, erro, recorrencias, recarregar])

  const pagamentosFatura = useMemo(() => indexarPagamentos(pagamentos), [pagamentos])
  const contasVirtuais = useMemo(
    () => montarContasVirtuais(carteiras, recorrencias, despesas, pagamentosFatura),
    [carteiras, recorrencias, despesas, pagamentosFatura],
  )

  // Lembretes locais de vencimento (1 dia antes, 9h).
  useEffect(() => {
    if (carregando || erro) return
    agendarLembretes([...contas, ...contasVirtuais]).catch((e) => console.warn('[lembretes]', e))
  }, [carregando, erro, contas, contasVirtuais])

  const exigirUid = () => {
    if (!uid) throw new Error('Sessão expirada. Entre novamente.')
    return uid
  }

  const value: DadosCtx = {
    carregando,
    erro,
    categorias,
    receitas,
    despesas,
    contas,
    carteiras,
    recorrencias,
    pagamentosFatura,
    contasVirtuais,
    recarregar,
    registrarTransacao: async (t) => {
      await api.registrarTransacao(supabase, exigirUid(), t)
      await recarregar()
    },
    excluirTransacao: async (m) => {
      const { error } = await supabase.from(m.tipo === 'receita' ? 'receitas' : 'despesas').delete().eq('id', m.id)
      if (error) throw error
      await recarregar()
    },
    salvarCarteira: async (dados, id) => {
      await api.salvarCarteira(supabase, exigirUid(), dados, id)
      await recarregar()
    },
    pagarFatura: async (cartaoId, fimCiclo, carteiraId, valor) => {
      await api.pagarFatura(supabase, exigirUid(), cartaoId, fimCiclo, carteiraId, valor)
      await recarregar()
    },
    marcarContaPaga: async (id) => {
      await api.marcarContaPaga(supabase, id)
      await recarregar()
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useDados() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDados deve ser usado dentro de DadosProvider')
  return ctx
}
