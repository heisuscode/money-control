import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { daysUntil, formatCurrency, formatDate } from '@/lib/format'
import type { Conta, ContaVirtual, Movimentacao } from '@/lib/types'
import { useDados } from '~/context/DadosProvider'
import { cores, raio } from '~/theme'
import { Botao, Campo, Chips, ModalCentral, s } from './ui'

export type ContaPagavel = Conta | ContaVirtual

export const isVirtual = (c: ContaPagavel): c is ContaVirtual => 'virtual' in c && c.virtual === true

function textoVencimento(c: ContaPagavel) {
  if (c.status === 'pago') return `Paga em ${c.pago_em ? formatDate(c.pago_em, 'dd MMM') : '—'}`
  const dias = daysUntil(c.vencimento)
  if (dias < 0) return `Atrasada há ${Math.abs(dias)} dia(s)`
  if (dias === 0) return 'Vence hoje'
  return `Vence em ${dias} dia(s)`
}

export function LinhaConta({ conta, aoTocar }: { conta: ContaPagavel; aoTocar?: () => void }) {
  const pago = conta.status === 'pago'
  const cor = pago ? cores.sucesso : conta.status === 'atrasado' ? cores.perigo : cores.aviso
  const recorrente = isVirtual(conta) && conta.origem === 'recorrencia'
  return (
    <Pressable onPress={aoTocar} disabled={!aoTocar} style={({ pressed }) => [st.linha, pressed && { opacity: 0.7 }, pago && { opacity: 0.55 }]}>
      <View style={st.data}>
        <Text style={st.dataMes}>{formatDate(conta.vencimento, 'MMM')}</Text>
        <Text style={st.dataDia}>{formatDate(conta.vencimento, 'dd')}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[st.descricao, pago && { textDecorationLine: 'line-through' }]} numberOfLines={1}>
          {conta.descricao}
          {recorrente ? ' 🔁' : ''}
        </Text>
        <Text style={[st.sub, { color: cor }]}>{textoVencimento(conta)}</Text>
      </View>
      <Text style={[st.valor, s.num]}>{formatCurrency(Number(conta.valor))}</Text>
    </Pressable>
  )
}

export function LinhaMovimentacao({ mov, nomeCarteira, aoSegurar }: { mov: Movimentacao; nomeCarteira?: string; aoSegurar?: () => void }) {
  const receita = mov.tipo === 'receita'
  return (
    <Pressable onLongPress={aoSegurar} style={({ pressed }) => [st.linha, pressed && { opacity: 0.7 }]}>
      <View style={[st.icone, { backgroundColor: receita ? cores.sucessoFundo : cores.sutil }]}>
        <Text style={{ fontSize: 17 }}>{mov.categoria?.icone ?? (receita ? '💰' : '💳')}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.descricao} numberOfLines={1}>
          {mov.descricao}
          {mov.recorrencia_id ? ' 🔁' : ''}
        </Text>
        <Text style={st.sub} numberOfLines={1}>
          {[mov.categoria?.nome ?? 'Sem categoria', nomeCarteira, formatDate(mov.data, 'dd MMM')].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={[st.valor, s.num, receita && { color: cores.sucesso }]}>
        {receita ? '+ ' : '− '}
        {formatCurrency(Number(mov.valor))}
      </Text>
    </Pressable>
  )
}

export function BotaoNovo({ tipo = 'despesa' }: { tipo?: 'despesa' | 'receita' }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/nova-transacao', params: { tipo } })}
      style={({ pressed }) => [st.fab, pressed && { opacity: 0.85 }]}
      accessibilityLabel="Nova transação"
    >
      <Ionicons name="add" size={30} color="#fff" />
    </Pressable>
  )
}

