import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Carregando } from '~/components/ui'
import { AuthProvider, useAuth } from '~/context/AuthProvider'
import { DadosProvider } from '~/context/DadosProvider'
import { cores } from '~/theme'

function Navegacao() {
  const { sessao, carregando } = useAuth()
  if (carregando) return <Carregando />

  return (
    <DadosProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          headerTintColor: cores.texto1,
          headerStyle: { backgroundColor: cores.superficie },
          contentStyle: { backgroundColor: cores.fundo },
        }}
      >
        <Stack.Protected guard={!!sessao}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="nova-transacao" options={{ presentation: 'modal', headerShown: true, title: 'Nova transação' }} />
          <Stack.Screen name="nova-carteira" options={{ presentation: 'modal', headerShown: true, title: 'Nova carteira' }} />
        </Stack.Protected>
        <Stack.Protected guard={!sessao}>
          <Stack.Screen name="login" />
        </Stack.Protected>
        <Stack.Screen name="auth-callback" />
      </Stack>
    </DadosProvider>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Navegacao />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
