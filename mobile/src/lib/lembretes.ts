import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'
import { formatCurrency, parseDate } from '@/lib/format'
import type { Conta, ContaVirtual } from '@/lib/types'

type ModuloNotificacoes = typeof import('expo-notifications')

const CANAL = 'vencimentos'

// No Expo Go para Android (SDK 53+), só importar expo-notifications já lança erro.
// Por isso o módulo é carregado sob demanda e os lembretes ficam desligados lá;
// no APK (development/preview build) funcionam normalmente.
const semSuporte = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient

let modulo: ModuloNotificacoes | null = null
let preparado: Promise<boolean> | null = null

function notificacoes(): ModuloNotificacoes | null {
  if (semSuporte) return null
  if (!modulo) {
    modulo = require('expo-notifications') as ModuloNotificacoes
    modulo.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    })
  }
  return modulo
}

function preparar(N: ModuloNotificacoes) {
  preparado ??= (async () => {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CANAL, { name: 'Vencimentos', importance: N.AndroidImportance.HIGH })
    }
    const atual = await N.getPermissionsAsync()
    if (atual.granted) return true
    return (await N.requestPermissionsAsync()).granted
  })()
  return preparado
}

/**
 * Reagenda todos os lembretes: 1 dia antes de cada conta/fatura pendente, às 9h.
 * Faturas em aberto também avisam (o valor pode mudar até o fechamento).
 */
export async function agendarLembretes(contas: (Conta | ContaVirtual)[]) {
  const N = notificacoes()
  if (!N || !(await preparar(N))) return
  await N.cancelAllScheduledNotificationsAsync()

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
    await N.scheduleNotificationAsync({
      content: { title: 'Vence amanhã', body: `${c.descricao} · ${formatCurrency(Number(c.valor))}` },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: quando, channelId: CANAL },
    })
  }
}
