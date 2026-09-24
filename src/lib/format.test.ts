import { describe, expect, it } from 'vitest'
import { maskMoneyInput, parseMoney } from './format'

describe('maskMoneyInput', () => {
  it('separa milhar e centavos no padrão pt-BR', () => {
    expect(maskMoneyInput('100000')).toBe('1.000,00')
    expect(maskMoneyInput('123456789')).toBe('1.234.567,89')
  })
  it('valores pequenos e entrada vazia', () => {
    expect(maskMoneyInput('5')).toBe('0,05')
    expect(maskMoneyInput('')).toBe('')
    expect(maskMoneyInput('abc')).toBe('')
  })
  it('ignora zeros à esquerda', () => {
    expect(maskMoneyInput('000150')).toBe('1,50')
  })
})

describe('parseMoney', () => {
  it('lê o formato mascarado', () => {
    expect(parseMoney('1.234,56')).toBe(1234.56)
    expect(parseMoney(maskMoneyInput('100000'))).toBe(1000)
  })
  it('aceita ponto decimal e texto vazio', () => {
    expect(parseMoney('1234.56')).toBe(1234.56)
    expect(parseMoney('')).toBe(0)
  })
})
