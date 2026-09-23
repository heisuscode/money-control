import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { dividirEmParcelas, iso } from '@/financeiro/logic'
import { formatCurrency, formatDate, maskMoneyInput, parseMoney, todayISO } from '@/lib/format'
import type { FrequenciaRecorrencia, TipoCategoria } from '@/lib/types'
import { Botao, Campo, Chips, Entrada, Segmentado } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { cores, raio } from '~/theme'

export default function NovaTransacao() {
  const params = useLocalSearchParams<{ tipo?: TipoCategoria }>()
  const { categorias, carteiras, registrarTransacao } = useDados()
  const [tipo, setTipo] = useState<TipoCategoria>(params.tipo === 'receita' ? 'receita' : 'despesa')
  const [valorStr, setValorStr] = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(todayISO())
  const [categoriaId, setCategoriaId] = useState('')
  const [carteiraId, setCarteiraId] = useState('')
  const [parcelas, setParcelas] = useState(1)
  const [repetir, setRepetir] = useState(false)
  const [frequencia, setFrequencia] = useState<FrequenciaRecorrencia>('mensal')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [mostrarData, setMostrarData] = useState(false)

  const valor = parseMoney(valorStr)
  const cats = categorias.filter((c) => c.tipo === tipo)
  const disponiveis = tipo === 'receita' ? carteiras.filter((c) => c.tipo !== 'cartao_credito') : carteiras
  const carteira = carteiras.find((c) => c.id === carteiraId)
  const noCartao = carteira?.tipo === 'cartao_credito'
  const podeParcelar = noCartao && tipo === 'despesa'
  const parcelado = podeParcelar && parcelas > 1
  const divisao = useMemo(() => dividirEmParcelas(valor, Math.max(parcelas, 1)), [valor, parcelas])

  // Mesmas regras do site: receita não vai para cartão; parcelado não repete; no cartão é mensal.
  useEffect(() => {
    if (tipo === 'receita' && noCartao) setCarteiraId('')
    setCategoriaId('')
  }, [tipo]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!podeParcelar) setParcelas(1)
    if (noCartao) setFrequencia('mensal')
  }, [podeParcelar, noCartao])
  useEffect(() => {
    if (parcelado) setRepetir(false)
  }, [parcelado])

  function escolherData() {
    const atual = new Date(`${data}T00:00:00`)
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: atual,
        mode: 'date',
        onChange: (evento, escolhida) => {
          if (evento.type === 'set' && escolhida) setData(iso(escolhida))
        },
      })
    } else {
      setMostrarData(true)
    }
  }

  async function salvar() {
    setErro(null)
    if (valor <= 0) return setErro('Informe um valor maior que zero.')
    if (!descricao.trim()) return setErro('Informe uma descrição.')
    setSalvando(true)
    try {
      await registrarTransacao({
        tipo,
        descricao: descricao.trim(),
        valorBRL: valor,
        valorOriginal: valor,
        moeda: 'BRL',
        taxa: 1,
        taxaTimestamp: new Date().toISOString(),
        data,
        categoriaId: categoriaId || null,
        carteiraId: carteiraId || null,
        parcelas: parcelado ? parcelas : 1,
        repetir: repetir ? frequencia : null,
      })
      router.back()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: cores.fundo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={st.conteudo} keyboardShouldPersistTaps="handled">
        <Segmentado
          valor={tipo}
          aoMudar={setTipo}
          opcoes={[
            { valor: 'despesa', rotulo: '− Despesa' },
            { valor: 'receita', rotulo: '+ Receita' },
          ]}
        />

        <Campo rotulo={parcelado ? 'Valor total da compra' : 'Valor'}>
          <Entrada
            value={valorStr}
            onChangeText={(t) => setValorStr(maskMoneyInput(t))}
            placeholder="0,00"
            keyboardType="numeric"
            style={st.valor}
            autoFocus
          />
        </Campo>

        <Campo rotulo="Descrição">
          <Entrada value={descricao} onChangeText={setDescricao} placeholder="Ex.: Tênis de corrida" />
        </Campo>

        <Campo rotulo="Data">
          <Pressable onPress={escolherData} style={st.data}>
            <Text style={st.dataTexto}>{formatDate(data, "dd 'de' MMMM 'de' yyyy")}</Text>
          </Pressable>
          {mostrarData && (
            <DateTimePicker
              value={new Date(`${data}T00:00:00`)}
              mode="date"
              onChange={(_e, escolhida) => {
                setMostrarData(false)
                if (escolhida) setData(iso(escolhida))
              }}
            />
          )}
        </Campo>

        <Campo rotulo="Categoria">
          <Chips
            valor={categoriaId}
            aoMudar={setCategoriaId}
            opcoes={[{ valor: '', rotulo: 'Sem categoria' }, ...cats.map((c) => ({ valor: c.id, rotulo: `${c.icone} ${c.nome}` }))]}
          />
        </Campo>

        <Campo
          rotulo={tipo === 'receita' ? 'Recebido em' : 'Pago com'}
          dica={noCartao ? 'Entra na fatura do cartão e desconta do limite.' : undefined}
        >
          <Chips
            valor={carteiraId}
            aoMudar={setCarteiraId}
            opcoes={[{ valor: '', rotulo: 'Sem carteira' }, ...disponiveis.map((c) => ({ valor: c.id, rotulo: `${c.icone} ${c.nome}` }))]}
          />
        </Campo>

        {podeParcelar && (
          <View style={st.caixa}>
            <Segmentado
              valor={parcelado ? 'parcelado' : 'vista'}
              aoMudar={(v) => setParcelas(v === 'parcelado' ? Math.max(parcelas, 2) : 1)}
              opcoes={[
                { valor: 'vista', rotulo: 'À vista' },
                { valor: 'parcelado', rotulo: 'Parcelado' },
              ]}
            />
            {parcelado && (
              <>
                <View style={st.passo}>
                  <Pressable style={st.passoBotao} onPress={() => setParcelas((p) => Math.max(2, p - 1))}>
                    <Text style={st.passoSinal}>−</Text>
                  </Pressable>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={st.passoNumero}>{parcelas}x</Text>
                    <Text style={st.dica}>de {formatCurrency(divisao.valor)}</Text>
                  </View>
                  <Pressable style={st.passoBotao} onPress={() => setParcelas((p) => Math.min(24, p + 1))}>
                    <Text style={st.passoSinal}>+</Text>
                  </Pressable>
                </View>
                {valor > 0 && (
                  <Text style={st.dica}>
                    Total {formatCurrency(valor)} em {parcelas}x de {formatCurrency(divisao.valor)}
                    {divisao.ultima !== divisao.valor ? ` (última de ${formatCurrency(divisao.ultima)})` : ''}. A 1ª cai na
                    fatura desta compra e as demais entram sozinhas, uma por mês.
                  </Text>
                )}
              </>
            )}
          </View>
        )}

        {!parcelado && (
          <View style={st.caixa}>
            <View style={st.entre}>
              <Text style={st.rotuloForte}>Repetir automaticamente</Text>
              <Switch value={repetir} onValueChange={setRepetir} trackColor={{ true: cores.marca }} />
            </View>
            {repetir &&
              (noCartao ? (
                <Text style={st.dica}>Repete todo mês no {carteira?.nome}; o vencimento é o da fatura do cartão.</Text>
              ) : (
                <Chips
                  valor={frequencia}
                  aoMudar={setFrequencia}
                  opcoes={[
                    { valor: 'mensal', rotulo: 'Todo mês' },
                    { valor: 'semanal', rotulo: 'Toda semana' },
                    { valor: 'anual', rotulo: 'Todo ano' },
                  ]}
                />
              ))}
          </View>
        )}

        {erro ? <Text style={st.erro}>{erro}</Text> : null}
        <Botao onPress={salvar} carregando={salvando}>
          {parcelado ? `Salvar compra em ${parcelas}x` : 'Salvar transação'}
        </Botao>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const st = StyleSheet.create({
  conteudo: { padding: 16, gap: 16, paddingBottom: 40 },
  valor: { fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  data: { borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.superficie, borderRadius: raio.md, padding: 14 },
  dataTexto: { fontSize: 16, color: cores.texto1 },
  caixa: { borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.superficie, borderRadius: raio.md, padding: 14, gap: 12 },
  entre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rotuloForte: { fontSize: 14, fontWeight: '600', color: cores.texto1 },
  passo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passoBotao: { width: 48, height: 48, borderRadius: 24, backgroundColor: cores.sutil, alignItems: 'center', justifyContent: 'center' },
  passoSinal: { fontSize: 24, fontWeight: '700', color: cores.marca },
  passoNumero: { fontSize: 26, fontWeight: '800', color: cores.texto1 },
  dica: { fontSize: 12, color: cores.texto3, lineHeight: 18 },
  erro: { fontSize: 13, color: cores.perigo, fontWeight: '600' },
})
