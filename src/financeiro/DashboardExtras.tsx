import { useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from 'recharts'
import { Card, CardHeader, Skeleton } from '@/components/ui'
import { useData } from '@/contexts/DataContext'
import { formatCurrency } from '@/lib/format'
import { sum, inMonth } from '@/lib/finance'
import { cn } from '@/lib/cn'
import { useFinanceiro } from './FinanceiroContext'
import { projecaoSaldo } from './logic'

/** Orçamento vs. gasto real do mês, somado entre todas as categorias com limite. Dados 100% reais. */
export function OrcamentoResumo() {
  const { categorias, despesas } = useData()
  const now = new Date()

  const { orcado, gasto, estouradas } = useMemo(() => {
    const comLimite = categorias.filter((c) => c.tipo === 'despesa' && c.orcamento > 0)
    let orcadoTotal = 0
    let gastoTotal = 0
    const est: { nome: string; gasto: number; orcamento: number }[] = []
    for (const c of comLimite) {
      const gastoCat = sum(despesas.filter((d) => d.categoria_id === c.id && inMonth(d.data, now.getFullYear(), now.getMonth())))
      orcadoTotal += c.orcamento
      gastoTotal += gastoCat
      if (gastoCat > c.orcamento) est.push({ nome: c.nome, gasto: gastoCat, orcamento: c.orcamento })
    }
    return { orcado: orcadoTotal, gasto: gastoTotal, estouradas: est }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorias, despesas])

  if (orcado === 0) return null
  const pct = Math.min(100, (gasto / orcado) * 100)
  const estourou = gasto > orcado

  return (
    <Card>
      <CardHeader title="Orçamento do mês" />
      <div className="flex items-baseline justify-between">
        <span className="num text-[22px] font-bold text-text-1">{formatCurrency(gasto)}</span>
        <span className="text-[12px] text-text-3">de {formatCurrency(orcado)} orçado</span>
      </div>
      <div className="mt-2 h-2.5 rounded-full bg-subtle">
        <div
          className="h-2.5 rounded-full transition-all"
          style={{ width: `${pct}%`, background: estourou ? '#E5484D' : '#16A34A' }}
        />
      </div>
      {estouradas.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {estouradas.slice(0, 3).map((c) => (
            <div key={c.nome} className="flex items-center justify-between text-[12px]">
              <span className="text-danger">⚠ {c.nome} estourou o orçamento</span>
              <span className="num text-danger">
                {formatCurrency(c.gasto)} / {formatCurrency(c.orcamento)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/** Projeção de saldo combinando contas a pagar reais + recorrências ativas. */
export function ProjecaoCard() {
  const { receitas, despesas, contas, loading } = useData()
  const { recorrencias } = useFinanceiro()
  const [dias, setDias] = useState<30 | 60 | 90>(30)

  const saldoAtual = sum(receitas) - sum(despesas)
  const pendentes = contas.filter((c) => c.status !== 'pago').map((c) => ({ valor: c.valor, vencimento: c.vencimento }))

  const serie = useMemo(
    () => projecaoSaldo(saldoAtual, pendentes, recorrencias, dias),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saldoAtual, contas, recorrencias, dias],
  )
  const saldoFinal = serie[serie.length - 1]?.saldo ?? saldoAtual

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Projeção de saldo
          </span>
        }
        action={
          <div className="inline-flex rounded-lg bg-subtle p-1 text-[12px] font-semibold">
            {([30, 60, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDias(d)}
                className={cn('rounded-md px-2.5 py-1', dias === d ? 'bg-surface text-brand shadow-sm' : 'text-text-2')}
              >
                {d}d
              </button>
            ))}
          </div>
        }
      />
      <p className="mb-2 text-[12px] text-text-3">
        Combina contas a pagar reais com as recorrências cadastradas (simuladas, nenhuma é gravada antes da data).
      </p>
      {loading ? <Skeleton className="h-[180px] w-full" /> : (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={serie} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
            formatter={(v: number) => [formatCurrency(v), 'Saldo projetado']}
          />
          <Line type="monotone" dataKey="saldo" stroke="#004AAD" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      )}
      <div className="mt-1 text-right text-[12px] text-text-3">
        Saldo projetado em {dias} dias: <span className={cn('num font-bold', saldoFinal < 0 ? 'text-danger' : 'text-text-1')}>{formatCurrency(saldoFinal)}</span>
      </div>
    </Card>
  )
}
