import Constants from 'expo-constants'
import type { ReactNode } from 'react'
import { Alert, Text, View } from 'react-native'
import { autenticar, biometriaDisponivel } from '~/components/Bloqueio'
import { Botao, Cartao, Chave, Chips, Grupo, Segmentado, Tela } from '~/components/ui'
import { useAuth } from '~/context/AuthProvider'
import { usePreferencias, type EscolhaTema } from '~/context/Preferencias'
import { lembretesDisponiveis, pedirPermissaoLembretes } from '~/lib/lembretes'
import { criarEstilos, f } from '~/theme'

const HORAS = [7, 9, 12, 18, 20]
const ANTECEDENCIA = [
  { valor: 0, rotulo: 'No dia' },
  { valor: 1, rotulo: '1 dia antes' },
  { valor: 3, rotulo: '3 dias antes' },
]

export default function Configuracoes() {
  const st = useSt()
  const { sessao, sair, viaGoogle } = useAuth()
  const p = usePreferencias()
  const l = p.lembretes

  async function ligarLembretes(ativo: boolean) {
    if (ativo && !(await pedirPermissaoLembretes())) {
      Alert.alert('Permissão negada', 'Libere as notificações do MoneyControl nas configurações do Android.')
      return
    }
    p.mudar({ lembretes: { ...l, ativo } })
  }

  async function ligarBiometria(ativo: boolean) {
    if (!ativo) return p.mudar({ biometria: false })
    if (!(await biometriaDisponivel())) {
      Alert.alert('Sem digital cadastrada', 'Cadastre uma digital ou o reconhecimento de rosto nas configurações do Android.')
      return
    }
    // confirma uma vez para garantir que funciona antes de travar o app
    if (await autenticar('Confirme para ativar o desbloqueio')) p.mudar({ biometria: true })
  }

  function confirmarSaida() {
    Alert.alert('Sair da conta?', 'Você pode entrar de novo quando quiser.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => sair() },
    ])
  }

  return (
    <Tela titulo="Configurações" voltar>
      <Grupo>Aparência</Grupo>
      <Cartao style={{ gap: 10 }}>
        <Text style={st.titulo}>Tema</Text>
        <Segmentado<EscolhaTema>
          valor={p.tema}
          aoMudar={(tema) => p.mudar({ tema })}
          opcoes={[
            { valor: 'claro', rotulo: 'Claro' },
            { valor: 'escuro', rotulo: 'Escuro' },
            { valor: 'sistema', rotulo: 'Sistema' },
          ]}
        />
      </Cartao>

      <Grupo>Privacidade</Grupo>
      <Cartao style={{ paddingVertical: 4 }}>
        <Linha titulo="Desbloquear com digital" detalhe="Pede a digital ao abrir o app e ao voltar depois de 1 minuto">
          <Chave valor={p.biometria} aoMudar={ligarBiometria} rotulo="Desbloquear com digital" />
        </Linha>
        <View style={st.divisor} />
        <Linha titulo="Esconder valores" detalhe="Mostra R$ •••• no lugar dos números (o olho no Início faz o mesmo)">
          <Chave valor={p.ocultarValores} aoMudar={(v) => p.mudar({ ocultarValores: v })} rotulo="Esconder valores" />
        </Linha>
      </Cartao>

      <Grupo>Lembretes</Grupo>
      <Cartao style={{ paddingVertical: 4 }}>
        <Linha
          titulo="Avisar vencimentos"
          detalhe={lembretesDisponiveis ? 'Contas, faturas e recorrências' : 'Funciona no app instalado (não no Expo Go)'}
        >
          <Chave valor={l.ativo && lembretesDisponiveis} aoMudar={ligarLembretes} rotulo="Avisar vencimentos" />
        </Linha>
        {l.ativo && lembretesDisponiveis ? (
          <>
            <View style={[st.bloco, st.divisor]}>
              <Text style={st.titulo}>Horário do aviso</Text>
              <Chips
                valor={l.hora}
                aoMudar={(hora) => p.mudar({ lembretes: { ...l, hora } })}
                opcoes={HORAS.map((h) => ({ valor: h, rotulo: `${String(h).padStart(2, '0')}:00` }))}
              />
            </View>
            <View style={[st.bloco, st.divisor]}>
              <Text style={st.titulo}>Antecedência</Text>
              <Chips valor={l.antecedencia} aoMudar={(antecedencia) => p.mudar({ lembretes: { ...l, antecedencia } })} opcoes={ANTECEDENCIA} />
            </View>
          </>
        ) : null}
      </Cartao>

      <Grupo>Conta</Grupo>
      <Cartao style={{ paddingVertical: 4 }}>
        <Linha titulo="E-mail" detalhe={viaGoogle ? 'Conectado com Google' : 'Entrada com senha'}>
          <Text style={st.valor} numberOfLines={1}>{sessao?.user.email}</Text>
        </Linha>
        <View style={st.divisor} />
        <Linha titulo="Moeda principal">
          <Text style={[st.valor, f[700]]}>Real (BRL)</Text>
        </Linha>
      </Cartao>

      <Botao variante="contornoPerigo" icone="log-out-outline" onPress={confirmarSaida}>Sair da conta</Botao>
      <Text style={st.versao}>MoneyControl {Constants.expoConfig?.version ?? ''}</Text>
    </Tela>
  )
}

function Linha({ titulo, detalhe, children }: { titulo: string; detalhe?: string; children: ReactNode }) {
  const st = useSt()
  return (
    <View style={st.linha}>
      <View style={{ flex: 1 }}>
        <Text style={st.titulo}>{titulo}</Text>
        {detalhe ? <Text style={st.detalhe}>{detalhe}</Text> : null}
      </View>
      {children}
    </View>
  )
}

const useSt = criarEstilos((cores) => ({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 56 },
  bloco: { paddingVertical: 12, gap: 10 },
  divisor: { borderTopWidth: 1, borderTopColor: cores.sutil },
  titulo: { fontSize: 14, ...f[600], color: cores.texto1 },
  detalhe: { fontSize: 12, ...f[400], color: cores.texto3, lineHeight: 17 },
  valor: { fontSize: 13, ...f[500], color: cores.texto2, maxWidth: 180 },
  versao: { fontSize: 12, ...f[400], color: cores.texto3, textAlign: 'center' },
}))
