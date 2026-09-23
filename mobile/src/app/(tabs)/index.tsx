import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { inMonth, sum } from '@/lib/finance'
import { formatCurrency, formatDateLong } from '@/lib/format'
import { resumoCartao } from '@/financeiro/logic'
import { BotaoNovo, LinhaConta, PagarConta, type ContaPagavel } from '~/components/financeiro'
import { Cartao, Carregando, TituloSecao, Tela, Vazio, s } from '~/components/ui'
import { useAuth } from '~/context/AuthProvider'
import { useDados } from '~/context/DadosProvider'
import { cores } from '~/theme'

export default function Inicio() {
  const { sessao } = useAuth()
  const d = useDados()
  const [pagar, setPagar] = useState<ContaPagavel | null>(null)
  const [atualizando, setAtualizando] = useState(false)
  const agora = new Date()

  const resumo = useMemo(() => {
    const y = agora.getFullYear()
    const m = agora.getMonth()
    const rec = sum(d.receitas.filter((r) => inMonth(r.data, y, m)))
    const des = sum(d.despesas.filter((r) => inMonth(r.data, y, m)))
    return { saldo: sum(d.receitas) - sum(d.despesas), rec, des }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.receitas, d.despesas])

  const proximas = useMemo(
    () =>
      [...d.contas, ...d.contasVirtuais]
        .filter((c) => c.status !== 'pago')
        .sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1))
        .slice(0, 4),
    [d.contas, d.contasVirtuais],
  )

  const cartoes = d.carteiras.filter((c) => c.tipo === 'cartao_credito')
  const nome = (sessao?.user.user_metadata?.nome as string | undefined)?.split(' ')[0] ?? sessao?.user.email?.split('@')[0]

  async function atualizar() {
    setAtualizando(true)
    await d.recarregar()
    setAtualizando(false)
  }

  return (
    <Tela
      titulo={nome ? `Olá, ${nome}` : 'Olá!'}
      subtitulo={formatDateLong(agora)}
      aoAtualizar={<RefreshControl refreshing={atualizando} onRefresh={atualizar} />}
      flutuante={<BotaoNovo />}
    >
      {d.carregando ? (
        <Carregando />
      ) : d.erro ? (
        <Cartao><Vazio titulo="Ops" descricao={d.erro} /></Cartao>
      ) : (
        <>
          <View style={st.saldo}>
            <Text style={st.saldoRotulo}>Saldo total</Text>
            <Text style={[st.saldoValor, s.num]}>{formatCurrency(resumo.saldo)}</Text>
            <View style={st.linhaMes}>
              <Mini rotulo="Receitas do mês" valor={resumo.rec} cor="#4ADE80" />
              <Mini rotulo="Despesas do mês" valor={resumo.des} cor="#F87171" />
              <Mini rotulo="Economia" valor={resumo.rec - resumo.des} cor="#7FA8FF" />
            </View>
          </View>

          <Cartao>
            <TituloSecao acao={<Pressable onPress={() => router.navigate('/contas')}><Text style={st.link}>Ver todas</Text></Pressable>}>
              Próximas contas
            </TituloSecao>
            {proximas.length === 0 ? (
              <Vazio titulo="Nenhuma conta pendente 🎉" />
            ) : (
              proximas.map((c) => <LinhaConta key={c.id} conta={c} aoTocar={() => setPagar(c)} />)
            )}
          </Cartao>

          {cartoes.length > 0 && (
            <Cartao>
              <TituloSecao>Cartões</TituloSecao>
              {cartoes.map((c) => {
                const r = resumoCartao(c, d.despesas, d.pagamentosFatura, d.recorrencias)
                const limite = Number(c.limite ?? 0)
                const uso = limite > 0 ? Math.min(100, ((r.emAberto + r.parcelasFuturas) / limite) * 100) : 0
                return (
                  <View key={c.id} style={{ paddingVertical: 8, gap: 6 }}>
                    <View style={st.entre}>
                      <Text style={st.cartaoNome}>{c.icone} {c.nome}</Text>
                      <Text style={[st.cartaoFatura, s.num]}>{formatCurrency(r.aberta.total)}</Text>
                    </View>
                    <View style={st.barra}>
                      <View style={[st.barraUso, { width: `${uso}%`, backgroundColor: uso > 90 ? cores.perigo : c.cor }]} />
                    </View>
                    <Text style={st.cartaoSub}>Disponível {formatCurrency(r.disponivel)} de {formatCurrency(limite)}</Text>
                  </View>
                )
              })}
            </Cartao>
          )}
        </>
      )}
      <PagarConta conta={pagar} aoFechar={() => setPagar(null)} />
    </Tela>
  )
}

function Mini({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[st.miniRotulo, { color: cor }]}>{rotulo}</Text>
      <Text style={[st.miniValor, s.num]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(valor)}</Text>
    </View>
  )
}

const st = StyleSheet.create({
  saldo: { backgroundColor: cores.tinta, borderRadius: 18, padding: 20, gap: 4 },
  saldoRotulo: { color: '#93A1B7', fontSize: 13 },
  saldoValor: { color: '#fff', fontSize: 32, fontWeight: '700' },
  linhaMes: { flexDirection: 'row', gap: 10, marginTop: 14 },
  miniRotulo: { fontSize: 11, fontWeight: '600' },
  miniValor: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 2 },
  link: { color: cores.marca, fontWeight: '700', fontSize: 13 },
  entre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartaoNome: { fontSize: 15, fontWeight: '700', color: cores.texto1 },
  cartaoFatura: { fontSize: 15, fontWeight: '700', color: cores.texto1 },
  cartaoSub: { fontSize: 12, color: cores.texto3 },
  barra: { height: 7, borderRadius: 4, backgroundColor: cores.sutil },
  barraUso: { height: 7, borderRadius: 4 },
})
