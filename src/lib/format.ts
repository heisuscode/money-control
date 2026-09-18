import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CURRENCIES } from './currencies'

/** Formata um valor monetário em uma moeda (padrão BRL) usando Intl pt-BR. */
export function formatCurrency(value: number, currency = 'BRL'): string {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    // moeda não suportada pelo Intl: usa símbolo da nossa tabela
    const c = CURRENCIES.find((m) => m.code === currency)
    return `${c?.symbol ?? currency} ${formatNumber(value)}`
  }
}

/** Apenas o número (sem símbolo), 2 casas, pt-BR. */
export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/** Valor "compacto" para títulos grandes (R$ 12.480,00). */
export function formatCurrencyParts(value: number, currency = 'BRL') {
  const full = formatCurrency(value, currency)
  // separa parte inteira dos centavos para estilização (mono + cents menores)
  const match = full.match(/^(.*?)(\d[\d.\s]*)(,\d{2})$/)
  if (!match) return { symbol: '', int: full, cents: '' }
  return { symbol: match[1].trim(), int: match[2].trim(), cents: match[3] }
}

export function parseDate(value: string): Date {
  return value.includes('T') ? parseISO(value) : parseISO(`${value}T00:00:00`)
}

export function formatDate(value: string | Date, pattern = "dd MMM yyyy"): string {
  const d = typeof value === 'string' ? parseDate(value) : value
  return format(d, pattern, { locale: ptBR })
}

export function formatDateLong(value: string | Date): string {
  const d = typeof value === 'string' ? parseDate(value) : value
  return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatPercent(value: number, digits = 1): string {
  return `${formatNumber(value, digits)}%`
}

/** Diferença em dias (inteiro) entre hoje e uma data (positivo = futuro). */
export function daysUntil(date: string | Date): number {
  const target = typeof date === 'string' ? parseDate(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const t = new Date(target)
  t.setHours(0, 0, 0, 0)
  return Math.round((t.getTime() - today.getTime()) / 86_400_000)
}

/** ISO yyyy-MM-dd da data de hoje (para inputs date). */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Nome do mês atual em pt-BR (ex.: "junho"). */
export function inMonthName(date: Date = new Date()): string {
  return format(date, 'MMMM', { locale: ptBR })
}

/** Converte texto digitado ("1.234,56" ou "1234.56") em número. */
export function parseMoney(input: string): number {
  if (!input) return 0
  let s = input.trim().replace(/[^\d.,-]/g, '')
  if (s.includes(',')) {
    // formato pt-BR: ponto = milhar, vírgula = decimal
    s = s.replace(/\./g, '').replace(',', '.')
  }
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}
