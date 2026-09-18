import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  Legend,
} from 'recharts'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Topbar } from '@/components/Topbar'
import { PageBody } from '@/components/PageBody'
import { Card, CardHeader, EmptyState } from '@/components/ui'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { useData } from '@/contexts/DataContext'
import { formatCurrency, formatPercent } from '@/lib/format'
import { monthlySeries, spendingByCategory, sum, inMonth, inYear } from '@/lib/finance'
import { exportCSV, exportPDF, exportXLSX } from '@/lib/export'
import { useToast } from '@/components/ui/Toast'

type Periodo = 'mes' | 'trimestre' | 'ano'

export default function Relatorios() {
  const { receitas, despesas, categorias } = useData()
  const toast = useToast()
  const [periodo, setPeriodo] = useState<Periodo>('trimestre')

  const now = new Date()
  const { recFiltradas, desFiltradas } = useMemo(() => {
    const y = now.getFullYear()
    const m = now.getMonth()
    const filtro = (data: string) => {
      if (periodo === 'mes') return inMonth(data, y, m)
      if (periodo === 'ano') return inYear(data, y)
      // trimestre: últimos 3 meses
      const d = new Date(data + 'T00:00:00')
      const limite = new Date(y, m - 2, 1)
      return d >= limite
    }
    return {
      recFiltradas: receitas.filter((r) => filtro(r.data)),
      desFiltradas: despesas.filter((r) => filtro(r.data)),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receitas, despesas, periodo])

  const totalRecebido = sum(recFiltradas)
  const totalGasto = sum(desFiltradas)
  const economia = totalRecebido - totalGasto
  const taxaPoupanca = totalRecebido ? (economia / totalRecebido) * 100 : 0

  const serie = useMemo(() => monthlySeries(receitas, despesas, 6), [receitas, despesas])
  const porCategoria = useMemo(
    () => spendingByCategory(desFiltradas, categorias),
    [desFiltradas, categorias],
  )

  async function exportar(tipo: 'pdf' | 'xlsx' | 'csv') {
    const dados = [...recFiltradas, ...desFiltradas].sort((a, b) => (a.data < b.data ? 1 : -1))
    if (!dados.length) return toast('error', 'Nenhum dado no período para exportar.')
    try {
      if (tipo === 'csv') exportCSV(dados)
      else if (tipo === 'xlsx') await exportXLSX(dados)
      else
        await exportPDF(dados, [
          { label: 'Total recebido', value: formatCurrency(totalRecebido) },
          { label: 'Total gasto', value: formatCurrency(totalGasto) },
          { label: 'Economia', value: formatCurrency(economia) },
          { label: 'Taxa de poupança', value: formatPercent(taxaPoupanca) },
        ])
      toast('success', `Exportado em ${tipo.toUpperCase()}.`)
    } catch {
      toast('error', 'Falha ao exportar.')
    }
  }

  const temDados = recFiltradas.length + desFiltradas.length > 0

  return (
    <>
      <Topbar title="Relatórios" subtitle="Análises, categorias e exportação" />
      <PageBody>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs
            value={periodo}
            onChange={(v) => setPeriodo(v as Periodo)}
            tabs={[
              { value: 'mes', label: 'Mês' },
              { value: 'trimestre', label: 'Trimestre' },
              { value: 'ano', label: 'Ano' },
            ]}
          />
          <div className="flex items-center gap-2">
            <button className="btn-ghost !px-3 !py-2 text-[13px]" onClick={() => exportar('pdf')} title="Exportar PDF">
              <Download size={15} /> PDF
            </button>
            <button className="btn-ghost !px-3 !py-2 text-[13px]" onClick={() => exportar('xlsx')} title="Exportar Excel">
              <FileSpreadsheet size={15} /> Excel
            </button>
            <button className="btn-ghost !px-3 !py-2 text-[13px]" onClick={() => exportar('csv')} title="Exportar CSV">
              <FileText size={15} /> CSV
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Total recebido" value={formatCurrency(totalRecebido)} tone="success" />
          <Kpi label="Total gasto" value={formatCurrency(totalGasto)} tone="danger" />
          <Kpi label="Economia" value={formatCurrency(economia)} tone="brand" />
          <Kpi label="Taxa de poupança" value={formatPercent(taxaPoupanca)} tone="ink" />
        </div>

        <div className="grid gap-[18px] lg:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader title="Receitas vs. despesas" />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serie} barGap={6}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                <Tooltip
                  cursor={{ fill: 'var(--bg-subtle)' }}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number, n) => [formatCurrency(v), n === 'receitas' ? 'Receitas' : 'Despesas']}
                />
                <Legend
                  formatter={(v) => (v === 'receitas' ? 'Receitas' : 'Despesas')}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="receitas" fill="#16A34A" radius={[6, 6, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                <Bar dataKey="despesas" fill="#004AAD" radius={[6, 6, 0, 0]} maxBarSize={26} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardHeader title="Gastos por categoria" />
            {porCategoria.length === 0 ? (
              <EmptyState title="Sem gastos no período" />
            ) : (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={porCategoria}
                        dataKey="total"
                        nameKey="nome"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        {porCategoria.map((c) => (
                          <Cell key={c.id} fill={c.cor} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[11px] text-text-3">Total</span>
                    <span className="num text-[15px] font-bold text-text-1">
                      {formatCurrency(totalGasto)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {porCategoria.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-[13px]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.cor }} />
                      <span className="flex-1 text-text-2">{c.nome}</span>
                      <span className="num font-semibold text-text-1">{c.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <p className="mb-2 text-[12px] font-bold text-text-2">Onde você mais gastou</p>
                  {porCategoria.slice(0, 2).map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-1 text-[13px]">
                      <span className="text-text-2">{c.nome}</span>
                      <span className="num font-semibold text-text-1">{formatCurrency(c.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {!temDados && (
          <Card>
            <EmptyState
              title="Sem dados no período selecionado"
              description="Registre transações ou troque o período para ver os relatórios."
            />
          </Card>
        )}
      </PageBody>
    </>
  )
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'success' | 'danger' | 'brand' | 'ink'
}) {
  const color = {
    success: 'text-success',
    danger: 'text-danger',
    brand: 'text-brand',
    ink: 'text-text-1',
  }[tone]
  return (
    <Card>
      <div className="text-[12px] text-text-3">{label}</div>
      <div className={`num mt-1.5 text-[22px] font-bold ${color}`}>{value}</div>
    </Card>
  )
}
