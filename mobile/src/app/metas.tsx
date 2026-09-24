import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { useState } from 'react'
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { iso } from '@/financeiro/logic'
import { formatCurrency, formatDate, formatNumber, maskMoneyInput, parseMoney } from '@/lib/format'
import type { Meta } from '@/lib/types'
import { Barra, Botao, BotaoIcone, Campo, Cartao, Chips, Entrada, FolhaInferior, Icone, Seletor, Tela, Vazio, num } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { usePreferencias } from '~/context/Preferencias'
import { CORES_CARTEIRA, cores, f, fundoComTextoBranco } from '~/theme'

function mesesAte(prazo: string) {
  const hoje = new Date()
  const fim = new Date(`${prazo}T00:00:00`)
  return Math.max(1, (fim.getFullYear() - hoje.getFullYear()) * 12 + fim.getMonth() - hoje.getMonth())
}

export default function Metas() {
  const d = useDados()
  const { dinheiro } = usePreferencias()
  const [aporte, setAporte] = useState<Meta | null>(null)
  const [editar, setEditar] = useState<Meta | 'nova' | null>(null)

  const guardado = d.metas.reduce((a, m) => a + Number(m.valor_atual), 0)
  const objetivo = d.metas.reduce((a, m) => a + Number(m.valor_meta), 0)

  return (
    <Tela
      titulo="Metas"
      voltar
      acao={<BotaoIcone icone="add" rotulo="Nova meta" contorno cor={cores.marca} aoTocar={() => setEditar('nova')} />}
    >
      <View style={st.hero}>
        <Text style={st.heroRotulo}>Total guardado</Text>
        <Text style={[st.heroValor, num]}>{dinheiro(guardado)}</Text>
        {objetivo > 0 ? <Text style={st.heroRotulo}>de {dinheiro(objetivo)} em {d.metas.length} metas</Text> : null}
      </View>

      {d.metas.length === 0 ? (
        <Cartao>
          <Vazio
            icone="flag-outline"
            titulo="Nenhuma meta ainda"
            descricao="Viagem, reserva de emergência, carro... Defina um valor e acompanhe quanto falta."
            acao={<Botao icone="add" onPress={() => setEditar('nova')}>Criar meta</Botao>}
          />
        </Cartao>
      ) : (
        d.metas.map((m) => {
          const atual = Number(m.valor_atual)
          const alvo = Number(m.valor_meta)
          const pct = alvo > 0 ? (atual / alvo) * 100 : 0
          const falta = Math.max(0, alvo - atual)
          const concluida = falta <= 0
          const porMes = m.prazo && !concluida ? falta / mesesAte(m.prazo) : null
          const cor = fundoComTextoBranco(m.cor || cores.marca)
          return (
            <Cartao key={m.id} style={{ gap: 10 }} aoTocar={() => setEditar(m)}>
              <View style={st.entre}>
                <View style={[st.icone, { backgroundColor: `${cor}1F` }]}>
                  <Icone nome={concluida ? 'trophy-outline' : 'flag-outline'} tamanho={20} cor={cor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.nome} numberOfLines={1}>{m.objetivo}</Text>
                  <Text style={st.sub}>{m.prazo ? `até ${formatDate(m.prazo, "MMM 'de' yyyy")}` : 'sem prazo'}</Text>
                </View>
                <Text style={[st.pct, num, { color: concluida ? cores.sucesso : cores.texto1 }]}>{Math.min(100, Math.round(pct))}%</Text>
              </View>
              <Barra pct={pct} cor={concluida ? cores.sucesso : cor} />
              <View style={st.entre}>
                <Text style={[st.sub, num]}>
                  <Text style={st.forte}>{dinheiro(atual)}</Text> de {dinheiro(alvo)}
                </Text>
                {concluida ? <Text style={[st.sub, { color: cores.sucesso, ...f[700] }]}>Meta batida!</Text> : null}
              </View>
              {porMes ? (
                <Text style={st.sugestao}>Guardando {dinheiro(porMes)} por mês você chega lá no prazo.</Text>
              ) : null}
              {!concluida ? (
                <Botao variante="fantasma" icone="add" onPress={() => setAporte(m)} style={{ minHeight: 44 }}>
                  Guardar dinheiro
                </Botao>
              ) : null}
            </Cartao>
          )
        })
      )}

      <Aporte meta={aporte} aoFechar={() => setAporte(null)} />
      <EditarMeta alvo={editar} aoFechar={() => setEditar(null)} />
    </Tela>
  )
}

