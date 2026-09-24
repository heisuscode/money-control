import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react'
import { IconeItem } from '@/components/IconeItem'
import { chaveCarteira } from '@/lib/icones'
import { Topbar } from '@/components/Topbar'
import { PageBody } from '@/components/PageBody'
import { Button, Card, EmptyState, ErrorState, Field, Input, Select, Skeleton } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useData } from '@/contexts/DataContext'
import { formatCurrency, formatDate, formatNumber, maskMoneyInput, parseMoney } from '@/lib/format'
import { sum } from '@/lib/finance'
import { cn } from '@/lib/cn'
import type { Carteira, TipoCarteira } from '@/lib/types'
import { useFinanceiro } from './FinanceiroContext'
import { resumoCartao } from './logic'

// o banco guarda a chave do ícone; o desenho vem do tipo (ver src/lib/icones.ts)
const ICONE_POR_TIPO: Record<TipoCarteira, string> = { conta: 'banco', dinheiro: 'dinheiro', cartao_credito: 'cartao' }
const LABEL_TIPO: Record<TipoCarteira, string> = { conta: 'Conta bancária', dinheiro: 'Dinheiro', cartao_credito: 'Cartão de crédito' }
const CORES = ['#004AAD', '#16A34A', '#820AD1', '#E5484D', '#F59E0B', '#06B6D4', '#EC7000', '#8A95A6']

