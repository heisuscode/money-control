// Regras de negócio de carteiras, cartões e recorrências (funções puras).
//
// Regime de competência: a compra no cartão conta como despesa na data da
// compra (saldo e orçamento). A fatura é só o agrupamento para pagamento, e
// pagá-la é uma transferência da conta pagadora — não uma nova despesa.

import { format } from 'date-fns'
import { parseDate } from '@/lib/format'
import type { Carteira, Recorrencia } from '@/lib/types'

/** Data local no formato yyyy-MM-dd (sem conversão para UTC). */
export function iso(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

function hoje0() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function clampDay(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay))
}

function somaMeses(ref: Date, meses: number, dia: number): Date {
  const total = ref.getFullYear() * 12 + ref.getMonth() + meses
  return clampDay(Math.floor(total / 12), total % 12, dia)
}

/* --------------------------- Recorrências --------------------------- */

type RegraRecorrencia = Pick<Recorrencia, 'frequencia' | 'dia' | 'data_inicio' | 'ultima_execucao'>

export function primeiraOcorrencia(rec: RegraRecorrencia): Date {
  const inicio = parseDate(rec.data_inicio)
  if (rec.frequencia === 'semanal') {
    const d = new Date(inicio)
    d.setDate(d.getDate() + ((rec.dia - d.getDay() + 7) % 7))
    return d
  }
  const d = clampDay(inicio.getFullYear(), inicio.getMonth(), rec.dia)
  if (d >= inicio) return d
  return rec.frequencia === 'anual' ? clampDay(d.getFullYear() + 1, d.getMonth(), rec.dia) : somaMeses(d, 1, rec.dia)
}

export function proximaAposA(rec: RegraRecorrencia, ref: Date): Date {
  if (rec.frequencia === 'semanal') {
    const d = new Date(ref)
    d.setDate(d.getDate() + 7)
    return d
  }
  if (rec.frequencia === 'anual') return clampDay(ref.getFullYear() + 1, ref.getMonth(), rec.dia)
  return somaMeses(ref, 1, rec.dia)
}

export function proximaOcorrencia(rec: RegraRecorrencia): Date {
  if (!rec.ultima_execucao) return primeiraOcorrencia(rec)
  return proximaAposA(rec, parseDate(rec.ultima_execucao))
}

/** Datas (até hoje) em que a recorrência já deveria ter gerado lançamento. */
export function ocorrenciasPendentes(rec: Recorrencia, limite = 36): string[] {
  if (!rec.ativo) return []
  const hoje = hoje0()
  const out: string[] = []
  let prox = proximaOcorrencia(rec)
  while (prox <= hoje && out.length < limite) {
    out.push(iso(prox))
    prox = proximaAposA(rec, prox)
  }
  return out
}

/* ------------------------ Fatura de cartão --------------------------- */

type Cartao = Pick<Carteira, 'id' | 'limite' | 'dia_fechamento' | 'dia_vencimento' | 'criado_em'>

export interface Ciclo {
  inicio: Date
  fim: Date
  vencimento: Date
}

/**
 * Ciclo que fecha em `fim`: começa no dia seguinte ao fechamento anterior e vence
 * no primeiro dia de vencimento depois do fechamento (fecha 10/vence 17 → mesmo
 * mês; fecha 25/vence 5 → mês seguinte).
 */
function cicloQueFechaEm(cart: Cartao, fim: Date): Ciclo {
  const inicio = somaMeses(fim, -1, cart.dia_fechamento ?? 1)
  inicio.setDate(inicio.getDate() + 1)
  const diaVenc = cart.dia_vencimento ?? 10
  let vencimento = clampDay(fim.getFullYear(), fim.getMonth(), diaVenc)
  if (vencimento <= fim) vencimento = somaMeses(fim, 1, diaVenc)
  return { inicio, fim, vencimento }
}

/** Ciclo em aberto: o fechamento de hoje ainda conta como aberto. */
export function cicloAberto(cart: Cartao, ref = hoje0()): Ciclo {
  const fechamento = cart.dia_fechamento ?? 1
  let fim = clampDay(ref.getFullYear(), ref.getMonth(), fechamento)
  if (fim < ref) fim = somaMeses(ref, 1, fechamento)
  return cicloQueFechaEm(cart, fim)
}

