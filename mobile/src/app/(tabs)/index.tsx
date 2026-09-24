import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { resumoCartao } from '@/financeiro/logic'
import { inMonth, sum } from '@/lib/finance'
import { formatDate } from '@/lib/format'
import { LinhaConta, MiniCartao, PagarConta, type ContaPagavel } from '~/components/financeiro'
import { BotaoIcone, Barra, Cartao, Carregando, Icone, TituloSecao, Vazio, num, type NomeIcone } from '~/components/ui'
import { useAuth } from '~/context/AuthProvider'
import { useDados } from '~/context/DadosProvider'
import { usePreferencias } from '~/context/Preferencias'
import { lembretesDisponiveis } from '~/lib/lembretes'
import { iniciais } from '~/lib/texto'
import { cores, f } from '~/theme'

export default function Inicio() {
  const { nome } = useAuth()
  const d = useDados()
  const p = usePreferencias()
  const [pagar, setPagar] = useState<ContaPagavel | null>(null)
  const [atualizando, setAtualizando] = useState(false)
  const agora = new Date()

  // Primeira vez no app (fora do Expo Go): apresenta os lembretes antes do pedido do Android.
  useEffect(() => {
    if (lembretesDisponiveis && !p.lembretesApresentados) router.push('/ativar-lembretes')
  }, [p.lembretesApresentados])

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
        .slice(0, 3),
    [d.contas, d.contasVirtuais],
  )

  const cartoes = d.carteiras.filter((c) => c.tipo === 'cartao_credito')
  const naoLidas = d.notificacoes.filter((n) => !n.lida).length
  const primeiroNome = nome.split(' ')[0]

  // Mesma regra do site: receitas − despesas (compras no cartão já contam na data).
  const saldo = resumo.saldo

  async function atualizar() {
    setAtualizando(true)
    await d.recarregar()
    setAtualizando(false)
  }

  const irFaturas = () =>
    cartoes.length === 1
      ? router.push({ pathname: '/cartao/[id]', params: { id: cartoes[0].id } })
      : router.navigate('/carteiras')

  return (
    <SafeAreaView style={st.tela} edges={['top']}>
      <View style={st.topo}>
        <Pressable
          onPress={() => router.push('/mais')}
          accessibilityRole="button"
          accessibilityLabel="Perfil e mais opções"
          style={st.avatar}
        >
          <Text style={st.avatarTexto}>{iniciais(nome)}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={st.ola} numberOfLines={1}>{primeiroNome ? `Olá, ${primeiroNome}` : 'Olá!'}</Text>
          <Text style={st.data}>{formatDate(agora, "EEEE, d 'de' MMMM")}</Text>
        </View>
        <BotaoIcone
          icone="notifications-outline"
          rotulo={naoLidas ? `Notificações, ${naoLidas} novas` : 'Notificações'}
          contorno
          aoTocar={() => router.push('/notificacoes')}
        >
          {naoLidas ? <View style={st.ponto} /> : null}
        </BotaoIcone>
      </View>

      <ScrollView
        contentContainerStyle={st.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[cores.marca]} />}
      >
        {d.carregando ? (
          <Carregando />
        ) : d.erro ? (
          <Cartao>
            <Vazio icone="cloud-offline-outline" titulo="Sem conexão" descricao={d.erro} />
          </Cartao>
        ) : (
          <>
            <View style={st.saldo}>
              <View style={st.entre}>
                <Text style={st.saldoRotulo}>Saldo total</Text>
                <Pressable
                  onPress={() => p.mudar({ ocultarValores: !p.ocultarValores })}
                  accessibilityRole="button"
                  accessibilityLabel={p.ocultarValores ? 'Mostrar valores' : 'Ocultar valores'}
                  style={st.olho}
                  hitSlop={6}
                >
                  <Icone nome={p.ocultarValores ? 'eye-off-outline' : 'eye-outline'} tamanho={20} cor="#FFFFFF" />
                </Pressable>
              </View>
              <Text style={[st.saldoValor, num]} numberOfLines={1} adjustsFontSizeToFit>{p.dinheiro(saldo)}</Text>
              <View style={st.linhaMes}>
                <Mini rotulo="Receitas" valor={p.dinheiro(resumo.rec)} cor="#86EFAC" />
                <Mini rotulo="Despesas" valor={p.dinheiro(resumo.des)} cor="#FCA5A5" />
                <Mini rotulo="Economia" valor={p.dinheiro(resumo.rec - resumo.des)} cor="#9DB8FF" />
              </View>
            </View>

            <View style={st.atalhos}>
              <Atalho icone="arrow-up" rotulo="Despesa" cor={cores.perigo} fundo={cores.perigoFundo}
                aoTocar={() => router.push({ pathname: '/nova-transacao', params: { tipo: 'despesa' } })} />
              <Atalho icone="arrow-down" rotulo="Receita" cor={cores.sucesso} fundo={cores.sucessoFundo}
                aoTocar={() => router.push({ pathname: '/nova-transacao', params: { tipo: 'receita' } })} />
              <Atalho icone="receipt-outline" rotulo="Pagar" cor={cores.aviso} fundo={cores.avisoFundo}
                aoTocar={() => router.navigate('/contas')} />
              <Atalho icone="card-outline" rotulo="Faturas" cor={cores.marca} fundo={cores.ativoFundo} aoTocar={irFaturas} />
            </View>

            <Cartao>
              <TituloSecao acao="Ver todas" aoTocarAcao={() => router.navigate('/contas')}>Próximas contas</TituloSecao>
              {proximas.length === 0 ? (
                <Vazio titulo="Nada para pagar agora" descricao="Contas, faturas e recorrências aparecem aqui." />
              ) : (
                proximas.map((c, i) => <LinhaConta key={c.id} conta={c} primeira={i === 0} aoTocar={() => setPagar(c)} />)
              )}
            </Cartao>

            {cartoes.map((c) => {
              const r = resumoCartao(c, d.despesas, d.pagamentosFatura, d.recorrencias)
              const limite = Number(c.limite ?? 0)
              const uso = limite > 0 ? (r.emAberto / limite) * 100 : 0
              const futuro = limite > 0 ? (r.parcelasFuturas / limite) * 100 : 0
              return (
                <Cartao key={c.id} aoTocar={() => router.push({ pathname: '/cartao/[id]', params: { id: c.id } })}>
                  <View style={st.entre}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <MiniCartao cor={c.cor} />
                      <Text style={st.cartaoNome} numberOfLines={1}>{c.nome}</Text>
                    </View>
                    <Text style={[st.cartaoFatura, num]}>{p.dinheiro(r.aberta.total)}</Text>
                  </View>
                  <View style={{ marginTop: 12 }}>
                    <Barra pct={uso} extra={futuro} cor={uso > 90 ? cores.perigo : c.cor} />
                  </View>
                  <View style={[st.entre, { marginTop: 8 }]}>
                    <Text style={st.cartaoSub}>Fatura atual · fecha {formatDate(r.aberta.ciclo.fim, 'dd/MM')}</Text>
                    <Text style={st.cartaoSub}>
                      Disponível <Text style={[st.forte, num]}>{p.dinheiro(r.disponivel)}</Text>
                    </Text>
                  </View>
                </Cartao>
              )
            })}
          </>
        )}
      </ScrollView>
      <PagarConta conta={pagar} aoFechar={() => setPagar(null)} />
    </SafeAreaView>
  )
}

