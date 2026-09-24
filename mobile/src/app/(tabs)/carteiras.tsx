import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { resumoCartao } from '@/financeiro/logic'
import { formatDate } from '@/lib/format'
import type { Carteira } from '@/lib/types'
import { saldoCarteira } from '~/components/financeiro'
import { Botao, BotaoIcone, Cartao, Carregando, Icone, Tela, TituloSecao, Vazio, num } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { usePreferencias } from '~/context/Preferencias'
import { cores, f, fundoComTextoBranco } from '~/theme'

export default function Carteiras() {
  const d = useDados()
  const { dinheiro } = usePreferencias()
  const [atualizando, setAtualizando] = useState(false)

  const saldo = (c: Carteira) => saldoCarteira(c, d.receitas, d.despesas, d.pagamentosFatura)
  const contas = d.carteiras.filter((c) => c.tipo !== 'cartao_credito')
  const cartoes = d.carteiras.filter((c) => c.tipo === 'cartao_credito')
  const saldoContas = contas.reduce((a, c) => a + saldo(c), 0)
  const divida = cartoes.reduce((a, c) => {
    const r = resumoCartao(c, d.despesas, d.pagamentosFatura, d.recorrencias)
    return a + r.emAberto + r.parcelasFuturas
  }, 0)
  const patrimonio = saldoContas - divida

  async function atualizar() {
    setAtualizando(true)
    await d.recarregar()
    setAtualizando(false)
  }

  const nova = () => router.push('/nova-carteira')

  return (
    <Tela
      titulo="Carteiras"
      espacoAbas
      acao={<BotaoIcone icone="add" rotulo="Nova carteira" contorno cor={cores.marca} aoTocar={nova} />}
      aoAtualizar={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[cores.marca]} />}
    >
      {d.carregando ? (
        <Carregando />
      ) : d.carteiras.length === 0 ? (
        <Cartao>
          <Vazio
            icone="wallet-outline"
            titulo="Nenhuma carteira ainda"
            descricao="Cadastre contas e cartões para saber de onde sai cada gasto e acompanhar faturas e limites."
            acao={<Botao onPress={nova} icone="add">Nova carteira</Botao>}
          />
        </Cartao>
      ) : (
        <>
          <View style={st.patrimonio}>
            <Text style={st.patrimonioRotulo}>Patrimônio líquido</Text>
            <Text style={[st.patrimonioValor, num, patrimonio < 0 && { color: '#FCA5A5' }]} numberOfLines={1} adjustsFontSizeToFit>
              {dinheiro(patrimonio)}
            </Text>
            <View style={st.patrimonioLinha}>
              <View style={{ flex: 1 }}>
                <Text style={[st.miniRotulo, { color: '#86EFAC' }]}>Em contas</Text>
                <Text style={[st.miniValor, num]}>{dinheiro(saldoContas)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.miniRotulo, { color: '#FCA5A5' }]}>Nos cartões</Text>
                <Text style={[st.miniValor, num]}>− {dinheiro(divida)}</Text>
              </View>
            </View>
          </View>

          {cartoes.length > 0 && (
            <View style={{ gap: 10 }}>
              <TituloSecao>Cartões de crédito</TituloSecao>
              {cartoes.map((c) => {
                const r = resumoCartao(c, d.despesas, d.pagamentosFatura, d.recorrencias)
                const limite = Number(c.limite ?? 0)
                const usado = limite > 0 ? Math.min(100, ((r.emAberto + r.parcelasFuturas) / limite) * 100) : 0
                const fechadaPendente = r.fechadas.find((x) => !x.paga)
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => router.push({ pathname: '/cartao/[id]', params: { id: c.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.nome}, fatura atual ${dinheiro(r.aberta.total)}`}
                    style={({ pressed }) => [st.cartao, { backgroundColor: fundoComTextoBranco(c.cor) }, pressed && { opacity: 0.85 }]}
                  >
                    <View style={st.entre}>
                      <Text style={st.cartaoNome} numberOfLines={1}>{c.nome}</Text>
                      <Icone nome="wifi" tamanho={20} cor="rgba(255,255,255,0.7)" />
                    </View>
                    <View style={st.chip} />
                    <Text style={st.cartaoRotulo}>Fatura atual · fecha {formatDate(r.aberta.ciclo.fim, 'dd/MM')}</Text>
                    <Text style={[st.cartaoValor, num]}>{dinheiro(r.aberta.total)}</Text>
                    <View style={st.cartaoBarra}>
                      <View style={{ width: `${usado}%`, height: 5, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
                    </View>
                    <View style={[st.entre, { marginTop: 6 }]}>
                      <Text style={st.cartaoRotulo}>Disponível {dinheiro(r.disponivel)}</Text>
                      <Text style={st.cartaoRotulo}>Vence dia {c.dia_vencimento}</Text>
                    </View>
                    {fechadaPendente ? (
                      <View style={st.alerta}>
                        <Icone nome="alert-circle" tamanho={15} cor={cores.aviso} />
                        <Text style={st.alertaTexto}>
                          Fatura fechada de {dinheiro(fechadaPendente.total)} · vence {formatDate(fechadaPendente.ciclo.vencimento, 'dd/MM')}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                )
              })}
            </View>
          )}

          {contas.length > 0 && (
            <Cartao style={{ paddingVertical: 4 }}>
              <View style={{ paddingTop: 10 }}>
                <TituloSecao>Contas e dinheiro</TituloSecao>
              </View>
              {contas.map((c, i) => {
                const v = saldo(c)
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => router.push({ pathname: '/nova-carteira', params: { id: c.id } })}
                    style={({ pressed }) => [st.linha, i > 0 && st.divisor, pressed && { opacity: 0.6 }]}
                  >
                    <View style={[st.icone, { backgroundColor: `${c.cor}1F` }]}>
                      <Icone nome={c.tipo === 'dinheiro' ? 'cash-outline' : 'business-outline'} tamanho={20} cor={c.cor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.nome}>{c.nome}</Text>
                      <Text style={st.sub}>{c.tipo === 'dinheiro' ? 'Dinheiro' : 'Conta bancária'}</Text>
                    </View>
                    <Text style={[st.saldo, num, v < 0 && { color: cores.perigo }]}>{dinheiro(v)}</Text>
                  </Pressable>
                )
              })}
            </Cartao>
          )}
        </>
      )}
    </Tela>
  )
}

const st = StyleSheet.create({
  entre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  patrimonio: { backgroundColor: cores.tinta, borderRadius: 22, padding: 20, gap: 4 },
  patrimonioRotulo: { color: cores.tintaTexto, fontSize: 13, ...f[500] },
  patrimonioValor: { color: '#FFFFFF', fontSize: 30, ...f[800], letterSpacing: -0.8 },
  patrimonioLinha: { flexDirection: 'row', gap: 10, marginTop: 10 },
  miniRotulo: { fontSize: 11, ...f[600] },
  miniValor: { color: '#FFFFFF', fontSize: 14, ...f[700], marginTop: 2 },
  cartao: { borderRadius: 20, padding: 18, minHeight: 190 },
  cartaoNome: { color: '#FFFFFF', fontSize: 16, ...f[700], flex: 1 },
  chip: { width: 38, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.35)', marginTop: 14, marginBottom: 14 },
  cartaoRotulo: { color: 'rgba(255,255,255,0.85)', fontSize: 12, ...f[500] },
  cartaoValor: { color: '#FFFFFF', fontSize: 24, ...f[800], letterSpacing: -0.5, marginTop: 2 },
  cartaoBarra: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 10, overflow: 'hidden' },
  alerta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 8, marginTop: 12 },
  alertaTexto: { fontSize: 12, ...f[600], color: cores.aviso, flex: 1 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 60 },
  divisor: { borderTopWidth: 1, borderTopColor: cores.sutil },
  icone: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nome: { fontSize: 14, ...f[600], color: cores.texto1 },
  sub: { fontSize: 12, ...f[400], color: cores.texto3 },
  saldo: { fontSize: 15, ...f[700], color: cores.texto1 },
})
