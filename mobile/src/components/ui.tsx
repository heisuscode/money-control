import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import type { ComponentProps, ReactElement, ReactNode, Ref } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { criarEstilos, f, raio, useTema } from '~/theme'

export type NomeIcone = ComponentProps<typeof Ionicons>['name']

export function Icone({ nome, tamanho = 22, cor }: { nome: NomeIcone; tamanho?: number; cor?: string }) {
  const { cores } = useTema()
  return <Ionicons name={nome} size={tamanho} color={cor ?? cores.texto2} />
}

/** Botão quadrado de 44 px só com ícone (voltar, sininho, editar...). */
export function BotaoIcone({
  icone,
  aoTocar,
  rotulo,
  contorno,
  cor,
  children,
}: {
  icone: NomeIcone
  aoTocar: () => void
  rotulo: string
  contorno?: boolean
  cor?: string
  children?: ReactNode
}) {
  const s = useS()
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={4}
      style={({ pressed }) => [s.botaoIcone, contorno && s.botaoIconeContorno, pressed && { opacity: 0.6 }]}
    >
      <Icone nome={icone} cor={cor} />
      {children}
    </Pressable>
  )
}

/**
 * Tela padrão: cabeçalho (título + voltar opcional), conteúdo rolável e um
 * rodapé fixo opcional (botão de salvar).
 */
export function Tela({
  titulo,
  subtitulo,
  voltar,
  acao,
  cabecalho,
  children,
  rolar = true,
  aoAtualizar,
  rodape,
  fundo,
  espacoAbas,
}: {
  titulo?: string
  subtitulo?: string
  /** mostra o botão de voltar */
  voltar?: boolean
  acao?: ReactNode
  /** substitui o cabeçalho padrão */
  cabecalho?: ReactNode
  children: ReactNode
  rolar?: boolean
  aoAtualizar?: ReactElement<RefreshControlProps>
  rodape?: ReactNode
  fundo?: string
  /** telas das abas: deixa espaço para a barra inferior */
  espacoAbas?: boolean
}) {
  const s = useS()
  const { cores } = useTema()
  const topo = cabecalho ?? (
    <View style={s.topo}>
      {voltar ? <BotaoIcone icone="chevron-back" rotulo="Voltar" aoTocar={() => router.back()} /> : null}
      <View style={{ flex: 1, paddingLeft: voltar ? 0 : 4 }}>
        {titulo ? <Text style={[s.titulo, voltar && { fontSize: 18 }]} accessibilityRole="header">{titulo}</Text> : null}
        {subtitulo ? <Text style={s.subtitulo}>{subtitulo}</Text> : null}
      </View>
      {acao}
    </View>
  )
  const conteudo = [s.conteudo, espacoAbas && { paddingBottom: 24 }, rodape ? { paddingBottom: 24 } : null]
  return (
    <SafeAreaView style={[s.tela, { backgroundColor: fundo ?? cores.fundo }]} edges={espacoAbas ? ['top'] : ['top', 'bottom']}>
      {topo}
      {rolar ? (
        <ScrollView contentContainerStyle={conteudo} refreshControl={aoAtualizar} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[conteudo, { flex: 1 }]}>{children}</View>
      )}
      {rodape ? <View style={s.rodape}>{rodape}</View> : null}
    </SafeAreaView>
  )
}

export function Cartao({ children, style, aoTocar }: { children: ReactNode; style?: StyleProp<ViewStyle>; aoTocar?: () => void }) {
  const s = useS()
  if (aoTocar) {
    return (
      <Pressable onPress={aoTocar} style={({ pressed }) => [s.cartao, style, pressed && { opacity: 0.8 }]}>
        {children}
      </Pressable>
    )
  }
  return <View style={[s.cartao, style]}>{children}</View>
}

