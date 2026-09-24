import { describe, expect, it } from 'vitest'
import { chaveCarteira, chaveIcone } from './icones'

describe('chaveIcone', () => {
  it('aceita a chave nova', () => {
    expect(chaveIcone('alimentacao')).toBe('alimentacao')
  })
  it('traduz emojis já gravados, com ou sem seletor de variação', () => {
    expect(chaveIcone('🍽️')).toBe('alimentacao')
    expect(chaveIcone('🍽')).toBe('alimentacao')
    expect(chaveIcone('🛍️')).toBe('compras')
    expect(chaveIcone('🎯')).toBe('meta')
  })
  it('sem ícone conhecido, usa o nome', () => {
    expect(chaveIcone('❓', 'Uber e 99')).toBe('transporte')
    expect(chaveIcone(null, 'Conta de luz')).toBe('energia')
  })
  it('cai no padrão quando não reconhece nada', () => {
    expect(chaveIcone('', 'Diversos')).toBe('etiqueta')
    expect(chaveIcone(undefined, undefined, 'meta')).toBe('meta')
  })
})

describe('chaveCarteira', () => {
  it('usa o tipo da carteira', () => {
    expect(chaveCarteira('conta')).toBe('banco')
    expect(chaveCarteira('dinheiro')).toBe('dinheiro')
    expect(chaveCarteira('cartao_credito')).toBe('cartao')
  })
})