export default function CarteirasPage() {
  const { receitas, despesas, loading: carregandoDados } = useData()
  const { carteiras, recorrencias, removerCarteira, pagamentosFatura, pagamentos, loading: carregandoCarteiras, erro } = useFinanceiro()
  const toast = useToast()
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Carteira | null>(null)
  const [excluir, setExcluir] = useState<Carteira | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const loading = carregandoDados || carregandoCarteiras

  // saldo = inicial + receitas − despesas − faturas de cartão pagas com esta conta
  function saldo(c: Carteira) {
    const faturasPagasAqui = pagamentos
      .filter((p) => p.carteira_id === c.id)
      .reduce((a, p) => a + Number(p.valor), 0)
    return (
      Number(c.saldo_inicial) +
      sum(receitas.filter((r) => r.carteira_id === c.id)) -
      sum(despesas.filter((d) => d.carteira_id === c.id)) -
      faturasPagasAqui
    )
  }

  const contas = carteiras.filter((c) => c.tipo !== 'cartao_credito')
  const cartoes = carteiras.filter((c) => c.tipo === 'cartao_credito')
  const saldoContas = contas.reduce((a, c) => a + saldo(c), 0)
  const dividaCartoes = cartoes.reduce((a, c) => {
    const r = resumoCartao(c, despesas, pagamentosFatura, recorrencias)
    return a + r.emAberto + r.parcelasFuturas
  }, 0)

  async function confirmarExcluir() {
    if (!excluir) return
    setExcluindo(true)
    try {
      await removerCarteira(excluir.id)
      toast('success', 'Carteira removida.')
      setExcluir(null)
    } catch {
      toast('error', 'Não foi possível remover a carteira.')
    } finally {
      setExcluindo(false)
    }
  }

  const novo = () => { setEditando(null); setModal(true) }

  return (
    <>
      <Topbar
        title="Carteiras & Cartões"
        subtitle="Contas, dinheiro e cartões de crédito"
        actions={
          <button className="btn-primary" onClick={novo}>
            <Plus size={16} /> Nova carteira
          </button>
        }
      />
      <PageBody>
        {erro ? (
          <Card><ErrorState message={erro} /></Card>
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-full" />)}
          </div>
        ) : carteiras.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Wallet size={28} />}
              title="Nenhuma carteira ainda"
              description="Cadastre suas contas, dinheiro e cartões para saber de onde sai cada gasto e acompanhar faturas e limites."
              action={<Button onClick={novo}><Plus size={16} /> Nova carteira</Button>}
            />
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Resumo label="Saldo em contas e dinheiro" valor={saldoContas} tom={saldoContas < 0 ? 'danger' : 'default'} />
              <Resumo label="Em aberto nos cartões" valor={dividaCartoes} tom="warning" />
              <Resumo
                label="Patrimônio líquido"
                valor={saldoContas - dividaCartoes}
                tom={saldoContas - dividaCartoes < 0 ? 'danger' : 'success'}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {carteiras.map((c) => (
                <Card key={c.id} className="group flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <IconeItem chave={chaveCarteira(c.tipo)} cor={c.cor} className="h-11 w-11" tamanho={20} />
                      <div>
                        <div className="text-[15px] font-bold text-text-1">{c.nome}</div>
                        <div className="text-[12px] text-text-3">{LABEL_TIPO[c.tipo]}</div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100 max-md:opacity-100">
                      <button onClick={() => { setEditando(c); setModal(true) }} className="text-text-3 hover:text-text-1" title="Editar"><Pencil size={15} /></button>
                      <button onClick={() => setExcluir(c)} className="text-danger" title="Remover"><Trash2 size={15} /></button>
                    </div>
                  </div>

                  {c.tipo === 'cartao_credito' ? <CartaoInfo cartao={c} /> : (
                    <div>
                      <div className="text-[11px] text-text-3">Saldo</div>
                      <div className={cn('num text-[22px] font-bold', saldo(c) < 0 ? 'text-danger' : 'text-text-1')}>
                        {formatCurrency(saldo(c))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}

              <button
                onClick={novo}
                className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line text-text-3 transition hover:border-brand hover:text-brand"
              >
                <Plus size={22} />
                <span className="text-[13px] font-semibold">Nova carteira/cartão</span>
              </button>
            </div>
          </>
        )}
      </PageBody>

      <CarteiraModal open={modal} onOpenChange={setModal} editar={editando} />
      <ConfirmDialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        message={`Remover "${excluir?.nome}"? As transações continuam existindo, só perdem o vínculo com esta carteira.`}
        loading={excluindo}
        onConfirm={confirmarExcluir}
      />
    </>
  )
}

function CartaoInfo({ cartao }: { cartao: Carteira }) {
  const { despesas } = useData()
  const { pagamentosFatura, recorrencias } = useFinanceiro()
  const r = resumoCartao(cartao, despesas, pagamentosFatura, recorrencias)
  const limite = Number(cartao.limite ?? 0)
  const pendentes = r.fechadas.filter((f) => !f.paga)
  const usoPct = limite > 0 ? Math.min(100, ((r.emAberto + r.parcelasFuturas) / limite) * 100) : 0

  return (
    <>
      <div>
        <div className="text-[11px] text-text-3">Fatura atual · fecha {formatDate(r.aberta.ciclo.fim, 'dd/MM')}</div>
        <div className="num text-[22px] font-bold text-text-1">{formatCurrency(r.aberta.total)}</div>
        {r.aberta.pago > 0 && (
          <div className="text-[12px] font-semibold text-success">
            Pago adiantado {formatCurrency(r.aberta.pago)} · falta {formatCurrency(r.aberta.restante)}
          </div>
        )}
      </div>
      <div className="h-2 rounded-full bg-subtle">
        <div className="h-2 rounded-full" style={{ width: `${usoPct}%`, background: usoPct > 90 ? '#E5484D' : cartao.cor }} />
      </div>
      <div className="flex items-center justify-between text-[12px] text-text-3">
        <span>Disponível: <b className={cn('num', r.disponivel < 0 ? 'text-danger' : 'text-text-1')}>{formatCurrency(r.disponivel)}</b></span>
        <span>Limite: <b className="num text-text-1">{formatCurrency(limite)}</b></span>
      </div>
      {r.parcelasFuturas > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-subtle px-2.5 py-1.5 text-[12px]">
          <span className="text-text-2">Parcelas das próximas faturas</span>
          <b className="num text-text-1">{formatCurrency(r.parcelasFuturas)}</b>
        </div>
      )}
      {pendentes.map((f) => (
        <div key={f.chave} className="flex items-center justify-between rounded-lg bg-warning/10 px-2.5 py-1.5 text-[12px]">
          <span className="text-text-2">
            Fatura fechada · vence {formatDate(f.ciclo.vencimento, 'dd/MM')}
            {f.pago > 0 ? ` · falta pagar` : ''}
          </span>
          <b className="num text-text-1">{formatCurrency(f.restante)}</b>
        </div>
      ))}
      <div className="text-[11px] text-text-3">
        Fecha dia {cartao.dia_fechamento} · vence dia {cartao.dia_vencimento}
      </div>
    </>
  )
}

function Resumo({ label, valor, tom }: { label: string; valor: number; tom: 'default' | 'danger' | 'warning' | 'success' }) {
  const cor = { default: 'text-text-1', danger: 'text-danger', warning: 'text-warning', success: 'text-success' }[tom]
  return (
    <Card>
      <div className="text-[12px] font-semibold text-text-2">{label}</div>
      <div className={cn('num mt-1 text-[20px] font-bold', cor)}>{formatCurrency(valor)}</div>
    </Card>
  )
}

function CarteiraModal({
  open,
  onOpenChange,
  editar,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editar: Carteira | null
}) {
  const { salvarCarteira } = useFinanceiro()
  const toast = useToast()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoCarteira>('conta')
  const [cor, setCor] = useState(CORES[0])
  const [saldoInicial, setSaldoInicial] = useState('')
  const [limite, setLimite] = useState('')
  const [diaFechamento, setDiaFechamento] = useState('25')
  const [diaVencimento, setDiaVencimento] = useState('5')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    setNome(editar?.nome ?? '')
    setTipo(editar?.tipo ?? 'conta')
    setCor(editar?.cor ?? CORES[0])
    setSaldoInicial(editar && Number(editar.saldo_inicial) ? formatNumber(Number(editar.saldo_inicial)) : '')
    setLimite(editar?.limite ? formatNumber(Number(editar.limite)) : '')
    setDiaFechamento(String(editar?.dia_fechamento ?? 25))
    setDiaVencimento(String(editar?.dia_vencimento ?? 5))
    setErro(null)
  }, [open, editar])

  async function salvar() {
    setErro(null)
    if (!nome.trim()) return setErro('Informe o nome.')
    const cartao = tipo === 'cartao_credito'
    const fech = Number(diaFechamento)
    const venc = Number(diaVencimento)
    if (cartao) {
      if (parseMoney(limite) <= 0) return setErro('Informe o limite do cartão.')
      if (!(fech >= 1 && fech <= 31) || !(venc >= 1 && venc <= 31)) return setErro('Dias de fechamento e vencimento devem estar entre 1 e 31.')
    }
    setSalvando(true)
    try {
      await salvarCarteira(
        {
          nome: nome.trim(),
          tipo,
          cor,
          icone: ICONE_POR_TIPO[tipo],
          saldo_inicial: cartao ? 0 : parseMoney(saldoInicial),
          limite: cartao ? parseMoney(limite) : null,
          dia_fechamento: cartao ? fech : null,
          dia_vencimento: cartao ? venc : null,
        },
        editar?.id,
      )
      toast('success', editar ? 'Carteira atualizada.' : 'Carteira criada.')
      onOpenChange(false)
    } catch {
      setErro('Não foi possível salvar a carteira.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={editar ? 'Editar carteira' : 'Nova carteira'} maxWidth={440}>
      <div className="flex flex-col gap-4">
        <Field label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Cartão Inter" />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCarteira)}>
            <option value="conta">Conta bancária</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao_credito">Cartão de crédito</option>
          </Select>
        </Field>

        {tipo === 'cartao_credito' ? (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Limite">
              <Input value={limite} onChange={(e) => setLimite(maskMoneyInput(e.target.value))} placeholder="0,00" inputMode="decimal" className="num" />
            </Field>
            <Field label="Fecha dia">
              <Input value={diaFechamento} onChange={(e) => setDiaFechamento(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" className="num" />
            </Field>
            <Field label="Vence dia">
              <Input value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" className="num" />
            </Field>
          </div>
        ) : (
          <Field label="Saldo inicial" hint="Quanto havia nesta conta antes de começar a usar o app.">
            <Input value={saldoInicial} onChange={(e) => setSaldoInicial(maskMoneyInput(e.target.value))} placeholder="0,00" inputMode="decimal" className="num" />
          </Field>
        )}

        <Field label="Cor">
          <div className="flex flex-wrap gap-2">
            {CORES.map((c) => (
              <button
                key={c}
                onClick={() => setCor(c)}
                className={cn('h-8 w-8 rounded-full border-2', cor === c ? 'border-text-1' : 'border-transparent')}
                style={{ background: c }}
              />
            ))}
          </div>
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
