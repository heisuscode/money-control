// Operações de dados compartilhadas entre o site (Vite) e o app (Expo).
// Recebem o cliente Supabase como parâmetro: cada plataforma cria o seu
// (variáveis de ambiente e armazenamento de sessão são diferentes).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Carteira, PagamentoFatura, Recorrencia, TipoCategoria, FrequenciaRecorrencia } from '@/lib/types'
import { dividirEmParcelas, iso, numeroParcela, ocorrenciasPendentes, valorDaParcela } from './logic'

export type CarteiraInput = Omit<Carteira, 'id' | 'usuario_id' | 'criado_em'>
export type RecorrenciaInput = Omit<Recorrencia, 'id' | 'usuario_id' | 'criado_em'>

export interface DadosFinanceiros {
  carteiras: Carteira[]
  recorrencias: Recorrencia[]
  pagamentos: PagamentoFatura[]
}

export async function carregarFinanceiro(sb: SupabaseClient, uid: string): Promise<DadosFinanceiros> {
  const [c, r, p] = await Promise.all([
    sb.from('carteiras').select('*').eq('usuario_id', uid).order('criado_em'),
    sb.from('recorrencias').select('*').eq('usuario_id', uid).order('criado_em'),
    sb.from('pagamentos_fatura').select('*').eq('usuario_id', uid),
  ])
  const falha = c.error ?? r.error ?? p.error
  if (falha) throw falha
  return {
    carteiras: (c.data ?? []) as Carteira[],
    recorrencias: (r.data ?? []) as Recorrencia[],
    pagamentos: (p.data ?? []) as PagamentoFatura[],
  }
}

/**
 * Lança como receita/despesa real cada ocorrência vencida das recorrências ativas
 * (inclui parcelas). A constraint única (recorrencia_id, data) torna isso seguro
 * contra execuções repetidas — StrictMode, duas abas, site e app ao mesmo tempo.
 * Retorna quantas recorrências tinham lançamentos pendentes.
 */
export async function lancarRecorrenciasPendentes(sb: SupabaseClient, uid: string, recorrencias: Recorrencia[]) {
  const pendentes = recorrencias.map((rec) => ({ rec, datas: ocorrenciasPendentes(rec) })).filter((p) => p.datas.length)
  if (!pendentes.length) return 0

  const agora = new Date().toISOString()
  const linhas = (tipo: TipoCategoria) =>
    pendentes
      .filter((p) => p.rec.tipo === tipo)
      .flatMap(({ rec, datas }) =>
        datas.map((data) => {
          const k = rec.parcelas_total ? numeroParcela(rec, data) : 0
          const valor = rec.parcelas_total ? valorDaParcela(rec, k) : Number(rec.valor)
          return {
            usuario_id: uid,
            descricao: rec.parcelas_total ? `${rec.descricao} (${k}/${rec.parcelas_total})` : rec.descricao,
            valor,
            valor_original: valor,
            valor_convertido: valor,
            moeda_original: 'BRL',
            taxa: 1,
            taxa_timestamp: agora,
            data,
            categoria_id: rec.categoria_id,
            carteira_id: rec.carteira_id,
            recorrencia_id: rec.id,
          }
        }),
      )

  for (const [tabela, tipo] of [['receitas', 'receita'], ['despesas', 'despesa']] as const) {
    const rows = linhas(tipo)
    if (!rows.length) continue
    const { error } = await sb.from(tabela).upsert(rows, { onConflict: 'recorrencia_id,data', ignoreDuplicates: true })
    if (error) throw error
  }
  await Promise.all(
    pendentes.map(({ rec, datas }) =>
      sb.from('recorrencias').update({ ultima_execucao: datas[datas.length - 1] }).eq('id', rec.id),
    ),
  )
  return pendentes.length
}

export async function salvarCarteira(sb: SupabaseClient, uid: string, dados: CarteiraInput, id?: string) {
  const { error } = id
    ? await sb.from('carteiras').update(dados).eq('id', id)
    : await sb.from('carteiras').insert({ ...dados, usuario_id: uid })
  if (error) throw error
}

/** Transações e recorrências perdem o vínculo (set null); pagamentos do cartão somem (cascade). */
export async function removerCarteira(sb: SupabaseClient, id: string) {
  const { error } = await sb.from('carteiras').delete().eq('id', id)
  if (error) throw error
}