export function TituloSecao({ children, acao, aoTocarAcao }: { children: ReactNode; acao?: string; aoTocarAcao?: () => void }) {
  const s = useS()
  return (
    <View style={s.secao}>
      <Text style={s.secaoTexto} accessibilityRole="header">{children}</Text>
      {acao ? (
        <Pressable onPress={aoTocarAcao} hitSlop={12}>
          <Text style={s.link}>{acao}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** Rótulo pequeno em caixa alta que separa grupos (ex.: "LEMBRETES"). */
export function Grupo({ children }: { children: ReactNode }) {
  const s = useS()
  return <Text style={s.grupo}>{String(children).toUpperCase()}</Text>
}

export function Divisor() {
  const s = useS()
  return <View style={s.divisor} />
}

type Variante = 'primario' | 'fantasma' | 'perigo' | 'contornoPerigo' | 'texto'

export function Botao({
  children,
  onPress,
  variante = 'primario',
  carregando,
  desabilitado,
  icone,
  style,
}: {
  children: ReactNode
  onPress?: () => void
  variante?: Variante
  carregando?: boolean
  desabilitado?: boolean
  icone?: NomeIcone
  style?: StyleProp<ViewStyle>
}) {
  const { cores } = useTema()
  const s = useS()
  const inativo = desabilitado || carregando
  const corTexto =
    variante === 'primario' || variante === 'perigo'
      ? '#FFFFFF'
      : variante === 'contornoPerigo'
        ? cores.perigo
        : variante === 'texto'
          ? cores.marcaTexto
          : cores.texto1
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      style={({ pressed }) => [s.botao, s[`botao_${variante}`], (pressed || inativo) && { opacity: 0.65 }, style]}
    >
      {carregando ? <ActivityIndicator color={corTexto} /> : icone ? <Icone nome={icone} cor={corTexto} tamanho={20} /> : null}
      <Text style={[s.botaoTexto, { color: corTexto }]}>{children}</Text>
    </Pressable>
  )
}

export function Campo({ rotulo, dica, erro, children }: { rotulo: string; dica?: string; erro?: string | null; children: ReactNode }) {
  const s = useS()
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.rotulo}>{rotulo}</Text>
      {children}
      {erro ? <Text style={s.erro}>{erro}</Text> : dica ? <Text style={s.dica}>{dica}</Text> : null}
    </View>
  )
}

export function Entrada(props: TextInputProps & { ref?: Ref<TextInput> }) {
  const { cores } = useTema()
  const s = useS()
  return <TextInput placeholderTextColor={cores.texto3} {...props} style={[s.entrada, props.style]} />
}

/** Campo que parece entrada mas abre um seletor (data, conta...). */
export function Seletor({ texto, icone, aoTocar }: { texto: string; icone?: NomeIcone; aoTocar: () => void }) {
  const { cores } = useTema()
  const s = useS()
  return (
    <Pressable onPress={aoTocar} style={({ pressed }) => [s.seletor, pressed && { opacity: 0.7 }]}>
      {icone ? <Icone nome={icone} tamanho={18} cor={cores.texto3} /> : null}
      <Text style={s.seletorTexto} numberOfLines={1}>{texto}</Text>
      <Icone nome="chevron-down" tamanho={18} cor={cores.texto3} />
    </Pressable>
  )
}

export interface Opcao<T extends string | number> {
  valor: T
  rotulo: string
  /** bolinha colorida antes do rótulo */
  cor?: string
}

/** Lista de opções em "pílulas" roláveis (substitui o <select> do site). */
export function Chips<T extends string | number>({
  opcoes,
  valor,
  aoMudar,
  quebrar,
}: {
  opcoes: Opcao<T>[]
  valor: T
  aoMudar: (v: T) => void
  /** quebra em várias linhas em vez de rolar para o lado */
  quebrar?: boolean
}) {
  const s = useS()
  const itens = opcoes.map((o) => {
    const ativo = o.valor === valor
    return (
      <Pressable
        key={String(o.valor)}
        onPress={() => aoMudar(o.valor)}
        accessibilityRole="radio"
        accessibilityState={{ checked: ativo }}
        style={[s.chip, ativo && s.chipAtivo]}
      >
        {o.cor ? <View style={[s.chipCor, { backgroundColor: o.cor }]} /> : null}
        <Text style={[s.chipTexto, ativo && s.chipTextoAtivo]}>{o.rotulo}</Text>
      </Pressable>
    )
  })
  if (quebrar) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{itens}</View>
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {itens}
    </ScrollView>
  )
}

