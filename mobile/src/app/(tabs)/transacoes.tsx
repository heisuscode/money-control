import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { inMonth, sum } from '@/lib/finance'
import { formatDate } from '@/lib/format'
import type { Movimentacao } from '@/lib/types'
import { LinhaMovimentacao } from '~/components/financeiro'
import { SeletorMes } from '~/components/SeletorMes'
import { Cartao, Carregando, Segmentado, Tela, Vazio, num } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { usePreferencias } from '~/context/Preferencias'
import { cores, f } from '~/theme'

type Filtro = 'todas' | 'receitas' | 'despesas'

function rotuloDia(data: string) {
  const hoje = formatDate(new Date(), 'yyyy-MM-dd')
  const ontem = new Date()
  ontem.setDate(ontem.getDate() - 1)
  if (data === hoje) return 'Hoje'
  if (data === formatDate(ontem, 'yyyy-MM-dd')) return 'Ontem'
  return formatDate(data, "EEEE, dd 'de' MMM")
}

export default function Transacoes() {
  const d = useDados()
  const { dinheiro } = usePreferencias()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [mes, setMes] = useState(() => new Date())
  const [atualizando, setAtualizando] = useState(false)

  const doMes = (m: Movimentacao) => inMonth(m.data, mes.getFullYear(), mes.getMonth())
  const receitasMes = useMemo(() => d.receitas.filter(doMes), [d.receitas, mes]) // eslint-disable-line react-hooks/exhaustive-deps
  const despesasMes = useMemo(() => d.despesas.filter(doMes), [d.despesas, mes]) // eslint-disable-line react-hooks/exhaustive-deps

  const grupos = useMemo(() => {
    const base = filtro === 'receitas' ? receitasMes : filtro === 'despesas' ? despesasMes : [...receitasMes, ...despesasMes]
    const ordenada = [...base].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.criado_em.localeCompare(a.criado_em)))
    const porDia = new Map<string, Movimentacao[]>()
    for (const m of ordenada) porDia.set(m.data, [...(porDia.get(m.data) ?? []), m])
    return [...porDia.entries()]
  }, [filtro, receitasMes, despesasMes])

  const entradas = sum(receitasMes)
  const saidas = sum(despesasMes)
  const recorrencia = (id?: string | null) => (id ? d.recorrencias.find((r) => r.id === id) : undefined)

  async function atualizar() {
    setAtualizando(true)
    await d.recarregar()
    setAtualizando(false)
  }

  return (
    <Tela titulo="Transações" espacoAbas aoAtualizar={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[cores.marca]} />}>
      <SeletorMes mes={mes} aoMudar={setMes} />

      <View style={st.resumo}>
        <View style={{ flex: 1 }}>
          <Text style={st.resumoRotulo}>Entrou</Text>
          <Text style={[st.resumoValor, num, { color: cores.sucesso }]}>{dinheiro(entradas)}</Text>
        </View>
        <View style={st.resumoDivisor} />
        <View style={{ flex: 1 }}>
          <Text style={st.resumoRotulo}>Saiu</Text>
          <Text style={[st.resumoValor, num, { color: cores.perigo }]}>{dinheiro(saidas)}</Text>
        </View>
        <View style={st.resumoDivisor} />
        <View style={{ flex: 1 }}>
          <Text style={st.resumoRotulo}>Saldo</Text>
          <Text style={[st.resumoValor, num]}>{dinheiro(entradas - saidas)}</Text>
        </View>
      </View>

      <Segmentado
        valor={filtro}
        aoMudar={setFiltro}
        opcoes={[
          { valor: 'todas', rotulo: 'Todas' },
          { valor: 'receitas', rotulo: 'Receitas' },
          { valor: 'despesas', rotulo: 'Despesas' },
        ]}
      />

      {d.carregando ? (
        <Carregando />
      ) : grupos.length === 0 ? (
        <Cartao>
          <Vazio
            icone="swap-vertical-outline"
            titulo="Nada neste mês"
            descricao="Toque no + para registrar uma receita ou despesa."
          />
        </Cartao>
      ) : (
        <>
          {grupos.map(([dia, itens]) => (
            <View key={dia} style={{ gap: 6 }}>
              <Text style={st.dia}>{rotuloDia(dia)}</Text>
              <Cartao style={{ paddingVertical: 2 }}>
                {itens.map((m, i) => (
                  <LinhaMovimentacao
                    key={m.id}
                    mov={m}
                    primeira={i === 0}
                    nomeCarteira={d.carteiras.find((c) => c.id === m.carteira_id)?.nome}
                    recorrencia={recorrencia(m.recorrencia_id)}
                    aoTocar={() =>
                      router.push({ pathname: '/transacao/[id]', params: { id: m.id, tipo: m.tipo ?? 'despesa' } })
                    }
                  />
                ))}
              </Cartao>
            </View>
          ))}
          <Text style={st.dica}>Toque numa transação para editar ou excluir.</Text>
        </>
      )}
    </Tela>
  )
}

const st = StyleSheet.create({
  resumo: {
    flexDirection: 'row',
    backgroundColor: cores.superficie,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: cores.linha,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  resumoDivisor: { width: 1, backgroundColor: cores.sutil },
  resumoRotulo: { fontSize: 11, ...f[600], color: cores.texto3 },
  resumoValor: { fontSize: 14, ...f[800], color: cores.texto1, marginTop: 2 },
  dia: { fontSize: 12, ...f[700], color: cores.texto3, marginLeft: 4, textTransform: 'capitalize' },
  dica: { fontSize: 12, ...f[400], color: cores.texto3, textAlign: 'center' },
})