/** Janela central para pagar uma conta, pagar fatura ou ver uma recorrência. */
export function PagarConta({ conta, aoFechar }: { conta: ContaPagavel | null; aoFechar: () => void }) {
  const { carteiras, pagarFatura, marcarContaPaga } = useDados()
  const pagadoras = carteiras.filter((c) => c.tipo !== 'cartao_credito')
  const [pagadora, setPagadora] = useState('')
  const [pagando, setPagando] = useState(false)

  useEffect(() => {
    if (conta) setPagadora(pagadoras[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conta?.id])

  const virtual = conta && isVirtual(conta) ? conta : null
  const recorrencia = virtual?.origem === 'recorrencia'
  const fatura = virtual?.origem === 'fatura'
  const aberta = !!virtual?.faturaAberta

  async function confirmar() {
    if (!conta) return
    setPagando(true)
    try {
      if (virtual) {
        if (!virtual.cartaoId || !virtual.fimCiclo) return
        await pagarFatura(virtual.cartaoId, virtual.fimCiclo, pagadora || null, Number(conta.valor))
      } else {
        await marcarContaPaga(conta.id)
      }
      aoFechar()
    } catch {
      Alert.alert('Não foi possível registrar o pagamento.')
    } finally {
      setPagando(false)
    }
  }

  const titulo = aberta ? 'Fatura em aberto' : recorrencia ? 'Conta recorrente' : fatura ? 'Pagar fatura' : 'Pagar conta'

  return (
    <ModalCentral visivel={!!conta} aoFechar={aoFechar} titulo={titulo}>
      {conta && (
        <>
          <View style={st.resumo}>
            <View style={{ flex: 1 }}>
              <Text style={st.descricao}>{conta.descricao}</Text>
              <Text style={st.sub}>Vence em {formatDate(conta.vencimento, 'dd/MM/yyyy')}</Text>
            </View>
            <Text style={[st.valor, s.num, { fontSize: 17 }]}>{formatCurrency(Number(conta.valor))}</Text>
          </View>

          {aberta ? (
            <>
              <Text style={st.texto}>
                Esta fatura ainda recebe compras e fecha em {formatDate(virtual!.fechaEm!, 'dd/MM')}. O pagamento fica
                disponível depois do fechamento, com o valor final.
              </Text>
              <Botao variante="fantasma" onPress={aoFechar}>Fechar</Botao>
            </>
          ) : recorrencia ? (
            <>
              <Text style={st.texto}>
                Esta despesa é lançada automaticamente na data. Para mudar valor ou pausar, use as Recorrências no site.
              </Text>
              <Botao variante="fantasma" onPress={aoFechar}>Fechar</Botao>
            </>
          ) : (
            <>
              {fatura && (
                <Campo
                  rotulo="Pagar com"
                  dica={pagadoras.length ? 'As compras já contaram como despesa na data da compra.' : 'Cadastre uma conta ou dinheiro em Carteiras.'}
                >
                  <Chips
                    valor={pagadora}
                    aoMudar={setPagadora}
                    opcoes={[{ valor: '', rotulo: 'Sem carteira' }, ...pagadoras.map((c) => ({ valor: c.id, rotulo: `${c.icone} ${c.nome}` }))]}
                  />
                </Campo>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Botao variante="fantasma" onPress={aoFechar} style={{ flex: 1 }}>Cancelar</Botao>
                <Botao onPress={confirmar} carregando={pagando} style={{ flex: 1 }}>
                  {fatura ? 'Pagar fatura' : 'Marcar paga'}
                </Botao>
              </View>
            </>
          )}
        </>
      )}
    </ModalCentral>
  )
}

const st = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  data: { width: 46, height: 46, borderRadius: 12, backgroundColor: cores.sutil, alignItems: 'center', justifyContent: 'center' },
  dataMes: { fontSize: 9, fontWeight: '700', color: cores.texto3, textTransform: 'uppercase' },
  dataDia: { fontSize: 16, fontWeight: '800', color: cores.texto1 },
  icone: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  descricao: { fontSize: 15, fontWeight: '600', color: cores.texto1 },
  sub: { fontSize: 12, color: cores.texto3, marginTop: 2 },
  valor: { fontSize: 15, fontWeight: '700', color: cores.texto1 },
  texto: { fontSize: 14, color: cores.texto2, lineHeight: 20 },
  resumo: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: cores.sutil, borderRadius: raio.md, padding: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: cores.marca,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
})
