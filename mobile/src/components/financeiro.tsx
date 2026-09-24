import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { numeroParcela } from '@/financeiro/logic'
import { sum } from '@/lib/finance'
import { daysUntil, formatCurrency, formatDate, formatNumber, maskMoneyInput, parseMoney } from '@/lib/format'
import type { Carteira, Categoria, Conta, ContaVirtual, Movimentacao, PagamentoFatura, Recorrencia } from '@/lib/types'
import { useDados } from '~/context/DadosProvider'
import { usePreferencias } from '~/context/Preferencias'
import { criarEstilos, f, useTema } from '~/theme'
import { Botao, Chips, Entrada, Icone, ModalCentral, num, Selo, type NomeIcone } from './ui'

export type ContaPagavel = Conta | ContaVirtual

export const isVirtual = (c: ContaPagavel): c is ContaVirtual => 'virtual' in c && c.virtual === true

/** Saldo de uma conta/dinheiro: inicial + receitas − despesas − faturas pagas com ela. */
export function saldoCarteira(
  c: Carteira,
  receitas: Movimentacao[],
  despesas: Movimentacao[],
  pagamentos: PagamentoFatura[],
) {
  const faturas = pagamentos
    .filter((p) => p.carteira_id === c.id)
    .reduce((a, p) => a + Number(p.valor), 0)
  return (
    Number(c.saldo_inicial) +
    sum(receitas.filter((r) => r.carteira_id === c.id)) -
    sum(despesas.filter((x) => x.carteira_id === c.id)) -
    faturas
  )
}

// Ícones de linha por palavra-chave da categoria (o banco guarda emoji, o app usa ícones).
const ICONES_CATEGORIA: [RegExp, NomeIcone][] = [
  [/aliment|mercado|comida|restaur|lanche|padaria/i, 'restaurant-outline'],
  [/transport|uber|combust|gasolina|carro|ônibus|onibus/i, 'car-outline'],
  [/moradia|casa|aluguel|condom|luz|água|agua|energia/i, 'home-outline'],
  [/saúde|saude|farm|médic|medic|academia/i, 'medkit-outline'],
  [/educa|curso|escola|faculdade|livro/i, 'school-outline'],
  [/lazer|cinema|viagem|diversão|diversao|jogo/i, 'game-controller-outline'],
  [/assinatura|streaming|netflix|spotify|internet|celular|telefone/i, 'tv-outline'],
  [/roupa|vestu|compras|shopping/i, 'bag-handle-outline'],
  [/pet/i, 'paw-outline'],
  [/salár|salar|trabalho|freela/i, 'briefcase-outline'],
  [/invest|rendimento|juros/i, 'trending-up-outline'],
  [/presente|doação|doacao/i, 'gift-outline'],
]

export function iconeCategoria(cat: Pick<Categoria, 'nome'> | null | undefined, tipo: 'receita' | 'despesa' = 'despesa'): NomeIcone {
  if (cat) for (const [re, ic] of ICONES_CATEGORIA) if (re.test(cat.nome)) return ic
  return tipo === 'receita' ? 'arrow-down-outline' : 'pricetag-outline'
}

function textoVencimento(c: ContaPagavel) {
  if (c.status === 'pago') return `Paga em ${c.pago_em ? formatDate(c.pago_em, 'dd MMM') : '—'}`
  const dias = daysUntil(c.vencimento)
  const aberta = isVirtual(c) && c.faturaAberta ? ' · em aberto' : ''
  if (dias < 0) return `Atrasada há ${Math.abs(dias)} dia${Math.abs(dias) > 1 ? 's' : ''}`
  if (dias === 0) return `Vence hoje${aberta}`
  if (dias === 1) return `Vence amanhã${aberta}`
  return `Vence em ${dias} dias${aberta}`
}

