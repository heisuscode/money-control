import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { formatCurrency, parseDate } from '@/lib/format'
import type { Conta, ContaVirtual } from '@/lib/types'

const CANAL = 'vencimentos'
let preparado: Promise<boolean> | null = null

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

function preparar() {
  preparado ??= (async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: 'Vencimentos',
        importance: Notifications.AndroidImportance.HIGH,
      })
    }
    const atual = await Notifications.getPermissionsAsync()
    if (atual.granted) return true
    const pedido = await Notifications.requestPermissionsAsync()
    return pedido.granted
  })()
  return preparado
}

/**
 * Reagenda todos os lembretes: 1 dia antes de cada conta/fatura pendente, às 9h.
 * Faturas em aberto também avisam (o valor pode mudar até o fechamento).
 */
export async function agendarLembretes(contas: (Conta | ContaVirtual)[]) {
  if (!(await preparar())) return
  await Notifications.cancelAllScheduledNotificationsAsync()

  const agora = new Date()
  const pendentes = contas
    .filter((c) => c.status !== 'pago')
    .map((c) => {
      const quando = parseDate(c.vencimento)
      quando.setDate(quando.getDate() - 1)
      quando.setHours(9, 0, 0, 0)
      return { c, quando }
    })
    .filter(({ quando }) => quando > agora)
    .sort((a, b) => a.quando.getTime() - b.quando.getTime())
    .slice(0, 40)

  for (const { c, quando } of pendentes) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Vence amanhã',
        body: `${c.descricao} · ${formatCurrency(Number(c.valor))}`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: quando,
        channelId: CANAL,
      },
    })
  }
}
