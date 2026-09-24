import Ionicons from '@expo/vector-icons/Ionicons'
import { router, Tabs } from 'expo-router'
import type { ColorValue } from 'react-native'
import { Pressable, StyleSheet, View } from 'react-native'
import type { NomeIcone } from '~/components/ui'
import { cores, f } from '~/theme'

const icone = (nome: NomeIcone, ativo: NomeIcone) =>
  function IconeAba({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? ativo : nome} color={color as string} size={24} />
  }

/** "+" central: abre Nova transação de qualquer aba (não é uma aba de verdade). */
function BotaoMais() {
  return (
    <View style={st.maisArea}>
      <Pressable
        onPress={() => router.push('/nova-transacao')}
        accessibilityRole="button"
        accessibilityLabel="Nova transação"
        style={({ pressed }) => [st.mais, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </Pressable>
    </View>
  )
}

export default function AbasLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.marca,
        tabBarInactiveTintColor: cores.texto3,
        tabBarStyle: { backgroundColor: cores.superficie, borderTopColor: cores.linha },
        tabBarLabelStyle: { fontSize: 11, ...f[600] },
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icone('home-outline', 'home') }} />
      <Tabs.Screen name="transacoes" options={{ title: 'Transações', tabBarIcon: icone('swap-vertical-outline', 'swap-vertical') }} />
      <Tabs.Screen name="novo" options={{ title: '', tabBarButton: () => <BotaoMais /> }} />
      <Tabs.Screen name="contas" options={{ title: 'Contas', tabBarIcon: icone('receipt-outline', 'receipt') }} />
      <Tabs.Screen name="carteiras" options={{ title: 'Carteiras', tabBarIcon: icone('wallet-outline', 'wallet') }} />
    </Tabs>
  )
}

const st = StyleSheet.create({
  maisArea: { flex: 1, alignItems: 'center' },
  mais: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -22,
    backgroundColor: cores.marca,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: cores.marca,
    shadowOpacity: 0.35,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 8 },
  },
})
