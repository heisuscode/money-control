import { useMemo, useState } from 'react'
import { Alert, RefreshControl, View } from 'react-native'
import { inMonth, sum } from '@/lib/finance'
import { formatCurrency } from '@/lib/format'
import type { Movimentacao } from '@/lib/types'
import { BotaoNovo, LinhaMovimentacao } from '~/components/financeiro'
import { Cartao, Carregando, Segmentado, Tela, Vazio } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'

type Filtro = 'todas' | 'receitas' | 'despesas'

export default function Transacoes() {
  const d = useDados()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [atualizando, setAtualizando] = useState(false)

  const lista = useMemo(() => {
    const base = filtro === 'receitas' ? d.receitas : filtro === 'despesas' ? d.despesas : [...d.receitas, ...d.despesas]
    return [...base].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
  }, [filtro, d.receitas, d.despesas])

  const agora = new Date()
  const saldoMes =
    sum(d.receitas.filter((r) => inMonth(r.data, agora.getFullYear(), agora.getMonth()))) -
    sum(d.despesas.filter((r) => inMonth(r.data, agora.getFullYear(), agora.getMonth())))

  function confirmarExclusao(m: Movimentacao) {
    Alert.alert('Excluir transação', `Excluir "${m.descricao}" (${formatCurrency(Number(m.valor))})?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => d.excluirTransacao(m).catch(() => Alert.alert('Não foi possível excluir.')),
      },
    ])
  }

  async function atualizar() {
    setAtualizando(true)
    await d.recarregar()
    setAtualizando(false)
  }

  return (
    <Tela
      titulo="Transações"
      subtitulo={`Saldo do mês ${formatCurrency(saldoMes)} · segure um item para excluir`}
      aoAtualizar={<RefreshControl refreshing={atualizando} onRefresh={atualizar} />}
      flutuante={<BotaoNovo tipo={filtro === 'receitas' ? 'receita' : 'despesa'} />}
    >
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
      ) : (
        <Cartao style={{ paddingVertical: 4 }}>
          {lista.length === 0 ? (
            <Vazio titulo="Nenhuma transação" descricao="Toque no + para registrar a primeira." />
          ) : (
            <View>
              {lista.map((m) => (
                <LinhaMovimentacao
                  key={m.id}
                  mov={m}
                  nomeCarteira={d.carteiras.find((c) => c.id === m.carteira_id)?.nome}
                  aoSegurar={() => confirmarExclusao(m)}
                />
              ))}
            </View>
          )}
        </Cartao>
      )}
    </Tela>
  )
}
