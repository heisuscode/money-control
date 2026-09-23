import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import type { ColorValue } from 'react-native'
import { cores } from '~/theme'

type Icone = ComponentProps<typeof Ionicons>['name']

const icone = (nome: Icone) =>
  function IconeAba({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={nome} color={color as string} size={size} />
  }

export default function AbasLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.marca,
        tabBarInactiveTintColor: cores.texto3,
        tabBarStyle: { backgroundColor: cores.superficie, borderTopColor: cores.linha },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icone('home-outline') }} />
      <Tabs.Screen name="transacoes" options={{ title: 'Transações', tabBarIcon: icone('swap-vertical-outline') }} />
      <Tabs.Screen name="contas" options={{ title: 'Contas', tabBarIcon: icone('document-text-outline') }} />
      <Tabs.Screen name="carteiras" options={{ title: 'Carteiras', tabBarIcon: icone('wallet-outline') }} />
    </Tabs>
  )
}
