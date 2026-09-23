import { daysUntil } from '@/lib/format'
import type { Carteira, ContaVirtual, Movimentacao, PagamentoFatura, Recorrencia } from '@/lib/types'
import { chaveFatura, iso, proximaOcorrencia, recorrenciaConcluida, resumoCartao } from './logic'

/** Pagamentos indexados pela chave da fatura (`${cartaoId}_${fimCiclo}`). */
export function indexarPagamentos(pagamentos: PagamentoFatura[]): Record<string, PagamentoFatura> {
  return Object.fromEntries(pagamentos.map((p) => [chaveFatura(p.cartao_id, p.fim_ciclo), p]))
}

/**
 * Contas a pagar calculadas (não gravadas): faturas de cartão (fechadas e a
 * aberta) e a próxima ocorrência das recorrências que saem de conta/dinheiro —
 * as que estão num cartão já entram somadas na fatura.
 */
export function montarContasVirtuais(
  carteiras: Carteira[],
  recorrencias: Recorrencia[],
  despesas: Pick<Movimentacao, 'data' | 'valor' | 'carteira_id'>[],
  pagamentosFatura: Record<string, PagamentoFatura>,
): ContaVirtual[] {
  const status = (venc: string, paga: boolean): ContaVirtual['status'] =>
    paga ? 'pago' : daysUntil(venc) < 0 ? 'atrasado' : 'pendente'

  const faturas = carteiras
    .filter((c) => c.tipo === 'cartao_credito')
    .flatMap((c) => {
      const r = resumoCartao(c, despesas, pagamentosFatura, recorrencias)
      const fechadas = r.fechadas.map((f): ContaVirtual => {
        const venc = iso(f.ciclo.vencimento)
        return {
          id: `fatura_${f.chave}`,
          usuario_id: c.usuario_id,
          descricao: `Fatura ${c.nome}`,
          valor: f.total,
          vencimento: venc,
          status: status(venc, f.paga),
          pago_em: pagamentosFatura[f.chave]?.data ?? null,
          criado_em: venc,
          virtual: true,
          origem: 'fatura',
          cartaoId: c.id,
          fimCiclo: iso(f.ciclo.fim),
        }
      })
      if (r.aberta.total <= 0) return fechadas
      const venc = iso(r.aberta.ciclo.vencimento)
      const aberta: ContaVirtual = {
        id: `fatura_aberta_${c.id}`,
        usuario_id: c.usuario_id,
        descricao: `Fatura ${c.nome} (em aberto)`,
        valor: r.aberta.total,
        vencimento: venc,
        status: 'pendente',
        pago_em: null,
        criado_em: venc,
        virtual: true,
        origem: 'fatura',
        cartaoId: c.id,
        faturaAberta: true,
        fechaEm: iso(r.aberta.ciclo.fim),
      }
      return [...fechadas, aberta]
    })

  const recorrentes = recorrencias
    .filter((r) => r.ativo && r.tipo === 'despesa' && !recorrenciaConcluida(r))
    .filter((r) => carteiras.find((c) => c.id === r.carteira_id)?.tipo !== 'cartao_credito')
    .map((r): ContaVirtual => {
      const venc = iso(proximaOcorrencia(r))
      return {
        id: `rec_${r.id}_${venc}`,
        usuario_id: r.usuario_id,
        descricao: r.descricao,
        valor: Number(r.valor),
        vencimento: venc,
        status: status(venc, false),
        pago_em: null,
        criado_em: venc,
        virtual: true,
        origem: 'recorrencia',
        recorrenciaId: r.id,
      }
    })

  return [...faturas, ...recorrentes]
}
