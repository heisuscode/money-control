import { useRef, useState } from 'react'
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  BOAS_VINDAS_ASSISTENTE,
  perguntarAoAssistente,
  SUGESTOES_ASSISTENTE,
  type MensagemAssistente,
  type RegistroAssistente,
} from '@/lib/assistente'
import { BotaoMicrofone } from '~/components/BotaoMicrofone'
import { BotaoIcone, Icone } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { supabase } from '~/lib/supabase'
import { criarEstilos, f, useTema } from '~/theme'

// O assistente roda no servidor do site (api/assistente.ts). Para testar uma
// branch antes de publicar, aponte EXPO_PUBLIC_ASSISTENTE_URL para o preview.
const ENDERECO = process.env.EXPO_PUBLIC_ASSISTENTE_URL || 'https://moneycontrolapp.vercel.app/api/assistente'
const ENDERECO_AUDIO = ENDERECO.replace(/assistente$/, 'transcrever')

export default function Assistente() {
  const { cores } = useTema()
  const st = useSt()
  const { recarregar } = useDados()
  const [conversa, setConversa] = useState<MensagemAssistente[]>([])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const rolagem = useRef<ScrollView>(null)

  async function enviar(mensagem: string) {
    const limpo = mensagem.trim()
    if (!limpo || pensando) return
    const nova: MensagemAssistente[] = [...conversa, { papel: 'usuario', texto: limpo }]
    setConversa(nova)
    setTexto('')
    setPensando(true)
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const r = token
      ? await perguntarAoAssistente(ENDERECO, token, nova)
      : { resposta: 'Sua sessão expirou. Entre de novo.', registros: [], erro: true }
    setConversa((atual) => [...atual, { papel: 'assistente', texto: r.resposta, registros: r.registros, erro: r.erro }])
    setPensando(false)
    if (r.registros.length) recarregar()
  }

  async function desfazer(indice: number, reg: RegistroAssistente) {
    const { error } = await supabase.from(reg.tipo === 'receita' ? 'receitas' : 'despesas').delete().eq('id', reg.id)
    if (error) return Alert.alert('Não foi possível desfazer.')
    setConversa((atual) => atual.map((m, i) => (i === indice ? { ...m, desfeitos: [...(m.desfeitos ?? []), reg.id] } : m)))
    recarregar()
  }

  return (
    <SafeAreaView style={st.tela} edges={['top', 'bottom']}>
      <View style={st.topo}>
        <BotaoIcone icone="chevron-back" rotulo="Voltar" aoTocar={() => router.back()} />
        <View style={st.avatar}>
          <Icone nome="chatbubble-ellipses-outline" tamanho={18} cor={cores.marcaTexto} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.titulo}>Assistente</Text>
          <Text style={st.subtitulo}>Conte seus gastos e pergunte</Text>
        </View>
        {conversa.length ? <BotaoIcone icone="trash-outline" rotulo="Nova conversa" aoTocar={() => setConversa([])} /> : null}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          ref={rolagem}
          contentContainerStyle={st.lista}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => rolagem.current?.scrollToEnd({ animated: true })}
        >
          <Balao papel="assistente" texto={BOAS_VINDAS_ASSISTENTE} />
          {conversa.map((m, i) => (
            <View key={i} style={{ gap: 8 }}>
              <Balao papel={m.papel} texto={m.texto} erro={m.erro} />
              {m.registros?.map((reg) => {
                const desfeito = m.desfeitos?.includes(reg.id)
                return (
                  <View key={reg.id} style={[st.registro, desfeito && { opacity: 0.55 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.registroValor, reg.tipo === 'receita' && { color: cores.sucesso }]}>
                        {reg.tipo === 'receita' ? '+ ' : '− '}
                        {formatCurrency(reg.valor)}
                      </Text>
                      <Text style={st.registroSub} numberOfLines={1}>
                        {reg.descricao} · {reg.categoria ?? 'sem categoria'} · {formatDate(reg.data, 'dd/MM')}
                      </Text>
                    </View>
                    {desfeito ? (
                      <Text style={st.registroSub}>Desfeito</Text>
                    ) : (
                      <Pressable onPress={() => desfazer(i, reg)} hitSlop={8} style={st.desfazer} accessibilityRole="button">
                        <Icone nome="arrow-undo-outline" tamanho={15} cor={cores.marcaTexto} />
                        <Text style={st.desfazerTexto}>Desfazer</Text>
                      </Pressable>
                    )}
                  </View>
                )
              })}
            </View>
          ))}
          {pensando ? <Balao papel="assistente" texto="Pensando…" /> : null}
          {conversa.length === 0 ? (
            <View style={st.sugestoes}>
              {SUGESTOES_ASSISTENTE.map((s) => (
                <Pressable key={s} onPress={() => enviar(s)} style={({ pressed }) => [st.sugestao, pressed && { opacity: 0.6 }]}>
                  <Text style={st.sugestaoTexto}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={st.rodape}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Digite ou toque no microfone"
            placeholderTextColor={cores.texto3}
            multiline
            maxLength={1000}
            accessibilityLabel="Mensagem para o assistente"
            style={st.entrada}
          />
          <BotaoMicrofone
            endereco={ENDERECO_AUDIO}
            desabilitado={pensando}
            aoErro={(m) => Alert.alert('Microfone', m)}
            aoTranscrever={(falado) => setTexto((atual) => (atual.trim() ? `${atual.trim()} ${falado}` : falado))}
          />
          <Pressable
            onPress={() => enviar(texto)}
            disabled={!texto.trim() || pensando}
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            style={({ pressed }) => [st.enviar, (!texto.trim() || pensando) && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
          >
            <Icone nome="send" tamanho={18} cor="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Balao({ papel, texto, erro }: { papel: 'usuario' | 'assistente'; texto: string; erro?: boolean }) {
  const st = useSt()
  const usuario = papel === 'usuario'
  return (
    <View style={[st.balao, usuario ? st.balaoUsuario : st.balaoAssistente, erro && st.balaoErro]}>
      <Text style={[st.balaoTexto, usuario && { color: '#FFFFFF' }, erro && st.balaoErroTexto]}>{texto}</Text>
    </View>
  )
}

const useSt = criarEstilos((cores) => ({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: cores.linha, backgroundColor: cores.superficie },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: cores.ativoFundo, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 16, ...f[800], color: cores.texto1 },
  subtitulo: { fontSize: 12, ...f[400], color: cores.texto3 },
  lista: { padding: 16, gap: 12 },
  balao: { maxWidth: '85%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  balaoUsuario: { alignSelf: 'flex-end', backgroundColor: cores.marca, borderBottomRightRadius: 6 },
  balaoAssistente: { alignSelf: 'flex-start', backgroundColor: cores.superficie, borderWidth: 1, borderColor: cores.linha, borderTopLeftRadius: 6 },
  balaoErro: { backgroundColor: cores.perigoFundo, borderColor: cores.perigoBorda },
  balaoTexto: { fontSize: 15, lineHeight: 21, ...f[400], color: cores.texto1 },
  balaoErroTexto: { color: cores.perigo },
  registro: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 8, maxWidth: '90%', backgroundColor: cores.sutil, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  registroValor: { fontSize: 14, ...f[800], color: cores.texto1 },
  registroSub: { fontSize: 12, ...f[400], color: cores.texto3 },
  desfazer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  desfazerTexto: { fontSize: 13, ...f[700], color: cores.marcaTexto },
  sugestoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  sugestao: { borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.superficie, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  sugestaoTexto: { fontSize: 13, ...f[600], color: cores.texto2 },
  rodape: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: cores.linha, backgroundColor: cores.superficie },
  entrada: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, borderColor: cores.borda, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15, ...f[400], color: cores.texto1, backgroundColor: cores.superficie },
  enviar: { width: 44, height: 44, borderRadius: 22, backgroundColor: cores.marca, alignItems: 'center', justifyContent: 'center' },
}))
