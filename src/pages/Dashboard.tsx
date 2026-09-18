import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { Plus, Search, ArrowUp, ArrowDown, PiggyBank } from 'lucide-react'
import { Topbar } from '@/components/Topbar'
import { PageBody } from '@/components/PageBody'
import { Card, CardHeader, EmptyState, Skeleton } from '@/components/ui'
import { useNovaTransacao } from '@/components/AppLayout'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatCurrencyParts, formatDate, formatDateLong, daysUntil } from '@/lib/format'
import { monthlySeries, sum, inMonth, pctChange } from '@/lib/finance'
import { cn } from '@/lib/cn'

export default function Dashboard() {
  const { receitas, despesas, metas, contas, loading } = useData()
  const { perfil, user } = useAuth()
  const { open } = useNovaTransacao()
  const [range, setRange] = useState<'6m' | 'ano'>('6m')

  const primeiroNome = (perfil?.nome || user?.email?.split('@')[0] || '').split(' ')[0]
  const saudacao = primeiroNome ? `Olá, ${primeiroNome}` : 'Olá! 👋'
  const now = new Date()

  const { totalReceitas, totalDespesas, economia, saldo, variacao } = useMemo(() => {
    const y = now.getFullYear()
    const m = now.getMonth()
    const recMes = sum(receitas.filter((r) => inMonth(r.data, y, m)))
    const desMes = sum(despesas.filter((r) => inMonth(r.data, y, m)))
    const recAnt = sum(receitas.filter((r) => inMonth(r.data, m === 0 ? y - 1 : y, (m + 11) % 12)))
    const desAnt = sum(despesas.filter((r) => inMonth(r.data, m === 0 ? y - 1 : y, (m + 11) % 12)))
    const saldoTotal = sum(receitas) - sum(despesas)
    const saldoAnt = recAnt - desAnt
    return {
      totalReceitas: recMes,
      totalDespesas: desMes,
      economia: recMes - desMes,
      saldo: saldoTotal,
      variacao: pctChange(recMes - desMes, saldoAnt),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receitas, despesas])

  const serie = useMemo(
    () => monthlySeries(receitas, despesas, range === '6m' ? 6 : 12),
    [receitas, despesas, range],
  )

  const recentes = useMemo(
    () =>
      [...receitas, ...despesas]
        .sort((a, b) => (a.data < b.data ? 1 : -1))
        .slice(0, 5),
    [receitas, despesas],
  )

  const proximas = useMemo(
    () =>
      contas
        .filter((c) => c.status !== 'pago')
        .sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1))
        .slice(0, 3),
    [contas],
  )

  const saldoParts = formatCurrencyParts(saldo)

  return (
    <>
      <Topbar
        title={saudacao}
        subtitle={formatDateLong(now)}
        actions={
          <>
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
              <input
                placeholder="Buscar..."
                className="input-base w-48 py-2.5 pl-9"
                readOnly
              />
            </div>
            <button className="btn-primary" onClick={() => open({ tipo: 'despesa' })}>
              <Plus size={16} /> Nova transação
            </button>
          </>
        }
      />
      <PageBody>
        {/* Banda de saldo */}
        <div
          className="relative overflow-hidden rounded-[18px] p-6 text-white"
          style={{ background: '#0E1726' }}
        >
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,74,173,.5), transparent 70%)' }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-[#93A1B7]">Saldo total</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                    variacao >= 0
                      ? 'bg-[rgba(22,163,74,.2)] text-[#4ADE80]'
                      : 'bg-[rgba(229,72,77,.2)] text-[#F87171]',
                  )}
                >
                  {variacao >= 0 ? '+' : ''}
                  {variacao.toFixed(1)}%
                </span>
              </div>
              <div className="num mt-1 flex items-end gap-1 font-semibold">
                <span className="text-[28px] md:text-[42px]">
                  {saldoParts.symbol} {saldoParts.int}
                </span>
                <span className="mb-1.5 text-[18px] text-[#93A1B7]">{saldoParts.cents}</span>
              </div>
              <p className="mt-1 text-[12px] text-[#6B7C96]">
                economia do mês {formatCurrency(economia)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat icon={<ArrowUp size={16} />} color="#4ADE80" label="Receitas" value={totalReceitas} />
              <MiniStat icon={<ArrowDown size={16} />} color="#F87171" label="Despesas" value={totalDespesas} />
              <MiniStat icon={<PiggyBank size={16} />} color="#7FA8FF" label="Economia" value={economia} />
            </div>
          </div>
        </div>

        <div className="grid gap-[18px] lg:grid-cols-[1.55fr_1fr]">
          {/* Coluna esquerda */}
          <div className="flex flex-col gap-[18px]">
            <Card>
              <CardHeader
                title={
                  <div>
                    <div>Evolução do saldo</div>
                    <div className="mt-0.5 text-[12px] font-normal text-text-3">
                      Receitas vs. despesas · {now.getFullYear()}
                    </div>
                  </div>
                }
                action={
                  <div className="inline-flex rounded-lg bg-subtle p-1 text-[12px] font-semibold">
                    {(['6m', 'ano'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={cn(
                          'rounded-md px-2.5 py-1',
                          range === r ? 'bg-surface text-brand shadow-sm' : 'text-text-2',
                        )}
                      >
                        {r === '6m' ? '6M' : 'Ano'}
                      </button>
                    ))}
                  </div>
                }
              />
              {loading ? (
                <Skeleton className="h-56 w-full" />
              ) : serie.every((s) => s.receitas === 0 && s.despesas === 0) ? (
                <div className="flex h-[230px] items-center justify-center">
                  <EmptyState
                    title="Sem dados para o gráfico"
                    description="Registre receitas e despesas para ver a evolução do saldo."
                  />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={serie} margin={{ left: 0, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#004AAD" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#004AAD" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: 'var(--text-3)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number, n) => [formatCurrency(v), n === 'receitas' ? 'Receitas' : 'Despesas']}
                    />
                    <Area
                      type="monotone"
                      dataKey="receitas"
                      stroke="#004AAD"
                      strokeWidth={2.5}
                      fill="url(#g)"
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="despesas"
                      stroke="#8A95A6"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Movimentações recentes"
                action={
                  <Link to="/transacoes" className="text-[13px] font-semibold text-brand">
                    Ver todas
                  </Link>
                }
              />
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentes.length === 0 ? (
                <EmptyState
                  title="Nenhuma movimentação ainda"
                  description="Registre sua primeira receita ou despesa."
                />
              ) : (
                <div className="flex flex-col">
                  {recentes.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full',
                          m.tipo === 'receita' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger',
                        )}
                      >
                        {m.tipo === 'receita' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold text-text-1">
                          {m.descricao}
                        </div>
                        <div className="truncate text-[12px] text-text-3">
                          {m.categoria?.nome ?? 'Sem categoria'} · {formatDate(m.data, 'dd MMM')}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'num text-[14px] font-semibold',
                          m.tipo === 'receita' ? 'text-success' : 'text-text-1',
                        )}
                      >
                        {m.tipo === 'receita' ? '+ ' : '− '}
                        {formatCurrency(m.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Coluna direita */}
          <div className="flex flex-col gap-[18px]">
            <Card>
              <CardHeader
                title="Metas financeiras"
                action={
                  <Link to="/metas" className="text-brand">
                    <Plus size={18} />
                  </Link>
                }
              />
              {metas.length === 0 ? (
                <EmptyState title="Sem metas" description="Crie uma meta para começar a poupar." />
              ) : (
                <div className="flex flex-col gap-4">
                  {metas.slice(0, 3).map((m) => {
                    const pct = Math.min(100, (m.valor_atual / m.valor_meta) * 100)
                    return (
                      <div key={m.id}>
                        <div className="flex items-center justify-between text-[13px] font-bold text-text-1">
                          <span>{m.objetivo}</span>
                          <span className="num text-brand">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-subtle">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${pct}%`, background: m.cor }}
                          />
                        </div>
                        <div className="num mt-1 text-[11px] text-text-3">
                          {formatCurrency(m.valor_atual)} / {formatCurrency(m.valor_meta)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Próximas contas"
                action={
                  <Link to="/calendario" className="text-[13px] font-semibold text-brand">
                    Calendário
                  </Link>
                }
              />
              {proximas.length === 0 ? (
                <EmptyState title="Nenhuma conta pendente" />
              ) : (
                <div className="flex flex-col gap-1">
                  {proximas.map((c) => {
                    const dias = daysUntil(c.vencimento)
                    return (
                      <div key={c.id} className="flex items-center gap-3 py-2">
                        <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-subtle">
                          <span className="text-[9px] font-bold uppercase text-text-3">
                            {formatDate(c.vencimento, 'MMM')}
                          </span>
                          <span className="num text-[15px] font-bold text-text-1">
                            {formatDate(c.vencimento, 'dd')}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold text-text-1">
                            {c.descricao}
                          </div>
                          <div className={cn('text-[12px]', dias < 0 ? 'text-danger' : 'text-text-3')}>
                            {dias < 0
                              ? `Atrasada há ${Math.abs(dias)} dia(s)`
                              : dias === 0
                                ? 'Vence hoje'
                                : `Vence em ${dias} dia(s)`}
                          </div>
                        </div>
                        <span className="num text-[14px] font-semibold text-text-1">
                          {formatCurrency(c.valor)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageBody>
    </>
  )
}

function MiniStat({
  icon,
  color,
  label,
  value,
}: {
  icon: React.ReactNode
  color: string
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-3">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ background: `${color}22`, color }}
      >
        {icon}
      </span>
      <div className="mt-2 text-[11px] text-[#93A1B7]">{label}</div>
      <div className="num text-[15px] font-semibold text-white">{formatCurrency(value)}</div>
    </div>
  )
}
