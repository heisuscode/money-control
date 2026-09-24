import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  cicloAberto,
  iso,
  numeroParcela,
  proximaAposA,
  proximaOcorrencia,
  resumoCartao,
  valorDaParcela,
  type Ciclo,
} from '@/financeiro/logic'
import { formatDate } from '@/lib/format'
import { LinhaMovimentacao, PagarConta, type ContaPagavel } from '~/components/financeiro'
import { Barra, Botao, BotaoIcone, Cartao, Segmentado, Selo, Tela, Vazio, num } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { usePreferencias } from '~/context/Preferencias'
import { criarEstilos, f, fundoComTextoBranco, useTema } from '~/theme'

type Aba = 'atual' | 'proximas' | 'fechadas'

interface Previsto {
  chave: string
  descricao: string
  valor: number
  parcela?: string
}

export default function CartaoDetalhe() {
  const { cores } = useTema()
  const st = useSt()
  const { id } = useLocalSearchParams<{ id: string }>()
  const d = useDados()
  const { dinheiro } = usePreferencias()
  const [aba, setAba] = useState<Aba>('atual')
  const [pagar, setPagar] = useState<ContaPagavel | null>(null)
  const cartao = d.carteiras.find((c) => c.id === id && c.tipo === 'cartao_credito')

  const resumo = useMemo(
    () => (cartao ? resumoCartao(cartao, d.despesas, d.pagamentosFatura, d.recorrencias) : null),
    [cartao, d.despesas, d.pagamentosFatura, d.recorrencias],
  )

  // Próximas faturas: parcelas e recorrências deste cartão que ainda vão cair.
  const proximas = useMemo(() => {
    if (!cartao || !resumo) return []
    const ciclos: Ciclo[] = []
    let ref = resumo.aberta.ciclo.fim
    for (let i = 0; i < 6; i++) {
      const prox = new Date(ref)
      prox.setDate(prox.getDate() + 1)
      const c = cicloAberto(cartao, prox)
      ciclos.push(c)
      ref = c.fim
    }
    const ultimo = ciclos[ciclos.length - 1].fim
    const porCiclo = ciclos.map((ciclo) => ({ ciclo, itens: [] as Previsto[] }))
    for (const rec of d.recorrencias) {
      if (!rec.ativo || rec.carteira_id !== cartao.id || rec.tipo !== 'despesa') continue
      let data = proximaOcorrencia(rec)
      for (let guarda = 0; data <= ultimo && guarda < 60; guarda++) {
        const k = rec.parcelas_total ? numeroParcela(rec, data) : 0
        if (rec.parcelas_total && k > rec.parcelas_total) break
        const alvo = porCiclo.find((p) => data >= p.ciclo.inicio && data <= p.ciclo.fim)
        if (alvo) {
          alvo.itens.push({
            chave: `${rec.id}_${iso(data)}`,
            descricao: rec.descricao,
            valor: rec.parcelas_total ? valorDaParcela(rec, k) : Number(rec.valor),
            parcela: rec.parcelas_total ? `${k}/${rec.parcelas_total}` : undefined,
          })
        }
        data = proximaAposA(rec, data)
      }
    }
    return porCiclo.filter((p) => p.itens.length > 0)
  }, [cartao, resumo, d.recorrencias])

  if (!cartao || !resumo) {
    return (
      <Tela titulo="Cartão" voltar>
        <Vazio icone="card-outline" titulo="Cartão não encontrado" descricao="Ele pode ter sido removido em outro aparelho." />
      </Tela>
    )
  }

  const limite = Number(cartao.limite ?? 0)
  const pctFatura = limite > 0 ? (resumo.emAberto / limite) * 100 : 0
  const pctFuturo = limite > 0 ? (resumo.parcelasFuturas / limite) * 100 : 0
  const cicloAtual = resumo.aberta.ciclo
  const comprasDoCiclo = (c: Ciclo) =>
    d.despesas
      .filter((m) => m.carteira_id === cartao.id && m.data >= iso(c.inicio) && m.data <= iso(c.fim))
      .sort((a, b) => (a.data < b.data ? 1 : -1))
  const compras = comprasDoCiclo(cicloAtual)
  const recorrencia = (rid?: string | null) => (rid ? d.recorrencias.find((r) => r.id === rid) : undefined)

  function pagarFechada(fimCiclo: Date) {
    const conta = d.contasVirtuais.find((c) => c.cartaoId === cartao!.id && c.fimCiclo === iso(fimCiclo))
    if (conta) setPagar(conta)
  }

  const fechadaPendente = resumo.fechadas.find((x) => !x.paga)

  return (
    <Tela
      titulo={cartao.nome}
      voltar
      acao={
        <BotaoIcone
          icone="create-outline"
          rotulo="Editar cartão"
          aoTocar={() => router.push({ pathname: '/nova-carteira', params: { id: cartao.id } })}
        />
      }
      rodape={
        fechadaPendente ? (
          <Botao onPress={() => pagarFechada(fechadaPendente.ciclo.fim)}>
            {`Pagar fatura de ${formatDate(fechadaPendente.ciclo.vencimento, 'dd/MM')} · ${dinheiro(fechadaPendente.total)}`}
          </Botao>
        ) : (
          <Botao desabilitado variante="fantasma">
            {`Pagar após o fechamento (${formatDate(cicloAtual.fim, 'dd/MM')})`}
          </Botao>
        )
      }
    >
      <View style={[st.hero, { backgroundColor: fundoComTextoBranco(cartao.cor) }]}>
        <Text style={st.heroRotulo}>Fatura atual</Text>
        <Text style={[st.heroValor, num]}>{dinheiro(resumo.aberta.total)}</Text>
        <View style={st.heroDatas}>
          <View>
            <Text style={st.heroRotulo}>Fecha</Text>
            <Text style={st.heroData}>{formatDate(cicloAtual.fim, "dd 'de' MMM")}</Text>
          </View>
          <View>
            <Text style={st.heroRotulo}>Vence</Text>
            <Text style={st.heroData}>{formatDate(cicloAtual.vencimento, "dd 'de' MMM")}</Text>
          </View>
        </View>
      </View>

      <Cartao style={{ gap: 10 }}>
        <View style={st.entre}>
          <Text style={st.forte}>Limite</Text>
          <Text style={[st.forte, num]}>{dinheiro(limite)}</Text>
        </View>
        <Barra pct={pctFatura} extra={pctFuturo} cor={cores.marcaTexto} corExtra={cores.parcelasFuturas} altura={10} />
        <Legenda cor={cores.marcaTexto} rotulo="Faturas em aberto" valor={dinheiro(resumo.emAberto)} />
        {resumo.parcelasFuturas > 0 ? (
          <Legenda cor={cores.parcelasFuturas} rotulo="Parcelas futuras" valor={dinheiro(resumo.parcelasFuturas)} />
        ) : null}
        <Legenda cor={cores.sutil} rotulo="Disponível" valor={dinheiro(resumo.disponivel)} forte />
      </Cartao>

      <Segmentado
        valor={aba}
        aoMudar={setAba}
        opcoes={[
          { valor: 'atual', rotulo: 'Atual' },
          { valor: 'proximas', rotulo: 'Próximas' },
          { valor: 'fechadas', rotulo: 'Fechadas' },
        ]}
      />

      {aba === 'atual' ? (
        <Cartao style={{ paddingVertical: 2 }}>
          {compras.length === 0 ? (
            <Vazio
              titulo="Nenhuma compra nesta fatura"
              descricao={`Compras de ${formatDate(cicloAtual.inicio, 'dd/MM')} a ${formatDate(cicloAtual.fim, 'dd/MM')} entram aqui.`}
            />
          ) : (
            compras.map((m, i) => (
              <LinhaMovimentacao
                key={m.id}
                mov={m}
                primeira={i === 0}
                recorrencia={recorrencia(m.recorrencia_id)}
                nomeCarteira={formatDate(m.data, 'dd/MM')}
                aoTocar={() => router.push({ pathname: '/transacao/[id]', params: { id: m.id, tipo: 'despesa' } })}
              />
            ))
          )}
        </Cartao>
      ) : aba === 'proximas' ? (
        proximas.length === 0 ? (
          <Cartao>
            <Vazio titulo="Nada previsto" descricao="Parcelas e assinaturas deste cartão aparecem aqui antes de cair na fatura." />
          </Cartao>
        ) : (
          proximas.map(({ ciclo, itens }) => (
            <Cartao key={iso(ciclo.fim)} style={{ gap: 4 }}>
              <View style={st.entre}>
                <Text style={st.forte}>Vence {formatDate(ciclo.vencimento, "dd 'de' MMM")}</Text>
                <Text style={[st.forte, num]}>{dinheiro(itens.reduce((a, x) => a + x.valor, 0))}</Text>
              </View>
              {itens.map((x) => (
                <View key={x.chave} style={[st.entre, { paddingVertical: 6 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Text style={st.sub} numberOfLines={1}>{x.descricao.replace(/\s*\(\d+\/\d+\)$/, '')}</Text>
                    {x.parcela ? <Selo texto={x.parcela} /> : null}
                  </View>
                  <Text style={[st.sub, num]}>{dinheiro(x.valor)}</Text>
                </View>
              ))}
            </Cartao>
          ))
        )
      ) : resumo.fechadas.length === 0 ? (
        <Cartao>
          <Vazio titulo="Nenhuma fatura fechada" descricao="Depois do fechamento, a fatura aparece aqui para pagar." />
        </Cartao>
      ) : (
        <Cartao style={{ paddingVertical: 2 }}>
          {resumo.fechadas.map((x, i) => (
            <Pressable
              key={x.chave}
              disabled={x.paga}
              onPress={() => pagarFechada(x.ciclo.fim)}
              style={({ pressed }) => [st.fechada, i > 0 && st.divisor, pressed && { opacity: 0.6 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={st.forte}>Fatura de {formatDate(x.ciclo.fim, 'MMMM')}</Text>
                <Text style={st.sub}>Venceu/vence {formatDate(x.ciclo.vencimento, 'dd/MM/yyyy')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={[st.forte, num]}>{dinheiro(x.total)}</Text>
                {x.paga ? (
                  <Selo texto="Paga" cor={cores.sucesso} fundo={cores.sucessoFundo} />
                ) : (
                  <Selo texto="Pagar" cor={cores.marcaTexto} fundo={cores.ativoFundo} />
                )}
              </View>
            </Pressable>
          ))}
        </Cartao>
      )}
      <PagarConta conta={pagar} aoFechar={() => setPagar(null)} />
    </Tela>
  )
}

function Legenda({ cor, rotulo, valor, forte }: { cor: string; rotulo: string; valor: string; forte?: boolean }) {
  const { cores } = useTema()
  const st = useSt()
  return (
    <View style={st.entre}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: cor, borderWidth: cor === cores.sutil ? 1 : 0, borderColor: cores.borda }} />
        <Text style={st.sub}>{rotulo}</Text>
      </View>
      <Text style={[forte ? st.forte : st.sub, num]}>{valor}</Text>
    </View>
  )
}

const useSt = criarEstilos((cores) => ({
  entre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  hero: { borderRadius: 22, padding: 20 },
  heroRotulo: { color: 'rgba(255,255,255,0.85)', fontSize: 12, ...f[500] },
  heroValor: { color: '#FFFFFF', fontSize: 34, ...f[800], letterSpacing: -1, marginTop: 2 },
  heroDatas: { flexDirection: 'row', gap: 32, marginTop: 14 },
  heroData: { color: '#FFFFFF', fontSize: 15, ...f[700], marginTop: 2 },
  forte: { fontSize: 14, ...f[700], color: cores.texto1, textTransform: 'none' },
  sub: { fontSize: 13, ...f[400], color: cores.texto2, flexShrink: 1 },
  fechada: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 60 },
  divisor: { borderTopWidth: 1, borderTopColor: cores.sutil },
}))