function Mini({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <View style={st.mini}>
      <Text style={[st.miniRotulo, { color: cor }]}>{rotulo}</Text>
      <Text style={[st.miniValor, num]} numberOfLines={1} adjustsFontSizeToFit>{valor}</Text>
    </View>
  )
}

function Atalho({ icone, rotulo, cor, fundo, aoTocar }: { icone: NomeIcone; rotulo: string; cor: string; fundo: string; aoTocar: () => void }) {
  return (
    <Pressable onPress={aoTocar} accessibilityRole="button" style={({ pressed }) => [st.atalho, pressed && { opacity: 0.6 }]}>
      <View style={[st.atalhoIcone, { backgroundColor: fundo }]}>
        <Icone nome={icone} tamanho={22} cor={cor} />
      </View>
      <Text style={st.atalhoTexto}>{rotulo}</Text>
    </Pressable>
  )
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: cores.marca, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: '#FFFFFF', fontSize: 14, ...f[800] },
  ola: { fontSize: 18, ...f[800], color: cores.texto1, letterSpacing: -0.3 },
  data: { fontSize: 12, ...f[400], color: cores.texto3 },
  ponto: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: cores.perigo },
  conteudo: { paddingHorizontal: 20, gap: 14, paddingBottom: 24 },
  entre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  saldo: { backgroundColor: cores.tinta, borderRadius: 22, padding: 20, gap: 4 },
  saldoRotulo: { color: cores.tintaTexto, fontSize: 13, ...f[500] },
  olho: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  saldoValor: { color: '#FFFFFF', fontSize: 34, ...f[800], letterSpacing: -1 },
  linhaMes: { flexDirection: 'row', gap: 8, marginTop: 12 },
  mini: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 10 },
  miniRotulo: { fontSize: 11, ...f[600] },
  miniValor: { color: '#FFFFFF', fontSize: 14, ...f[700], marginTop: 2 },
  atalhos: { flexDirection: 'row', justifyContent: 'space-between' },
  atalho: { alignItems: 'center', gap: 6, width: 72 },
  atalhoIcone: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  atalhoTexto: { fontSize: 12, ...f[600], color: cores.texto1 },
  cartaoNome: { fontSize: 14, ...f[700], color: cores.texto1, flexShrink: 1 },
  cartaoFatura: { fontSize: 15, ...f[800], color: cores.texto1 },
  cartaoSub: { fontSize: 12, ...f[400], color: cores.texto3 },
  forte: { ...f[700], color: cores.texto1 },
})
