import { createContext, useContext } from 'react'
import { StyleSheet, type TextStyle } from 'react-native'

// Identidade visual do app (protótipo de UX/UI aprovado — nota 07 do Obsidian).
// Duas paletas com os mesmos nomes; a tela lê a ativa por `useTema()` e os
// estilos são criados por `criarEstilos`, que refaz o StyleSheet ao trocar o tema.

const claro = {
  /** preenchimento da marca (botões, com texto branco) */
  marca: '#004AAD',
  /** marca como cor de texto/ícone sobre as superfícies */
  marcaTexto: '#004AAD',
  fundo: '#F3F5F9',
  superficie: '#FFFFFF',
  sutil: '#EEF2F8',
  linha: '#E3E8F0',
  borda: '#D5DCE6',
  ativoFundo: '#E8F0FF',
  destaqueFundo: '#F5F8FF',
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
  /** cartão escuro do saldo/patrimônio */
  tinta: '#0E1726',
  tintaTexto: '#B8C4D6',
  // gráficos (paleta validada para daltonismo)
  receitaGrafico: '#004AAD',
  despesaGrafico: '#EA580C',
  parcelasFuturas: '#7FA8E6',
}

export type Cores = { [K in keyof typeof claro]: string }

const escuro: Cores = {
  marca: '#2563EB',
  marcaTexto: '#8AB4FF',
  fundo: '#0B1220',
  superficie: '#141C2B',
  sutil: '#1C2638',
  linha: '#263247',
  borda: '#334058',
  ativoFundo: '#1A2B4D',
  destaqueFundo: '#16223A',
  texto1: '#E8EDF5',
  texto2: '#B4BFD0',
  texto3: '#8F9BB0',
  desligado: '#3A4760',
  sucesso: '#4ADE80',
  sucessoFundo: '#12301F',
  perigo: '#F87171',
  perigoFundo: '#3A1A1D',
  perigoBorda: '#5C2A2E',
  aviso: '#FBBF24',
  avisoFundo: '#3A2A0E',
  tinta: '#16233B',
  tintaTexto: '#B8C4D6',
  receitaGrafico: '#3F7FE8',
  despesaGrafico: '#E0701F',
  parcelasFuturas: '#3F5F99',
}

export const paletas = { claro, escuro } as const

export interface Tema {
  cores: Cores
  escuro: boolean
}

export const TemaContexto = createContext<Tema>({ cores: claro, escuro: false })

export function useTema() {
  return useContext(TemaContexto)
}

/**
 * Estilos que dependem das cores: `const useSt = criarEstilos((cores) => ({...}))`
 * no módulo e `const st = useSt()` no componente. Um StyleSheet por paleta, em cache.
 */
export function criarEstilos<T extends StyleSheet.NamedStyles<T>>(fabrica: (cores: Cores) => T) {
  const cache = new Map<Cores, T>()
  return function useEstilos(): T {
    const { cores } = useTema()
    let estilos = cache.get(cores)
    if (!estilos) {
      estilos = StyleSheet.create(fabrica(cores))
      cache.set(cores, estilos)
    }
    return estilos
  }
}

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

/** Cores disponíveis para carteiras e cartões (iguais nos dois temas). */
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
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return claro.marca
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
