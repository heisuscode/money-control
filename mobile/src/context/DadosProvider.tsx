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
  Meta,
  Movimentacao,
  Notificacao,
  PagamentoFatura,
  Recorrencia,
} from '@/lib/types'
import { supabase } from '~/lib/supabase'
import { agendarLembretes } from '~/lib/lembretes'
import { useAuth } from './AuthProvider'
import { usePreferencias } from './Preferencias'

/** Campos editáveis de uma transação já lançada. */
export interface EdicaoTransacao {
  descricao: string
  /** novo valor em reais; ignorado em transações feitas em moeda estrangeira */
  valor: number
  data: string
  categoriaId: string | null
  carteiraId: string | null
}

export type MetaInput = Pick<Meta, 'objetivo' | 'valor_meta' | 'valor_atual' | 'prazo' | 'icone' | 'cor'>

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
  metas: Meta[]
  notificacoes: Notificacao[]
  recarregar: () => Promise<void>
  registrarTransacao: (t: api.NovaTransacao) => Promise<void>
  editarTransacao: (m: Movimentacao, dados: EdicaoTransacao) => Promise<void>
  excluirTransacao: (m: Movimentacao) => Promise<void>
  salvarCarteira: (dados: api.CarteiraInput, id?: string) => Promise<void>
  removerCarteira: (id: string) => Promise<void>
  salvarRecorrencia: (dados: api.RecorrenciaInput, id: string) => Promise<void>
  removerRecorrencia: (id: string) => Promise<void>
  definirOrcamento: (categoriaId: string, orcamento: number) => Promise<void>
  salvarMeta: (dados: MetaInput, id?: string) => Promise<void>
  removerMeta: (id: string) => Promise<void>
  marcarNotificacoesLidas: (ids?: string[]) => Promise<void>
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

interface Tudo {
  categorias: Categoria[]
  receitas: Movimentacao[]
  despesas: Movimentacao[]
  contas: Conta[]
  fin: api.DadosFinanceiros
  metas: Meta[]
  notificacoes: Notificacao[]
}

async function buscarTudo(uid: string): Promise<Tudo> {
  const [cats, rec, des, cts, fin, mts, nts] = await Promise.all([
    supabase.from('categorias').select('*').eq('usuario_id', uid).order('nome'),
    carregarMovimentacoes(uid, 'receitas'),
    carregarMovimentacoes(uid, 'despesas'),
    supabase.from('contas').select('*').eq('usuario_id', uid).order('vencimento'),
    api.carregarFinanceiro(supabase, uid),
    supabase.from('metas').select('*').eq('usuario_id', uid).order('criado_em', { ascending: false }),
    supabase.from('notificacoes').select('*').eq('usuario_id', uid).order('criado_em', { ascending: false }).limit(100),
  ])
  for (const r of [cats, cts, mts, nts]) if (r.error) throw r.error
  return {
    categorias: (cats.data ?? []) as Categoria[],
    receitas: rec,
    despesas: des,
    // conta pendente com vencimento passado aparece como atrasada (como no site)
    contas: ((cts.data ?? []) as Conta[]).map((c) =>
      c.status === 'pendente' && daysUntil(c.vencimento) < 0 ? { ...c, status: 'atrasado' as const } : c,
    ),
    fin,
    metas: (mts.data ?? []) as Meta[],
    notificacoes: (nts.data ?? []) as Notificacao[],
  }
}

