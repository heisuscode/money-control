import type { TextStyle } from 'react-native'

// Identidade visual do app (protótipo de UX/UI aprovado — nota 07 do Obsidian).
export const cores = {
  marca: '#004AAD',
  marcaEscura: '#003A8C',
  fundo: '#F3F5F9',
  superficie: '#FFFFFF',
  sutil: '#EEF2F8',
  linha: '#E3E8F0',
  borda: '#D5DCE6',
  ativoFundo: '#E8F0FF',
  texto1: '#0E1726',
  texto2: '#3E4A5C',
  texto3: '#5B6576',
  desligado: '#C9D1DD',
  sucesso: '#15803D',
  sucessoFundo: '#DCFCE7',
  perigo: '#C8363B',
  perigoFundo: '#FDECEC',
  perigoBorda: '#F5C2C4',
  aviso: '#B45309',
  avisoFundo: '#FEF3C7',
  tinta: '#0E1726',
  tintaTexto: '#B8C4D6',
  // gráficos (paleta validada para daltonismo)
  receitaGrafico: '#004AAD',
  despesaGrafico: '#EA580C',
} as const

export const raio = { sm: 10, md: 14, lg: 18, xl: 22 } as const

/**
 * No Android a fonte customizada não obedece a fontWeight: cada peso é uma
 * família própria. Use `f[700]` no lugar de `fontWeight: '700'`.
 */
export const f: Record<400 | 500 | 600 | 700 | 800, TextStyle> = {
  400: { fontFamily: 'PlusJakartaSans_400Regular' },
  500: { fontFamily: 'PlusJakartaSans_500Medium' },
  600: { fontFamily: 'PlusJakartaSans_600SemiBold' },
  700: { fontFamily: 'PlusJakartaSans_700Bold' },
  800: { fontFamily: 'PlusJakartaSans_800ExtraBold' },
}

/** Cores disponíveis para carteiras e cartões. */
export const CORES_CARTEIRA = ['#820AD1', '#004AAD', '#C2410C', '#15803D', '#C8363B', '#0E7490', '#B45309', '#0E1726']

function luminancia(hex: string) {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Fundo para cartão colorido com texto branco: escurece cores claras (ex.: cartões
 * antigos em amarelo) até o contraste com o branco chegar a 4,5:1.
 */
export function fundoComTextoBranco(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return cores.marca
  let atual = hex
  for (let i = 0; i < 10 && 1.05 / (luminancia(atual) + 0.05) < 4.5; i++) {
    const n = atual.replace('#', '')
    atual =
      '#' +
      [0, 2, 4]
        .map((k) => Math.round(parseInt(n.slice(k, k + 2), 16) * 0.88).toString(16).padStart(2, '0'))
        .join('')
  }
  return atual
}
