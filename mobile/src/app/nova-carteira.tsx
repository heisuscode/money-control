import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { formatNumber, maskMoneyInput, parseMoney } from '@/lib/format'
import type { TipoCarteira } from '@/lib/types'
import { Botao, Campo, Entrada, Icone, Segmentado, Tela } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { CORES_CARTEIRA, criarEstilos, f, fundoComTextoBranco } from '~/theme'

// O banco guarda um emoji por carteira (o site mostra); o app desenha ícones.
const ICONE: Record<TipoCarteira, string> = { conta: '🏦', dinheiro: '💵', cartao_credito: '💳' }

export default function NovaCarteira() {
  const st = useSt()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { carteiras, salvarCarteira, removerCarteira } = useDados()
  const existente = id ? carteiras.find((c) => c.id === id) : undefined

  const [nome, setNome] = useState(existente?.nome ?? '')
  const [tipo, setTipo] = useState<TipoCarteira>(existente?.tipo ?? 'cartao_credito')
  const [cor, setCor] = useState(existente?.cor ?? CORES_CARTEIRA[0])
  const [saldoInicial, setSaldoInicial] = useState(existente ? formatNumber(Number(existente.saldo_inicial)) : '')
  const [limite, setLimite] = useState(existente?.limite ? formatNumber(Number(existente.limite)) : '')
  const [fechamento, setFechamento] = useState(String(existente?.dia_fechamento ?? 25))
  const [vencimento, setVencimento] = useState(String(existente?.dia_vencimento ?? 5))
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const cartao = tipo === 'cartao_credito'

  async function salvar() {
    setErro(null)
    if (!nome.trim()) return setErro('Informe o nome.')
    const fech = Number(fechamento)
    const venc = Number(vencimento)
    if (cartao) {
      if (parseMoney(limite) <= 0) return setErro('Informe o limite do cartão.')
      if (!(fech >= 1 && fech <= 31) || !(venc >= 1 && venc <= 31)) return setErro('Dias de fechamento e vencimento entre 1 e 31.')
    }
    setSalvando(true)
    try {
      await salvarCarteira(
        {
          nome: nome.trim(),
          tipo,
          cor,
          icone: existente?.tipo === tipo ? existente.icone : ICONE[tipo],
          saldo_inicial: cartao ? 0 : parseMoney(saldoInicial),
          limite: cartao ? parseMoney(limite) : null,
          dia_fechamento: cartao ? fech : null,
          dia_vencimento: cartao ? venc : null,
        },
        existente?.id,
      )
      router.back()
    } catch {
      setErro('Não foi possível salvar a carteira.')
    } finally {
      setSalvando(false)
    }
  }

  function remover() {
    if (!existente) return
    Alert.alert(
      `Remover ${existente.nome}?`,
      'As transações continuam no histórico, só perdem o vínculo com esta carteira.' +
        (existente.tipo === 'cartao_credito' ? ' Os pagamentos de fatura deste cartão são apagados.' : ''),
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await removerCarteira(existente.id)
              router.dismissTo('/carteiras')
            } catch {
              Alert.alert('Não foi possível remover.')
            }
          },
        },
      ],
    )
  }

  const apenasDia = (t: string) => t.replace(/\D/g, '').slice(0, 2)
  const valorPrevia = cartao ? limite || '0,00' : saldoInicial || '0,00'

  return (
    <Tela
      titulo={existente ? 'Editar carteira' : 'Nova carteira'}
      voltar
      rodape={
        <View style={{ gap: 8 }}>
          {erro ? <Text style={st.erro}>{erro}</Text> : null}
          <Botao onPress={salvar} carregando={salvando}>{existente ? 'Salvar alterações' : 'Criar carteira'}</Botao>
        </View>
      }
    >
      <View style={[st.previa, { backgroundColor: fundoComTextoBranco(cor) }]} accessibilityElementsHidden>
        <View style={st.entre}>
          <Text style={st.previaNome} numberOfLines={1}>{nome || (cartao ? 'Meu cartão' : tipo === 'dinheiro' ? 'Carteira' : 'Minha conta')}</Text>
          <Icone nome={cartao ? 'card' : tipo === 'dinheiro' ? 'cash' : 'business'} tamanho={22} cor="rgba(255,255,255,0.8)" />
        </View>
        <View style={{ flex: 1 }} />
        <Text style={st.previaRotulo}>{cartao ? 'Limite' : 'Saldo inicial'}</Text>
        <Text style={st.previaValor}>R$ {valorPrevia}</Text>
        {cartao ? <Text style={st.previaRotulo}>Fecha dia {fechamento || '–'} · vence dia {vencimento || '–'}</Text> : null}
      </View>

      <Campo rotulo="Tipo">
        <Segmentado
          valor={tipo}
          aoMudar={setTipo}
          opcoes={[
            { valor: 'conta', rotulo: 'Conta' },
            { valor: 'dinheiro', rotulo: 'Dinheiro' },
            { valor: 'cartao_credito', rotulo: 'Cartão' },
          ]}
        />
      </Campo>
      <Campo rotulo="Nome">
        <Entrada value={nome} onChangeText={setNome} placeholder={cartao ? 'Ex.: Cartão Nubank' : 'Ex.: Conta Itaú'} />
      </Campo>

      {cartao ? (
        <>
          <Campo rotulo="Limite">
            <Entrada value={limite} onChangeText={(t) => setLimite(maskMoneyInput(t))} placeholder="0,00" keyboardType="numeric" />
          </Campo>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Campo rotulo="Fecha dia">
                <Entrada value={fechamento} onChangeText={(t) => setFechamento(apenasDia(t))} keyboardType="number-pad" />
              </Campo>
            </View>
            <View style={{ flex: 1 }}>
              <Campo rotulo="Vence dia">
                <Entrada value={vencimento} onChangeText={(t) => setVencimento(apenasDia(t))} keyboardType="number-pad" />
              </Campo>
            </View>
          </View>
          <Text style={st.dica}>Compras depois do fechamento entram na fatura seguinte.</Text>
        </>
      ) : (
        <Campo rotulo="Saldo inicial" dica="Quanto havia nesta conta antes de começar a usar o app.">
          <Entrada value={saldoInicial} onChangeText={(t) => setSaldoInicial(maskMoneyInput(t))} placeholder="0,00" keyboardType="numeric" />
        </Campo>
      )}

      <Campo rotulo="Cor">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[...new Set([...CORES_CARTEIRA, existente?.cor ?? CORES_CARTEIRA[0]])].map((c) => (
            <Pressable
              key={c}
              onPress={() => setCor(c)}
              accessibilityRole="radio"
              accessibilityState={{ checked: cor === c }}
              accessibilityLabel={`Cor ${c}`}
              style={[st.cor, { backgroundColor: c }, cor === c && st.corAtiva]}
            >
              {cor === c ? <Icone nome="checkmark" tamanho={20} cor="#FFFFFF" /> : null}
            </Pressable>
          ))}
        </View>
      </Campo>

      {existente ? (
        <Botao variante="contornoPerigo" icone="trash-outline" onPress={remover}>Remover carteira</Botao>
      ) : null}
    </Tela>
  )
}

const useSt = criarEstilos((cores) => ({
  entre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  previa: { borderRadius: 20, padding: 18, height: 170 },
  previaNome: { color: '#FFFFFF', fontSize: 16, ...f[700], flex: 1 },
  previaRotulo: { color: 'rgba(255,255,255,0.85)', fontSize: 12, ...f[500] },
  previaValor: { color: '#FFFFFF', fontSize: 24, ...f[800], fontVariant: ['tabular-nums'] },
  cor: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  corAtiva: { borderWidth: 3, borderColor: cores.superficie, outlineColor: cores.texto1, outlineWidth: 2 },
  dica: { fontSize: 12, ...f[400], color: cores.texto3, marginTop: -6 },
  erro: { fontSize: 13, ...f[600], color: cores.perigo, textAlign: 'center' },
}))
