import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Recorrencia } from '@/lib/types'
import {
  cicloAberto,
  ciclosFechados,
  dividirEmParcelas,
  iso,
  numeroParcela,
  ocorrenciasPendentes,
  parcelasLancadas,
  primeiraOcorrencia,
  proximaOcorrencia,
  recorrenciaConcluida,
  resumoCartao,
  valorDaParcela,
  valorParcelasFuturas,
} from './logic'

const d = (s: string) => new Date(`${s}T00:00:00`)

function rec(parcial: Partial<Recorrencia>): Recorrencia {
  return {
    id: 'r1',
    usuario_id: 'u',
    ativo: true,
    tipo: 'despesa',
    descricao: 'Teste',
    valor: 100,
    categoria_id: null,
    carteira_id: null,
    frequencia: 'mensal',
    dia: 10,
    data_inicio: '2026-01-10',
    ultima_execucao: null,
    parcelas_total: null,
    valor_total: null,
    criado_em: '2026-01-01T00:00:00Z',
    ...parcial,
  }
}

const cartao = (fecha: number, vence: number) => ({
  id: 'c1',
  limite: 5000,
  dia_fechamento: fecha,
  dia_vencimento: vence,
  criado_em: '2025-01-01T00:00:00Z',
})

describe('dividirEmParcelas', () => {
  it('divide igual quando fecha', () => {
    expect(dividirEmParcelas(300, 3)).toEqual({ valor: 100, ultima: 100 })
  })
  it('a última parcela absorve os centavos', () => {
    expect(dividirEmParcelas(100, 3)).toEqual({ valor: 33.33, ultima: 33.34 })
  })
})

describe('recorrências', () => {
  it('primeira ocorrência mensal no mesmo mês ou no seguinte', () => {
    expect(iso(primeiraOcorrencia(rec({ dia: 15, data_inicio: '2026-03-10' })))).toBe('2026-03-15')
    expect(iso(primeiraOcorrencia(rec({ dia: 5, data_inicio: '2026-03-10' })))).toBe('2026-04-05')
  })
  it('dia 31 cai no último dia de meses curtos', () => {
    const r = rec({ dia: 31, data_inicio: '2026-01-31', ultima_execucao: '2026-01-31' })
    expect(iso(proximaOcorrencia(r))).toBe('2026-02-28')
  })
  it('semanal cai no dia da semana pedido', () => {
    // 2026-03-10 é terça (2); dia 5 = sexta
    expect(iso(primeiraOcorrencia(rec({ frequencia: 'semanal', dia: 5, data_inicio: '2026-03-10' })))).toBe('2026-03-13')
  })
})

describe('parcelamento', () => {
  const compra = rec({ dia: 10, data_inicio: '2026-01-10', parcelas_total: 3, valor: 33.33, valor_total: 100 })

  it('numera as parcelas por mês', () => {
    expect(numeroParcela(compra, '2026-01-10')).toBe(1)
    expect(numeroParcela(compra, '2026-03-10')).toBe(3)
  })
  it('a última parcela fecha o total', () => {
    expect(valorDaParcela(compra, 1)).toBe(33.33)
    expect(valorDaParcela(compra, 3)).toBe(33.34)
  })
  it('parcelas futuras = o que falta lançar', () => {
    const r = { ...compra, ultima_execucao: '2026-01-10' }
    expect(parcelasLancadas(r)).toBe(1)
    expect(valorParcelasFuturas(r)).toBe(66.67)
    expect(recorrenciaConcluida({ ...compra, ultima_execucao: '2026-03-10' })).toBe(true)
  })
})

describe('ocorrenciasPendentes', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(d('2026-06-15'))
  })
  afterEach(() => vi.useRealTimers())

  it('lança só até hoje', () => {
    const r = rec({ dia: 10, data_inicio: '2026-04-10', ultima_execucao: '2026-04-10' })
    expect(ocorrenciasPendentes(r)).toEqual(['2026-05-10', '2026-06-10'])
  })
  it('para no fim do parcelamento', () => {
    const r = rec({ dia: 10, data_inicio: '2026-01-10', ultima_execucao: '2026-01-10', parcelas_total: 3, valor_total: 300 })
    expect(ocorrenciasPendentes(r)).toEqual(['2026-02-10', '2026-03-10'])
  })
  it('pausada não lança nada', () => {
    expect(ocorrenciasPendentes(rec({ ativo: false, data_inicio: '2026-01-10' }))).toEqual([])
  })
})

