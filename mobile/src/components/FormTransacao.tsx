import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { dividirEmParcelas, iso } from '@/financeiro/logic'
import { formatCurrency, formatDate, formatNumber, maskMoneyInput, parseMoney, todayISO } from '@/lib/format'
import type { FrequenciaRecorrencia, Movimentacao, TipoCategoria } from '@/lib/types'
import { useDados } from '~/context/DadosProvider'
import { cores, f } from '~/theme'
import { Botao, BotaoIcone, Campo, Chave, Chips, Entrada, Icone, Segmentado, Seletor } from './ui'

export interface ValoresTransacao {
  tipo: TipoCategoria
  valor: number
  descricao: string
  data: string
  categoriaId: string | null
  carteiraId: string | null
  parcelas: number
  repetir: FrequenciaRecorrencia | null
}

/**
 * Formulário de transação (nova ou edição). Na edição não há parcelamento nem
 * repetição: esses são definidos na criação (e ajustados em Recorrências).
 */
export function FormTransacao({
  titulo,
  inicial,
  editando,
  tipoInicial = 'despesa',
  aoSalvar,
  aoExcluir,
}: {
  titulo: string
  inicial?: Movimentacao
  editando?: boolean
  tipoInicial?: TipoCategoria
  aoSalvar: (v: ValoresTransacao) => Promise<void>
  aoExcluir?: () => void
}) {
  const { categorias, carteiras, recorrencias } = useDados()
  const [tipo, setTipo] = useState<TipoCategoria>(inicial?.tipo ?? tipoInicial)
  const [valorStr, setValorStr] = useState(inicial ? formatNumber(Number(inicial.valor)) : '')
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')
  const [data, setData] = useState(inicial?.data ?? todayISO())
  const [categoriaId, setCategoriaId] = useState(inicial?.categoria_id ?? '')
  const [carteiraId, setCarteiraId] = useState(inicial?.carteira_id ?? '')
  const [parcelas, setParcelas] = useState(1)
  const [repetir, setRepetir] = useState(false)
  const [frequencia, setFrequencia] = useState<FrequenciaRecorrencia>('mensal')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [mostrarData, setMostrarData] = useState(false)

  const moedaEstrangeira = !!inicial && (inicial.moeda_original ?? 'BRL') !== 'BRL'
  const recorrenciaOrigem = inicial?.recorrencia_id ? recorrencias.find((r) => r.id === inicial.recorrencia_id) : undefined
  const valor = parseMoney(valorStr)
  const cats = categorias.filter((c) => c.tipo === tipo)
  const disponiveis = tipo === 'receita' ? carteiras.filter((c) => c.tipo !== 'cartao_credito') : carteiras
  const carteira = carteiras.find((c) => c.id === carteiraId)
  const noCartao = carteira?.tipo === 'cartao_credito'
  const podeParcelar = !editando && noCartao && tipo === 'despesa'
  const parcelado = podeParcelar && parcelas > 1
  const divisao = useMemo(() => dividirEmParcelas(valor, Math.max(parcelas, 1)), [valor, parcelas])

  // Mesmas regras do site: receita não vai para cartão; parcelado não repete; no cartão é mensal.
  const [tipoAnterior, setTipoAnterior] = useState(tipo)
  if (tipoAnterior !== tipo) {
    setTipoAnterior(tipo)
    setCategoriaId('')
    if (tipo === 'receita' && noCartao) setCarteiraId('')
  }
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
      await aoSalvar({
        tipo,
        valor,
        descricao: descricao.trim(),
        data,
        categoriaId: categoriaId || null,
        carteiraId: carteiraId || null,
        parcelas: parcelado ? parcelas : 1,
        repetir: !editando && repetir ? frequencia : null,
      })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const hojeISO = todayISO()
  const textoData = data === hojeISO ? `Hoje, ${formatDate(data, "dd 'de' MMMM")}` : formatDate(data, "dd 'de' MMMM 'de' yyyy")
  const corValor = tipo === 'receita' ? cores.sucesso : cores.texto1

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top', 'bottom']}>
      <View style={st.topo}>
        <BotaoIcone icone="close" rotulo="Fechar" aoTocar={() => router.back()} />
        <Text style={st.titulo} accessibilityRole="header">{titulo}</Text>
        {aoExcluir ? <BotaoIcone icone="trash-outline" rotulo="Excluir" cor={cores.perigo} aoTocar={aoExcluir} /> : <View style={{ width: 44 }} />}
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={st.conteudo} keyboardShouldPersistTaps="handled">
          {!editando && (
            <Segmentado
              valor={tipo}
              aoMudar={setTipo}
              cores={{ despesa: cores.perigo, receita: cores.sucesso }}
              opcoes={[
                { valor: 'despesa', rotulo: 'Despesa' },
                { valor: 'receita', rotulo: 'Receita' },
              ]}
            />
          )}

          <View style={st.valorCaixa}>
            <Text style={st.valorRotulo}>{parcelado ? 'Valor total da compra' : 'Valor'}</Text>
            <View style={st.valorLinha}>
              <Text style={[st.moeda, { color: corValor }]}>R$</Text>
              <TextInput
                value={valorStr}
                onChangeText={(t) => setValorStr(maskMoneyInput(t))}
                placeholder="0,00"
                placeholderTextColor={cores.desligado}
                keyboardType="numeric"
                editable={!moedaEstrangeira}
                autoFocus={!editando}
                accessibilityLabel="Valor"
                style={[st.valor, { color: corValor }]}
              />
            </View>
            {moedaEstrangeira ? (
              <Text style={st.dica}>
                Lançada em {inicial!.moeda_original} ({formatCurrency(Number(inicial!.valor_original), inicial!.moeda_original)}). Para
                mudar o valor, edite pelo site.
              </Text>
            ) : null}
          </View>

          <Campo rotulo="Descrição">
            <Entrada value={descricao} onChangeText={setDescricao} placeholder={tipo === 'receita' ? 'Ex.: Salário' : 'Ex.: Tênis de corrida'} />
          </Campo>

          <Campo rotulo="Categoria">
            <Chips
              quebrar
              valor={categoriaId}
              aoMudar={setCategoriaId}
              opcoes={[{ valor: '', rotulo: 'Sem categoria' }, ...cats.map((c) => ({ valor: c.id, rotulo: c.nome, cor: c.cor }))]}
            />
          </Campo>

          <Campo rotulo="Data">
            <Seletor icone="calendar-outline" texto={textoData} aoTocar={escolherData} />
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

          <Campo
            rotulo={tipo === 'receita' ? 'Recebido em' : 'Pago com'}
            dica={noCartao ? 'Entra na fatura do cartão e desconta do limite.' : undefined}
          >
            <Chips
              quebrar
              valor={carteiraId}
              aoMudar={setCarteiraId}
              opcoes={[{ valor: '', rotulo: 'Sem carteira' }, ...disponiveis.map((c) => ({ valor: c.id, rotulo: c.nome, cor: c.cor }))]}
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
                    <Pressable
                      style={st.passoBotao}
                      onPress={() => setParcelas((p) => Math.max(2, p - 1))}
                      accessibilityLabel="Menos parcelas"
                    >
                      <Icone nome="remove" cor={cores.marca} tamanho={24} />
                    </Pressable>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={st.passoNumero}>{parcelas}x</Text>
                      <Text style={st.dica}>de {formatCurrency(divisao.valor)}</Text>
                    </View>
                    <Pressable
                      style={st.passoBotao}
                      onPress={() => setParcelas((p) => Math.min(24, p + 1))}
                      accessibilityLabel="Mais parcelas"
                    >
                      <Icone nome="add" cor={cores.marca} tamanho={24} />
                    </Pressable>
                  </View>
                  {valor > 0 && (
                    <View style={st.aviso}>
                      <Icone nome="information-circle-outline" tamanho={18} cor={cores.marca} />
                      <Text style={[st.dica, { flex: 1, color: cores.texto2 }]}>
                        {parcelas}x de {formatCurrency(divisao.valor)}
                        {divisao.ultima !== divisao.valor ? ` (última de ${formatCurrency(divisao.ultima)})` : ''}. A 1ª cai
                        na fatura desta compra e as outras entram sozinhas, uma por mês. O limite reserva o total.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {!editando && !parcelado && (
            <View style={st.caixa}>
              <View style={st.entre}>
                <View style={{ flex: 1 }}>
                  <Text style={st.rotuloForte}>Repetir automaticamente</Text>
                  <Text style={st.dica}>Aluguel, salário, assinaturas...</Text>
                </View>
                <Chave valor={repetir} aoMudar={setRepetir} rotulo="Repetir automaticamente" />
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

          {editando && recorrenciaOrigem ? (
            <View style={st.aviso}>
              <Icone nome="repeat" tamanho={18} cor={cores.marca} />
              <Text style={[st.dica, { flex: 1, color: cores.texto2 }]}>
                {recorrenciaOrigem.parcelas_total
                  ? 'Esta é uma parcela. Mudar aqui altera só este mês; as próximas seguem a compra original.'
                  : 'Lançada por uma recorrência. Mudar aqui altera só este lançamento; as próximas seguem a regra em Recorrências.'}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={st.rodape}>
        {erro ? <Text style={st.erro}>{erro}</Text> : null}
        <Botao onPress={salvar} carregando={salvando}>
          {editando ? 'Salvar alterações' : parcelado ? `Salvar compra em ${parcelas}x` : tipo === 'receita' ? 'Salvar receita' : 'Salvar despesa'}
        </Botao>
      </View>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  titulo: { fontSize: 17, ...f[800], color: cores.texto1 },
  conteudo: { paddingHorizontal: 20, paddingTop: 8, gap: 18, paddingBottom: 24 },
  valorCaixa: { alignItems: 'center', paddingVertical: 8, gap: 2 },
  valorRotulo: { fontSize: 13, ...f[600], color: cores.texto3 },
  valorLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moeda: { fontSize: 22, ...f[700] },
  valor: { fontSize: 42, ...f[800], letterSpacing: -1, minWidth: 120, textAlign: 'center', fontVariant: ['tabular-nums'], padding: 0 },
  caixa: { borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.superficie, borderRadius: 18, padding: 14, gap: 12 },
  entre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rotuloForte: { fontSize: 14, ...f[600], color: cores.texto1 },
  passo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passoBotao: { width: 48, height: 48, borderRadius: 24, backgroundColor: cores.ativoFundo, alignItems: 'center', justifyContent: 'center' },
  passoNumero: { fontSize: 28, ...f[800], color: cores.texto1 },
  dica: { fontSize: 12, ...f[400], color: cores.texto3, lineHeight: 17 },
  aviso: { flexDirection: 'row', gap: 8, backgroundColor: cores.ativoFundo, borderRadius: 12, padding: 10 },
  rodape: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, gap: 8, borderTopWidth: 1, borderTopColor: cores.linha, backgroundColor: cores.superficie },
  erro: { fontSize: 13, ...f[600], color: cores.perigo, textAlign: 'center' },
})
