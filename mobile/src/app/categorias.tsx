import { useMemo, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { inMonth, sum } from '@/lib/finance'
import { formatCurrency, formatNumber, inMonthName, maskMoneyInput, parseMoney } from '@/lib/format'
import type { Categoria } from '@/lib/types'
import { iconeCategoria } from '~/components/financeiro'
import { Barra, Botao, Campo, Cartao, Entrada, FolhaInferior, Icone, Tela, Vazio, num } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { usePreferencias } from '~/context/Preferencias'
import { criarEstilos, f, useTema, type Cores } from '~/theme'

/** Âmbar a partir de 80% do orçamento; vermelho quando estoura. */
function corUso(pct: number, cores: Cores) {
  return pct > 100 ? cores.perigo : pct >= 80 ? cores.aviso : cores.sucesso
}

export default function Categorias() {
  const { cores } = useTema()
  const st = useSt()
  const d = useDados()
  const { dinheiro } = usePreferencias()
  const [editando, setEditando] = useState<Categoria | null>(null)
  const agora = new Date()

  const linhas = useMemo(() => {
    const doMes = d.despesas.filter((m) => inMonth(m.data, agora.getFullYear(), agora.getMonth()))
    return d.categorias
      .filter((c) => c.tipo === 'despesa')
      .map((c) => {
        const gasto = sum(doMes.filter((m) => m.categoria_id === c.id))
        const orc = Number(c.orcamento ?? 0)
        return { c, gasto, orc, pct: orc > 0 ? (gasto / orc) * 100 : 0 }
      })
      .sort((a, b) => (b.orc > 0 ? 1 : 0) - (a.orc > 0 ? 1 : 0) || b.pct - a.pct || b.gasto - a.gasto)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.categorias, d.despesas])

  const comOrcamento = linhas.filter((l) => l.orc > 0)
  const totalOrc = comOrcamento.reduce((a, l) => a + l.orc, 0)
  const totalGasto = comOrcamento.reduce((a, l) => a + l.gasto, 0)
  const pctTotal = totalOrc > 0 ? (totalGasto / totalOrc) * 100 : 0

  return (
    <Tela titulo="Categorias e orçamento" voltar>
      <Cartao style={{ gap: 10 }}>
        <Text style={st.rotulo}>Orçamento de {inMonthName(agora)}</Text>
        {totalOrc > 0 ? (
          <>
            <View style={st.entre}>
              <Text style={[st.grande, num]}>{dinheiro(totalGasto)}</Text>
              <Text style={[st.sub, num]}>de {dinheiro(totalOrc)}</Text>
            </View>
            <Barra pct={pctTotal} cor={corUso(pctTotal, cores)} altura={10} />
            <Text style={st.sub}>
              {totalGasto <= totalOrc
                ? `Ainda pode gastar ${dinheiro(totalOrc - totalGasto)} nas categorias com limite.`
                : `Passou ${dinheiro(totalGasto - totalOrc)} do planejado.`}
            </Text>
          </>
        ) : (
          <Text style={st.sub}>Toque numa categoria para definir quanto quer gastar por mês.</Text>
        )}
      </Cartao>

      {linhas.length === 0 ? (
        <Cartao>
          <Vazio icone="pie-chart-outline" titulo="Nenhuma categoria de despesa" descricao="Crie categorias pelo site." />
        </Cartao>
      ) : (
        <Cartao style={{ paddingVertical: 2 }}>
          {linhas.map(({ c, gasto, orc, pct }, i) => (
            <Pressable
              key={c.id}
              onPress={() => setEditando(c)}
              style={({ pressed }) => [st.linha, i > 0 && st.divisor, pressed && { opacity: 0.6 }]}
            >
              <View style={st.topoLinha}>
                <View style={[st.icone, { backgroundColor: `${c.cor}1F` }]}>
                  <Icone nome={iconeCategoria(c)} tamanho={18} cor={c.cor} />
                </View>
                <Text style={st.nome} numberOfLines={1}>{c.nome}</Text>
                {orc > 0 && pct >= 80 ? (
                  <Icone nome={pct > 100 ? 'alert-circle' : 'warning-outline'} tamanho={16} cor={corUso(pct, cores)} />
                ) : null}
                <Text style={[st.valor, num]}>
                  {dinheiro(gasto)}
                  {orc > 0 ? <Text style={st.sub}> / {dinheiro(orc)}</Text> : null}
                </Text>
              </View>
              {orc > 0 ? (
                <>
                  <Barra pct={pct} cor={corUso(pct, cores)} />
                  {pct > 100 ? (
                    <Text style={[st.sub, { color: cores.perigo, ...f[600] }]}>Estourou {dinheiro(gasto - orc)}</Text>
                  ) : pct >= 80 ? (
                    <Text style={[st.sub, { color: cores.aviso, ...f[600] }]}>{Math.round(pct)}% usado</Text>
                  ) : null}
                </>
              ) : (
                <Text style={st.sub}>Sem limite · toque para definir</Text>
              )}
            </Pressable>
          ))}
        </Cartao>
      )}

      <DefinirOrcamento categoria={editando} aoFechar={() => setEditando(null)} />
    </Tela>
  )
}

function DefinirOrcamento({ categoria, aoFechar }: { categoria: Categoria | null; aoFechar: () => void }) {
  const { definirOrcamento } = useDados()
  const [valor, setValor] = useState('')
  const [atual, setAtual] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  if (categoria && atual !== categoria.id) {
    setAtual(categoria.id)
    setValor(Number(categoria.orcamento) > 0 ? formatNumber(Number(categoria.orcamento)) : '')
  }
  if (!categoria && atual !== null) setAtual(null)

  async function salvar(v: number) {
    if (!categoria) return
    setSalvando(true)
    try {
      await definirOrcamento(categoria.id, v)
      aoFechar()
    } catch {
      Alert.alert('Não foi possível salvar o orçamento.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <FolhaInferior visivel={!!categoria} aoFechar={aoFechar} titulo={categoria ? `Orçamento de ${categoria.nome}` : ''}>
      <Campo rotulo="Limite por mês" dica="A barra fica âmbar em 80% e vermelha quando passa do limite.">
        <Entrada value={valor} onChangeText={(t) => setValor(maskMoneyInput(t))} placeholder="0,00" keyboardType="numeric" autoFocus />
      </Campo>
      <Botao onPress={() => salvar(parseMoney(valor))} carregando={salvando}>
        {parseMoney(valor) > 0 ? `Salvar ${formatCurrency(parseMoney(valor))}` : 'Salvar sem limite'}
      </Botao>
      {categoria && Number(categoria.orcamento) > 0 ? (
        <Botao variante="texto" onPress={() => salvar(0)}>Remover limite</Botao>
      ) : null}
    </FolhaInferior>
  )
}

const useSt = criarEstilos((cores) => ({
  entre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  rotulo: { fontSize: 13, ...f[600], color: cores.texto2, textTransform: 'none' },
  grande: { fontSize: 26, ...f[800], color: cores.texto1, letterSpacing: -0.6 },
  sub: { fontSize: 12, ...f[400], color: cores.texto3 },
  linha: { paddingVertical: 12, gap: 8 },
  topoLinha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divisor: { borderTopWidth: 1, borderTopColor: cores.sutil },
  icone: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  nome: { flex: 1, fontSize: 14, ...f[600], color: cores.texto1 },
  valor: { fontSize: 13, ...f[700], color: cores.texto1 },
}))