describe('ciclo da fatura', () => {
  it('fecha 10 / vence 17: vence no mesmo mês', () => {
    const c = cicloAberto(cartao(10, 17), d('2026-03-05'))
    expect([iso(c.inicio), iso(c.fim), iso(c.vencimento)]).toEqual(['2026-02-11', '2026-03-10', '2026-03-17'])
  })
  it('fecha 25 / vence 5: vence no mês seguinte', () => {
    const c = cicloAberto(cartao(25, 5), d('2026-03-26'))
    expect([iso(c.inicio), iso(c.fim), iso(c.vencimento)]).toEqual(['2026-03-26', '2026-04-25', '2026-05-05'])
  })
  it('no dia do fechamento a fatura ainda está aberta', () => {
    expect(iso(cicloAberto(cartao(10, 17), d('2026-03-10')).fim)).toBe('2026-03-10')
  })
  it('ciclos fechados vêm do mais recente para o mais antigo', () => {
    const f = ciclosFechados(cartao(10, 17), 2, d('2026-03-05'))
    expect(f.map((c) => iso(c.fim))).toEqual(['2026-02-10', '2026-01-10'])
  })
})

describe('resumoCartao', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(d('2026-03-05'))
  })
  afterEach(() => vi.useRealTimers())

  const despesas = [
    { data: '2026-03-01', valor: 200, carteira_id: 'c1' }, // fatura aberta (fecha 10/03)
    { data: '2026-02-05', valor: 300, carteira_id: 'c1' }, // fechada em 10/02
    { data: '2026-03-02', valor: 999, carteira_id: 'outro' },
  ]

  it('limite disponível desconta aberta, fechadas não pagas e parcelas futuras', () => {
    const parcelada = rec({
      carteira_id: 'c1',
      dia: 1,
      data_inicio: '2026-03-01',
      ultima_execucao: '2026-03-01',
      parcelas_total: 4,
      valor: 50,
      valor_total: 200,
    })
    const r = resumoCartao(cartao(10, 17), despesas, {}, [parcelada])
    expect(r.aberta.total).toBe(200)
    expect(r.fechadas.map((f) => f.total)).toEqual([300])
    expect(r.emAberto).toBe(500)
    expect(r.parcelasFuturas).toBe(150)
    expect(r.disponivel).toBe(5000 - 500 - 150)
  })

  it('fatura paga libera o limite', () => {
    const r = resumoCartao(cartao(10, 17), despesas, { 'c1_2026-02-10': { total: 300 } })
    expect(r.emAberto).toBe(200)
  })

  it('pagamento parcial deixa o restante em aberto', () => {
    const r = resumoCartao(cartao(10, 17), despesas, { 'c1_2026-02-10': { total: 100 } })
    expect(r.fechadas[0]).toMatchObject({ total: 300, pago: 100, restante: 200, paga: false })
    expect(r.emAberto).toBe(400)
  })

  it('pagamento adiantado abate da fatura aberta e libera limite', () => {
    const r = resumoCartao(cartao(10, 17), despesas, { 'c1_2026-03-10': { total: 150 } })
    expect(r.aberta).toMatchObject({ total: 200, pago: 150, restante: 50 })
    expect(r.emAberto).toBe(50 + 300)
    expect(r.disponivel).toBe(5000 - 350)
  })

  it('adiantar mais do que a fatura não deixa o restante negativo', () => {
    const r = resumoCartao(cartao(10, 17), despesas, { 'c1_2026-03-10': { total: 250 } })
    expect(r.aberta.restante).toBe(0)
  })

  it('faturas vencidas antes do cadastro do cartão são histórico', () => {
    const novo = { ...cartao(10, 17), criado_em: '2026-03-01T00:00:00Z' }
    expect(resumoCartao(novo, despesas, {}).fechadas).toEqual([])
  })
})
