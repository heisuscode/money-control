import { Pressable, Text, View } from 'react-native'
import { criarEstilos, f, useTema } from '~/theme'
import { Icone } from './ui'

/** Botão "Continuar com Google" (destaque nas telas de acesso). */
export function BotaoGoogle({ aoTocar, carregando, texto = 'Continuar com Google' }: { aoTocar: () => void; carregando?: boolean; texto?: string }) {
  const { cores } = useTema()
  const st = useSt()
  return (
    <Pressable
      onPress={aoTocar}
      disabled={carregando}
      accessibilityRole="button"
      style={({ pressed }) => [st.google, (pressed || carregando) && { opacity: 0.7 }]}
    >
      <Icone nome="logo-google" tamanho={20} cor={cores.texto1} />
      <Text style={st.googleTexto}>{carregando ? 'Abrindo o Google...' : texto}</Text>
    </Pressable>
  )
}

export function Ou({ texto = 'ou com e-mail' }: { texto?: string }) {
  const st = useSt()
  return (
    <View style={st.ou}>
      <View style={st.traco} />
      <Text style={st.ouTexto}>{texto}</Text>
      <View style={st.traco} />
    </View>
  )
}

/** Marca do app (quadrado azul com o gráfico). */
export function Marca({ tamanho = 56 }: { tamanho?: number }) {
  const st = useSt()
  return (
    <View style={[st.marca, { width: tamanho, height: tamanho, borderRadius: tamanho * 0.3 }]}>
      <Icone nome="stats-chart" tamanho={tamanho * 0.5} cor="#FFFFFF" />
    </View>
  )
}

const useSt = criarEstilos((cores) => ({
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: cores.texto1,
    backgroundColor: cores.superficie,
  },
  googleTexto: { fontSize: 15, ...f[700], color: cores.texto1 },
  ou: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  traco: { flex: 1, height: 1, backgroundColor: cores.linha },
  ouTexto: { fontSize: 12, ...f[500], color: cores.texto3 },
  marca: { backgroundColor: cores.marca, alignItems: 'center', justifyContent: 'center' },
}))
