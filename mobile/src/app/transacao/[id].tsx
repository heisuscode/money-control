import { router, useLocalSearchParams } from 'expo-router'
import { Alert } from 'react-native'
import { formatCurrency } from '@/lib/format'
import { FormTransacao } from '~/components/FormTransacao'
import { Tela, Vazio } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'

export default function EditarTransacao() {
  const { id, tipo } = useLocalSearchParams<{ id: string; tipo?: string }>()
  const d = useDados()
  const lista = tipo === 'receita' ? d.receitas : d.despesas
  const mov = lista.find((m) => m.id === id) ?? [...d.receitas, ...d.despesas].find((m) => m.id === id)

  if (!mov) {
    return (
      <Tela titulo="Transação" voltar>
        <Vazio icone="search-outline" titulo="Transação não encontrada" descricao="Ela pode ter sido excluída em outro aparelho." />
      </Tela>
    )
  }

  function excluir() {
    if (!mov) return
    Alert.alert('Excluir transação?', `"${mov.descricao}" (${formatCurrency(Number(mov.valor))}) será apagada.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await d.excluirTransacao(mov)
            router.back()
          } catch {
            Alert.alert('Não foi possível excluir.')
          }
        },
      },
    ])
  }

  return (
    <FormTransacao
      titulo={mov.tipo === 'receita' ? 'Editar receita' : 'Editar despesa'}
      inicial={mov}
      editando
      aoExcluir={excluir}
      aoSalvar={async (v) => {
        await d.editarTransacao(mov, {
          descricao: v.descricao,
          valor: v.valor,
          data: v.data,
          categoriaId: v.categoriaId,
          carteiraId: v.carteiraId,
        })
        router.back()
      }}
    />
  )
}
