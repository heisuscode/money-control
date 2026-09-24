import { router } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { BotaoGoogle, Ou } from '~/components/Acesso'
import { Botao, Campo, Entrada, Icone, Tela } from '~/components/ui'
import { useAuth } from '~/context/AuthProvider'
import { criarEstilos, f, useTema, type Cores } from '~/theme'

/** 0–4: tamanho, número, maiúscula e símbolo. */
function forca(senha: string) {
  if (!senha) return 0
  let pontos = senha.length >= 8 ? 1 : 0
  if (/\d/.test(senha)) pontos++
  if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) pontos++
  if (/[^A-Za-z0-9]/.test(senha)) pontos++
  return senha.length < 6 ? Math.min(pontos, 1) : pontos
}
const niveis = (cores: Cores) => [
  { texto: 'Muito fraca', cor: cores.perigo },
  { texto: 'Fraca', cor: cores.perigo },
  { texto: 'Razoável', cor: cores.aviso },
  { texto: 'Boa', cor: cores.sucesso },
  { texto: 'Forte', cor: cores.sucesso },
]

export default function CriarConta() {
  const { cores } = useTema()
  const st = useSt()
  const { cadastrar, entrarComGoogle } = useAuth()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [google, setGoogle] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const nivel = forca(senha)
  const NIVEIS = niveis(cores)

  async function comGoogle() {
    setErro(null)
    setGoogle(true)
    const falha = await entrarComGoogle()
    setGoogle(false)
    if (falha) setErro(falha)
  }

  async function criar() {
    setErro(null)
    if (!nome.trim()) return setErro('Informe seu nome.')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro('Informe um e-mail válido.')
    if (senha.length < 6) return setErro('A senha precisa de pelo menos 6 caracteres.')
    setEnviando(true)
    const r = await cadastrar(nome, email, senha)
    setEnviando(false)
    if (r.erro) return setErro(r.erro)
    if (r.confirmar) setConfirmar(true)
    // sem confirmação por e-mail a sessão já abre e o app vai para o Início sozinho
  }

  if (confirmar) {
    return (
      <Tela voltar fundo={cores.superficie}>
        <View style={st.icone}>
          <Icone nome="mail-open-outline" tamanho={30} cor={cores.sucesso} />
        </View>
        <Text style={st.titulo}>Confirme seu e-mail</Text>
        <Text style={st.texto}>
          Enviamos um link para {email.trim()}. Depois de confirmar, volte aqui e entre com seu e-mail e senha.
        </Text>
        <Botao onPress={() => router.back()}>Voltar para entrar</Botao>
      </Tela>
    )
  }

  return (
    <Tela voltar fundo={cores.superficie}>
      <Text style={st.titulo}>Criar conta</Text>
      <Text style={st.texto}>A mesma conta funciona no site e no app.</Text>
      <BotaoGoogle aoTocar={comGoogle} carregando={google} texto="Criar com Google" />
      <Ou />
      <Campo rotulo="Nome">
        <Entrada value={nome} onChangeText={setNome} autoComplete="name" placeholder="Como quer ser chamado" />
      </Campo>
      <Campo rotulo="E-mail">
        <Entrada value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="voce@email.com" />
      </Campo>
      <Campo rotulo="Senha">
        <Entrada value={senha} onChangeText={setSenha} secureTextEntry autoComplete="new-password" placeholder="Mínimo de 6 caracteres" />
        {senha ? (
          <View style={{ gap: 6 }}>
            <View style={st.forca}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={[st.forcaParte, { backgroundColor: i <= nivel ? NIVEIS[nivel].cor : cores.sutil }]} />
              ))}
            </View>
            <Text style={[st.forcaTexto, { color: NIVEIS[nivel].cor }]}>{NIVEIS[nivel].texto}</Text>
          </View>
        ) : null}
      </Campo>
      {erro ? <Text style={st.erro}>{erro}</Text> : null}
      <Botao onPress={criar} carregando={enviando}>Criar conta</Botao>
    </Tela>
  )
}

const useSt = criarEstilos((cores) => ({
  titulo: { fontSize: 26, ...f[800], color: cores.texto1, letterSpacing: -0.5 },
  texto: { fontSize: 15, ...f[400], color: cores.texto2, lineHeight: 22, marginTop: -6 },
  icone: { width: 64, height: 64, borderRadius: 20, backgroundColor: cores.sucessoFundo, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  forca: { flexDirection: 'row', gap: 4 },
  forcaParte: { flex: 1, height: 5, borderRadius: 3 },
  forcaTexto: { fontSize: 12, ...f[700] },
  erro: { fontSize: 13, ...f[600], color: cores.perigo },
}))