export async function salvarRecorrencia(sb: SupabaseClient, uid: string, dados: RecorrenciaInput, id?: string) {
  const { data, error } = id
    ? await sb.from('recorrencias').update(dados).eq('id', id).select().single()
    : await sb.from('recorrencias').insert({ ...dados, usuario_id: uid }).select().single()
  if (error) throw error
  return data as Recorrencia
}

/** Lançamentos já gerados ficam no histórico (recorrencia_id vira null). */
export async function removerRecorrencia(sb: SupabaseClient, id: string) {
  const { error } = await sb.from('recorrencias').delete().eq('id', id)
  if (error) throw error
}

/** Pagamento de fatura: transferência da conta pagadora (as compras já são despesas). */
export async function pagarFatura(
  sb: SupabaseClient,
  uid: string,
  cartaoId: string,
  fimCiclo: string,
  carteiraId: string | null,
  valor: number,
) {
  const { error } = await sb.from('pagamentos_fatura').insert({
    usuario_id: uid,
    cartao_id: cartaoId,
    fim_ciclo: fimCiclo,
    carteira_id: carteiraId,
    valor,
    data: iso(new Date()),
  })
  if (error) throw error
}

export async function marcarContaPaga(sb: SupabaseClient, contaId: string) {
  const { error } = await sb.from('contas').update({ status: 'pago', pago_em: iso(new Date()) }).eq('id', contaId)
  if (error) throw error
}

export interface NovaTransacao {
  tipo: TipoCategoria
  descricao: string
  /** valor em BRL (já convertido) */
  valorBRL: number
  /** valor na moeda original digitada */
  valorOriginal: number
  moeda: string
  taxa: number
  taxaTimestamp: string
  data: string
  categoriaId: string | null
  carteiraId: string | null
  /** 1 = à vista; 2+ = parcelado (só despesa no cartão) */
  parcelas?: number
  /** repetir automaticamente (ignorado se parcelado) */
  repetir?: FrequenciaRecorrencia | null
}

/**
 * Registra uma transação nova. Parcelada ou recorrente vira uma recorrência que
 * já nasce "executada" nesta data: este lançamento é a 1ª ocorrência (vinculada
 * a ela) e as próximas são geradas automaticamente. Se o lançamento falhar, a
 * recorrência criada é desfeita.
 */
export async function registrarTransacao(sb: SupabaseClient, uid: string, t: NovaTransacao) {
  const tabela = t.tipo === 'receita' ? 'receitas' : 'despesas'
  const registro = {
    usuario_id: uid,
    descricao: t.descricao,
    valor: t.valorBRL,
    valor_convertido: t.valorBRL,
    valor_original: t.valorOriginal,
    moeda_original: t.moeda,
    taxa: t.taxa,
    taxa_timestamp: t.taxaTimestamp,
    data: t.data,
    categoria_id: t.categoriaId,
    carteira_id: t.carteiraId,
  }
  const parcelas = t.parcelas ?? 1
  const d = new Date(`${t.data}T00:00:00`)

  if (parcelas <= 1 && !t.repetir) {
    const { error } = await sb.from(tabela).insert(registro)
    if (error) throw error
    return
  }

  const parcelado = parcelas > 1
  const divisao = dividirEmParcelas(t.valorBRL, parcelas)
  const frequencia: FrequenciaRecorrencia = parcelado ? 'mensal' : t.repetir!
  const rec = await salvarRecorrencia(sb, uid, {
    ativo: true,
    tipo: t.tipo,
    descricao: t.descricao,
    valor: parcelado ? divisao.valor : t.valorBRL,
    categoria_id: t.categoriaId,
    carteira_id: t.carteiraId,
    frequencia,
    dia: frequencia === 'semanal' ? d.getDay() : d.getDate(),
    data_inicio: t.data,
    ultima_execucao: t.data,
    parcelas_total: parcelado ? parcelas : null,
    valor_total: parcelado ? t.valorBRL : null,
  })
  const primeira = parcelado
    ? {
        ...registro,
        descricao: `${t.descricao} (1/${parcelas})`,
        valor: divisao.valor,
        valor_convertido: divisao.valor,
        valor_original: Number((t.valorOriginal / parcelas).toFixed(2)),
      }
    : registro
  const { error } = await sb.from(tabela).insert({ ...primeira, recorrencia_id: rec.id })
  if (error) {
    await removerRecorrencia(sb, rec.id).catch(() => {})
    throw error
  }
}
