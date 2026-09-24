import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Info } from 'lucide-react'
import { Topbar } from '@/components/Topbar'
import { PageBody } from '@/components/PageBody'
import { Card } from '@/components/ui'
import { useData } from '@/contexts/DataContext'
import { useNovaTransacao } from '@/components/AppLayout'
import { formatCurrency, parseDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useFinanceiro } from '@/financeiro/FinanceiroContext'
import { PagarContaModal, isVirtual, type ContaPagavel } from '@/financeiro/PagarContaModal'

export default function Calendario() {
  const { receitas, despesas, contas } = useData()
  const { contasVirtuais } = useFinanceiro()
  const { open } = useNovaTransacao()
  const [cursor, setCursor] = useState(new Date())
  const [selecionado, setSelecionado] = useState(new Date())
  const [pagarConta, setPagarConta] = useState<ContaPagavel | null>(null)

  const todasContas = useMemo<ContaPagavel[]>(() => [...contas, ...contasVirtuais], [contas, contasVirtuais])

  const dias = useMemo(() => {
    const ini = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 })
    const fim = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 })
    return eachDayOfInterval({ start: ini, end: fim })
  }, [cursor])

  function eventosDoDia(d: Date) {
    const rec = receitas.filter((r) => isSameDay(parseDate(r.data), d))
    const des = despesas.filter((r) => isSameDay(parseDate(r.data), d))
    const cts = todasContas.filter((c) => isSameDay(parseDate(c.vencimento), d))
    return { rec, des, cts }
  }

  const selEventos = eventosDoDia(selecionado)
  // Fatura só agrupa compras que já aparecem no dia em que foram feitas: não soma de novo.
  const totalDia =
    selEventos.cts
      .filter((c) => c.status !== 'pago' && !(isVirtual(c) && c.origem === 'fatura'))
      .reduce((a, c) => a + Number(c.valor), 0) + selEventos.des.reduce((a, c) => a + Number(c.valor), 0)

  function subConta(c: ContaPagavel) {
    if (c.status === 'pago') return 'Já paga'
    if (isVirtual(c) && c.origem === 'recorrencia') return 'Recorrente · toque para ver'
    if (isVirtual(c) && c.faturaAberta) return 'Fatura em aberto · toque para pagar adiantado'
    if (isVirtual(c) && c.origem === 'fatura') return 'Fatura do cartão · toque para pagar'
    return 'Vencimento · toque para pagar'
  }

  const semana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

  return (
    <>
      <Topbar
        title="Calendário financeiro"
        subtitle="Vencimentos, recebimentos e agenda do mês"
        actions={
          <button className="btn-primary" onClick={() => open()}>
            <Plus size={16} /> Lançamento
          </button>
        }
      />
      <PageBody>
        <div className="grid gap-[18px] lg:grid-cols-[1.8fr_1fr]">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[18px] font-extrabold capitalize tracking-tightest text-text-1">
                {format(cursor, 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-[12px] font-semibold">
                  <span className="flex items-center gap-1.5 text-text-2">
                    <span className="h-2 w-2 rounded-full bg-danger" /> Despesa
                  </span>
                  <span className="flex items-center gap-1.5 text-text-2">
                    <span className="h-2 w-2 rounded-full bg-success" /> Receita
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setCursor(addMonths(cursor, -1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-text-2 hover:bg-subtle">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setCursor(addMonths(cursor, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-text-2 hover:bg-subtle">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {semana.map((s) => (
                <div key={s} className="pb-1 text-[10px] font-bold text-text-3">{s}</div>
              ))}
              {dias.map((d) => {
                const { rec, des, cts } = eventosDoDia(d)
                const temRec = rec.length > 0
                const temDes = des.length > 0 || cts.length > 0
                const foraMes = !isSameMonth(d, cursor)
                const hoje = isToday(d)
                const sel = isSameDay(d, selecionado)
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelecionado(d)}
                    className={cn(
                      'flex h-16 flex-col items-start rounded-xl border p-1.5 text-left transition',
                      hoje
                        ? 'border-transparent bg-ink text-white'
                        : sel
                          ? 'border-brand bg-active-bg'
                          : 'border-line hover:bg-subtle',
                      foraMes && !hoje && 'opacity-40',
                    )}
                  >
                    <span className={cn('num text-[12px] font-semibold', hoje ? 'text-white' : 'text-text-1')}>
                      {format(d, 'd')}
                    </span>
                    <div className="mt-auto flex gap-1">
                      {temRec && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                      {temDes && <span className="h-1.5 w-1.5 rounded-full bg-danger" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card className="flex flex-col">
            <h3 className="text-[15px] font-bold capitalize text-text-1">
              {format(selecionado, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h3>
            <p className="mt-0.5 text-[12px] text-text-3">
              {selEventos.cts.length + selEventos.rec.length + selEventos.des.length} evento(s)
              {totalDia > 0 && ` · ${formatCurrency(totalDia)}`}
            </p>

            <div className="mt-4 flex flex-1 flex-col gap-2">
              {selEventos.cts.length + selEventos.rec.length + selEventos.des.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-text-3">Nenhum evento neste dia.</p>
              ) : (
                <>
                  {selEventos.cts.map((c) => (
                    <Linha
                      key={c.id}
                      cor="danger"
                      titulo={c.descricao}
                      sub={subConta(c)}
                      valor={c.valor}
                      onClick={c.status !== 'pago' ? () => setPagarConta(c) : undefined}
                    />
                  ))}
                  {selEventos.des.map((m) => (
                    <Linha key={m.id} cor="danger" titulo={m.descricao} sub={m.categoria?.nome ?? 'Despesa'} valor={m.valor} />
                  ))}
                  {selEventos.rec.map((m) => (
                    <Linha key={m.id} cor="success" titulo={m.descricao} sub={m.categoria?.nome ?? 'Receita'} valor={m.valor} positivo />
                  ))}
                </>
              )}
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-active-bg px-3 py-2.5 text-[12px] text-brand-700 dark:text-active-text">
              <Info size={15} className="mt-0.5 shrink-0" />
              Você receberá um lembrete 1 dia antes de cada vencimento.
            </div>
          </Card>
        </div>
      </PageBody>

      <PagarContaModal conta={pagarConta} onClose={() => setPagarConta(null)} />
    </>
  )
}

function Linha({
  cor,
  titulo,
  sub,
  valor,
  positivo,
  onClick,
}: {
  cor: 'danger' | 'success'
  titulo: string
  sub: string
  valor: number
  positivo?: boolean
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border-l-[3px] bg-subtle/60 px-3 py-2.5 text-left',
        cor === 'danger' ? 'border-danger' : 'border-success',
        onClick && 'transition hover:bg-subtle',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-text-1">{titulo}</div>
        <div className="text-[11px] text-text-3">{sub}</div>
      </div>
      <span className={cn('num text-[13px] font-semibold', positivo ? 'text-success' : 'text-text-1')}>
        {positivo ? '+ ' : ''}
        {formatCurrency(valor)}
      </span>
    </Comp>
  )
}