export function LinhaConta({
  conta,
  aoTocar,
  primeira,
  botaoPagar,
}: {
  conta: ContaPagavel
  aoTocar?: () => void
  primeira?: boolean
  /** mostra o botão "Pagar" à direita */
  botaoPagar?: boolean
}) {
  const { cores } = useTema()
  const st = useSt()
  const { dinheiro } = usePreferencias()
  const pago = conta.status === 'pago'
  const dias = daysUntil(conta.vencimento)
  const cor = pago ? cores.sucesso : conta.status === 'atrasado' ? cores.perigo : dias <= 7 ? cores.aviso : cores.texto3
  const virtual = isVirtual(conta) ? conta : null
  const recorrente = virtual?.origem === 'recorrencia'
  const fatura = virtual?.origem === 'fatura'
  const podePagar = botaoPagar && !pago && !recorrente
  const adiantar = !!virtual?.faturaAberta
  return (
    <Pressable
      onPress={aoTocar}
      disabled={!aoTocar}
      style={({ pressed }) => [st.linha, !primeira && st.divisor, pressed && { opacity: 0.6 }, pago && { opacity: 0.6 }]}
    >
      <View style={st.data}>
        <Text style={st.dataMes}>{formatDate(conta.vencimento, 'MMM').toUpperCase()}</Text>
        <Text style={[st.dataDia, num]}>{formatDate(conta.vencimento, 'dd')}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {fatura ? <Icone nome="card-outline" tamanho={15} cor={cores.texto3} /> : null}
          <Text style={[st.descricao, { flexShrink: 1 }, pago && { textDecorationLine: 'line-through' }]} numberOfLines={1}>
            {conta.descricao}
          </Text>
          {recorrente ? <Icone nome="repeat" tamanho={14} cor={cores.texto3} /> : null}
        </View>
        <Text style={[st.sub, { color: cor }, !pago && cor !== cores.texto3 && f[600]]}>{textoVencimento(conta)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={[st.valor, num]}>{dinheiro(Number(conta.valor))}</Text>
        {podePagar ? (
          <View style={st.pagar}>
            <Text style={st.pagarTexto}>{adiantar ? 'Adiantar' : 'Pagar'}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

export function LinhaMovimentacao({
  mov,
  nomeCarteira,
  recorrencia,
  primeira,
  aoTocar,
}: {
  mov: Movimentacao
  nomeCarteira?: string
  recorrencia?: Recorrencia
  primeira?: boolean
  aoTocar?: () => void
}) {
  const { cores } = useTema()
  const st = useSt()
  const { dinheiro } = usePreferencias()
  const receita = mov.tipo === 'receita'
  const parcela = recorrencia?.parcelas_total ? `${numeroParcela(recorrencia, mov.data)}/${recorrencia.parcelas_total}` : null
  // o 1º lançamento já traz a parcela no nome ("Tênis (1/5)"): não repete ao lado do selo
  const descricao = parcela ? mov.descricao.replace(/\s*\(\d+\/\d+\)$/, '') : mov.descricao
  const corCat = mov.categoria?.cor
  return (
    <Pressable
      onPress={aoTocar}
      disabled={!aoTocar}
      style={({ pressed }) => [st.linha, !primeira && st.divisor, pressed && { opacity: 0.6 }]}
    >
      <View style={[st.icone, { backgroundColor: receita ? cores.sucessoFundo : corCat ? `${corCat}1F` : cores.sutil }]}>
        <Icone
          nome={iconeCategoria(mov.categoria, receita ? 'receita' : 'despesa')}
          tamanho={19}
          cor={receita ? cores.sucesso : corCat ?? cores.texto2}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[st.descricao, { flexShrink: 1 }]} numberOfLines={1}>{descricao}</Text>
          {parcela ? <Selo texto={parcela} /> : mov.recorrencia_id ? <Icone nome="repeat" tamanho={14} cor={cores.texto3} /> : null}
        </View>
        <Text style={st.sub} numberOfLines={1}>
          {[mov.categoria?.nome ?? 'Sem categoria', nomeCarteira].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={[st.valor, num, receita && { color: cores.sucesso }]}>
        {receita ? '+ ' : '− '}
        {dinheiro(Number(mov.valor))}
      </Text>
    </Pressable>
  )
}

/** Mini cartão colorido (cor da carteira), usado em listas e seletores. */
export function MiniCartao({ cor, largura = 36 }: { cor: string; largura?: number }) {
  return <View style={{ width: largura, height: Math.round(largura * 0.66), borderRadius: 6, backgroundColor: cor }} />
}

/** Janela central para pagar uma conta, pagar fatura ou ver uma recorrência. */
export function PagarConta({ conta, aoFechar }: { conta: ContaPagavel | null; aoFechar: () => void }) {
  const { cores } = useTema()
  const st = useSt()
  const { carteiras, pagarFatura, marcarContaPaga, receitas, despesas, pagamentos } = useDados()
  const pagadoras = carteiras.filter((c) => c.tipo !== 'cartao_credito')
  const [pagadora, setPagadora] = useState('')
  const [valorStr, setValorStr] = useState('')
  const [pagando, setPagando] = useState(false)

  // Nova conta aberta: sugere a primeira conta bancária e o valor que falta pagar.
  const [contaAtual, setContaAtual] = useState<string | null>(null)
  if (conta && conta.id !== contaAtual) {
    setContaAtual(conta.id)
    setPagadora(pagadoras[0]?.id ?? '')
    setValorStr(formatNumber(Number(conta.valor)))
  }
  if (!conta && contaAtual !== null) setContaAtual(null)

  const virtual = conta && isVirtual(conta) ? conta : null
  const recorrencia = virtual?.origem === 'recorrencia'
  const fatura = virtual?.origem === 'fatura'
  const aberta = !!virtual?.faturaAberta
  // fatura pode ser paga em partes e adiantada; o `valor` da conta é o que falta
  const restante = Number(conta?.valor ?? 0)
  const pagoAntes = virtual?.pagoFatura ?? 0
  const valor = parseMoney(valorStr)
  const valorInvalido = fatura && (valor <= 0 || valor > restante + 0.001)

  async function confirmar() {
    if (!conta || valorInvalido) return
    setPagando(true)
    try {
      if (virtual) {
        if (!virtual.cartaoId || !virtual.fimCiclo) return
        await pagarFatura(virtual.cartaoId, virtual.fimCiclo, pagadora || null, valor)
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

  function irPara(destino: () => void) {
    aoFechar()
    destino()
  }

  const titulo = aberta ? 'Pagar adiantado' : recorrencia ? 'Conta recorrente' : fatura ? 'Pagar fatura' : 'Pagar conta'

  return (
    <ModalCentral visivel={!!conta} aoFechar={aoFechar} titulo={titulo}>
      {conta && (
        <>
          <View style={st.resumo}>
            <Text style={st.sub}>{conta.descricao}</Text>
            <Text style={[st.resumoValor, num]}>{formatCurrency(restante)}</Text>
            <Text style={st.sub}>
              {aberta ? `Fecha em ${formatDate(virtual!.fechaEm!, 'dd/MM')} · vence ` : 'Vence em '}
              {formatDate(conta.vencimento, "dd 'de' MMMM")}
            </Text>
            {fatura && pagoAntes > 0 ? (
              <Text style={[st.sub, { color: cores.sucesso, ...f[600] }]}>Já pago {formatCurrency(pagoAntes)}</Text>
            ) : null}
          </View>

          {recorrencia ? (
            <>
              <Text style={st.texto}>Esta conta é lançada sozinha na data. Para mudar o valor ou pausar, use Recorrências.</Text>
              <Botao variante="fantasma" onPress={() => irPara(() => router.push('/recorrencias'))}>
                Abrir recorrências
              </Botao>
            </>
          ) : (
            <>
              {aberta ? (
                <View style={st.aviso}>
                  <Icone nome="flash-outline" tamanho={18} cor={cores.marcaTexto} />
                  <Text style={[st.texto, { flex: 1, fontSize: 12, lineHeight: 17 }]}>
                    A fatura ainda recebe compras. O que você pagar agora abate do valor final e libera limite na hora.
                  </Text>
                </View>
              ) : null}
              {fatura && (
                <View style={{ gap: 8 }}>
                  <Text style={st.rotulo}>Valor do pagamento</Text>
                  <Entrada
                    value={valorStr}
                    onChangeText={(t) => setValorStr(maskMoneyInput(t))}
                    keyboardType="numeric"
                    accessibilityLabel="Valor do pagamento"
                    style={{ fontSize: 18, ...f[700] }}
                  />
                  <Chips
                    valor={valorStr}
                    aoMudar={setValorStr}
                    opcoes={[
                      { valor: formatNumber(restante), rotulo: `Tudo · ${formatCurrency(restante)}` },
                      { valor: formatNumber(Math.round(restante * 50) / 100), rotulo: 'Metade' },
                    ]}
                  />
                  {valorInvalido ? (
                    <Text style={[st.sub, { color: cores.perigo }]}>Informe um valor entre R$ 0,01 e {formatCurrency(restante)}.</Text>
                  ) : valor < restante - 0.001 ? (
                    <Text style={st.sub}>Depois deste pagamento ainda faltam {formatCurrency(restante - valor)}.</Text>
                  ) : null}
                  <Text style={[st.rotulo, { marginTop: 4 }]}>Pagar com</Text>
                  {pagadoras.length === 0 ? (
                    <Text style={st.sub}>Nenhuma conta cadastrada: o pagamento fica sem conta de origem.</Text>
                  ) : (
                    pagadoras.map((c) => {
                      const ativo = c.id === pagadora
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setPagadora(c.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: ativo }}
                          style={[st.opcao, ativo && st.opcaoAtiva]}
                        >
                          <View style={[st.radio, ativo && st.radioAtivo]} />
                          <View style={{ flex: 1 }}>
                            <Text style={st.descricao}>{c.nome}</Text>
                            <Text style={st.sub}>Saldo {formatCurrency(saldoCarteira(c, receitas, despesas, pagamentos))}</Text>
                          </View>
                        </Pressable>
                      )
                    })
                  )}
                  <View style={st.aviso}>
                    <Icone nome="information-circle-outline" tamanho={18} cor={cores.marcaTexto} />
                    <Text style={[st.texto, { flex: 1, fontSize: 12, lineHeight: 17 }]}>
                      As compras já contaram como despesa na data. Pagar a fatura só tira o dinheiro da conta: nada é
                      contado duas vezes.
                    </Text>
                  </View>
                </View>
              )}
              <Botao onPress={confirmar} carregando={pagando} desabilitado={!!valorInvalido}>
                {fatura ? `${aberta ? 'Pagar adiantado' : 'Pagar'} ${formatCurrency(valor)}` : 'Marcar como paga'}
              </Botao>
              {aberta ? (
                <Botao
                  variante="texto"
                  onPress={() => irPara(() => router.push({ pathname: '/cartao/[id]', params: { id: virtual!.cartaoId! } }))}
                >
                  Ver compras da fatura
                </Botao>
              ) : null}
            </>
          )}
        </>
      )}
    </ModalCentral>
  )
}

const useSt = criarEstilos((cores) => ({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, minHeight: 60 },
  divisor: { borderTopWidth: 1, borderTopColor: cores.sutil },
  data: { width: 44, height: 44, borderRadius: 12, backgroundColor: cores.fundo, alignItems: 'center', justifyContent: 'center' },
  dataMes: { fontSize: 9, ...f[700], color: cores.texto3 },
  dataDia: { fontSize: 16, ...f[800], color: cores.texto1, marginTop: -2 },
  icone: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  descricao: { fontSize: 14, ...f[600], color: cores.texto1 },
  sub: { fontSize: 12, ...f[400], color: cores.texto3 },
  valor: { fontSize: 14, ...f[700], color: cores.texto1 },
  pagar: { backgroundColor: cores.ativoFundo, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  pagarTexto: { fontSize: 12, ...f[700], color: cores.marcaTexto },
  texto: { fontSize: 14, ...f[400], color: cores.texto2, lineHeight: 20 },
  rotulo: { fontSize: 13, ...f[600], color: cores.texto2 },
  resumo: { alignItems: 'center', gap: 2, backgroundColor: cores.fundo, borderRadius: 16, padding: 16 },
  resumoValor: { fontSize: 28, ...f[800], color: cores.texto1, letterSpacing: -0.6 },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: 14,
    padding: 12,
    minHeight: 56,
  },
  opcaoAtiva: { borderColor: cores.marca, backgroundColor: cores.ativoFundo },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: cores.desligado },
  radioAtivo: { borderColor: cores.marca, borderWidth: 6 },
  aviso: { flexDirection: 'row', gap: 8, backgroundColor: cores.ativoFundo, borderRadius: 12, padding: 10 },
}))
