import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Botao, Campo, Entrada } from '~/components/ui'
import { useAuth } from '~/context/AuthProvider'
import { cores } from '~/theme'

export default function Login() {
  const { entrar, entrarComGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
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
      <KeyboardAvoidingView style={st.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ marginBottom: 28 }}>
          <Text style={st.marca}>MoneyControl</Text>
          <Text style={st.slogan}>Suas finanças, organizadas e sob controle.</Text>
        </View>
        <View style={st.caixa}>
          <Text style={st.titulo}>Bem-vindo de volta</Text>
          <Text style={st.sub}>Use a mesma conta do site.</Text>
          <Botao variante="fantasma" onPress={comGoogle} carregando={google}>Continuar com Google</Botao>
          <View style={st.ou}>
            <View style={st.traco} />
            <Text style={st.ouTexto}>ou com e-mail</Text>
            <View style={st.traco} />
          </View>
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
          <Campo rotulo="Senha" erro={erro}>
            <Entrada value={senha} onChangeText={setSenha} secureTextEntry autoComplete="password" placeholder="••••••••" onSubmitEditing={enviar} />
          </Campo>
          <Botao onPress={enviar} carregando={enviando}>Entrar</Botao>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  tela: { flex: 1, justifyContent: 'center', padding: 20 },
  marca: { color: '#fff', fontSize: 30, fontWeight: '800' },
  slogan: { color: '#93A1B7', fontSize: 14, marginTop: 6 },
  caixa: { backgroundColor: cores.superficie, borderRadius: 22, padding: 20, gap: 14 },
  titulo: { fontSize: 20, fontWeight: '800', color: cores.texto1 },
  sub: { fontSize: 13, color: cores.texto3, marginTop: -8 },
  ou: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  traco: { flex: 1, height: 1, backgroundColor: cores.linha },
  ouTexto: { fontSize: 12, color: cores.texto3 },
})
