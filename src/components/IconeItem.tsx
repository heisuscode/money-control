import {
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  Clapperboard,
  Coffee,
  CreditCard,
  Dumbbell,
  Gem,
  Gift,
  GraduationCap,
  House,
  Landmark,
  Laptop,
  Lightbulb,
  Music,
  PawPrint,
  Plane,
  Shield,
  ShoppingBag,
  Smartphone,
  Stethoscope,
  Sun,
  Tag,
  Target,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { chaveIcone, NOME_ICONE, type ChaveIcone } from '@/lib/icones'
import { cn } from '@/lib/cn'

// Mesma família de ícones de linha do menu lateral (lucide).
const LUCIDE: Record<ChaveIcone, LucideIcon> = {
  alimentacao: Utensils,
  transporte: Car,
  casa: House,
  saude: Stethoscope,
  educacao: BookOpen,
  lazer: Clapperboard,
  compras: ShoppingBag,
  investimento: TrendingUp,
  pet: PawPrint,
  viagem: Plane,
  presente: Gift,
  energia: Lightbulb,
  celular: Smartphone,
  cafe: Coffee,
  academia: Dumbbell,
  musica: Music,
  salario: Briefcase,
  meta: Target,
  computador: Laptop,
  formatura: GraduationCap,
  casamento: Gem,
  praia: Sun,
  reserva: Shield,
  banco: Landmark,
  dinheiro: Banknote,
  cartao: CreditCard,
  etiqueta: Tag,
}

/** Desenha o ícone de uma chave (ou de um emoji antigo gravado no banco). */
export function IconeChave({
  chave,
  size = 18,
  className,
  color,
}: {
  chave: ChaveIcone
  size?: number
  className?: string
  color?: string
}) {
  const Componente = LUCIDE[chave]
  return <Componente size={size} strokeWidth={1.9} className={className} color={color} aria-hidden />
}

/**
 * Quadrado colorido com o ícone da categoria/meta/carteira, no lugar do emoji.
 * `icone` é o valor gravado no banco (chave nova ou emoji antigo).
 */
export function IconeItem({
  icone,
  nome,
  cor,
  padrao,
  chave,
  className,
  tamanho = 18,
}: {
  icone?: string | null
  nome?: string | null
  cor?: string | null
  padrao?: ChaveIcone
  /** força a chave (ex.: carteiras, pelo tipo) */
  chave?: ChaveIcone
  className?: string
  tamanho?: number
}) {
  const resolvida = chave ?? chaveIcone(icone, nome, padrao)
  const tom = cor || '#004AAD'
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-xl', className ?? 'h-10 w-10')}
      style={{ background: `${tom}1f`, color: tom }}
      title={NOME_ICONE[resolvida]}
    >
      <IconeChave chave={resolvida} size={tamanho} />
    </span>
  )
}
