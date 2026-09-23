import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { maskMoneyInput, parseMoney } from '@/lib/format'
import type { TipoCarteira } from '@/lib/types'
import { Botao, Campo, Entrada, Segmentado } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { cores } from '~/theme'

const ICONE: Record<TipoCarteira, string> = { conta: '🏦', dinheiro: '💵', cartao_credito: '💳' }
const CORES = ['#004AAD', '#16A34A', '#820AD1', '#E5484D', '#F59E0B', '#06B6D4', '#EC7000', '#8A95A6']

export default function NovaCarteira() {
  const { salvarCarteira } = useDados()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoCarteira>('conta')
  const [cor, setCor] = useState(CORES[0])
  const [saldoInicial, setSaldoInicial] = useState('')
  const [limite, setLimite] = useState('')
  const [fechamento, setFechamento] = useState('25')
  const [vencimento, setVencimento] = useState('5')
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
      await salvarCarteira({
        nome: nome.trim(),
        tipo,
        cor,
        icone: ICONE[tipo],
        saldo_inicial: cartao ? 0 : parseMoney(saldoInicial),
        limite: cartao ? parseMoney(limite) : null,
        dia_fechamento: cartao ? fech : null,
        dia_vencimento: cartao ? venc : null,
      })
      router.back()
    } catch {
      setErro('Não foi possível salvar a carteira.')
    } finally {
      setSalvando(false)
    }
  }

  const apenasDia = (t: string) => t.replace(/\D/g, '').slice(0, 2)

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: cores.fundo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={st.conteudo} keyboardShouldPersistTaps="handled">
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
          </>
        ) : (
          <Campo rotulo="Saldo inicial" dica="Quanto havia nesta conta antes de começar a usar o app.">
            <Entrada value={saldoInicial} onChangeText={(t) => setSaldoInicial(maskMoneyInput(t))} placeholder="0,00" keyboardType="numeric" />
          </Campo>
        )}

        <Campo rotulo="Cor">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {CORES.map((c) => (
              <Pressable key={c} onPress={() => setCor(c)} style={[st.cor, { backgroundColor: c }, cor === c && st.corAtiva]} />
            ))}
          </View>
        </Campo>

        {erro ? <Text style={st.erro}>{erro}</Text> : null}
        <Botao onPress={salvar} carregando={salvando}>Salvar</Botao>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const st = StyleSheet.create({
  conteudo: { padding: 16, gap: 16, paddingBottom: 40 },
  cor: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
  corAtiva: { borderColor: cores.texto1 },
  erro: { fontSize: 13, color: cores.perigo, fontWeight: '600' },
})
