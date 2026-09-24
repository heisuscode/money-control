import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { iso } from '@/financeiro/logic'
import { sum } from '@/lib/finance'
import { formatDate } from '@/lib/format'
import { isVirtual, LinhaConta, PagarConta, type ContaPagavel } from '~/components/financeiro'
import { SeletorMes } from '~/components/SeletorMes'
import { Cartao, Tela, Vazio, num } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { usePreferencias } from '~/context/Preferencias'
import { criarEstilos, f, useTema } from '~/theme'

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function Calendario() {
  const { cores } = useTema()
  const st = useSt()
  const d = useDados()
  const { dinheiro } = usePreferencias()
  const [mes, setMes] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [dia, setDia] = useState(() => iso(new Date()))
  const [pagar, setPagar] = useState<ContaPagavel | null>(null)

  const porDia = useMemo(() => {
    const mapa = new Map<string, ContaPagavel[]>()
    for (const c of [...d.contas, ...d.contasVirtuais]) mapa.set(c.vencimento, [...(mapa.get(c.vencimento) ?? []), c])
    return mapa
  }, [d.contas, d.contasVirtuais])

  const celulas = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1)
    const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
    const lista: (string | null)[] = Array(primeiro.getDay()).fill(null)
    for (let i = 1; i <= dias; i++) lista.push(iso(new Date(mes.getFullYear(), mes.getMonth(), i)))
    while (lista.length % 7) lista.push(null)
    return lista
  }, [mes])

  const hoje = iso(new Date())
  const doDia = porDia.get(dia) ?? []
  const prefixo = iso(mes).slice(0, 7)
  const pendentesMes = [...porDia.entries()].filter(([k]) => k.startsWith(prefixo)).flatMap(([, v]) => v).filter((c) => c.status !== 'pago')

  function tocar(c: ContaPagavel) {
    if (isVirtual(c) && c.origem === 'fatura' && c.faturaAberta && c.cartaoId) {
      router.push({ pathname: '/cartao/[id]', params: { id: c.cartaoId } })
    } else if (c.status !== 'pago') setPagar(c)
  }

  return (
    <Tela titulo="Calendário" voltar>
      <SeletorMes
        mes={mes}
        aoMudar={(m) => {
          setMes(m)
          setDia(iso(m))
        }}
      />
      <Cartao style={{ paddingHorizontal: 8 }}>
        <View style={st.grade}>
          {SEMANA.map((s, i) => (
            <Text key={i} style={st.semana}>{s}</Text>
          ))}
          {celulas.map((c, i) => {
            if (!c) return <View key={i} style={st.celula} />
            const contas = porDia.get(c) ?? []
            const pendentes = contas.filter((x) => x.status !== 'pago')
            const atrasada = pendentes.some((x) => x.status === 'atrasado')
            const selecionado = c === dia
            return (
              <Pressable
                key={i}
                onPress={() => setDia(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: selecionado }}
                accessibilityLabel={`${formatDate(c, "d 'de' MMMM")}${pendentes.length ? `, ${pendentes.length} conta(s)` : ''}`}
                style={st.celula}
              >
                <View style={[st.numero, c === hoje && st.hoje, selecionado && st.selecionado]}>
                  <Text style={[st.numeroTexto, selecionado && { color: '#FFFFFF' }, c === hoje && !selecionado && { color: cores.marcaTexto }]}>
                    {Number(c.slice(8))}
                  </Text>
                </View>
                <View style={[st.ponto, { backgroundColor: pendentes.length ? (atrasada ? cores.perigo : cores.aviso) : contas.length ? cores.sucesso : 'transparent' }]} />
              </Pressable>
            )
          })}
        </View>
        <View style={st.legenda}>
          <Legenda cor={cores.aviso} texto="A vencer" />
          <Legenda cor={cores.perigo} texto="Atrasada" />
          <Legenda cor={cores.sucesso} texto="Paga" />
        </View>
      </Cartao>

      <View style={st.entre}>
        <Text style={st.titulo}>{formatDate(dia, "EEEE, d 'de' MMMM")}</Text>
        {pendentesMes.length ? <Text style={[st.sub, num]}>No mês: {dinheiro(sum(pendentesMes))}</Text> : null}
      </View>
      <Cartao style={{ paddingVertical: 2 }}>
        {doDia.length === 0 ? (
          <Vazio titulo="Nada vence neste dia" />
        ) : (
          doDia.map((c, i) => <LinhaConta key={c.id} conta={c} primeira={i === 0} botaoPagar aoTocar={c.status === 'pago' ? undefined : () => tocar(c)} />)
        )}
      </Cartao>
      <PagarConta conta={pagar} aoFechar={() => setPagar(null)} />
    </Tela>
  )
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  const st = useSt()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={[st.ponto, { backgroundColor: cor }]} />
      <Text style={st.sub}>{texto}</Text>
    </View>
  )
}

const useSt = criarEstilos((cores) => ({
  entre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  semana: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, ...f[700], color: cores.texto3, paddingBottom: 6 },
  celula: { width: `${100 / 7}%`, height: 50, alignItems: 'center', justifyContent: 'center', gap: 3 },
  numero: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  hoje: { borderWidth: 1.5, borderColor: cores.marca },
  selecionado: { backgroundColor: cores.marca, borderWidth: 0 },
  numeroTexto: { fontSize: 14, ...f[600], color: cores.texto1 },
  ponto: { width: 6, height: 6, borderRadius: 3 },
  legenda: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  titulo: { fontSize: 15, ...f[700], color: cores.texto1, textTransform: 'capitalize', flexShrink: 1 },
  sub: { fontSize: 12, ...f[400], color: cores.texto3 },
}))
