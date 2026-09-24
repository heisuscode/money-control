import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Botao } from '~/components/ui'
import { concluirLoginGoogle, useAuth } from '~/context/AuthProvider'
import { criarEstilos, f, useTema } from '~/theme'

/**
 * Retorno do login com Google. No Expo Go o link exp://…/auth-callback?code=…
 * abre esta tela antes de a sessão existir: ela conclui o login (sem trocar o
 * código duas vezes) e só vai para o Início quando a sessão estiver pronta.
 * Redirecionar antes disso fazia as rotas protegidas se alternarem e travava o app.
 */
export default function RetornoLogin() {
  const { code, error_description: erroGoogle } = useLocalSearchParams<{ code?: string; error_description?: string }>()
  const { sessao } = useAuth()
  const { cores } = useTema()
  const st = useSt()
  const [falha, setFalha] = useState<string | null>(null)

  useEffect(() => {
    console.log('[google] link de retorno chegou; com código:', !!code)
    if (!code) return
    concluirLoginGoogle(code).then((erro) => {
      if (erro) setFalha(erro)
    })
  }, [code])

  useEffect(() => {
    if (sessao) router.replace('/')
  }, [sessao])

  // Link sem código (ou que nunca conclui): volta para a entrada depois de um tempo.
  useEffect(() => {
    if (sessao) return
    const t = setTimeout(() => setFalha((f) => f ?? 'O login demorou demais para concluir.'), code ? 15000 : 1500)
    return () => clearTimeout(t)
  }, [code, sessao])

  const mensagem = erroGoogle ? `O Google recusou o login: ${erroGoogle}` : falha

  return (
    <View style={st.tela}>
      {mensagem ? (
        <>
          <Text style={st.titulo}>Não deu para entrar</Text>
          <Text style={st.texto}>{mensagem}</Text>
          <Botao onPress={() => router.replace('/login')} style={{ alignSelf: 'stretch' }}>
            Voltar para entrar
          </Botao>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={cores.marcaTexto} />
          <Text style={st.titulo}>Entrando…</Text>
        </>
      )}
    </View>
  )
}

const useSt = criarEstilos((cores) => ({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  titulo: { fontSize: 18, ...f[800], color: cores.texto1 },
  texto: { fontSize: 14, ...f[400], color: cores.texto2, textAlign: 'center', lineHeight: 20 },
}))
