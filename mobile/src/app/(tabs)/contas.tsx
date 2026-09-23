import { useMemo, useState } from 'react'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { daysUntil, formatCurrency } from '@/lib/format'
import { sum } from '@/lib/finance'
import { LinhaConta, PagarConta, type ContaPagavel } from '~/components/financeiro'
import { Cartao, Carregando, Tela, Vazio, s } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { cores } from '~/theme'

export default function Contas() {
  const d = useDados()
  const [pagar, setPagar] = useState<ContaPagavel | null>(null)
  const [atualizando, setAtualizando] = useState(false)

  const todas = useMemo(
    () =>
      [...d.contas, ...d.contasVirtuais].sort((a, b) => {
        if (a.status === 'pago' && b.status !== 'pago') return 1
        if (a.status !== 'pago' && b.status === 'pago') return -1
        return a.vencimento < b.vencimento ? -1 : 1
      }),
    [d.contas, d.contasVirtuais],
  )
  const atrasadas = todas.filter((c) => c.status === 'atrasado')
  const semana = todas.filter((c) => c.status === 'pendente' && daysUntil(c.vencimento) <= 7)

  async function atualizar() {
    setAtualizando(true)
    await d.recarregar()
    setAtualizando(false)
  }

  return (
    <Tela
      titulo="Contas a pagar"
      subtitulo="Toque numa conta para pagar"
      aoAtualizar={<RefreshControl refreshing={atualizando} onRefresh={atualizar} />}
    >
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Resumo rotulo="Atrasadas" valor={sum(atrasadas)} cor={cores.perigo} />
        <Resumo rotulo="Vencem em 7 dias" valor={sum(semana)} cor={cores.aviso} />
      </View>
      {d.carregando ? (
        <Carregando />
      ) : (
        <Cartao style={{ paddingVertical: 4 }}>
          {todas.length === 0 ? (
            <Vazio titulo="Nenhuma conta" descricao="Cadastre contas pelo site; faturas e recorrências aparecem aqui sozinhas." />
          ) : (
            todas.map((c) => <LinhaConta key={c.id} conta={c} aoTocar={c.status === 'pago' ? undefined : () => setPagar(c)} />)
          )}
        </Cartao>
      )}
      <PagarConta conta={pagar} aoFechar={() => setPagar(null)} />
    </Tela>
  )
}

function Resumo({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <Cartao style={{ flex: 1, padding: 14 }}>
      <Text style={st.rotulo}>{rotulo}</Text>
      <Text style={[st.valor, s.num, { color: cor }]}>{formatCurrency(valor)}</Text>
    </Cartao>
  )
}

const st = StyleSheet.create({
  rotulo: { fontSize: 12, fontWeight: '600', color: cores.texto2 },
  valor: { fontSize: 18, fontWeight: '800', marginTop: 4 },
})
