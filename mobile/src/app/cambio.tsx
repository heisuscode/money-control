import { useEffect, useState } from 'react'
import { Pressable, RefreshControl, Text, View } from 'react-native'
import { CURRENCIES } from '@/lib/currencies'
import { convert, fetchRates, rateBetween, type RateMap } from '@/lib/exchange'
import { formatCurrency, formatDate, formatNumber, maskMoneyInput, parseMoney } from '@/lib/format'
import { BotaoIcone, Cartao, Chips, Entrada, Icone, Tela, TituloSecao, num } from '~/components/ui'
import { criarEstilos, f, useTema } from '~/theme'

export default function Cambio() {
  const { cores } = useTema()
  const st = useSt()
  const [taxas, setTaxas] = useState<RateMap>({})
  const [atualizando, setAtualizando] = useState(false)
  const [valor, setValor] = useState('100,00')
  const [de, setDe] = useState('USD')
  const [para, setPara] = useState('BRL')

  async function atualizar() {
    setAtualizando(true)
    setTaxas(await fetchRates(true))
    setAtualizando(false)
  }

  // sempre busca a cotação mais recente ao abrir (como no site)
  useEffect(() => {
    fetchRates(true).then(setTaxas)
  }, [])

  const pronto = Object.keys(taxas).length > 0
  const resultado = pronto ? convert(parseMoney(valor), de, para, taxas) : 0
  const quando = taxas.USD?.timestamp
  const opcoes = CURRENCIES.map((c) => ({ valor: c.code, rotulo: c.code, cor: c.color }))

  return (
    <Tela
      titulo="Câmbio"
      subtitulo={quando ? `Atualizado ${formatDate(quando, "dd/MM 'às' HH:mm")}` : 'Buscando cotações...'}
      voltar
      aoAtualizar={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[cores.marca]} />}
    >
      <Cartao style={{ gap: 12 }}>
        <Text style={st.rotulo}>De</Text>
        <Chips valor={de} aoMudar={setDe} opcoes={opcoes} />
        <Entrada
          value={valor}
          onChangeText={(t) => setValor(maskMoneyInput(t))}
          keyboardType="numeric"
          accessibilityLabel={`Valor em ${de}`}
          style={st.valor}
        />
        <View style={st.meio}>
          <View style={st.traco} />
          <BotaoIcone
            icone="swap-vertical"
            rotulo="Inverter moedas"
            contorno
            cor={cores.marcaTexto}
            aoTocar={() => {
              setDe(para)
              setPara(de)
            }}
          />
          <View style={st.traco} />
        </View>
        <Text style={st.rotulo}>Para</Text>
        <Chips valor={para} aoMudar={setPara} opcoes={opcoes} />
        <View style={st.resultado}>
          <Text style={[st.resultadoValor, num]} numberOfLines={1} adjustsFontSizeToFit>
            {pronto ? formatCurrency(resultado, para) : '—'}
          </Text>
          {pronto ? (
            <Text style={st.sub}>
              1 {de} = {formatNumber(rateBetween(de, para, taxas), 4)} {para}
            </Text>
          ) : null}
        </View>
      </Cartao>

      <Cartao style={{ paddingVertical: 4 }}>
        <View style={{ paddingTop: 10 }}>
          <TituloSecao>Cotações em reais</TituloSecao>
        </View>
        <Text style={[st.sub, { marginTop: -4, marginBottom: 4 }]}>Toque numa moeda para converter.</Text>
        {CURRENCIES.filter((c) => c.code !== 'BRL').map((c, i) => {
          const t = taxas[c.code]
          const subiu = (t?.pct ?? 0) >= 0
          return (
            <Pressable
              key={c.code}
              onPress={() => {
                setDe(c.code)
                setPara('BRL')
              }}
              style={({ pressed }) => [st.linha, i > 0 && st.divisor, pressed && { opacity: 0.6 }]}
            >
              <View style={[st.moeda, { backgroundColor: `${c.color}1F` }]}>
                <Text style={[st.moedaSimbolo, { color: cores.texto1 }]} numberOfLines={1} adjustsFontSizeToFit>{c.symbol}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.codigo}>{c.code}</Text>
                <Text style={st.sub} numberOfLines={1}>{c.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[st.codigo, num]}>{t ? formatCurrency(t.brlPerUnit < 0.1 ? t.brlPerUnit * 100 : t.brlPerUnit) : '—'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  {t && t.brlPerUnit < 0.1 ? <Text style={st.sub}>por 100 · </Text> : null}
                  {t ? (
                    <>
                      <Icone nome={subiu ? 'caret-up' : 'caret-down'} tamanho={12} cor={subiu ? cores.sucesso : cores.perigo} />
                      <Text style={[st.variacao, num, { color: subiu ? cores.sucesso : cores.perigo }]}>
                        {formatNumber(Math.abs(t.pct), 2)}%
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )
        })}
      </Cartao>
    </Tela>
  )
}

const useSt = criarEstilos((cores) => ({
  rotulo: { fontSize: 13, ...f[600], color: cores.texto2 },
  valor: { fontSize: 24, ...f[800], fontVariant: ['tabular-nums'] },
  meio: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  traco: { flex: 1, height: 1, backgroundColor: cores.linha },
  resultado: { backgroundColor: cores.ativoFundo, borderRadius: 14, padding: 14, gap: 2 },
  resultadoValor: { fontSize: 28, ...f[800], color: cores.marcaTexto, letterSpacing: -0.6 },
  sub: { fontSize: 12, ...f[400], color: cores.texto3 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 56 },
  divisor: { borderTopWidth: 1, borderTopColor: cores.sutil },
  moeda: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  moedaSimbolo: { fontSize: 13, ...f[800] },
  codigo: { fontSize: 14, ...f[700], color: cores.texto1 },
  variacao: { fontSize: 12, ...f[700] },
}))
