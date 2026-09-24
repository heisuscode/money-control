import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Carregando } from '~/components/ui'
import { AuthProvider, useAuth } from '~/context/AuthProvider'
import { DadosProvider } from '~/context/DadosProvider'
import { PreferenciasProvider } from '~/context/Preferencias'
import { cores } from '~/theme'

SplashScreen.preventAutoHideAsync()

function Navegacao() {
  const { sessao, carregando } = useAuth()
  if (carregando) return <Carregando />

  return (
    <DadosProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.fundo } }}>
        <Stack.Protected guard={!!sessao}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="nova-transacao" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="transacao/[id]" />
          <Stack.Screen name="nova-carteira" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="cartao/[id]" />
          <Stack.Screen name="mais" />
          <Stack.Screen name="recorrencias" />
          <Stack.Screen name="categorias" />
          <Stack.Screen name="metas" />
          <Stack.Screen name="calendario" />
          <Stack.Screen name="relatorios" />
          <Stack.Screen name="cambio" />
          <Stack.Screen name="notificacoes" />
          <Stack.Screen name="configuracoes" />
          <Stack.Screen name="ativar-lembretes" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={!sessao}>
          <Stack.Screen name="login" />
          <Stack.Screen name="criar-conta" />
          <Stack.Screen name="recuperar-senha" />
        </Stack.Protected>
        <Stack.Screen name="auth-callback" />
      </Stack>
    </DadosProvider>
  )
}

export default function RootLayout() {
  const [fontes, erroFontes] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })
  const pronto = fontes || !!erroFontes

  useEffect(() => {
    if (pronto) SplashScreen.hideAsync()
  }, [pronto])

  if (!pronto) return null

  return (
    <SafeAreaProvider>
      <PreferenciasProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Navegacao />
        </AuthProvider>
      </PreferenciasProvider>
    </SafeAreaProvider>
  )
}
