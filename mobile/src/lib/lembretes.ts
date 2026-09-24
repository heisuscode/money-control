import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'
import { formatCurrency, parseDate } from '@/lib/format'
import type { Conta, ContaVirtual } from '@/lib/types'
import type { ConfigLembretes } from '~/context/Preferencias'

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
    // import tardio de propósito: no Expo Go só carregar o módulo já lança erro
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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

/** Lembretes funcionam neste ambiente? (não no Expo Go para Android) */
export const lembretesDisponiveis = !semSuporte

/** Pede a permissão do sistema (tela "Ativar lembretes"). */
export async function pedirPermissaoLembretes() {
  const N = notificacoes()
  return N ? preparar(N) : false
}

function titulo(antecedencia: number) {
  if (antecedencia === 0) return 'Vence hoje'
  if (antecedencia === 1) return 'Vence amanhã'
  return `Vence em ${antecedencia} dias`
}

/**
 * Reagenda todos os lembretes: `antecedencia` dias antes de cada conta/fatura
 * pendente, na `hora` escolhida (padrão 1 dia antes, às 9h). Faturas em aberto
 * também avisam (o valor pode mudar até o fechamento).
 */
export async function agendarLembretes(
  contas: (Conta | ContaVirtual)[],
  { ativo, hora, antecedencia }: ConfigLembretes,
) {
  const N = notificacoes()
  if (!N) return
  if (!ativo) {
    await N.cancelAllScheduledNotificationsAsync()
    return
  }
  if (!(await preparar(N))) return
  await N.cancelAllScheduledNotificationsAsync()

  const agora = new Date()
  const pendentes = contas
    .filter((c) => c.status !== 'pago')
    .map((c) => {
      const quando = parseDate(c.vencimento)
      quando.setDate(quando.getDate() - antecedencia)
      quando.setHours(hora, 0, 0, 0)
      return { c, quando }
    })
    .filter(({ quando }) => quando > agora)
    .sort((a, b) => a.quando.getTime() - b.quando.getTime())
    .slice(0, 40)

  for (const { c, quando } of pendentes) {
    await N.scheduleNotificationAsync({
      content: { title: titulo(antecedencia), body: `${c.descricao} · ${formatCurrency(Number(c.valor))}` },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: quando, channelId: CANAL },
    })
  }
}
