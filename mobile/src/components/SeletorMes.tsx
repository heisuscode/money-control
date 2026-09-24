import { StyleSheet, Text, View } from 'react-native'
import { formatDate } from '@/lib/format'
import { cores, f } from '~/theme'
import { BotaoIcone } from './ui'

/** "‹ setembro 2026 ›" — troca o mês exibido. */
export function SeletorMes({ mes, aoMudar }: { mes: Date; aoMudar: (d: Date) => void }) {
  const mover = (delta: number) => aoMudar(new Date(mes.getFullYear(), mes.getMonth() + delta, 1))
  return (
    <View style={st.caixa}>
      <BotaoIcone icone="chevron-back" rotulo="Mês anterior" aoTocar={() => mover(-1)} />
      <Text style={st.texto} accessibilityLiveRegion="polite">{formatDate(mes, 'MMMM yyyy')}</Text>
      <BotaoIcone icone="chevron-forward" rotulo="Próximo mês" aoTocar={() => mover(1)} />
    </View>
  )
}

const st = StyleSheet.create({
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: cores.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: cores.linha,
    paddingHorizontal: 4,
    height: 52,
  },
  texto: { fontSize: 15, ...f[700], color: cores.texto1, textTransform: 'capitalize' },
})
