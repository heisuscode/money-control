// 15 moedas suportadas (RNF12: >= 15). Base de conversão do app: BRL.

export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
  flag: string // emoji de bandeira
  color: string // cor do "chip" redondo
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'BRL', name: 'Real brasileiro', symbol: 'R$', flag: '🇧🇷', color: '#16A34A' },
  { code: 'USD', name: 'Dólar americano', symbol: 'US$', flag: '🇺🇸', color: '#2F6BD4' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', color: '#004AAD' },
  { code: 'GBP', name: 'Libra esterlina', symbol: '£', flag: '🇬🇧', color: '#0E1726' },
  { code: 'JPY', name: 'Iene japonês', symbol: '¥', flag: '🇯🇵', color: '#E5484D' },
  { code: 'CAD', name: 'Dólar canadense', symbol: 'C$', flag: '🇨🇦', color: '#F59E0B' },
  { code: 'AUD', name: 'Dólar australiano', symbol: 'A$', flag: '🇦🇺', color: '#06B6D4' },
  { code: 'CHF', name: 'Franco suíço', symbol: 'CHF', flag: '🇨🇭', color: '#A855F7' },
  { code: 'CNY', name: 'Yuan chinês', symbol: '¥', flag: '🇨🇳', color: '#E5484D' },
  { code: 'ARS', name: 'Peso argentino', symbol: '$', flag: '🇦🇷', color: '#06B6D4' },
  { code: 'MXN', name: 'Peso mexicano', symbol: '$', flag: '🇲🇽', color: '#16A34A' },
  { code: 'CLP', name: 'Peso chileno', symbol: '$', flag: '🇨🇱', color: '#E5484D' },
  { code: 'UYU', name: 'Peso uruguaio', symbol: '$U', flag: '🇺🇾', color: '#2F6BD4' },
  { code: 'PYG', name: 'Guarani paraguaio', symbol: '₲', flag: '🇵🇾', color: '#F59E0B' },
  { code: 'PEN', name: 'Sol peruano', symbol: 'S/', flag: '🇵🇪', color: '#A855F7' },
]

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code)

export function getCurrency(code: string): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}
