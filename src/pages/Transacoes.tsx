import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, SlidersHorizontal, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react'
import { Topbar } from '@/components/Topbar'
import { PageBody } from '@/components/PageBody'
import { Card, Chip, EmptyState, ErrorState, Select, Skeleton } from '@/components/ui'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useNovaTransacao } from '@/components/AppLayout'
import { useData } from '@/contexts/DataContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate, formatNumber, inMonthName } from '@/lib/format'
import { sum, inMonth } from '@/lib/finance'
import { getCurrency } from '@/lib/currencies'
import type { Movimentacao } from '@/lib/types'
import { cn } from '@/lib/cn'
import { useFinanceiro } from '@/financeiro/FinanceiroContext'

type Filtro = 'todas' | 'receitas' | 'despesas'

export default function Transacoes({ filtroInicial }: { filtroInicial: Filtro }) {
  const { receitas, despesas, categorias, loading, error, reload, refreshAll } = useData()
  const { carteiras } = useFinanceiro()
  const { open } = useNovaTransacao()
  const toast = useToast()

  const [filtro, setFiltro] = useState<Filtro>(filtroInicial)

  useEffect(() => {
    setFiltro(filtroInicial)
  }, [filtroInicial])
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('')
  const [mostraFiltros, setMostraFiltros] = useState(false)
  const [excluir, setExcluir] = useState<Movimentacao | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  const todas = useMemo(
    () => [...receitas, ...despesas].sort((a, b) => (a.data < b.data ? 1 : -1)),
    [receitas, despesas],
  )

  const lista = useMemo(() => {
    let base = filtro === 'receitas' ? receitas : filtro === 'despesas' ? despesas : todas
    if (busca) base = base.filter((m) => m.descricao.toLowerCase().includes(busca.toLowerCase()))
    if (categoria) base = base.filter((m) => m.categoria_id === categoria)
    return [...base].sort((a, b) => (a.data < b.data ? 1 : -1))
  }, [filtro, receitas, despesas, todas, busca, categoria])

  const now = new Date()
  const entradasMes = sum(receitas.filter((r) => inMonth(r.data, now.getFullYear(), now.getMonth())))
  const saidasMes = sum(despesas.filter((r) => inMonth(r.data, now.getFullYear(), now.getMonth())))

  async function confirmarExcluir() {
    if (!excluir) return
    setExcluindo(true)
    try {
      const tabela = excluir.tipo === 'receita' ? 'receitas' : 'despesas'
      const { error } = await supabase.from(tabela).delete().eq('id', excluir.id)
      if (error) throw error
      toast('success', 'Transação excluída.')
      await reload([tabela])
      setExcluir(null)
    } catch {
      toast('error', 'Não foi possível excluir.')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <>
      <Topbar
        title={filtro === 'receitas' ? 'Receitas' : filtro === 'despesas' ? 'Despesas' : 'Transações'}
        subtitle="Lista de transações · filtros · categorias"
        actions={
          <button
            className="btn-primary"
            onClick={() => open({ tipo: filtro === 'receitas' ? 'receita' : 'despesa' })}
          >
            <Plus size={16} /> Nova
          </button>
        }
      />
      <PageBody>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs
            value={filtro}
            onChange={(v) => setFiltro(v as Filtro)}
            tabs={[
              { value: 'todas', label: 'Todas' },
              { value: 'receitas', label: 'Receitas' },
              { value: 'despesas', label: 'Despesas' },
            ]}
          />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="input-base w-44 py-2.5 pl-9"
              />
            </div>
            <button
              onClick={() => setMostraFiltros((v) => !v)}
              className={cn('btn-ghost', mostraFiltros && 'border-brand text-brand')}
            >
              <SlidersHorizontal size={16} /> Filtros
            </button>
          </div>
        </div>

        {mostraFiltros && (
          <Card className="!p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-text-2">
                  Categoria
                </label>
                <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option value="">Todas as categorias</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icone} {c.nome}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>
        )}

        {/* Mini-cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniCard color="success" icon={<ArrowUp size={16} />} label={`Entradas · ${inMonthName()}`} value={entradasMes} />
          <MiniCard color="danger" icon={<ArrowDown size={16} />} label={`Saídas · ${inMonthName()}`} value={saidasMes} />
          <MiniCard color="brand" icon={<span className="num text-[13px]">R$</span>} label="Saldo do mês" value={entradasMes - saidasMes} />
        </div>

        <Card className="!p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={refreshAll} />
          ) : lista.length === 0 ? (
            <EmptyState
              title="Nenhuma transação encontrada"
              description="Ajuste os filtros ou registre uma nova transação."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wide text-text-3">
                    <th className="px-5 py-3">Descrição</th>
                    <th className="px-3 py-3">Categoria</th>
                    <th className="px-3 py-3">Data</th>
                    <th className="px-3 py-3 text-right">Valor</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((m) => (
                    <tr key={m.id} className="group border-b border-line last:border-0 hover:bg-subtle/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'flex h-9 w-9 items-center justify-center rounded-full text-[16px]',
                              m.tipo === 'receita' ? 'bg-success-bg' : 'bg-subtle',
                            )}
                          >
                            {m.categoria?.icone ?? (m.tipo === 'receita' ? '💰' : '💳')}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5 text-[14px] font-semibold text-text-1">
                              {m.descricao}
                              {m.recorrencia_id && <span className="text-[12px]" title="Lançado por recorrência">🔁</span>}
                            </div>
                            {m.carteira_id && (
                              <div className="text-[11px] text-text-3">
                                {carteiras.find((c) => c.id === m.carteira_id)?.nome ?? 'Carteira removida'}
                              </div>
                            )}
                            {m.moeda_original !== 'BRL' && (
                              <div className="num text-[11px] text-text-3">
                                {getCurrency(m.moeda_original).symbol} {formatNumber(m.valor_original)}{' '}
                                ({m.moeda_original})
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        {m.categoria ? (
                          <Chip color={m.categoria.cor}>{m.categoria.nome}</Chip>
                        ) : (
                          <span className="text-[12px] text-text-3">—</span>
                        )}
                      </td>
                      <td className="num px-3 py-3.5 text-[12px] text-text-2">
                        {formatDate(m.data, 'dd MMM yyyy')}
                      </td>
                      <td
                        className={cn(
                          'num px-3 py-3.5 text-right text-[14px] font-semibold',
                          m.tipo === 'receita' ? 'text-success' : 'text-text-1',
                        )}
                      >
                        {m.tipo === 'receita' ? '+ ' : '− '}
                        {formatCurrency(m.valor)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={() => open({ tipo: m.tipo, editar: m })}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-2 hover:bg-subtle"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setExcluir(m)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-danger-bg"
                            title="Excluir"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageBody>

      <ConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        message={`Excluir "${excluir?.descricao}"? Esta ação não pode ser desfeita.`}
        loading={excluindo}
        onConfirm={confirmarExcluir}
      />
    </>
  )
}

function MiniCard({
  color,
  icon,
  label,
  value,
}: {
  color: 'success' | 'danger' | 'brand'
  icon: React.ReactNode
  label: string
  value: number
}) {
  const map = {
    success: 'bg-success-bg text-success',
    danger: 'bg-danger-bg text-danger',
    brand: 'bg-active-bg text-brand',
  }
  return (
    <Card className="flex items-center gap-3">
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', map[color])}>
        {icon}
      </span>
      <div>
        <div className="text-[12px] text-text-3">{label}</div>
        <div className="num text-[18px] font-bold text-text-1">{formatCurrency(value)}</div>
      </div>
    </Card>
  )
}
