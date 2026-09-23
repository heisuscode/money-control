import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Repeat, ArrowUp, ArrowDown } from 'lucide-react'
import { Topbar } from '@/components/Topbar'
import { PageBody } from '@/components/PageBody'
import { Button, Card, EmptyState, ErrorState, Field, Input, Select, Skeleton } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useData } from '@/contexts/DataContext'
import { formatCurrency, formatDate, formatNumber, maskMoneyInput, parseMoney, todayISO } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { FrequenciaRecorrencia, Recorrencia, TipoCategoria } from '@/lib/types'
import { useFinanceiro } from './FinanceiroContext'
import { iso, proximaOcorrencia } from './logic'

const LABEL_FREQ: Record<FrequenciaRecorrencia, string> = {
  semanal: 'Toda semana',
  mensal: 'Todo mês',
  anual: 'Todo ano',
}

export default function RecorrenciasPage() {
  const { categorias } = useData()
  const { recorrencias, carteiras, salvarRecorrencia, removerRecorrencia, loading, erro } = useFinanceiro()
  const toast = useToast()
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Recorrencia | null>(null)
  const [excluir, setExcluir] = useState<Recorrencia | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  async function alternarAtivo(rec: Recorrencia) {
    // Ao reativar, recomeça de hoje: o período pausado não gera lançamentos atrasados.
    const dados = rec.ativo
      ? { ...rec, ativo: false }
      : { ...rec, ativo: true, data_inicio: todayISO(), ultima_execucao: null }
    try {
      await salvarRecorrencia(semMeta(dados), rec.id)
    } catch {
      toast('error', 'Não foi possível alterar a recorrência.')
    }
  }

  async function confirmarExcluir() {
    if (!excluir) return
    setExcluindo(true)
    try {
      await removerRecorrencia(excluir.id)
      toast('success', 'Recorrência removida.')
      setExcluir(null)
    } catch {
      toast('error', 'Não foi possível remover.')
    } finally {
      setExcluindo(false)
    }
  }

  const novo = () => { setEditando(null); setModal(true) }

  return (
    <>
      <Topbar
        title="Recorrências"
        subtitle="Assinaturas, salário e outras contas que se repetem"
        actions={
          <button className="btn-primary" onClick={novo}>
            <Plus size={16} /> Nova recorrência
          </button>
        }
      />
      <PageBody>
        {erro ? (
          <Card><ErrorState message={erro} /></Card>
        ) : loading ? (
          <Skeleton className="h-48 w-full" />
        ) : recorrencias.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Repeat size={28} />}
              title="Nenhuma recorrência"
              description="Cadastre assinaturas, salário ou aluguel: na data, o lançamento é feito automaticamente."
              action={<Button onClick={novo}><Plus size={16} /> Nova recorrência</Button>}
            />
          </Card>
        ) : (
          <Card className="!p-0">
            <div className="flex flex-col">
              {recorrencias.map((r) => {
                const cat = categorias.find((c) => c.id === r.categoria_id)
                const cart = carteiras.find((c) => c.id === r.carteira_id)
                const proxima = proximaOcorrencia(r)
                const noCartao = cart?.tipo === 'cartao_credito'
                return (
                  <div key={r.id} className={cn('group flex items-center gap-3 border-b border-line px-5 py-4 last:border-0', !r.ativo && 'opacity-50')}>
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', r.tipo === 'receita' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger')}>
                      {r.tipo === 'receita' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-text-1">{r.descricao}</div>
                      <div className="truncate text-[12px] text-text-3">
                        {LABEL_FREQ[r.frequencia]} · {cat?.nome ?? 'Sem categoria'} ·{' '}
                        {!r.ativo
                          ? 'pausada'
                          : noCartao
                            ? `cobrada no ${cart?.nome} (entra na fatura) · próxima ${formatDate(proxima, 'dd MMM')}`
                            : `${cart?.nome ?? 'Sem carteira'} · próxima em ${formatDate(proxima, 'dd MMM')}`}
                      </div>
                    </div>
                    <span className={cn('num text-[14px] font-semibold', r.tipo === 'receita' ? 'text-success' : 'text-text-1')}>
                      {r.tipo === 'receita' ? '+ ' : '− '}{formatCurrency(Number(r.valor))}
                    </span>
                    <button
                      onClick={() => alternarAtivo(r)}
                      className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', r.ativo ? 'bg-success-bg text-success' : 'bg-subtle text-text-3')}
                      title={r.ativo ? 'Pausar' : 'Reativar'}
                    >
                      {r.ativo ? 'Ativa' : 'Pausada'}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 max-md:opacity-100">
                      <button onClick={() => { setEditando(r); setModal(true) }} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-2 hover:bg-subtle" title="Editar"><Pencil size={15} /></button>
                      <button onClick={() => setExcluir(r)} className="flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-danger-bg" title="Remover"><Trash2 size={15} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </PageBody>

      <RecorrenciaModal open={modal} onOpenChange={setModal} editar={editando} />
      <ConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        message={`Remover a recorrência "${excluir?.descricao}"? Os lançamentos já feitos continuam no histórico; só os próximos deixam de acontecer.`}
        loading={excluindo}
        onConfirm={confirmarExcluir}
      />
    </>
  )
}

function semMeta(r: Recorrencia) {
  const { id: _id, usuario_id: _u, criado_em: _c, ...dados } = r
  return dados
}

function RecorrenciaModal({
  open,
  onOpenChange,
  editar,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editar: Recorrencia | null
}) {
  const { categorias } = useData()
  const { carteiras, salvarRecorrencia } = useFinanceiro()
  const toast = useToast()
  const [tipo, setTipo] = useState<TipoCategoria>('despesa')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [carteiraId, setCarteiraId] = useState('')
  const [frequencia, setFrequencia] = useState<FrequenciaRecorrencia>('mensal')
  const [dia, setDia] = useState('5')
  const [dataInicio, setDataInicio] = useState(todayISO())
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    setTipo(editar?.tipo ?? 'despesa')
    setDescricao(editar?.descricao ?? '')
    setValor(editar ? formatNumber(Number(editar.valor)) : '')
    setCategoriaId(editar?.categoria_id ?? '')
    setCarteiraId(editar?.carteira_id ?? '')
    setFrequencia(editar?.frequencia ?? 'mensal')
    setDia(String(editar?.dia ?? new Date().getDate()))
    setDataInicio(editar?.data_inicio ?? todayISO())
    setErro(null)
  }, [open, editar])

  const cats = categorias.filter((c) => c.tipo === tipo)
  const cartaoSelecionado = carteiras.find((c) => c.id === carteiraId && c.tipo === 'cartao_credito')

  // Receita não cai em cartão; despesa no cartão é sempre mensal (segue a fatura).
  const carteirasDisponiveis = tipo === 'receita' ? carteiras.filter((c) => c.tipo !== 'cartao_credito') : carteiras
  useEffect(() => {
    if (cartaoSelecionado) setFrequencia('mensal')
  }, [cartaoSelecionado])
  useEffect(() => {
    if (tipo === 'receita' && cartaoSelecionado) setCarteiraId('')
  }, [tipo, cartaoSelecionado])

  async function salvar() {
    setErro(null)
    if (!descricao.trim()) return setErro('Informe a descrição.')
    const v = parseMoney(valor)
    if (v <= 0) return setErro('Informe um valor maior que zero.')
    const d = Number(dia)
    if (frequencia !== 'semanal' && !(d >= 1 && d <= 31)) return setErro('O dia do mês deve estar entre 1 e 31.')

    // Mudou a agenda: o histórico já lançado fica, e a nova regra vale só daqui pra frente
    // (evita lançar de novo meses que já foram gerados).
    const mudouRegra =
      !!editar && (editar.frequencia !== frequencia || editar.dia !== d || editar.data_inicio !== dataInicio)
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const inicioEfetivo = mudouRegra && dataInicio <= todayISO() ? iso(amanha) : dataInicio

    setSalvando(true)
    try {
      await salvarRecorrencia(
        {
          ativo: editar?.ativo ?? true,
          tipo,
          descricao: descricao.trim(),
          valor: v,
          categoria_id: categoriaId || null,
          carteira_id: carteiraId || null,
          frequencia,
          dia: frequencia === 'semanal' ? Math.min(6, Math.max(0, d)) : d,
          data_inicio: inicioEfetivo,
          ultima_execucao: mudouRegra ? null : (editar?.ultima_execucao ?? null),
        },
        editar?.id,
      )
      toast('success', editar ? 'Recorrência atualizada.' : 'Recorrência criada.')
      onOpenChange(false)
    } catch {
      setErro('Não foi possível salvar a recorrência.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={editar ? 'Editar recorrência' : 'Nova recorrência'} maxWidth={460}>
      <div className="flex flex-col gap-4">
        <Field label="Descrição">
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Assinatura Spotify" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCategoria)}>
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </Select>
          </Field>
          <Field label="Valor">
            <Input value={valor} onChange={(e) => setValor(maskMoneyInput(e.target.value))} placeholder="0,00" inputMode="decimal" className="num" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">Sem categoria</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
            </Select>
          </Field>
          <Field label={tipo === 'receita' ? 'Recebida em' : 'Paga com'}>
            <Select value={carteiraId} onChange={(e) => setCarteiraId(e.target.value)}>
              <option value="">Sem carteira</option>
              {carteirasDisponiveis.map((c) => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Frequência">
            <Select value={frequencia} disabled={!!cartaoSelecionado} onChange={(e) => setFrequencia(e.target.value as FrequenciaRecorrencia)}>
              <option value="mensal">Mensal</option>
              <option value="semanal">Semanal</option>
              <option value="anual">Anual</option>
            </Select>
          </Field>
          {frequencia === 'semanal' ? (
            <Field label="Dia da semana">
              <Select value={dia} onChange={(e) => setDia(e.target.value)}>
                {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label={cartaoSelecionado ? 'Dia da cobrança' : 'Dia do mês'}>
              <Input value={dia} onChange={(e) => setDia(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" className="num" />
            </Field>
          )}
        </div>
        {cartaoSelecionado && (
          <p className="-mt-1 text-[12px] text-text-3">
            Cobrada todo mês no {cartaoSelecionado.nome}. Não vira conta a pagar própria: entra na fatura, que vence
            dia {cartaoSelecionado.dia_vencimento}.
          </p>
        )}
        <Field label="Início da recorrência" hint="Se for no passado, os lançamentos desde essa data são criados automaticamente.">
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </Field>

        {erro && <p className="text-[12px] font-medium text-danger">{erro}</p>}
        <div className="mt-2 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="flex-1" loading={salvando} onClick={salvar}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}
