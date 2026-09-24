import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Botao, Campo, Entrada, Icone, Tela } from '~/components/ui'
import { useAuth } from '~/context/AuthProvider'
import { cores, f } from '~/theme'

export default function RecuperarSenha() {
  const { recuperarSenha } = useAuth()
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function enviar() {
    setErro(null)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro('Informe um e-mail válido.')
    setEnviando(true)
    const falha = await recuperarSenha(email)
    setEnviando(false)
    if (falha) setErro(falha)
    else setEnviado(true)
  }

  if (enviado) {
    return (
      <Tela voltar fundo={cores.superficie}>
        <View style={[st.icone, { backgroundColor: cores.sucessoFundo }]}>
          <Icone nome="mail-outline" tamanho={30} cor={cores.sucesso} />
        </View>
        <Text style={st.titulo}>Confira seu e-mail</Text>
        <Text style={st.texto}>
          Se existir uma conta com {email.trim()}, o link chega em alguns minutos. Veja também a caixa de spam. A senha
          nova é criada no site; depois é só entrar aqui com ela.
        </Text>
        <Botao onPress={() => router.back()}>Voltar para entrar</Botao>
        <Botao variante="texto" onPress={() => setEnviado(false)}>Não recebi, enviar de novo</Botao>
      </Tela>
    )
  }

  return (
    <Tela voltar fundo={cores.superficie}>
      <View style={[st.icone, { backgroundColor: cores.ativoFundo }]}>
        <Icone nome="lock-closed-outline" tamanho={30} cor={cores.marca} />
      </View>
      <Text style={st.titulo}>Esqueceu a senha?</Text>
      <Text style={st.texto}>Informe o e-mail da sua conta e enviamos um link para criar uma senha nova.</Text>
      <Campo rotulo="E-mail" erro={erro}>
        <Entrada
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="voce@email.com"
          onSubmitEditing={enviar}
        />
      </Campo>
      <Botao onPress={enviar} carregando={enviando}>Enviar link</Botao>
      <Text style={st.dica}>Entrou com o Google? Então não há senha: volte e toque em "Continuar com Google".</Text>
    </Tela>
  )
}

const st = StyleSheet.create({
  icone: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  titulo: { fontSize: 26, ...f[800], color: cores.texto1, letterSpacing: -0.5 },
  texto: { fontSize: 15, ...f[400], color: cores.texto2, lineHeight: 22, marginTop: -6 },
  dica: { fontSize: 13, ...f[400], color: cores.texto3, lineHeight: 19 },
})
