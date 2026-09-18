import { useEffect, useState } from 'react'
import { Plus, Target, Pencil, Trash2 } from 'lucide-react'
import { Topbar } from '@/components/Topbar'
import { PageBody } from '@/components/PageBody'
import { Button, Card, EmptyState, ErrorState, Field, Input, Select, Skeleton } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useData } from '@/contexts/DataContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate, parseMoney } from '@/lib/format'
import { sum } from '@/lib/finance'
import type { Meta } from '@/lib/types'

const ICONES = ['🎯', '✈️', '🏠', '🚗', '💻', '🎓', '💍', '🏖️', '🛡️', '📈']

export default function Metas() {
  const { metas, loading, error, reload, refreshAll } = useData()
  const toast = useToast()
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Meta | null>(null)
  const [aporte, setAporte] = useState<Meta | null>(null)
  const [excluir, setExcluir] = useState<Meta | null>(null)

  const totalGuardado = sum(metas.map((m) => ({ valor: m.valor_atual })))
  const ativas = metas.filter((m) => m.valor_atual < m.valor_meta).length
  const concluidas = metas.filter((m) => m.valor_atual >= m.valor_meta).length

  async function confirmarExcluir() {
    if (!excluir) return
    const { error } = await supabase.from('metas').delete().eq('id', excluir.id)
    if (error) return toast('error', 'Não foi possível excluir.')
    toast('success', 'Meta excluída.')
    setExcluir(null)
    reload(['metas'])
  }

  return (
    <>
      <Topbar
        title="Metas"
        subtitle="Objetivos, progresso e aportes"
        actions={
          <button className="btn-primary" onClick={() => { setEditando(null); setModal(true) }}>
            <Plus size={16} /> Nova meta
          </button>
        }
      />
      <PageBody>
        <div className="relative overflow-hidden rounded-[18px] p-6 text-white" style={{ background: '#0E1726' }}>
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,74,173,.5), transparent 70%)' }}
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[13px] text-[#93A1B7]">Total guardado em metas</div>
              <div className="num mt-1 text-[34px] font-semibold">{formatCurrency(totalGuardado)}</div>
            </div>
            <div className="flex gap-8">
              <Metric label="Metas ativas" value={String(ativas)} />
              <Metric label="Concluídas" value={String(concluidas)} />
              <Metric label="Total" value={String(metas.length)} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 w-full" />)}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={refreshAll} />
        ) : metas.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Target size={28} />}
              title="Nenhuma meta ainda"
              description="Crie metas para organizar seus objetivos financeiros."
              action={<Button onClick={() => setModal(true)}><Plus size={16} /> Nova meta</Button>}
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {metas.map((m) => {
              const pct = Math.min(100, (m.valor_atual / m.valor_meta) * 100)
              const falta = Math.max(0, m.valor_meta - m.valor_atual)
              const completa = m.valor_atual >= m.valor_meta
              return (
                <Card key={m.id} className="group flex flex-col">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-[20px]"
                        style={{ background: `${m.cor}1f` }}
                      >
                        {m.icone}
                      </span>
                      <div>
                        <div className="text-[15px] font-bold text-text-1">{m.objetivo}</div>
                        <div className="text-[12px] text-text-3">
                          {m.prazo ? `Meta para ${formatDate(m.prazo, 'MMM/yyyy')}` : 'Sem prazo'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => { setEditando(m); setModal(true) }} className="text-text-3 hover:text-text-1"><Pencil size={15} /></button>
                      <button onClick={() => setExcluir(m)} className="text-danger"><Trash2 size={15} /></button>
                    </div>
                  </div>

                  <div className="num mt-4 text-[22px] font-bold text-text-1">
                    {formatCurrency(m.valor_atual)}
                    <span className="text-[13px] font-medium text-text-3"> / {formatCurrency(m.valor_meta)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-subtle">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: completa ? '#16A34A' : m.cor }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[12px]">
                    <span className="num font-bold" style={{ color: completa ? '#16A34A' : m.cor }}>
                      {pct.toFixed(0)}%
                    </span>
                    <span className="num text-text-3">
                      {completa ? 'Meta concluída 🎉' : `faltam ${formatCurrency(falta)}`}
                    </span>
                  </div>

                  <Button
                    variant="subtle"
                    className="mt-4 w-full"
                    onClick={() => setAporte(m)}
                    disabled={completa}
                  >
                    {completa ? 'Concluída' : 'Adicionar aporte'}
                  </Button>
                </Card>
              )
            })}
          </div>
        )}
      </PageBody>

      <MetaModal open={modal} onOpenChange={setModal} editar={editando} onSaved={() => reload(['metas'])} />
      <AporteModal meta={aporte} onClose={() => setAporte(null)} onSaved={() => reload(['metas'])} />
      <ConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        message={`Excluir a meta "${excluir?.objetivo}"?`}
        onConfirm={confirmarExcluir}
      />
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[12px] text-[#93A1B7]">{label}</div>
      <div className="num mt-0.5 text-[20px] font-bold">{value}</div>
    </div>
  )
}

