import type { ChaveIcone } from '@/lib/icones'
import type { NomeIcone } from './ui'

// Chaves de ícone compartilhadas com o site (src/lib/icones.ts) desenhadas com
// ícones de linha do Ionicons — a mesma família da barra de abas.
export const IONICONS: Record<ChaveIcone, NomeIcone> = {
  alimentacao: 'restaurant-outline',
  transporte: 'car-outline',
  casa: 'home-outline',
  saude: 'medkit-outline',
  educacao: 'book-outline',
  lazer: 'film-outline',
  compras: 'bag-handle-outline',
  investimento: 'trending-up-outline',
  pet: 'paw-outline',
  viagem: 'airplane-outline',
  presente: 'gift-outline',
  energia: 'bulb-outline',
  celular: 'phone-portrait-outline',
  cafe: 'cafe-outline',
  academia: 'barbell-outline',
  musica: 'musical-notes-outline',
  salario: 'briefcase-outline',
  meta: 'flag-outline',
  computador: 'laptop-outline',
  formatura: 'school-outline',
  casamento: 'diamond-outline',
  praia: 'sunny-outline',
  reserva: 'shield-checkmark-outline',
  banco: 'business-outline',
  dinheiro: 'cash-outline',
  cartao: 'card-outline',
  etiqueta: 'pricetag-outline',
}