export function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  cores: corAtiva,
}: {
  opcoes: Opcao<T>[]
  valor: T
  aoMudar: (v: T) => void
  /** cor do texto ativo por opção (ex.: despesa vermelha, receita verde) */
  cores?: Partial<Record<T, string>>
}) {
  const { cores } = useTema()
  const s = useS()
  return (
    <View style={s.segmentado} accessibilityRole="radiogroup">
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <Pressable
            key={o.valor}
            onPress={() => aoMudar(o.valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativo }}
            style={[s.segmento, ativo && s.segmentoAtivo]}
          >
            <Text style={[s.segmentoTexto, ativo && { color: corAtiva?.[o.valor] ?? cores.marcaTexto, ...f[700] }]}>{o.rotulo}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Chave liga/desliga no estilo do protótipo. */
export function Chave({ valor, aoMudar, rotulo }: { valor: boolean; aoMudar: (v: boolean) => void; rotulo: string }) {
  const { cores } = useTema()
  const s = useS()
  return (
    <Pressable
      onPress={() => aoMudar(!valor)}
      accessibilityRole="switch"
      accessibilityLabel={rotulo}
      accessibilityState={{ checked: valor }}
      hitSlop={8}
      style={[s.chave, { backgroundColor: valor ? cores.marca : cores.desligado }]}
    >
      <View style={[s.chaveBolinha, { left: valor ? 23 : 3 }]} />
    </Pressable>
  )
}

/** Barra de progresso; `extra` desenha um segundo trecho (ex.: parcelas futuras). */
export function Barra({
  pct,
  cor: corBarra,
  extra,
  corExtra,
  altura = 8,
}: {
  pct: number
  cor?: string
  extra?: number
  corExtra?: string
  altura?: number
}) {
  const s = useS()
  const { cores } = useTema()
  const cor = corBarra ?? cores.marca
  const a = Math.max(0, Math.min(100, pct))
  const b = Math.max(0, Math.min(100 - a, extra ?? 0))
  return (
    <View style={[s.barra, { height: altura, borderRadius: altura / 2 }]}>
      <View style={{ width: `${a}%`, backgroundColor: cor, borderRadius: altura / 2 }} />
      {b > 0 ? <View style={{ width: `${b}%`, backgroundColor: corExtra ?? `${cor}66`, marginLeft: a > 0 ? 2 : 0, borderRadius: altura / 2 }} /> : null}
    </View>
  )
}

/** Selo pequeno (ex.: "3/10", "Atrasada"). */
export function Selo({ texto, cor, fundo }: { texto: string; cor?: string; fundo?: string }) {
  const s = useS()
  const { cores } = useTema()
  return (
    <View style={[s.selo, { backgroundColor: fundo ?? cores.sutil }]}>
      <Text style={[s.seloTexto, { color: cor ?? cores.texto2 }]}>{texto}</Text>
    </View>
  )
}

/** Linha de menu: ícone, título, detalhe e seta. */
export function ItemMenu({
  icone,
  titulo,
  detalhe,
  aoTocar,
  corIcone,
  fundoIcone,
  primeiro,
  direita,
}: {
  icone: NomeIcone
  titulo: string
  detalhe?: string
  aoTocar?: () => void
  corIcone?: string
  fundoIcone?: string
  primeiro?: boolean
  direita?: ReactNode
}) {
  const { cores } = useTema()
  const s = useS()
  return (
    <Pressable
      onPress={aoTocar}
      disabled={!aoTocar}
      style={({ pressed }) => [s.itemMenu, !primeiro && s.itemMenuDivisor, pressed && { opacity: 0.6 }]}
    >
      <View style={[s.itemMenuIcone, { backgroundColor: fundoIcone ?? cores.ativoFundo }]}>
        <Icone nome={icone} tamanho={19} cor={corIcone ?? cores.marcaTexto} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.itemMenuTitulo}>{titulo}</Text>
        {detalhe ? <Text style={s.dica}>{detalhe}</Text> : null}
      </View>
      {direita ?? (aoTocar ? <Icone nome="chevron-forward" tamanho={18} cor={cores.texto3} /> : null)}
    </Pressable>
  )
}

export function Vazio({ titulo, descricao, acao, icone }: { titulo: string; descricao?: string; acao?: ReactNode; icone?: NomeIcone }) {
  const { cores } = useTema()
  const s = useS()
  return (
    <View style={s.vazio}>
      {icone ? (
        <View style={s.vazioIcone}>
          <Icone nome={icone} tamanho={26} cor={cores.marcaTexto} />
        </View>
      ) : null}
      <Text style={s.vazioTitulo}>{titulo}</Text>
      {descricao ? <Text style={s.vazioDescricao}>{descricao}</Text> : null}
      {acao ? <View style={{ marginTop: 14, alignSelf: 'stretch' }}>{acao}</View> : null}
    </View>
  )
}

export function Carregando() {
  const { cores } = useTema()
  return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <ActivityIndicator color={cores.marca} size="large" />
    </View>
  )
}

/** Janela no centro da tela (ex.: pagar conta rapidamente). */
export function ModalCentral({
  visivel,
  aoFechar,
  titulo,
  children,
}: {
  visivel: boolean
  aoFechar: () => void
  titulo: string
  children: ReactNode
}) {
  const s = useS()
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar} statusBarTranslucent>
      <Pressable style={s.modalFundo} onPress={aoFechar}>
        <Pressable style={s.modalCaixa} onPress={() => {}}>
          <View style={s.entre}>
            <Text style={s.modalTitulo}>{titulo}</Text>
            <BotaoIcone icone="close" rotulo="Fechar" aoTocar={aoFechar} />
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

