// Ícones de categorias, metas e carteiras, compartilhados entre site e app.
//
// O banco guarda um texto em `icone`. Antes eram emojis (🍽️, 🚗, 🏦...), agora
// é uma chave (ex.: 'alimentacao'). Cada plataforma desenha a chave com a sua
// biblioteca de ícones de linha (lucide no site, Ionicons no app). Emojis já
// gravados continuam funcionando: são traduzidos aqui, sem mexer nos dados.

export type ChaveIcone =
  | 'alimentacao'
  | 'transporte'
  | 'casa'
  | 'saude'
  | 'educacao'
  | 'lazer'
  | 'compras'
  | 'investimento'
  | 'pet'
  | 'viagem'
  | 'presente'
  | 'energia'
  | 'celular'
  | 'cafe'
  | 'academia'
  | 'musica'
  | 'salario'
  | 'meta'
  | 'computador'
  | 'formatura'
  | 'casamento'
  | 'praia'
  | 'reserva'
  | 'banco'
  | 'dinheiro'
  | 'cartao'
  | 'etiqueta'

/** Opções do seletor de ícone de categoria. */
export const ICONES_CATEGORIA: ChaveIcone[] = [
  'alimentacao', 'transporte', 'casa', 'saude', 'educacao', 'lazer', 'compras', 'investimento',
  'pet', 'viagem', 'presente', 'energia', 'celular', 'cafe', 'academia', 'musica', 'salario', 'etiqueta',
]

/** Opções do seletor de ícone de meta. */
export const ICONES_META: ChaveIcone[] = [
  'meta', 'viagem', 'casa', 'transporte', 'computador', 'formatura', 'casamento', 'praia', 'reserva', 'investimento',
]

/** Nome para leitores de tela (aria-label) e dicas. */
export const NOME_ICONE: Record<ChaveIcone, string> = {
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  casa: 'Casa',
  saude: 'Saúde',
  educacao: 'Educação',
  lazer: 'Lazer',
  compras: 'Compras',
  investimento: 'Investimento',
  pet: 'Pet',
  viagem: 'Viagem',
  presente: 'Presente',
  energia: 'Contas da casa',
  celular: 'Celular e internet',
  cafe: 'Café',
  academia: 'Academia',
  musica: 'Música',
  salario: 'Salário',
  meta: 'Objetivo',
  computador: 'Computador',
  formatura: 'Estudos',
  casamento: 'Casamento',
  praia: 'Férias',
  reserva: 'Reserva de emergência',
  banco: 'Conta bancária',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  etiqueta: 'Outros',
}

const CHAVES = new Set<string>(Object.keys(NOME_ICONE))

// Emojis usados até agora (categorias padrão, seletores antigos do site, carteiras).
const POR_EMOJI: Record<string, ChaveIcone> = {
  '🍽': 'alimentacao', '🍔': 'alimentacao', '🍕': 'alimentacao', '🛒': 'compras',
  '🚗': 'transporte', '🚌': 'transporte', '⛽': 'transporte',
  '🏠': 'casa', '🏡': 'casa',
  '🩺': 'saude', '💊': 'saude', '🏥': 'saude',
  '📚': 'educacao', '🎓': 'formatura',
  '🎬': 'lazer', '🎮': 'lazer', '🎉': 'lazer',
  '🛍': 'compras', '👕': 'compras',
  '📈': 'investimento', '💹': 'investimento',
  '🐾': 'pet', '🐶': 'pet', '🐱': 'pet',
  '✈': 'viagem', '🧳': 'viagem',
  '🎁': 'presente',
  '💡': 'energia', '🔌': 'energia',
  '📱': 'celular', '📶': 'celular',
  '☕': 'cafe',
  '🏋': 'academia', '💪': 'academia',
  '🎵': 'musica', '🎧': 'musica',
  '💰': 'salario', '💼': 'salario',
  '🎯': 'meta', '🏆': 'meta',
  '💻': 'computador',
  '💍': 'casamento',
  '🏖': 'praia', '🌴': 'praia',
  '🛡': 'reserva',
  '🏦': 'banco',
  '💵': 'dinheiro', '💸': 'dinheiro',
  '💳': 'cartao',
  '🏷': 'etiqueta',
}

// Sem ícone reconhecível: tenta pelo nome da categoria/meta.
const POR_NOME: [RegExp, ChaveIcone][] = [
  [/aliment|mercado|comida|restaur|lanche|padaria|ifood/i, 'alimentacao'],
  [/transport|uber|combust|gasolina|carro|ônibus|onibus|moto/i, 'transporte'],
  [/moradia|casa|aluguel|condom|apartamento/i, 'casa'],
  [/luz|água|agua|energia|gás\b|gas\b/i, 'energia'],
  [/saúde|saude|farm|médic|medic|dentista|plano/i, 'saude'],
  [/academia|esporte|treino/i, 'academia'],
  [/educa|curso|escola|faculdade|livro/i, 'educacao'],
  [/viagem|férias|ferias/i, 'viagem'],
  [/lazer|cinema|diversão|diversao|jogo|show/i, 'lazer'],
  [/internet|celular|telefone/i, 'celular'],
  [/streaming|netflix|spotify|música|musica/i, 'musica'],
  [/roupa|vestu|compras|shopping/i, 'compras'],
  [/pet|cachorro|gato/i, 'pet'],
  [/salár|salar|trabalho|freela|renda/i, 'salario'],
  [/invest|rendimento|juros|dividend/i, 'investimento'],
  [/presente|doação|doacao/i, 'presente'],
  [/reserva|emergência|emergencia/i, 'reserva'],
  [/casamento/i, 'casamento'],
  [/notebook|computador|pc\b/i, 'computador'],
]

/**
 * Resolve o ícone a desenhar: chave nova, emoji antigo ou, por último, pelo nome.
 * Ex.: chaveIcone('🍽️') === 'alimentacao'; chaveIcone(null, 'Uber') === 'transporte'.
 */
export function chaveIcone(icone: string | null | undefined, nome?: string | null, padrao: ChaveIcone = 'etiqueta'): ChaveIcone {
  const valor = (icone ?? '').trim()
  if (CHAVES.has(valor)) return valor as ChaveIcone
  // emojis podem vir com o seletor de variação (U+FE0F) no fim
  const semVariacao = valor.replace(/️/g, '')
  if (POR_EMOJI[semVariacao]) return POR_EMOJI[semVariacao]
  if (nome) for (const [re, chave] of POR_NOME) if (re.test(nome)) return chave
  return padrao
}

/** Ícone de uma carteira: sempre pelo tipo (conta, dinheiro ou cartão). */
export function chaveCarteira(tipo: 'conta' | 'dinheiro' | 'cartao_credito'): ChaveIcone {
  return tipo === 'cartao_credito' ? 'cartao' : tipo === 'dinheiro' ? 'dinheiro' : 'banco'
}
