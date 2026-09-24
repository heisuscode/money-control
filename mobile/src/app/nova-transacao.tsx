import { router, useLocalSearchParams } from 'expo-router'
import type { TipoCategoria } from '@/lib/types'
import { FormTransacao } from '~/components/FormTransacao'
import { useDados } from '~/context/DadosProvider'

export default function NovaTransacao() {
  const params = useLocalSearchParams<{ tipo?: TipoCategoria }>()
  const { registrarTransacao } = useDados()

  return (
    <FormTransacao
      titulo="Nova transação"
      tipoInicial={params.tipo === 'receita' ? 'receita' : 'despesa'}
      aoSalvar={async (v) => {
        await registrarTransacao({
          tipo: v.tipo,
          descricao: v.descricao,
          valorBRL: v.valor,
          valorOriginal: v.valor,
          moeda: 'BRL',
          taxa: 1,
          taxaTimestamp: new Date().toISOString(),
          data: v.data,
          categoriaId: v.categoriaId,
          carteiraId: v.carteiraId,
          parcelas: v.parcelas,
          repetir: v.repetir,
        })
        router.back()
      }}
    />
  )
}