function MetaModal({
  open,
  onOpenChange,
  editar,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editar: Meta | null
  onSaved: () => void
}) {
  const { user } = useAuth()
  const toast = useToast()
  const [objetivo, setObjetivo] = useState('')
  const [valorMeta, setValorMeta] = useState('')
  const [valorAtual, setValorAtual] = useState('')
  const [prazo, setPrazo] = useState('')
  const [icone, setIcone] = useState('🎯')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setObjetivo(editar?.objetivo ?? '')
      setValorMeta(editar ? String(editar.valor_meta).replace('.', ',') : '')
      setValorAtual(editar ? String(editar.valor_atual).replace('.', ',') : '')
      setPrazo(editar?.prazo ?? '')
      setIcone(editar?.icone ?? '🎯')
      setErro(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function salvar() {
    setErro(null)
    const vm = parseMoney(valorMeta)
    const va = parseMoney(valorAtual)
    if (!objetivo.trim()) return setErro('Informe o objetivo.')
    if (vm <= 0) return setErro('O valor da meta deve ser maior que zero.')
    if (!user) return
    setLoading(true)
    try {
      const payload = {
        objetivo: objetivo.trim(),
        valor_meta: vm,
        valor_atual: va,
        prazo: prazo || null,
        icone,
        cor: '#004AAD',
      }
      if (editar) {
        const { error } = await supabase.from('metas').update(payload).eq('id', editar.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('metas').insert({ ...payload, usuario_id: user.id })
        if (error) throw error
      }
      toast('success', editar ? 'Meta atualizada.' : 'Meta criada.')
      onSaved()
      onOpenChange(false)
    } catch {
      setErro('Erro ao salvar a meta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={editar ? 'Editar meta' : 'Nova meta'} maxWidth={440}>
      <div className="flex flex-col gap-4">
        <Field label="Objetivo">
          <Input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex.: Viagem Europa" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor da meta">
            <Input value={valorMeta} onChange={(e) => setValorMeta(e.target.value)} placeholder="0,00" inputMode="decimal" className="num" />
          </Field>
          <Field label="Já guardado">
            <Input value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} placeholder="0,00" inputMode="decimal" className="num" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prazo (opcional)">
            <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </Field>
          <Field label="Ícone">
            <Select value={icone} onChange={(e) => setIcone(e.target.value)}>
              {ICONES.map((i) => <option key={i} value={i}>{i}</option>)}
            </Select>
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

function AporteModal({ meta, onClose, onSaved }: { meta: Meta | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [valor, setValor] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (meta) setValor('')
  }, [meta])

  async function salvar() {
    if (!meta) return
    const v = parseMoney(valor)
    if (v <= 0) return toast('error', 'Informe um valor maior que zero.')
    setLoading(true)
    const novo = meta.valor_atual + v
    const { error } = await supabase.from('metas').update({ valor_atual: novo }).eq('id', meta.id)
    setLoading(false)
    if (error) return toast('error', 'Não foi possível registrar o aporte.')
    toast('success', 'Aporte adicionado!')
    onSaved()
    onClose()
  }

  return (
    <Modal open={!!meta} onOpenChange={(v) => !v && onClose()} title="Adicionar aporte" maxWidth={380}>
      {meta && (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-text-2">
            Meta <b>{meta.objetivo}</b> · atual {formatCurrency(meta.valor_atual)} de{' '}
            {formatCurrency(meta.valor_meta)}.
          </p>
          <Field label="Valor do aporte">
            <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" inputMode="decimal" className="num" autoFocus />
          </Field>
          <div className="mt-2 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" loading={loading} onClick={salvar}>Adicionar</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