/** Ciclos já fechados, do mais recente para o mais antigo. */
export function ciclosFechados(cart: Cartao, quantidade: number, ref = hoje0()): Ciclo[] {
  const aberto = cicloAberto(cart, ref)
  const out: Ciclo[] = []
  for (let i = 1; i <= quantidade; i++) {
    out.push(cicloQueFechaEm(cart, somaMeses(aberto.fim, -i, cart.dia_fechamento ?? 1)))
  }
  return out
}

interface Mov {
  data: string
  valor: number
  carteira_id?: string | null
}

export function totalNoPeriodo(carteiraId: string, ciclo: Ciclo, despesas: Mov[]): number {
  const ini = iso(ciclo.inicio)
  const fim = iso(ciclo.fim)
  return despesas.reduce(
    (acc, d) => (d.carteira_id === carteiraId && d.data >= ini && d.data <= fim ? acc + Number(d.valor) : acc),
    0,
  )
}

/** Identifica uma fatura: cartão + data de fechamento do ciclo. */
export function chaveFatura(cartaoId: string, fimCiclo: string) {
  return `${cartaoId}_${fimCiclo}`
}

export interface FaturaFechada {
  chave: string
  ciclo: Ciclo
  total: number
  paga: boolean
}

export interface ResumoCartao {
  aberta: { ciclo: Ciclo; total: number }
  fechadas: FaturaFechada[]
  emAberto: number
  disponivel: number
}

/**
 * Situação completa do cartão: fatura aberta, faturas fechadas e limite disponível.
 * Faturas que venceram antes do cartão ser cadastrado são histórico (quitadas fora
 * do app) e não aparecem como pendentes.
 */
export function resumoCartao(cart: Cartao, despesas: Mov[], faturasPagas: Record<string, unknown>): ResumoCartao {
  const cadastradoEm = iso(new Date(cart.criado_em))
  const cAberto = cicloAberto(cart)
  const aberta = { ciclo: cAberto, total: totalNoPeriodo(cart.id, cAberto, despesas) }
  const fechadas = ciclosFechados(cart, 12)
    .map((ciclo) => {
      const chave = chaveFatura(cart.id, iso(ciclo.fim))
      return { chave, ciclo, total: totalNoPeriodo(cart.id, ciclo, despesas), paga: !!faturasPagas[chave] }
    })
    .filter((f) => f.total > 0)
    .filter((f) => f.paga || iso(f.ciclo.vencimento) >= cadastradoEm)
  const emAberto = aberta.total + fechadas.filter((f) => !f.paga).reduce((a, f) => a + f.total, 0)
  return { aberta, fechadas, emAberto, disponivel: Number(cart.limite ?? 0) - emAberto }
}

/* --------------------------- Projeção de saldo ------------------------ */

/**
 * Saldo dia a dia a partir de hoje. Compras no cartão já estão no saldo
 * (competência), então faturas não são descontadas de novo — só recorrências
 * futuras e contas a pagar pendentes.
 */
export function projecaoSaldo(
  saldoAtual: number,
  contasPendentes: { valor: number; vencimento: string }[],
  recorrencias: Recorrencia[],
  dias: number,
): { label: string; saldo: number }[] {
  const hoje = hoje0()
  const eventosPorDia = new Map<string, number>()
  const add = (dataISO: string, delta: number) => eventosPorDia.set(dataISO, (eventosPorDia.get(dataISO) ?? 0) + delta)

  // contas atrasadas entram hoje (ainda precisam ser pagas)
  const hojeISO = iso(hoje)
  for (const c of contasPendentes) add(c.vencimento < hojeISO ? hojeISO : c.vencimento, -Number(c.valor))

  const limite = new Date(hoje)
  limite.setDate(limite.getDate() + dias)
  for (const rec of recorrencias) {
    if (!rec.ativo) continue
    let prox = proximaOcorrencia(rec)
    let guard = 0
    while (prox <= limite && guard < 120) {
      if (prox > hoje) add(iso(prox), rec.tipo === 'receita' ? Number(rec.valor) : -Number(rec.valor))
      prox = proximaAposA(rec, prox)
      guard++
    }
  }

  const passo = dias > 45 ? 3 : 1
  const out: { label: string; saldo: number }[] = []
  let saldo = saldoAtual
  for (let i = 0; i <= dias; i++) {
    const d = new Date(hoje)
    d.setDate(d.getDate() + i)
    saldo += eventosPorDia.get(iso(d)) ?? 0
    if (i % passo === 0 || i === dias) out.push({ label: format(d, 'dd/MM'), saldo })
  }
  return out
}
