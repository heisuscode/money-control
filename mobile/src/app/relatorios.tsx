import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { inMonth, monthlySeries, spendingByCategory } from '@/lib/finance'
import { formatPercent } from '@/lib/format'
import { Barra, Cartao, Segmentado, Tela, TituloSecao, Vazio, num } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { usePreferencias } from '~/context/Preferencias'
import { criarEstilos, f, useTema } from '~/theme'

const ALTURA = 150

export default function Relatorios() {
  const { cores } = useTema()
  const st = useSt()
  const d = useDados()
  const { dinheiro } = usePreferencias()
  const serie = useMemo(() => monthlySeries(d.receitas, d.despesas, 6), [d.receitas, d.despesas])
  const [sel, setSel] = useState(serie.length - 1)
  const [periodo, setPeriodo] = useState<'mes' | 'seis'>('mes')

  const maximo = Math.max(1, ...serie.flatMap((s) => [s.receitas, s.despesas]))
  const atual = serie[sel] ?? serie[serie.length - 1]

  const gastos = useMemo(() => {
    const agora = new Date()
    const base =
      periodo === 'mes'
        ? d.despesas.filter((m) => inMonth(m.data, agora.getFullYear(), agora.getMonth()))
        : d.despesas.filter((m) => {
            const inicio = new Date(agora.getFullYear(), agora.getMonth() - 5, 1)
            return new Date(`${m.data}T00:00:00`) >= inicio
          })
    return spendingByCategory(base, d.categorias).slice(0, 6)
  }, [d.despesas, d.categorias, periodo])
  const maiorGasto = gastos[0]?.total ?? 1

  return (
    <Tela titulo="Relatórios" voltar>
      <Cartao style={{ gap: 12 }}>
        <TituloSecao>Receitas × despesas</TituloSecao>
        <View style={st.legenda}>
          <Legenda cor={cores.receitaGrafico} texto="Receitas" />
          <Legenda cor={cores.despesaGrafico} texto="Despesas" />
        </View>

        <View style={st.grafico} accessibilityLabel="Gráfico de receitas e despesas dos últimos 6 meses">
          {[0.5, 1].map((g) => (
            <View key={g} style={[st.grade, { bottom: ALTURA * g + 22 }]} />
          ))}
          {serie.map((s, i) => {
            const ativo = i === sel
            return (
              <Pressable
                key={s.label + i}
                onPress={() => setSel(i)}
                accessibilityRole="button"
                accessibilityLabel={`${s.label}: receitas ${dinheiro(s.receitas)}, despesas ${dinheiro(s.despesas)}`}
                style={[st.coluna, ativo && st.colunaAtiva]}
              >
                <View style={st.barras}>
                  <View style={[st.barra, { height: Math.max(2, (s.receitas / maximo) * ALTURA), backgroundColor: cores.receitaGrafico }]} />
                  <View style={[st.barra, { height: Math.max(2, (s.despesas / maximo) * ALTURA), backgroundColor: cores.despesaGrafico }]} />
                </View>
                <Text style={[st.mes, ativo && { color: cores.texto1, ...f[800] }]}>{s.label}</Text>
              </Pressable>
            )
          })}
        </View>

        {atual ? (
          <View style={st.detalhe}>
            <Text style={st.detalheTitulo}>{atual.label}</Text>
            <Linha cor={cores.receitaGrafico} rotulo="Receitas" valor={dinheiro(atual.receitas)} />
            <Linha cor={cores.despesaGrafico} rotulo="Despesas" valor={dinheiro(atual.despesas)} />
            <View style={st.detalheDivisor} />
            <View style={st.entre}>
              <Text style={st.forte}>Saldo</Text>
              <Text style={[st.forte, num, { color: atual.saldo < 0 ? cores.perigo : cores.sucesso }]}>{dinheiro(atual.saldo)}</Text>
            </View>
          </View>
        ) : null}
        <Text style={st.dica}>Toque num mês para ver os valores.</Text>
      </Cartao>

      <Cartao style={{ gap: 12 }}>
        <TituloSecao>Onde você mais gastou</TituloSecao>
        <Segmentado
          valor={periodo}
          aoMudar={setPeriodo}
          opcoes={[
            { valor: 'mes', rotulo: 'Este mês' },
            { valor: 'seis', rotulo: '6 meses' },
          ]}
        />
        {gastos.length === 0 ? (
          <Vazio titulo="Sem despesas no período" />
        ) : (
          gastos.map((g) => (
            <View key={g.id} style={{ gap: 6 }}>
              <View style={st.entre}>
                <Text style={st.categoria} numberOfLines={1}>{g.nome}</Text>
                <Text style={[st.forte, num]}>
                  {dinheiro(g.total)} <Text style={st.dica}>{formatPercent(g.pct, 0)}</Text>
                </Text>
              </View>
              <Barra pct={(g.total / maiorGasto) * 100} cor={cores.marcaTexto} />
            </View>
          ))
        )}
      </Cartao>
    </Tela>
  )
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  const st = useSt()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: cor }} />
      <Text style={st.legendaTexto}>{texto}</Text>
    </View>
  )
}

function Linha({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: string }) {
  const st = useSt()
  return (
    <View style={st.entre}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: cor }} />
        <Text style={st.sub}>{rotulo}</Text>
      </View>
      <Text style={[st.forte, num]}>{valor}</Text>
    </View>
  )
}

const useSt = criarEstilos((cores) => ({
  entre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  legenda: { flexDirection: 'row', gap: 16, marginTop: -6 },
  legendaTexto: { fontSize: 12, ...f[600], color: cores.texto2 },
  grafico: { flexDirection: 'row', height: ALTURA + 30, alignItems: 'flex-end' },
  grade: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: cores.sutil },
  coluna: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%', borderRadius: 10, paddingBottom: 2 },
  colunaAtiva: { backgroundColor: cores.fundo },
  barras: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barra: { width: 12, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  mes: { fontSize: 12, ...f[600], color: cores.texto3 },
  detalhe: { backgroundColor: cores.fundo, borderRadius: 14, padding: 12, gap: 6 },
  detalheTitulo: { fontSize: 13, ...f[700], color: cores.texto1, textTransform: 'capitalize' },
  detalheDivisor: { height: 1, backgroundColor: cores.linha },
  forte: { fontSize: 14, ...f[700], color: cores.texto1 },
  sub: { fontSize: 13, ...f[400], color: cores.texto2 },
  categoria: { fontSize: 14, ...f[600], color: cores.texto1, flex: 1 },
  dica: { fontSize: 12, ...f[400], color: cores.texto3 },
}))
