import { router } from 'expo-router'
import { Alert, Text, View } from 'react-native'
import { Botao, Cartao, Grupo, ItemMenu, Tela } from '~/components/ui'
import { useAuth } from '~/context/AuthProvider'
import { useDados } from '~/context/DadosProvider'
import { iniciais } from '~/lib/texto'
import { criarEstilos, f, useTema } from '~/theme'

export default function Mais() {
  const { cores } = useTema()
  const st = useSt()
  const { nome, sessao, sair, viaGoogle } = useAuth()
  const d = useDados()
  const naoLidas = d.notificacoes.filter((n) => !n.lida).length
  const ativas = d.recorrencias.filter((r) => r.ativo).length

  function confirmarSaida() {
    Alert.alert('Sair da conta?', 'Você pode entrar de novo quando quiser.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => sair() },
    ])
  }

  return (
    <Tela titulo="Mais" voltar>
      <Cartao style={st.perfil}>
        <View style={st.avatar}>
          <Text style={st.avatarTexto}>{iniciais(nome)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.nome} numberOfLines={1}>{nome}</Text>
          <Text style={st.email} numberOfLines={1}>{sessao?.user.email}</Text>
          {viaGoogle ? <Text style={st.email}>Conectado com Google</Text> : null}
        </View>
      </Cartao>

      <Cartao style={{ paddingVertical: 2 }}>
        <ItemMenu
          primeiro
          icone="chatbubble-ellipses-outline"
          titulo="Assistente"
          detalhe="Conte seus gastos e pergunte sobre suas finanças"
          aoTocar={() => router.push('/assistente')}
        />
      </Cartao>

      <Grupo>Planejamento</Grupo>
      <Cartao style={{ paddingVertical: 2 }}>
        <ItemMenu primeiro icone="repeat" titulo="Recorrências" detalhe={ativas ? `${ativas} ativas` : 'Contas fixas e assinaturas'} aoTocar={() => router.push('/recorrencias')} />
        <ItemMenu icone="pie-chart-outline" titulo="Categorias e orçamento" detalhe="Limite por categoria" aoTocar={() => router.push('/categorias')} />
        <ItemMenu icone="flag-outline" titulo="Metas" detalhe={d.metas.length ? `${d.metas.length} metas` : 'Guarde para um objetivo'} aoTocar={() => router.push('/metas')} />
      </Cartao>

      <Grupo>Acompanhar</Grupo>
      <Cartao style={{ paddingVertical: 2 }}>
        <ItemMenu primeiro icone="calendar-outline" titulo="Calendário" detalhe="Vencimentos do mês" aoTocar={() => router.push('/calendario')} />
        <ItemMenu icone="bar-chart-outline" titulo="Relatórios" detalhe="Receitas × despesas" aoTocar={() => router.push('/relatorios')} />
        <ItemMenu icone="swap-horizontal-outline" titulo="Câmbio" detalhe="Cotações e conversor" aoTocar={() => router.push('/cambio')} />
        <ItemMenu
          icone="notifications-outline"
          titulo="Notificações"
          detalhe={naoLidas ? `${naoLidas} não lidas` : 'Tudo lido'}
          aoTocar={() => router.push('/notificacoes')}
        />
      </Cartao>

      <Cartao style={{ paddingVertical: 2 }}>
        <ItemMenu
          primeiro
          icone="settings-outline"
          titulo="Configurações"
          corIcone={cores.texto2}
          fundoIcone={cores.sutil}
          aoTocar={() => router.push('/configuracoes')}
        />
      </Cartao>

      <Botao variante="contornoPerigo" icone="log-out-outline" onPress={confirmarSaida}>Sair da conta</Botao>
    </Tela>
  )
}

const useSt = criarEstilos((cores) => ({
  perfil: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: cores.marca, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: '#FFFFFF', fontSize: 18, ...f[800] },
  nome: { fontSize: 17, ...f[800], color: cores.texto1 },
  email: { fontSize: 13, ...f[400], color: cores.texto3 },
}))
