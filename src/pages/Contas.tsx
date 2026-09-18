import { useEffect, useMemo, useState } from 'react'
import { Plus, Check, FileText, Pencil, Trash2 } from 'lucide-react'
import { Topbar } from '@/components/Topbar'
import { PageBody } from '@/components/PageBody'
import { Button, Card, EmptyState, ErrorState, Field, Input, Skeleton } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate, daysUntil, parseMoney, todayISO } from '@/lib/format'
import { sum, inMonth } from '@/lib/finance'
import type { Conta } from '@/lib/types'
import { cn } from '@/lib/cn'

export default function Contas() {
  const { contas, loading, error, reload, refreshAll } = useData()
  const toast = useToast()
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Conta | null>(null)
  const [excluir, setExcluir] = useState<Conta | null>(null)

  const now = new Date()
  const atrasadas = contas.filter((c) => c.status === 'atrasado')
  const aVencer = contas.filter((c) => c.status === 'pendente' && daysUntil(c.vencimento) >= 0 && daysUntil(c.vencimento) <= 7)
  const pagasMes = contas.filter((c) => c.status === 'pago' && c.pago_em && inMonth(c.pago_em, now.getFullYear(), now.getMonth()))

  const ordenadas = useMemo(
    () =>
      [...contas].sort((a, b) => {
        if (a.status === 'pago' && b.status !== 'pago') return 1
        if (a.status !== 'pago' && b.status === 'pago') return -1
        return a.vencimento < b.vencimento ? -1 : 1
      }),
    [contas],
  )

  async function pagar(c: Conta) {
    const { error } = await supabase
      .from('contas')
      .update({ status: 'pago', pago_em: todayISO() })
      .eq('id', c.id)
    if (error) return toast('error', 'Não foi possível marcar como paga.')
    toast('success', 'Conta marcada como paga.')
    reload(['contas'])
  }

  async function confirmarExcluir() {
    if (!excluir) return
    const { error } = await supabase.from('contas').delete().eq('id', excluir.id)
    if (error) return toast('error', 'Não foi possível excluir.')
    toast('success', 'Conta excluída.')
    setExcluir(null)
    reload(['contas'])
  }

  return (
    <>
      <Topbar
        title="Contas a pagar"
        subtitle="Vencimentos, status e lembretes"
        actions={
          <button className="btn-primary" onClick={() => { setEditando(null); setModal(true) }}>
            <Plus size={16} /> Nova conta
          </button>
        }
      />
      <PageBody>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatusCard
            tone="danger"
            label="Atrasadas"
            value={sum(atrasadas)}
            sub={atrasadas.length === 0 ? 'nenhuma conta atrasada 🎉' : `${atrasadas.length} conta(s) atrasada(s)`}
          />
          <StatusCard
            tone="warning"
            label="A vencer · 7 dias"
            value={sum(aVencer)}
            sub={`${aVencer.length} conta(s) pendente(s)`}
          />
          <StatusCard
            tone="success"
            label={`Pagas · ${formatDate(now, 'MMMM')}`}
            value={sum(pagasMes)}
            sub={`${pagasMes.length} conta(s) quitada(s)`}
          />
        </div>

        <Card className="!p-0">
          <div className="border-b border-line px-5 py-4">
            <h3 className="card-title">Próximos vencimentos</h3>
          </div>
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={refreshAll} />
          ) : ordenadas.length === 0 ? (
            <EmptyState
              icon={<FileText size={28} />}
              title="Nenhuma conta cadastrada"
              description="Adicione contas para acompanhar vencimentos."
              action={<Button onClick={() => setModal(true)}><Plus size={16} /> Nova conta</Button>}
            />
          ) : (
            <div className="flex flex-col">
              {ordenadas.map((c) => {
                const pago = c.status === 'pago'
                const dias = daysUntil(c.vencimento)
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'group flex items-center gap-3 border-b border-line px-5 py-4 last:border-0',
                      pago && 'opacity-55',
                    )}
                  >
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-subtle">
                      <span className="text-[9px] font-bold uppercase text-text-3">
                        {formatDate(c.vencimento, 'MMM')}
                      </span>
                      <span className="num text-[16px] font-bold text-text-1">
                        {formatDate(c.vencimento, 'dd')}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-[14px] font-semibold text-text-1', pago && 'line-through')}>
                        {c.descricao}
                      </div>
                      <div
                        className={cn(
                          'text-[12px]',
                          pago ? 'text-success' : c.status === 'atrasado' ? 'text-danger' : 'text-warning',
                        )}
                      >
                        {pago
                          ? `Paga em ${c.pago_em ? formatDate(c.pago_em, 'dd MMM') : '—'}`
                          : c.status === 'atrasado'
                            ? `Atrasada há ${Math.abs(dias)} dia(s)`
                            : dias === 0
                              ? 'Vence hoje'
                              : `Vence em ${dias} dia(s)`}
                      </div>
                    </div>
                    <span className="num text-[14px] font-semibold text-text-1">
                      {formatCurrency(c.valor)}
                    </span>
                    {pago ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success-bg text-success">
                        <Check size={16} />
                      </span>
                    ) : (
                      <Button className="!px-4 !py-2 text-[13px]" onClick={() => pagar(c)}>
                        Pagar
                      </Button>
                    )}
                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => { setEditando(c); setModal(true) }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-2 hover:bg-subtle"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setExcluir(c)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-danger-bg"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </PageBody>

      <ContaModal open={modal} onOpenChange={setModal} editar={editando} onSaved={() => reload(['contas'])} />
      <ConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        message={`Excluir a conta "${excluir?.descricao}"?`}
        onConfirm={confirmarExcluir}
      />
    </>
  )
}

