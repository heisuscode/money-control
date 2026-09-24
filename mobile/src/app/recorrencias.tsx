import { useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { parcelasLancadas, proximaOcorrencia, recorrenciaConcluida } from '@/financeiro/logic'
import { formatCurrency, formatDate, formatNumber, maskMoneyInput, parseMoney } from '@/lib/format'
import type { Recorrencia } from '@/lib/types'
import type { RecorrenciaInput } from '@/financeiro/api'
import { iconeCategoria } from '~/components/financeiro'
import { Botao, Campo, Cartao, Chave, Chips, Entrada, FolhaInferior, Icone, Selo, Tela, Vazio, num } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { usePreferencias } from '~/context/Preferencias'
import { criarEstilos, f, useTema } from '~/theme'

const FREQ = { mensal: 'Todo mês', semanal: 'Toda semana', anual: 'Todo ano' } as const

/** Quanto a recorrência pesa num mês (semanal ≈ 52/12 vezes; anual ÷ 12). */
function porMes(r: Recorrencia) {
  const v = Number(r.valor)
  return r.frequencia === 'semanal' ? (v * 52) / 12 : r.frequencia === 'anual' ? v / 12 : v
}

function paraInput(r: Recorrencia): RecorrenciaInput {
  const { id: _id, usuario_id: _u, criado_em: _c, ...resto } = r
  return resto
}

export default function Recorrencias() {
  const { cores } = useTema()
  const st = useSt()
  const d = useDados()
  const { dinheiro } = usePreferencias()
  const [editando, setEditando] = useState<Recorrencia | null>(null)

  const vigentes = d.recorrencias.filter((r) => !recorrenciaConcluida(r))
  const ativas = vigentes.filter((r) => r.ativo)
  const entra = ativas.filter((r) => r.tipo === 'receita').reduce((a, r) => a + porMes(r), 0)
  const sai = ativas.filter((r) => r.tipo === 'despesa').reduce((a, r) => a + porMes(r), 0)
  const ordenadas = [...vigentes].sort((a, b) => Number(b.ativo) - Number(a.ativo) || proximaOcorrencia(a).getTime() - proximaOcorrencia(b).getTime())

  async function alternar(r: Recorrencia, ativo: boolean) {
    try {
      await d.salvarRecorrencia({ ...paraInput(r), ativo }, r.id)
    } catch {
      Alert.alert('Não foi possível atualizar.')
    }
  }

  return (
    <Tela titulo="Recorrências" voltar>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Cartao style={st.resumo}>
          <Text style={st.resumoRotulo}>Entra por mês</Text>
          <Text style={[st.resumoValor, num, { color: cores.sucesso }]}>{dinheiro(entra)}</Text>
        </Cartao>
        <Cartao style={st.resumo}>
          <Text style={st.resumoRotulo}>Sai por mês</Text>
          <Text style={[st.resumoValor, num, { color: cores.perigo }]}>{dinheiro(sai)}</Text>
        </Cartao>
      </View>
      <Text style={st.dica}>Pausar uma recorrência tira ela dos totais e das próximas contas.</Text>

      {ordenadas.length === 0 ? (
        <Cartao>
          <Vazio
            icone="repeat"
            titulo="Nenhuma recorrência"
            descricao="Ao lançar uma transação, ligue 'Repetir automaticamente' ou parcele no cartão."
          />
        </Cartao>
      ) : (
        <Cartao style={{ paddingVertical: 2 }}>
          {ordenadas.map((r, i) => {
            const cat = d.categorias.find((c) => c.id === r.categoria_id)
            const carteira = d.carteiras.find((c) => c.id === r.carteira_id)
            const receita = r.tipo === 'receita'
            const parcela = r.parcelas_total ? `${parcelasLancadas(r)}/${r.parcelas_total}` : null
            return (
              <View key={r.id} style={[st.linha, i > 0 && st.divisor, !r.ativo && { opacity: 0.55 }]}>
                <Pressable onPress={() => setEditando(r)} style={st.toque} accessibilityHint="Editar recorrência">
                  <View style={[st.icone, { backgroundColor: receita ? cores.sucessoFundo : cores.sutil }]}>
                    <Icone nome={iconeCategoria(cat, r.tipo)} tamanho={19} cor={receita ? cores.sucesso : cores.texto2} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={st.descricao} numberOfLines={1}>{r.descricao}</Text>
                      {parcela ? <Selo texto={parcela} /> : null}
                    </View>
                    <Text style={st.sub} numberOfLines={1}>
                      {[
                        r.parcelas_total ? 'Parcelado' : FREQ[r.frequencia],
                        carteira?.nome,
                        r.ativo ? `próx. ${formatDate(proximaOcorrencia(r), 'dd/MM')}` : 'pausada',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    <Text style={[st.valor, num, receita && { color: cores.sucesso }]}>
                      {receita ? '+ ' : '− '}
                      {dinheiro(Number(r.valor))}
                    </Text>
                  </View>
                </Pressable>
                <Chave valor={r.ativo} aoMudar={(v) => alternar(r, v)} rotulo={`${r.descricao} ativa`} />
              </View>
            )
          })}
        </Cartao>
      )}

      <EditarRecorrencia rec={editando} aoFechar={() => setEditando(null)} />
    </Tela>
  )
}

function EditarRecorrencia({ rec, aoFechar }: { rec: Recorrencia | null; aoFechar: () => void }) {
  const { cores } = useTema()
  const st = useSt()
  const d = useDados()
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [atual, setAtual] = useState<string | null>(null)

  if (rec && atual !== rec.id) {
    setAtual(rec.id)
    setDescricao(rec.descricao)
    setValor(formatNumber(Number(rec.valor)))
    setCategoriaId(rec.categoria_id ?? '')
  }
  if (!rec && atual !== null) setAtual(null)

  if (!rec) return <FolhaInferior visivel={false} aoFechar={aoFechar} titulo=""><View /></FolhaInferior>

  const parcelada = !!rec.parcelas_total
  const cats = d.categorias.filter((c) => c.tipo === rec.tipo)

  async function salvar() {
    if (!rec) return
    const v = parseMoney(valor)
    if (!descricao.trim() || (!parcelada && v <= 0)) return Alert.alert('Preencha descrição e valor.')
    setSalvando(true)
    try {
      await d.salvarRecorrencia(
        { ...paraInput(rec), descricao: descricao.trim(), categoria_id: categoriaId || null, ...(parcelada ? {} : { valor: v }) },
        rec.id,
      )
      setAtual(null)
      aoFechar()
    } catch {
      Alert.alert('Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  function excluir() {
    if (!rec) return
    Alert.alert('Excluir recorrência?', 'Os lançamentos já feitos continuam no histórico; as próximas param.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await d.removerRecorrencia(rec.id)
            setAtual(null)
            aoFechar()
          } catch {
            Alert.alert('Não foi possível excluir.')
          }
        },
      },
    ])
  }

  return (
    <FolhaInferior visivel={!!rec} aoFechar={aoFechar} titulo={parcelada ? 'Compra parcelada' : 'Editar recorrência'}>
      <Campo rotulo="Descrição">
        <Entrada value={descricao} onChangeText={setDescricao} />
      </Campo>
      {parcelada ? (
        <Text style={st.dica}>
          Parcelas de compras não mudam de valor: {rec.parcelas_total}x, total {formatCurrency(Number(rec.valor_total ?? 0))}.
        </Text>
      ) : (
        <Campo rotulo="Valor">
          <Entrada value={valor} onChangeText={(t) => setValor(maskMoneyInput(t))} keyboardType="numeric" />
        </Campo>
      )}
      <Campo rotulo="Categoria">
        <Chips
          valor={categoriaId}
          aoMudar={setCategoriaId}
          opcoes={[{ valor: '', rotulo: 'Sem categoria' }, ...cats.map((c) => ({ valor: c.id, rotulo: c.nome, cor: c.cor }))]}
        />
      </Campo>
      <Botao onPress={salvar} carregando={salvando}>Salvar</Botao>
      <Botao variante="texto" onPress={excluir} style={{ minHeight: 40 }}>
        <Text style={{ color: cores.perigo }}>Excluir recorrência</Text>
      </Botao>
    </FolhaInferior>
  )
}

const useSt = criarEstilos((cores) => ({
  resumo: { flex: 1, padding: 14 },
  resumoRotulo: { fontSize: 12, ...f[600], color: cores.texto2 },
  resumoValor: { fontSize: 18, ...f[800], marginTop: 4 },
  dica: { fontSize: 12, ...f[400], color: cores.texto3, lineHeight: 17 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  toque: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  divisor: { borderTopWidth: 1, borderTopColor: cores.sutil },
  icone: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  descricao: { fontSize: 14, ...f[600], color: cores.texto1, flexShrink: 1 },
  sub: { fontSize: 12, ...f[400], color: cores.texto3 },
  valor: { fontSize: 13, ...f[700], color: cores.texto1 },
}))
