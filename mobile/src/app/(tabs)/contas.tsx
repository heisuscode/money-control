import { useMemo, useState } from 'react'
import { RefreshControl, Text, View } from 'react-native'
import { sum } from '@/lib/finance'
import { daysUntil, formatDate } from '@/lib/format'
import { isVirtual, LinhaConta, PagarConta, type ContaPagavel } from '~/components/financeiro'
import { Cartao, Carregando, Icone, Segmentado, Tela, Vazio, num } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { usePreferencias } from '~/context/Preferencias'
import { criarEstilos, f, useTema } from '~/theme'

type Filtro = 'pendentes' | 'faturas' | 'pagas'

export default function Contas() {
  const { cores } = useTema()
  const st = useSt()
  const d = useDados()
  const { dinheiro } = usePreferencias()
  const [filtro, setFiltro] = useState<Filtro>('pendentes')
  const [pagar, setPagar] = useState<ContaPagavel | null>(null)
  const [atualizando, setAtualizando] = useState(false)

  const todas = useMemo(() => [...d.contas, ...d.contasVirtuais], [d.contas, d.contasVirtuais])
  const pendentes = todas.filter((c) => c.status !== 'pago')
  const atrasadas = pendentes.filter((c) => c.status === 'atrasado')
  const semana = pendentes.filter((c) => c.status === 'pendente' && daysUntil(c.vencimento) <= 7)

  const grupos = useMemo(() => {
    const lista = todas
      .filter((c) =>
        filtro === 'pagas'
          ? c.status === 'pago'
          : filtro === 'faturas'
            ? isVirtual(c) && c.origem === 'fatura' && c.status !== 'pago'
            : c.status !== 'pago',
      )
      .sort((a, b) => (filtro === 'pagas' ? (a.vencimento < b.vencimento ? 1 : -1) : a.vencimento < b.vencimento ? -1 : 1))
    const porMes = new Map<string, ContaPagavel[]>()
    for (const c of lista) {
      const chave = c.status === 'atrasado' ? 'Atrasadas' : formatDate(c.vencimento, 'MMMM yyyy')
      porMes.set(chave, [...(porMes.get(chave) ?? []), c])
    }
    return [...porMes.entries()]
  }, [todas, filtro])

  function tocar(c: ContaPagavel) {
    if (c.status !== 'pago') setPagar(c)
  }

  async function atualizar() {
    setAtualizando(true)
    await d.recarregar()
    setAtualizando(false)
  }

  return (
    <Tela
      titulo="Contas a pagar"
      espacoAbas
      aoAtualizar={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[cores.marca]} />}
    >
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Resumo icone="alert-circle-outline" rotulo="Atrasadas" qtd={atrasadas.length} valor={dinheiro(sum(atrasadas))} cor={cores.perigo} fundo={cores.perigoFundo} />
        <Resumo icone="time-outline" rotulo="Próximos 7 dias" qtd={semana.length} valor={dinheiro(sum(semana))} cor={cores.aviso} fundo={cores.avisoFundo} />
      </View>

      <Segmentado
        valor={filtro}
        aoMudar={setFiltro}
        opcoes={[
          { valor: 'pendentes', rotulo: 'Pendentes' },
          { valor: 'faturas', rotulo: 'Faturas' },
          { valor: 'pagas', rotulo: 'Pagas' },
        ]}
      />

      {d.carregando ? (
        <Carregando />
      ) : grupos.length === 0 ? (
        <Cartao>
          <Vazio
            icone={filtro === 'pagas' ? 'checkmark-done-outline' : 'sparkles-outline'}
            titulo={filtro === 'pagas' ? 'Nenhuma conta paga ainda' : 'Tudo em dia'}
            descricao="Faturas de cartão e contas recorrentes aparecem aqui sozinhas."
          />
        </Cartao>
      ) : (
        grupos.map(([mes, itens]) => (
          <View key={mes} style={{ gap: 6 }}>
            <Text style={[st.mes, mes === 'Atrasadas' && { color: cores.perigo }]}>{mes}</Text>
            <Cartao style={{ paddingVertical: 2 }}>
              {itens.map((c, i) => (
                <LinhaConta key={c.id} conta={c} primeira={i === 0} botaoPagar aoTocar={c.status === 'pago' ? undefined : () => tocar(c)} />
              ))}
            </Cartao>
          </View>
        ))
      )}
      <PagarConta conta={pagar} aoFechar={() => setPagar(null)} />
    </Tela>
  )
}

function Resumo({
  icone,
  rotulo,
  qtd,
  valor,
  cor,
  fundo,
}: {
  icone: 'alert-circle-outline' | 'time-outline'
  rotulo: string
  qtd: number
  valor: string
  cor: string
  fundo: string
}) {
  const { cores } = useTema()
  const st = useSt()
  return (
    <Cartao style={{ flex: 1, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[st.resumoIcone, { backgroundColor: fundo }]}>
          <Icone nome={icone} tamanho={17} cor={cor} />
        </View>
        <Text style={st.rotulo}>{rotulo}</Text>
      </View>
      <Text style={[st.valor, num, { color: qtd ? cor : cores.texto1 }]} numberOfLines={1} adjustsFontSizeToFit>{valor}</Text>
      <Text style={st.qtd}>{qtd === 0 ? 'nenhuma' : qtd === 1 ? '1 conta' : `${qtd} contas`}</Text>
    </Cartao>
  )
}

const useSt = criarEstilos((cores) => ({
  mes: { fontSize: 12, ...f[700], color: cores.texto3, marginLeft: 4, textTransform: 'capitalize' },
  resumoIcone: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rotulo: { fontSize: 12, ...f[600], color: cores.texto2, flexShrink: 1 },
  valor: { fontSize: 18, ...f[800] },
  qtd: { fontSize: 12, ...f[400], color: cores.texto3, marginTop: -4 },
}))