function StatusCard({
  tone,
  label,
  value,
  sub,
}: {
  tone: 'danger' | 'warning' | 'success'
  label: string
  value: number
  sub: string
}) {
  const map = {
    danger: 'text-danger',
    warning: 'text-warning',
    success: 'text-success',
  }
  const dot = { danger: 'bg-danger', warning: 'bg-warning', success: 'bg-success' }
  return (
    <Card>
      <div className="flex items-center gap-2 text-[13px] font-semibold text-text-2">
        <span className={cn('h-2 w-2 rounded-full', dot[tone])} /> {label}
      </div>
      <div className={cn('num mt-2 text-[22px] font-bold', map[tone])}>{formatCurrency(value)}</div>
      <div className="mt-1 text-[12px] text-text-3">{sub}</div>
    </Card>
  )
}

function ContaModal({
  open,
  onOpenChange,
  editar,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editar: Conta | null
  onSaved: () => void
}) {
  const { user } = useAuth()
  const toast = useToast()
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState(todayISO())
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // sincroniza ao abrir
  useEffect(() => {
    if (open) {
      setDescricao(editar?.descricao ?? '')
      setValor(editar ? String(editar.valor).replace('.', ',') : '')
      setVencimento(editar?.vencimento ?? todayISO())
      setErro(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function salvar() {
    setErro(null)
    const v = parseMoney(valor)
    if (!descricao.trim()) return setErro('Informe a descrição.')
    if (v <= 0) return setErro('O valor deve ser maior que zero.')
    if (!user) return
    setLoading(true)
    try {
      const status = daysUntil(vencimento) < 0 ? 'atrasado' : 'pendente'
      if (editar) {
        const { error } = await supabase
          .from('contas')
          .update({ descricao: descricao.trim(), valor: v, vencimento, status: editar.status === 'pago' ? 'pago' : status })
          .eq('id', editar.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('contas')
          .insert({ usuario_id: user.id, descricao: descricao.trim(), valor: v, vencimento, status })
        if (error) throw error
      }
      toast('success', editar ? 'Conta atualizada.' : 'Conta cadastrada.')
      onSaved()
      onOpenChange(false)
    } catch {
      setErro('Erro ao salvar a conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={editar ? 'Editar conta' : 'Nova conta'} maxWidth={420}>
      <div className="flex flex-col gap-4">
        <Field label="Descrição / credor">
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Cartão de crédito - Nubank" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor">
            <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" className="num" />
          </Field>
          <Field label="Vencimento">
            <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </Field>
        </div>
        {erro && <p className="text-[12px] font-medium text-danger">{erro}</p>}
        <div className="mt-2 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="flex-1" loading={loading} onClick={salvar}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}
