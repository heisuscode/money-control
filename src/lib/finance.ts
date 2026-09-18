import { parseDate } from './format'
import type { Categoria, Movimentacao } from './types'

export function sum(rows: { valor: number }[]): number {
  return rows.reduce((acc, r) => acc + Number(r.valor), 0)
}

export function inMonth(dateStr: string, year: number, month: number): boolean {
  const d = parseDate(dateStr)
  return d.getFullYear() === year && d.getMonth() === month
}

export function inYear(dateStr: string, year: number): boolean {
  return parseDate(dateStr).getFullYear() === year
}

/** Agrupa movimentações por mês (últimos N meses) → série para gráficos. */
export function monthlySeries(
  receitas: Movimentacao[],
  despesas: Movimentacao[],
  months = 6,
): { label: string; receitas: number; despesas: number; saldo: number }[] {
  const now = new Date()
  const out: { label: string; receitas: number; despesas: number; saldo: number }[] = []
  const labels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const rec = sum(receitas.filter((r) => inMonth(r.data, y, m)))
    const des = sum(despesas.filter((r) => inMonth(r.data, y, m)))
    out.push({ label: labels[m], receitas: rec, despesas: des, saldo: rec - des })
  }
  return out
}

/** Gastos agrupados por categoria (para donut). */
export function spendingByCategory(
  despesas: Movimentacao[],
  categorias: Categoria[],
): { id: string; nome: string; cor: string; total: number; pct: number }[] {
  const totalGeral = sum(despesas)
  const map = new Map<string, number>()
  for (const d of despesas) {
    const key = d.categoria_id ?? 'sem'
    map.set(key, (map.get(key) ?? 0) + Number(d.valor))
  }
  const arr = Array.from(map.entries()).map(([id, total]) => {
    const cat = categorias.find((c) => c.id === id)
    return {
      id,
      nome: cat?.nome ?? 'Outras',
      cor: cat?.cor ?? '#8A95A6',
      total,
      pct: totalGeral ? (total / totalGeral) * 100 : 0,
    }
  })
  return arr.sort((a, b) => b.total - a.total)
}

/** Variação percentual entre dois valores. */
export function pctChange(current: number, previous: number): number {
  if (!previous) return current ? 100 : 0
  return ((current - previous) / previous) * 100
}