/** Folha que sobe do rodapé (ex.: aporte numa meta). */
export function FolhaInferior({
  visivel,
  aoFechar,
  titulo,
  children,
}: {
  visivel: boolean
  aoFechar: () => void
  titulo: string
  children: ReactNode
}) {
  const s = useS()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <Pressable style={s.folhaFundo} onPress={aoFechar}>
        <Pressable style={[s.folha, { paddingBottom: 20 + insets.bottom }]} onPress={() => {}}>
          <View style={s.folhaPuxador} />
          <Text style={s.modalTitulo}>{titulo}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export const num: TextStyle = { fontVariant: ['tabular-nums'] }

const useS = criarEstilos((cores) => ({
  tela: { flex: 1 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  titulo: { fontSize: 22, ...f[800], color: cores.texto1, letterSpacing: -0.4 },
  subtitulo: { fontSize: 12, ...f[400], color: cores.texto3, marginTop: 2 },
  conteudo: { paddingHorizontal: 20, paddingTop: 4, gap: 14, paddingBottom: 32 },
  rodape: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, backgroundColor: cores.fundo },
  entre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: cores.linha,
    padding: 16,
  },
  secao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  secaoTexto: { fontSize: 15, ...f[700], color: cores.texto1 },
  link: { fontSize: 13, ...f[700], color: cores.marcaTexto },
  grupo: { fontSize: 12, ...f[700], color: cores.texto3, letterSpacing: 0.4, marginTop: 4 },
  divisor: { height: 1, backgroundColor: cores.sutil },
  botaoIcone: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  botaoIconeContorno: { borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.superficie },
  botao: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  botao_primario: { backgroundColor: cores.marca },
  botao_fantasma: { backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.linha },
  botao_perigo: { backgroundColor: cores.perigo },
  botao_contornoPerigo: { backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.perigoBorda },
  botao_texto: { backgroundColor: 'transparent', minHeight: 44 },
  botaoTexto: { ...f[700], fontSize: 15 },
  rotulo: { fontSize: 13, ...f[600], color: cores.texto2 },
  dica: { fontSize: 12, ...f[400], color: cores.texto3, lineHeight: 17 },
  erro: { fontSize: 13, ...f[600], color: cores.perigo },
  entrada: {
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 50,
    fontSize: 15,
    ...f[500],
    color: cores.texto1,
  },
  seletor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  seletorTexto: { flex: 1, fontSize: 15, ...f[500], color: cores.texto1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: cores.linha,
    backgroundColor: cores.superficie,
  },
  chipAtivo: { borderColor: cores.marca, backgroundColor: cores.ativoFundo },
  chipCor: { width: 10, height: 10, borderRadius: 5 },
  chipTexto: { fontSize: 13, color: cores.texto2, ...f[600] },
  chipTextoAtivo: { color: cores.marcaTexto, ...f[700] },
  segmentado: { flexDirection: 'row', backgroundColor: cores.sutil, borderRadius: 12, padding: 4, gap: 4 },
  segmento: { flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentoAtivo: { backgroundColor: cores.superficie, elevation: 1 },
  segmentoTexto: { fontSize: 13, ...f[600], color: cores.texto2 },
  chave: { width: 48, height: 28, borderRadius: 14 },
  chaveBolinha: { position: 'absolute', top: 3, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  barra: { flexDirection: 'row', backgroundColor: cores.sutil, overflow: 'hidden' },
  selo: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  seloTexto: { fontSize: 11, ...f[700] },
  itemMenu: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 56 },
  itemMenuDivisor: { borderTopWidth: 1, borderTopColor: cores.sutil },
  itemMenuIcone: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemMenuTitulo: { fontSize: 14, ...f[600], color: cores.texto1 },
  vazio: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 12 },
  vazioIcone: { width: 56, height: 56, borderRadius: 18, backgroundColor: cores.ativoFundo, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  vazioTitulo: { fontSize: 15, ...f[700], color: cores.texto1, textAlign: 'center' },
  vazioDescricao: { fontSize: 13, ...f[400], color: cores.texto2, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  modalFundo: { flex: 1, backgroundColor: 'rgba(14,23,38,0.55)', justifyContent: 'center', padding: 20 },
  modalCaixa: { backgroundColor: cores.superficie, borderRadius: raio.xl, padding: 20, paddingTop: 12, gap: 14 },
  modalTitulo: { fontSize: 18, ...f[800], color: cores.texto1 },
  folhaFundo: { flex: 1, backgroundColor: 'rgba(14,23,38,0.55)', justifyContent: 'flex-end' },
  folha: { backgroundColor: cores.superficie, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 10, gap: 14 },
  folhaPuxador: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: cores.borda, marginBottom: 6 },
  num,
}))
