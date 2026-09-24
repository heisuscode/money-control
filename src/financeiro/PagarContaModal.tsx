import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Field, Input, Select } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useData } from '@/contexts/DataContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, formatNumber, maskMoneyInput, parseMoney, todayISO } from '@/lib/format'
import type { Conta, ContaVirtual } from '@/lib/types'
import { useFinanceiro } from './FinanceiroContext'

export type ContaPagavel = Conta | ContaVirtual

export function isVirtual(c: ContaPagavel): c is ContaVirtual {
  return 'virtual' in c && c.virtual === true
}

/**
 * Janela central para pagar uma conta a pagar ou uma fatura de cartão. Fatura
 * pode ser paga em partes e também adiantada (antes de fechar): o valor pago
 * abate do total e libera limite.
 */
export function PagarContaModal({ conta, onClose }: { conta: ContaPagavel | null; onClose: () => void }) {
  const { reload } = useData()
  const { carteiras, pagarFatura } = useFinanceiro()
  const toast = useToast()
  const [pagando, setPagando] = useState(false)
  const pagadoras = carteiras.filter((c) => c.tipo !== 'cartao_credito')
  const [pagadora, setPagadora] = useState('')
  const [valorStr, setValorStr] = useState('')

  // Nova conta aberta: sugere a primeira conta e o valor que falta pagar.
  const [contaAtual, setContaAtual] = useState<string | null>(null)
  if (conta && conta.id !== contaAtual) {
    setContaAtual(conta.id)
    setPagadora(pagadoras[0]?.id ?? '')
    setValorStr(formatNumber(Number(conta.valor)))
  }
  if (!conta && contaAtual !== null) setContaAtual(null)

  const virtual = conta && isVirtual(conta) ? conta : null
  const recorrencia = virtual?.origem === 'recorrencia'
  const fatura = virtual?.origem === 'fatura'
  const faturaAberta = !!virtual?.faturaAberta
  const restante = Number(conta?.valor ?? 0)
  const pagoAntes = virtual?.pagoFatura ?? 0
  const valor = parseMoney(valorStr)

  async function confirmar() {
    if (!conta) return
    if (fatura && (valor <= 0 || valor > restante + 0.001)) {
      toast('error', `Informe um valor entre R$ 0,01 e ${formatCurrency(restante)}.`)
      return
    }
    setPagando(true)
    try {
      if (virtual) {
        if (!virtual.cartaoId || !virtual.fimCiclo) return
        await pagarFatura(virtual.cartaoId, virtual.fimCiclo, pagadora || null, valor)
        toast('success', valor < restante - 0.001 ? `Pago ${formatCurrency(valor)}. Falta ${formatCurrency(restante - valor)}.` : 'Fatura paga.')
      } else {
        const { error } = await supabase.from('contas').update({ status: 'pago', pago_em: todayISO() }).eq('id', conta.id)
        if (error) throw error
        toast('success', 'Conta marcada como paga.')
        reload(['contas'])
      }
      onClose()
    } catch {
      toast('error', 'Não foi possível registrar o pagamento.')
    } finally {
      setPagando(false)
    }
  }

  const titulo = faturaAberta ? 'Pagar fatura adiantado' : recorrencia ? 'Conta recorrente' : fatura ? 'Pagar fatura' : 'Pagar conta'

  return (
    <Modal open={!!conta} onOpenChange={(v) => !v && onClose()} title={titulo} maxWidth={400}>
      {conta && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl bg-subtle p-3.5">
            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-surface">
              <span className="text-[9px] font-bold uppercase text-text-3">{formatDate(conta.vencimento, 'MMM')}</span>
              <span className="num text-[16px] font-bold text-text-1">{formatDate(conta.vencimento, 'dd')}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-bold text-text-1">{conta.descricao}</div>
              <div className="text-[12px] text-text-3">
                {conta.status === 'atrasado' ? 'Atrasada' : 'Vence'} em {formatDate(conta.vencimento, 'dd/MM/yyyy')}
              </div>
            </div>
            <div className="text-right">
              <div className="num text-[16px] font-bold text-text-1">{formatCurrency(restante)}</div>
              {fatura && pagoAntes > 0 && <div className="text-[11px] text-success">já pago {formatCurrency(pagoAntes)}</div>}
            </div>
          </div>

          {recorrencia ? (
            <>
              <p className="text-[13px] text-text-2">
                Esta despesa é lançada automaticamente na data. Para mudar valor, data ou pausar, use a tela de recorrências.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={onClose}>Fechar</Button>
                <Link to="/recorrencias" onClick={onClose} className="btn-primary flex-1 justify-center">Gerenciar recorrência</Link>
              </div>
            </>
          ) : (
            <>
              {faturaAberta && (
                <p className="rounded-lg bg-active-bg px-3 py-2 text-[13px] text-text-2">
                  A fatura ainda recebe compras até {formatDate(virtual!.fechaEm!, 'dd/MM')}. O que você pagar agora
                  abate do valor final e libera limite na hora.
                </p>
              )}
              {fatura && (
                <>
                  <Field label="Valor do pagamento" hint={`Pode pagar só uma parte. Máximo ${formatCurrency(restante)}.`}>
                    <Input
                      inputMode="numeric"
                      value={valorStr}
                      onChange={(e) => setValorStr(maskMoneyInput(e.target.value))}
                      className="num"
                    />
                  </Field>
                  <Field
                    label="Pagar com"
                    hint={
                      pagadoras.length
                        ? 'O valor sai desta conta. As compras já contaram como despesa na data da compra.'
                        : 'Cadastre uma conta bancária ou dinheiro em Carteiras para escolher de onde sai o pagamento.'
                    }
                  >
                    <Select value={pagadora} onChange={(e) => setPagadora(e.target.value)}>
                      <option value="">Sem carteira</option>
                      {pagadoras.map((c) => (
                        <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
                      ))}
                    </Select>
                  </Field>
                </>
              )}
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
                <Button className="flex-1" loading={pagando} onClick={confirmar}>
                  {fatura ? (faturaAberta ? 'Pagar adiantado' : 'Pagar') : 'Marcar como paga'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
