import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Field, Select } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useData } from '@/contexts/DataContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, todayISO } from '@/lib/format'
import type { Conta, ContaVirtual } from '@/lib/types'
import { useFinanceiro } from './FinanceiroContext'

export type ContaPagavel = Conta | ContaVirtual

export function isVirtual(c: ContaPagavel): c is ContaVirtual {
  return 'virtual' in c && c.virtual === true
}

/** Janela central para pagar uma conta a pagar ou uma fatura de cartão. */
export function PagarContaModal({ conta, onClose }: { conta: ContaPagavel | null; onClose: () => void }) {
  const { reload } = useData()
  const { carteiras, pagarFatura } = useFinanceiro()
  const toast = useToast()
  const [pagando, setPagando] = useState(false)
  const pagadoras = carteiras.filter((c) => c.tipo !== 'cartao_credito')
  const [pagadora, setPagadora] = useState('')

  useEffect(() => {
    if (conta) setPagadora(pagadoras[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conta?.id])

  async function confirmar() {
    if (!conta) return
    setPagando(true)
    try {
      if (isVirtual(conta)) {
        if (conta.origem !== 'fatura' || !conta.cartaoId || !conta.fimCiclo) return
        await pagarFatura(conta.cartaoId, conta.fimCiclo, pagadora || null, conta.valor)
        toast('success', 'Fatura paga.')
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

  const virtual = conta && isVirtual(conta) ? conta : null
  const recorrencia = virtual?.origem === 'recorrencia'
  const fatura = virtual?.origem === 'fatura'
  const faturaAberta = !!virtual?.faturaAberta

  return (
    <Modal
      open={!!conta}
      onOpenChange={(v) => !v && onClose()}
      title={faturaAberta ? 'Fatura em aberto' : recorrencia ? 'Conta recorrente' : fatura ? 'Pagar fatura' : 'Pagar conta'}
      maxWidth={400}
    >
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
            <span className="num text-[16px] font-bold text-text-1">{formatCurrency(conta.valor)}</span>
          </div>

          {faturaAberta ? (
            <>
              <p className="text-[13px] text-text-2">
                Esta fatura ainda recebe compras e fecha em {formatDate(virtual!.fechaEm!, 'dd/MM')}. O pagamento
                fica disponível depois do fechamento, com o valor final.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={onClose}>Fechar</Button>
                <Link to="/carteiras" onClick={onClose} className="btn-primary flex-1 justify-center">Ver cartão</Link>
              </div>
            </>
          ) : recorrencia ? (
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
              {fatura && (
                <Field label="Pagar com" hint="O valor sai desta conta. As compras já contaram como despesa na data da compra.">
                  <Select value={pagadora} onChange={(e) => setPagadora(e.target.value)}>
                    <option value="">Sem carteira</option>
                    {pagadoras.map((c) => (
                      <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
                    ))}
                  </Select>
                </Field>
              )}
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
                <Button className="flex-1" loading={pagando} onClick={confirmar}>
                  {fatura ? 'Pagar fatura' : 'Marcar como paga'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
