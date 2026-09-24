import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BotaoGoogle, Marca, Ou } from '~/components/Acesso'
import { Botao, Campo, Entrada } from '~/components/ui'
import { useAuth } from '~/context/AuthProvider'
import { criarEstilos, f, useTema } from '~/theme'

export default function Login() {
  const { cores } = useTema()
  const st = useSt()
  const { entrar, entrarComGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [google, setGoogle] = useState(false)

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.tinta }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={st.tela} keyboardShouldPersistTaps="handled">
          <View style={st.topo}>
            <Marca />
            <Text style={st.nomeApp}>MoneyControl</Text>
            <Text style={st.slogan}>Suas finanças organizadas, no site e no celular.</Text>
          </View>
          <View style={st.caixa}>
            <Text style={st.titulo}>Entrar</Text>
            <BotaoGoogle aoTocar={comGoogle} carregando={google} />
            <Ou />
            <Campo rotulo="E-mail">
              <Entrada
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="voce@email.com"
              />
            </Campo>
            <Campo rotulo="Senha">
              <View>
                <Entrada
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry={!verSenha}
                  autoComplete="password"
                  placeholder="••••••••"
                  onSubmitEditing={enviar}
                  style={{ paddingRight: 52 }}
                />
                <Pressable
                  onPress={() => setVerSenha((v) => !v)}
                  accessibilityLabel={verSenha ? 'Esconder senha' : 'Mostrar senha'}
                  style={st.olho}
                >
                  <Text style={st.link}>{verSenha ? 'Ocultar' : 'Ver'}</Text>
                </Pressable>
              </View>
            </Campo>
            <Pressable onPress={() => router.push('/recuperar-senha')} hitSlop={8} style={{ alignSelf: 'flex-end' }}>
              <Text style={st.link}>Esqueci a senha</Text>
            </Pressable>
            {erro ? <Text style={st.erro}>{erro}</Text> : null}
            <Botao onPress={enviar} carregando={enviando}>Entrar</Botao>
          </View>
          <Pressable onPress={() => router.push('/criar-conta')} hitSlop={8} style={st.criar}>
            <Text style={st.criarTexto}>
              Ainda não tem conta? <Text style={{ color: '#FFFFFF', ...f[700] }}>Criar conta</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const useSt = criarEstilos((cores) => ({
  tela: { flexGrow: 1, justifyContent: 'center', padding: 20, gap: 20 },
  topo: { alignItems: 'center', gap: 8, marginBottom: 4 },
  nomeApp: { color: '#FFFFFF', fontSize: 26, ...f[800], letterSpacing: -0.5, marginTop: 6 },
  slogan: { color: cores.tintaTexto, fontSize: 14, ...f[400], textAlign: 'center' },
  caixa: { backgroundColor: cores.superficie, borderRadius: 24, padding: 20, gap: 14 },
  titulo: { fontSize: 20, ...f[800], color: cores.texto1 },
  olho: { position: 'absolute', right: 4, top: 0, bottom: 0, width: 56, alignItems: 'center', justifyContent: 'center' },
  link: { fontSize: 13, ...f[700], color: cores.marcaTexto },
  erro: { fontSize: 13, ...f[600], color: cores.perigo },
  criar: { alignItems: 'center', paddingVertical: 8 },
  criarTexto: { color: cores.tintaTexto, fontSize: 14, ...f[500] },
}))
