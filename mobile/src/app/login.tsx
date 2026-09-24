import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef, useState } from 'react'
import { BackHandler, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { BotaoGoogle, IlustracaoAcesso, Marca, Ou } from '~/components/Acesso'
import { Botao, BotaoIcone, Campo, Entrada, Icone } from '~/components/ui'
import { useAuth } from '~/context/AuthProvider'
import { criarEstilos, f, useTema } from '~/theme'

type Modo = 'opcoes' | 'email'

export default function Login() {
  const { cores } = useTema()
  const st = useSt()
  const insets = useSafeAreaInsets()
  const { entrar, entrarComGoogle } = useAuth()
  const [modo, setModo] = useState<Modo>('opcoes')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [google, setGoogle] = useState(false)
  const campoSenha = useRef<TextInput>(null)

  function trocarModo(novo: Modo) {
    setErro(null)
    setModo(novo)
  }

  // No formulário de e-mail, o "voltar" do Android volta para as opções.
  useEffect(() => {
    if (modo !== 'email') return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setErro(null)
      setModo('opcoes')
      return true
    })
    return () => sub.remove()
  }, [modo])

  async function comGoogle() {
    setErro(null)
    setGoogle(true)
    const falha = await entrarComGoogle()
    setGoogle(false)
    if (falha) setErro(falha)
  }

  async function enviar() {
    setErro(null)
    if (!email.trim() || !senha) return setErro('Informe e-mail e senha.')
    setEnviando(true)
    const falha = await entrar(email, senha)
    setEnviando(false)
    if (falha) setErro(falha)
  }

  const comEmail = modo === 'email'

  return (
    <SafeAreaView style={st.tela} edges={['top']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={st.topo}>
            <Marca tamanho={36} />
            <Text style={st.nomeApp}>MoneyControl</Text>
          </View>

          <View style={[st.hero, comEmail && st.heroCompacto]}>
            {comEmail ? null : <IlustracaoAcesso />}
            <Text style={[st.titulo, comEmail && st.tituloCompacto]} accessibilityRole="header">
              {comEmail ? 'Bem-vindo de volta' : 'Suas finanças, sem planilha.'}
            </Text>
            <Text style={st.subtitulo}>
              {comEmail ? 'Use o e-mail e a senha da sua conta.' : 'Contas, cartões e parcelas num só lugar. É a mesma conta do site.'}
            </Text>
          </View>

          <View style={[st.folha, { paddingBottom: 20 + insets.bottom }]}>
            {comEmail ? (
              <>
                <View style={st.folhaTopo}>
                  <BotaoIcone icone="chevron-back" rotulo="Voltar às opções de entrada" aoTocar={() => trocarModo('opcoes')} />
                  <Text style={st.folhaTitulo}>Entrar com e-mail</Text>
                </View>
                <Campo rotulo="E-mail">
                  <Entrada
                    value={email}
                    onChangeText={setEmail}
                    autoFocus
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    onSubmitEditing={() => campoSenha.current?.focus()}
                    placeholder="voce@email.com"
                  />
                </Campo>
                <Campo rotulo="Senha">
                  <View>
                    <Entrada
                      ref={campoSenha}
                      value={senha}
                      onChangeText={setSenha}
                      secureTextEntry={!verSenha}
                      autoComplete="current-password"
                      textContentType="password"
                      returnKeyType="go"
                      onSubmitEditing={enviar}
                      placeholder="Sua senha"
                      style={{ paddingRight: 52 }}
                    />
                    <Pressable
                      onPress={() => setVerSenha((v) => !v)}
                      accessibilityRole="button"
                      accessibilityLabel={verSenha ? 'Esconder senha' : 'Mostrar senha'}
                      style={st.olho}
                    >
                      <Icone nome={verSenha ? 'eye-off-outline' : 'eye-outline'} tamanho={20} cor={cores.texto3} />
                    </Pressable>
                  </View>
                </Campo>
                <Pressable onPress={() => router.push('/recuperar-senha')} hitSlop={10} style={{ alignSelf: 'flex-end' }}>
                  <Text style={st.link}>Esqueci a senha</Text>
                </Pressable>
                {erro ? <Erro texto={erro} /> : null}
                <Botao onPress={enviar} carregando={enviando}>Entrar</Botao>
              </>
            ) : (
              <>
                <BotaoGoogle aoTocar={comGoogle} carregando={google} />
                <Ou />
                <Botao variante="fantasma" icone="mail-outline" onPress={() => trocarModo('email')}>
                  Entrar com e-mail
                </Botao>
                {erro ? <Erro texto={erro} /> : null}
              </>
            )}

            <Pressable onPress={() => router.push('/criar-conta')} hitSlop={8} style={st.criar}>
              <Text style={st.criarTexto}>
                Novo por aqui? <Text style={st.link}>Criar conta</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Erro({ texto }: { texto: string }) {
  const { cores } = useTema()
  const st = useSt()
  return (
    <View style={st.erro} accessibilityLiveRegion="polite">
      <Icone nome="alert-circle" tamanho={18} cor={cores.perigo} />
      <Text style={st.erroTexto}>{texto}</Text>
    </View>
  )
}

const useSt = criarEstilos((cores) => ({
  tela: { flex: 1, backgroundColor: cores.tinta },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 16 },
  nomeApp: { color: '#FFFFFF', fontSize: 18, ...f[800], letterSpacing: -0.3 },
  hero: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24, gap: 10 },
  heroCompacto: { justifyContent: 'flex-end', paddingTop: 32 },
  titulo: { color: '#FFFFFF', fontSize: 30, lineHeight: 36, ...f[800], letterSpacing: -0.8, marginTop: 8 },
  tituloCompacto: { fontSize: 24, lineHeight: 30 },
  subtitulo: { color: cores.tintaTexto, fontSize: 15, lineHeight: 22, ...f[400] },
  folha: {
    backgroundColor: cores.superficie,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 14,
  },
  folhaTopo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: -12, marginTop: -8 },
  folhaTitulo: { fontSize: 17, ...f[800], color: cores.texto1 },
  olho: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 50, alignItems: 'center', justifyContent: 'center' },
  link: { fontSize: 14, ...f[700], color: cores.marcaTexto },
  erro: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: cores.perigoFundo, borderRadius: 12, padding: 12 },
  erroTexto: { flex: 1, fontSize: 13, ...f[600], color: cores.perigo },
  criar: { alignItems: 'center', paddingVertical: 6 },
  criarTexto: { fontSize: 14, ...f[500], color: cores.texto2 },
}))
