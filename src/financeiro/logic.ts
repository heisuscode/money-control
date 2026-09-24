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
type Parcelamento = RegraRecorrencia & Pick<Recorrencia, 'valor' | 'parcelas_total' | 'valor_total'>

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

/* --------------------------- Parcelamento --------------------------- */

/** Número (1-based) da parcela que cai em `data` — parcelas são mensais. */
export function numeroParcela(rec: RegraRecorrencia, data: string | Date): number {
  const p = primeiraOcorrencia(rec)
  const d = typeof data === 'string' ? parseDate(data) : data
  return (d.getFullYear() - p.getFullYear()) * 12 + d.getMonth() - p.getMonth() + 1
}

export function parcelasLancadas(rec: RegraRecorrencia): number {
  return rec.ultima_execucao ? numeroParcela(rec, rec.ultima_execucao) : 0
}

/** Parcelamento com todas as parcelas já lançadas: não gera mais nada. */
export function recorrenciaConcluida(rec: Parcelamento): boolean {
  return !!rec.parcelas_total && parcelasLancadas(rec) >= rec.parcelas_total
}

const centavos = (v: number) => Math.round(v * 100) / 100

/** Divide o total em parcelas iguais; a última absorve a diferença de centavos. */
export function dividirEmParcelas(total: number, parcelas: number): { valor: number; ultima: number } {
  const valor = Math.floor((total / parcelas) * 100) / 100
  return { valor, ultima: centavos(total - valor * (parcelas - 1)) }
}

export function valorDaParcela(rec: Parcelamento, k: number): number {
  if (rec.parcelas_total && rec.valor_total && k === rec.parcelas_total) {
    return centavos(Number(rec.valor_total) - Number(rec.valor) * (rec.parcelas_total - 1))
  }
  return Number(rec.valor)
}

/** Soma das parcelas ainda não lançadas (compromete o limite do cartão). */
export function valorParcelasFuturas(rec: Parcelamento): number {
  if (!rec.parcelas_total) return 0
  let total = 0
  for (let k = parcelasLancadas(rec) + 1; k <= rec.parcelas_total; k++) total += valorDaParcela(rec, k)
  return centavos(total)
}

/** Datas (até hoje) em que a recorrência já deveria ter gerado lançamento. */
export function ocorrenciasPendentes(rec: Recorrencia, limite = 36): string[] {
  if (!rec.ativo) return []
  const hoje = hoje0()
  const out: string[] = []
  let prox = proximaOcorrencia(rec)
  while (prox <= hoje && out.length < limite) {
    if (rec.parcelas_total && numeroParcela(rec, prox) > rec.parcelas_total) break
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

/** Quanto já foi pago numa fatura (pode ser em várias vezes, inclusive adiantado). */
export interface PagoNaFatura {
  total: number
}

export interface FaturaFechada {
  chave: string
  ciclo: Ciclo
  total: number
  /** soma dos pagamentos desta fatura */
  pago: number
  /** o que ainda falta pagar */
  restante: number
  paga: boolean
}

export interface FaturaAberta {
  chave: string
  ciclo: Ciclo
  total: number
  /** pago adiantado, antes do fechamento */
  pago: number
  restante: number
}

export interface ResumoCartao {
  aberta: FaturaAberta
  fechadas: FaturaFechada[]
  /** o que falta pagar na fatura aberta + nas fechadas */
  emAberto: number
  /** parcelas de compras parceladas que ainda vão cair nas próximas faturas */
  parcelasFuturas: number
  disponivel: number
}

/** Diferença abaixo de meio centavo conta como quitada (arredondamentos). */
const QUITADA = 0.005

/**
 * Situação completa do cartão: fatura aberta, faturas fechadas e limite disponível.
 * Uma fatura pode ser paga em várias vezes, inclusive antes de fechar (adiantado):
 * o que já foi pago abate do total e libera limite na hora, como no banco.
 * Faturas que venceram antes do cartão ser cadastrado são histórico (quitadas fora
 * do app) e não aparecem como pendentes.
 */
export function resumoCartao(
  cart: Cartao,
  despesas: Mov[],
  faturasPagas: Record<string, PagoNaFatura | undefined>,
  recorrencias: Recorrencia[] = [],
): ResumoCartao {
  const cadastradoEm = iso(new Date(cart.criado_em))
  const pagoEm = (chave: string) => centavos(Number(faturasPagas[chave]?.total ?? 0))
  const cAberto = cicloAberto(cart)
  const chaveAberta = chaveFatura(cart.id, iso(cAberto.fim))
  const totalAberta = totalNoPeriodo(cart.id, cAberto, despesas)
  const pagoAberta = pagoEm(chaveAberta)
  const aberta: FaturaAberta = {
    chave: chaveAberta,
    ciclo: cAberto,
    total: totalAberta,
    pago: pagoAberta,
    restante: Math.max(0, centavos(totalAberta - pagoAberta)),
  }
  const fechadas = ciclosFechados(cart, 12)
    .map((ciclo): FaturaFechada => {
      const chave = chaveFatura(cart.id, iso(ciclo.fim))
      const total = totalNoPeriodo(cart.id, ciclo, despesas)
      const pago = pagoEm(chave)
      const restante = Math.max(0, centavos(total - pago))
      return { chave, ciclo, total, pago, restante, paga: restante < QUITADA }
    })
    .filter((f) => f.total > 0)
    .filter((f) => f.paga || iso(f.ciclo.vencimento) >= cadastradoEm)
  const emAberto = centavos(aberta.restante + fechadas.filter((f) => !f.paga).reduce((a, f) => a + f.restante, 0))
  // Como no banco: a compra parcelada ocupa o limite pelo valor total, e cada
  // parcela paga libera a sua parte.
  const parcelasFuturas = recorrencias
    .filter((r) => r.ativo && r.carteira_id === cart.id)
    .reduce((a, r) => a + valorParcelasFuturas(r), 0)
  return { aberta, fechadas, emAberto, parcelasFuturas, disponivel: Number(cart.limite ?? 0) - emAberto - parcelasFuturas }
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
      const k = rec.parcelas_total ? numeroParcela(rec, prox) : 0
      if (rec.parcelas_total && k > rec.parcelas_total) break
      const valor = rec.parcelas_total ? valorDaParcela(rec, k) : Number(rec.valor)
      if (prox > hoje) add(iso(prox), rec.tipo === 'receita' ? valor : -valor)
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