function Aporte({ meta, aoFechar }: { meta: Meta | null; aoFechar: () => void }) {
  const { salvarMeta } = useDados()
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const falta = meta ? Math.max(0, Number(meta.valor_meta) - Number(meta.valor_atual)) : 0

  async function guardar(retirar = false) {
    if (!meta) return
    const v = parseMoney(valor)
    if (v <= 0) return
    setSalvando(true)
    try {
      const novo = Math.max(0, Number(meta.valor_atual) + (retirar ? -v : v))
      await salvarMeta({ ...campos(meta), valor_atual: novo }, meta.id)
      setValor('')
      aoFechar()
    } catch {
      Alert.alert('Não foi possível atualizar a meta.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <FolhaInferior visivel={!!meta} aoFechar={aoFechar} titulo={meta ? `Guardar em ${meta.objetivo}` : ''}>
      <Text style={st.sub}>Faltam {formatCurrency(falta)}.</Text>
      <Entrada value={valor} onChangeText={(t) => setValor(maskMoneyInput(t))} placeholder="0,00" keyboardType="numeric" autoFocus />
      <Chips
        valor=""
        aoMudar={(v) => setValor(formatNumber(Number(v)))}
        opcoes={[50, 100, 200, 500].map((v) => ({ valor: String(v), rotulo: `+ R$ ${v}` }))}
      />
      <Botao onPress={() => guardar()} carregando={salvando}>Guardar</Botao>
      <Botao variante="texto" onPress={() => guardar(true)}>Retirar esse valor</Botao>
    </FolhaInferior>
  )
}

const campos = (m: Meta) => ({
  objetivo: m.objetivo,
  valor_meta: Number(m.valor_meta),
  valor_atual: Number(m.valor_atual),
  prazo: m.prazo,
  icone: m.icone,
  cor: m.cor,
})

function EditarMeta({ alvo, aoFechar }: { alvo: Meta | 'nova' | null; aoFechar: () => void }) {
  const { salvarMeta, removerMeta } = useDados()
  const meta = alvo && alvo !== 'nova' ? alvo : null
  const [chave, setChave] = useState<string | null>(null)
  const [objetivo, setObjetivo] = useState('')
  const [valor, setValor] = useState('')
  const [prazo, setPrazo] = useState<string | null>(null)
  const [cor, setCor] = useState(CORES_CARTEIRA[1])
  const [mostrarData, setMostrarData] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const chaveAtual = alvo === 'nova' ? 'nova' : meta?.id ?? null
  if (chaveAtual !== chave) {
    setChave(chaveAtual)
    setObjetivo(meta?.objetivo ?? '')
    setValor(meta ? formatNumber(Number(meta.valor_meta)) : '')
    setPrazo(meta?.prazo ?? null)
    setCor(meta?.cor ?? CORES_CARTEIRA[1])
  }

  function escolherPrazo() {
    const base = prazo ? new Date(`${prazo}T00:00:00`) : new Date(new Date().getFullYear() + 1, new Date().getMonth(), 1)
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (e, data) => {
          if (e.type === 'set' && data) setPrazo(iso(data))
        },
      })
    } else setMostrarData(true)
  }

  async function salvar() {
    const v = parseMoney(valor)
    if (!objetivo.trim() || v <= 0) return Alert.alert('Informe o objetivo e o valor.')
    setSalvando(true)
    try {
      await salvarMeta(
        { objetivo: objetivo.trim(), valor_meta: v, valor_atual: meta ? Number(meta.valor_atual) : 0, prazo, icone: meta?.icone ?? '🎯', cor },
        meta?.id,
      )
      aoFechar()
    } catch {
      Alert.alert('Não foi possível salvar a meta.')
    } finally {
      setSalvando(false)
    }
  }

  function excluir() {
    if (!meta) return
    Alert.alert('Excluir meta?', `"${meta.objetivo}" será apagada.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await removerMeta(meta.id)
            aoFechar()
          } catch {
            Alert.alert('Não foi possível excluir.')
          }
        },
      },
    ])
  }

  return (
    <FolhaInferior visivel={!!alvo} aoFechar={aoFechar} titulo={meta ? 'Editar meta' : 'Nova meta'}>
      <Campo rotulo="Objetivo">
        <Entrada value={objetivo} onChangeText={setObjetivo} placeholder="Ex.: Viagem para o Chile" />
      </Campo>
      <Campo rotulo="Quanto quer juntar">
        <Entrada value={valor} onChangeText={(t) => setValor(maskMoneyInput(t))} placeholder="0,00" keyboardType="numeric" />
      </Campo>
      <Campo rotulo="Prazo (opcional)">
        <Seletor icone="calendar-outline" texto={prazo ? formatDate(prazo, "dd 'de' MMMM 'de' yyyy") : 'Sem prazo'} aoTocar={escolherPrazo} />
        {mostrarData && (
          <DateTimePicker
            value={prazo ? new Date(`${prazo}T00:00:00`) : new Date()}
            mode="date"
            onChange={(_e, data) => {
              setMostrarData(false)
              if (data) setPrazo(iso(data))
            }}
          />
        )}
      </Campo>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {CORES_CARTEIRA.slice(0, 6).map((c) => (
          <Pressable
            key={c}
            onPress={() => setCor(c)}
            accessibilityRole="radio"
            accessibilityState={{ checked: cor === c }}
            accessibilityLabel={`Cor ${c}`}
            style={[st.cor, { backgroundColor: c }]}
          >
            {cor === c ? <Icone nome="checkmark" tamanho={18} cor="#FFFFFF" /> : null}
          </Pressable>
        ))}
      </View>
      <Botao onPress={salvar} carregando={salvando}>{meta ? 'Salvar' : 'Criar meta'}</Botao>
      {meta ? (
        <Botao variante="texto" onPress={excluir}>
          <Text style={{ color: cores.perigo }}>Excluir meta</Text>
        </Botao>
      ) : null}
    </FolhaInferior>
  )
}

const st = StyleSheet.create({
  entre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  hero: { backgroundColor: cores.tinta, borderRadius: 22, padding: 20, gap: 2 },
  heroRotulo: { color: cores.tintaTexto, fontSize: 13, ...f[500] },
  heroValor: { color: '#FFFFFF', fontSize: 30, ...f[800], letterSpacing: -0.8 },
  icone: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nome: { fontSize: 15, ...f[700], color: cores.texto1 },
  sub: { fontSize: 12, ...f[400], color: cores.texto3 },
  forte: { ...f[700], color: cores.texto1 },
  pct: { fontSize: 16, ...f[800] },
  sugestao: { fontSize: 12, ...f[500], color: cores.marca, backgroundColor: cores.ativoFundo, borderRadius: 10, padding: 10 },
  cor: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
})