export function DadosProvider({ children }: { children: ReactNode }) {
  const { sessao } = useAuth()
  const uid = sessao?.user.id
  const [erro, setErro] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [receitas, setReceitas] = useState<Movimentacao[]>([])
  const [despesas, setDespesas] = useState<Movimentacao[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [carteiras, setCarteiras] = useState<Carteira[]>([])
  const [recorrencias, setRecorrencias] = useState<Recorrencia[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoFatura[]>([])
  const [metas, setMetas] = useState<Meta[]>([])
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const { lembretes } = usePreferencias()
  const lancando = useRef(false)

  const aplicar = useCallback((t: Tudo) => {
    setMetas(t.metas)
    setNotificacoes(t.notificacoes)
    setCategorias(t.categorias)
    setReceitas(t.receitas)
    setDespesas(t.despesas)
    setContas(t.contas)
    setCarteiras(t.fin.carteiras)
    setRecorrencias(t.fin.recorrencias)
    setPagamentos(t.fin.pagamentos)
    setErro(null)
  }, [])

  const falhar = useCallback((e: unknown) => {
    console.error(e)
    setErro('Não foi possível carregar seus dados. Verifique a conexão e puxe para atualizar.')
  }, [])

  const recarregar = useCallback(async () => {
    if (!uid) return
    await buscarTudo(uid).then(aplicar, falhar)
  }, [uid, aplicar, falhar])

  // Primeira busca deste usuário: "carregando" até ela terminar.
  const [carregadoPara, setCarregadoPara] = useState<string | null>(null)
  const carregando = !!uid && carregadoPara !== uid
  useEffect(() => {
    if (!uid) return
    let vivo = true
    buscarTudo(uid)
      .then((t) => vivo && aplicar(t), (e) => vivo && falhar(e))
      .finally(() => vivo && setCarregadoPara(uid))
    return () => {
      vivo = false
    }
  }, [uid, aplicar, falhar])

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

  // Lembretes locais de vencimento (padrão: 1 dia antes, 9h — ajustável em Configurações).
  useEffect(() => {
    if (carregando || erro) return
    agendarLembretes([...contas, ...contasVirtuais], lembretes).catch((e) => console.warn('[lembretes]', e))
  }, [carregando, erro, contas, contasVirtuais, lembretes])

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
    metas,
    notificacoes,
    recarregar,
    registrarTransacao: async (t) => {
      await api.registrarTransacao(supabase, exigirUid(), t)
      await recarregar()
    },
    editarTransacao: async (m, e) => {
      const emReais = (m.moeda_original ?? 'BRL') === 'BRL'
      const { error } = await supabase
        .from(m.tipo === 'receita' ? 'receitas' : 'despesas')
        .update({
          descricao: e.descricao,
          data: e.data,
          categoria_id: e.categoriaId,
          carteira_id: e.carteiraId,
          ...(emReais ? { valor: e.valor, valor_convertido: e.valor, valor_original: e.valor } : {}),
        })
        .eq('id', m.id)
      if (error) throw error
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
    removerCarteira: async (id) => {
      await api.removerCarteira(supabase, id)
      await recarregar()
    },
    salvarRecorrencia: async (dados, id) => {
      await api.salvarRecorrencia(supabase, exigirUid(), dados, id)
      await recarregar()
    },
    removerRecorrencia: async (id) => {
      await api.removerRecorrencia(supabase, id)
      await recarregar()
    },
    definirOrcamento: async (categoriaId, orcamento) => {
      const { error } = await supabase.from('categorias').update({ orcamento }).eq('id', categoriaId)
      if (error) throw error
      await recarregar()
    },
    salvarMeta: async (dados, id) => {
      const { error } = id
        ? await supabase.from('metas').update(dados).eq('id', id)
        : await supabase.from('metas').insert({ ...dados, usuario_id: exigirUid() })
      if (error) throw error
      await recarregar()
    },
    removerMeta: async (id) => {
      const { error } = await supabase.from('metas').delete().eq('id', id)
      if (error) throw error
      await recarregar()
    },
    marcarNotificacoesLidas: async (ids) => {
      const alvo = ids ?? notificacoes.filter((n) => !n.lida).map((n) => n.id)
      if (!alvo.length) return
      setNotificacoes((atual) => atual.map((n) => (alvo.includes(n.id) ? { ...n, lida: true } : n)))
      const { error } = await supabase.from('notificacoes').update({ lida: true }).in('id', alvo)
      if (error) {
        await recarregar()
        throw error
      }
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
