import type { ReactElement, ReactNode } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { cores, raio } from '~/theme'

export function Tela({
  titulo,
  subtitulo,
  acao,
  children,
  rolar = true,
  aoAtualizar,
  flutuante,
}: {
  titulo: string
  subtitulo?: string
  acao?: ReactNode
  children: ReactNode
  rolar?: boolean
  aoAtualizar?: ReactElement<RefreshControlProps>
  /** elemento fixo sobre o conteúdo (ex.: botão +) */
  flutuante?: ReactNode
}) {
  return (
    <SafeAreaView style={s.tela} edges={['top']}>
      <View style={s.topo}>
        <View style={{ flex: 1 }}>
          <Text style={s.titulo}>{titulo}</Text>
          {subtitulo ? <Text style={s.subtitulo}>{subtitulo}</Text> : null}
        </View>
        {acao}
      </View>
      {rolar ? (
        <ScrollView contentContainerStyle={s.conteudo} refreshControl={aoAtualizar}>
          {children}
        </ScrollView>
      ) : (
        <View style={[s.conteudo, { flex: 1 }]}>{children}</View>
      )}
      {flutuante}
    </SafeAreaView>
  )
}

export function Cartao({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.cartao, style]}>{children}</View>
}

export function TituloSecao({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <View style={s.secao}>
      <Text style={s.secaoTexto}>{children}</Text>
      {acao}
    </View>
  )
}

type Variante = 'primario' | 'fantasma' | 'perigo'

export function Botao({
  children,
  onPress,
  variante = 'primario',
  carregando,
  desabilitado,
  style,
}: {
  children: ReactNode
  onPress?: () => void
  variante?: Variante
  carregando?: boolean
  desabilitado?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const inativo = desabilitado || carregando
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [s.botao, s[`botao_${variante}`], (pressed || inativo) && { opacity: 0.7 }, style]}
    >
      {carregando ? <ActivityIndicator color={variante === 'fantasma' ? cores.marca : '#fff'} /> : null}
      <Text style={[s.botaoTexto, variante === 'fantasma' && { color: cores.texto1 }]}>{children}</Text>
    </Pressable>
  )
}

export function Campo({ rotulo, dica, erro, children }: { rotulo: string; dica?: string; erro?: string | null; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.rotulo}>{rotulo}</Text>
      {children}
      {erro ? <Text style={s.erro}>{erro}</Text> : dica ? <Text style={s.dica}>{dica}</Text> : null}
    </View>
  )
}

export function Entrada(props: TextInputProps) {
  return <TextInput placeholderTextColor={cores.texto3} {...props} style={[s.entrada, props.style]} />
}

export interface Opcao<T extends string | number> {
  valor: T
  rotulo: string
}

/** Lista de opções em "pílulas" roláveis (substitui o <select> do site). */
export function Chips<T extends string | number>({
  opcoes,
  valor,
  aoMudar,
}: {
  opcoes: Opcao<T>[]
  valor: T
  aoMudar: (v: T) => void
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <Pressable key={String(o.valor)} onPress={() => aoMudar(o.valor)} style={[s.chip, ativo && s.chipAtivo]}>
            <Text style={[s.chipTexto, ativo && s.chipTextoAtivo]}>{o.rotulo}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

export function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
}: {
  opcoes: Opcao<T>[]
  valor: T
  aoMudar: (v: T) => void
}) {
  return (
    <View style={s.segmentado}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <Pressable key={o.valor} onPress={() => aoMudar(o.valor)} style={[s.segmento, ativo && s.segmentoAtivo]}>
            <Text style={[s.segmentoTexto, ativo && { color: cores.marca }]}>{o.rotulo}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Vazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <View style={s.vazio}>
      <Text style={s.vazioTitulo}>{titulo}</Text>
      {descricao ? <Text style={s.vazioDescricao}>{descricao}</Text> : null}
      {acao ? <View style={{ marginTop: 12 }}>{acao}</View> : null}
    </View>
  )
}

export function Carregando() {
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
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <Pressable style={s.modalFundo} onPress={aoFechar}>
        <Pressable style={s.modalCaixa} onPress={() => {}}>
          <Text style={s.modalTitulo}>{titulo}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: cores.superficie,
    borderBottomWidth: 1,
    borderBottomColor: cores.linha,
  },
  titulo: { fontSize: 22, fontWeight: '800', color: cores.texto1 },
  subtitulo: { fontSize: 12, color: cores.texto3, marginTop: 2 },
  conteudo: { padding: 16, gap: 14, paddingBottom: 96 },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
    borderWidth: 1,
    borderColor: cores.linha,
    padding: 16,
  },
  secao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  secaoTexto: { fontSize: 15, fontWeight: '700', color: cores.texto1 },
  botao: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raio.md,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  botao_primario: { backgroundColor: cores.marca },
  botao_fantasma: { backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.linha },
  botao_perigo: { backgroundColor: cores.perigo },
  botaoTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rotulo: { fontSize: 13, fontWeight: '600', color: cores.texto2 },
  dica: { fontSize: 12, color: cores.texto3 },
  erro: { fontSize: 12, color: cores.perigo, fontWeight: '600' },
  entrada: {
    borderWidth: 1,
    borderColor: cores.linha,
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: cores.texto1,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.linha,
    backgroundColor: cores.superficie,
  },
  chipAtivo: { borderColor: cores.marca, backgroundColor: cores.ativoFundo },
  chipTexto: { fontSize: 14, color: cores.texto2, fontWeight: '600' },
  chipTextoAtivo: { color: cores.marca },
  segmentado: { flexDirection: 'row', backgroundColor: cores.sutil, borderRadius: raio.md, padding: 4 },
  segmento: { flex: 1, paddingVertical: 9, borderRadius: raio.sm, alignItems: 'center' },
  segmentoAtivo: { backgroundColor: cores.superficie },
  segmentoTexto: { fontSize: 14, fontWeight: '700', color: cores.texto2 },
  vazio: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  vazioTitulo: { fontSize: 15, fontWeight: '700', color: cores.texto1, textAlign: 'center' },
  vazioDescricao: { fontSize: 13, color: cores.texto2, textAlign: 'center', marginTop: 6 },
  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'center', padding: 20 },
  modalCaixa: { backgroundColor: cores.superficie, borderRadius: 22, padding: 20, gap: 14 },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: cores.texto1 },
  num: { fontVariant: ['tabular-nums'] },
})
