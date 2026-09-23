import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { resumoCartao } from '@/financeiro/logic'
import { sum } from '@/lib/finance'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Carteira } from '@/lib/types'
import { Botao, Cartao, Carregando, Tela, Vazio, s } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { cores } from '~/theme'

const LABEL = { conta: 'Conta bancária', dinheiro: 'Dinheiro', cartao_credito: 'Cartão de crédito' } as const

export default function Carteiras() {
  const d = useDados()
  const [atualizando, setAtualizando] = useState(false)

  // saldo = inicial + receitas − despesas − faturas pagas com esta conta (mesma regra do site)
  function saldo(c: Carteira) {
    const faturas = Object.values(d.pagamentosFatura)
      .filter((p) => p.carteira_id === c.id)
      .reduce((a, p) => a + Number(p.valor), 0)
    return (
      Number(c.saldo_inicial) +
      sum(d.receitas.filter((r) => r.carteira_id === c.id)) -
      sum(d.despesas.filter((x) => x.carteira_id === c.id)) -
      faturas
    )
  }

  const contas = d.carteiras.filter((c) => c.tipo !== 'cartao_credito')
  const cartoes = d.carteiras.filter((c) => c.tipo === 'cartao_credito')
  const saldoContas = contas.reduce((a, c) => a + saldo(c), 0)
  const divida = cartoes.reduce((a, c) => {
    const r = resumoCartao(c, d.despesas, d.pagamentosFatura, d.recorrencias)
    return a + r.emAberto + r.parcelasFuturas
  }, 0)

  async function atualizar() {
    setAtualizando(true)
    await d.recarregar()
    setAtualizando(false)
  }

  const novo = () => router.push('/nova-carteira')

  return (
    <Tela
      titulo="Carteiras"
      subtitulo="Contas, dinheiro e cartões"
      acao={
        <Pressable onPress={novo} hitSlop={10} accessibilityLabel="Nova carteira">
          <Ionicons name="add-circle" size={30} color={cores.marca} />
        </Pressable>
      }
      aoAtualizar={<RefreshControl refreshing={atualizando} onRefresh={atualizar} />}
    >
      {d.carregando ? (
        <Carregando />
      ) : d.carteiras.length === 0 ? (
        <Cartao>
          <Vazio
            titulo="Nenhuma carteira ainda"
            descricao="Cadastre suas contas e cartões para saber de onde sai cada gasto e acompanhar faturas e limites."
            acao={<Botao onPress={novo}>Nova carteira</Botao>}
          />
        </Cartao>
      ) : (
        <>
          <Cartao>
            <Linha rotulo="Saldo em contas e dinheiro" valor={saldoContas} />
            <Linha rotulo="Em aberto nos cartões" valor={divida} cor={cores.aviso} />
            <Linha rotulo="Patrimônio líquido" valor={saldoContas - divida} cor={saldoContas - divida < 0 ? cores.perigo : cores.sucesso} forte />
          </Cartao>

          {d.carteiras.map((c) => {
            if (c.tipo !== 'cartao_credito') {
              const v = saldo(c)
              return (
                <Cartao key={c.id}>
                  <Cabecalho c={c} />
                  <Text style={st.rotulo}>Saldo</Text>
                  <Text style={[st.grande, s.num, v < 0 && { color: cores.perigo }]}>{formatCurrency(v)}</Text>
                </Cartao>
              )
            }
            const r = resumoCartao(c, d.despesas, d.pagamentosFatura, d.recorrencias)
            const limite = Number(c.limite ?? 0)
            const uso = limite > 0 ? Math.min(100, ((r.emAberto + r.parcelasFuturas) / limite) * 100) : 0
            return (
              <Cartao key={c.id}>
                <Cabecalho c={c} />
                <Text style={st.rotulo}>Fatura atual · fecha {formatDate(r.aberta.ciclo.fim, 'dd/MM')}</Text>
                <Text style={[st.grande, s.num]}>{formatCurrency(r.aberta.total)}</Text>
                <View style={st.barra}>
                  <View style={[st.barraUso, { width: `${uso}%`, backgroundColor: uso > 90 ? cores.perigo : c.cor }]} />
                </View>
                <View style={[st.entre, { marginTop: 6 }]}>
                  <Text style={st.sub}>Disponível <Text style={[st.forte, s.num]}>{formatCurrency(r.disponivel)}</Text></Text>
                  <Text style={st.sub}>Limite <Text style={[st.forte, s.num]}>{formatCurrency(limite)}</Text></Text>
                </View>
                {r.parcelasFuturas > 0 && <Text style={st.sub}>Parcelas das próximas faturas: {formatCurrency(r.parcelasFuturas)}</Text>}
                {r.fechadas.filter((f) => !f.paga).map((f) => (
                  <Text key={f.chave} style={[st.sub, { color: cores.aviso }]}>
                    Fatura fechada de {formatCurrency(f.total)} · vence {formatDate(f.ciclo.vencimento, 'dd/MM')}
                  </Text>
                ))}
                <Text style={st.sub}>Fecha dia {c.dia_fechamento} · vence dia {c.dia_vencimento}</Text>
              </Cartao>
            )
          })}
        </>
      )}
    </Tela>
  )
}

function Cabecalho({ c }: { c: Carteira }) {
  return (
    <View style={[st.entre, { marginBottom: 10 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[st.icone, { backgroundColor: `${c.cor}22` }]}>
          <Text style={{ fontSize: 20 }}>{c.icone}</Text>
        </View>
        <View>
          <Text style={st.nome}>{c.nome}</Text>
          <Text style={st.sub}>{LABEL[c.tipo]}</Text>
        </View>
      </View>
    </View>
  )
}

function Linha({ rotulo, valor, cor, forte }: { rotulo: string; valor: number; cor?: string; forte?: boolean }) {
  return (
    <View style={[st.entre, { paddingVertical: 5 }]}>
      <Text style={[st.sub, forte && { color: cores.texto1, fontWeight: '700' }]}>{rotulo}</Text>
      <Text style={[st.forte, s.num, cor ? { color: cor } : null]}>{formatCurrency(valor)}</Text>
    </View>
  )
}

const st = StyleSheet.create({
  entre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icone: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nome: { fontSize: 16, fontWeight: '700', color: cores.texto1 },
  rotulo: { fontSize: 12, color: cores.texto3 },
  grande: { fontSize: 24, fontWeight: '800', color: cores.texto1, marginBottom: 6 },
  sub: { fontSize: 12, color: cores.texto3, marginTop: 2 },
  forte: { fontSize: 14, fontWeight: '700', color: cores.texto1 },
  barra: { height: 7, borderRadius: 4, backgroundColor: cores.sutil },
  barraUso: { height: 7, borderRadius: 4 },
})
