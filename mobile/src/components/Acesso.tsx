import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { criarEstilos, f } from '~/theme'
import { Icone } from './ui'

/** "G" oficial do Google (4 cores), exigido nos botões de login com Google. */
export function LogoGoogle({ tamanho = 18 }: { tamanho?: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  )
}

/** Botão principal "Continuar com Google": escuro no tema claro e claro no tema escuro. */
export function BotaoGoogle({ aoTocar, carregando, texto = 'Continuar com Google' }: { aoTocar: () => void; carregando?: boolean; texto?: string }) {
  const st = useSt()
  return (
    <Pressable
      onPress={aoTocar}
      disabled={carregando}
      accessibilityRole="button"
      accessibilityLabel={texto}
      style={({ pressed }) => [st.google, (pressed || carregando) && { opacity: 0.75 }]}
    >
      <View style={st.googleLogo}>
        {carregando ? <ActivityIndicator size="small" color="#4285F4" /> : <LogoGoogle />}
      </View>
      <Text style={st.googleTexto}>{carregando ? 'Abrindo o Google...' : texto}</Text>
      {/* equilibra o logo para o texto ficar centralizado */}
      <View style={{ width: 28 }} />
    </Pressable>
  )
}

export function Ou({ texto = 'ou' }: { texto?: string }) {
  const st = useSt()
  return (
    <View style={st.ou}>
      <View style={st.traco} />
      <Text style={st.ouTexto}>{texto}</Text>
      <View style={st.traco} />
    </View>
  )
}

/** Marca do app: quadrado azul com a linha de gráfico. */
export function Marca({ tamanho = 56 }: { tamanho?: number }) {
  const st = useSt()
  return (
    <View style={[st.marca, { width: tamanho, height: tamanho, borderRadius: tamanho * 0.3 }]}>
      <Svg width={tamanho * 0.55} height={tamanho * 0.55} viewBox="0 0 24 24" fill="none">
        <Path d="M4 18V9l4 4 4-7 4 7 4-4v9" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  )
}

/**
 * Ilustração da tela de entrada: um cartão com dois avisos do app ao redor,
 * mostrando o que ele faz (fatura, lembrete, parcela) sem números de mentira.
 */
export function IlustracaoAcesso() {
  const st = useSt()
  return (
    <View style={st.ilustracao} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={st.cartao}>
        <View style={st.cartaoTopo}>
          <Text style={st.cartaoNome}>MoneyControl</Text>
          <Icone nome="wifi" tamanho={18} cor="rgba(255,255,255,0.75)" />
        </View>
        <View style={st.cartaoChip} />
        <Text style={st.cartaoNumero}>••••  ••••  ••••  4821</Text>
      </View>
      <View style={[st.aviso, st.avisoCima]}>
        <View style={[st.avisoIcone, { backgroundColor: '#FEF3C7' }]}>
          <Icone nome="notifications" tamanho={14} cor="#B45309" />
        </View>
        <Text style={st.avisoTexto}>Fatura vence amanhã</Text>
      </View>
      <View style={[st.aviso, st.avisoBaixo]}>
        <View style={[st.avisoIcone, { backgroundColor: '#DCFCE7' }]}>
          <Icone nome="checkmark" tamanho={14} cor="#15803D" />
        </View>
        <Text style={st.avisoTexto}>Parcela 3/10 lançada</Text>
      </View>
    </View>
  )
}

const useSt = criarEstilos((cores) => ({
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: cores.texto1,
  },
  googleLogo: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  googleTexto: { fontSize: 15, ...f[700], color: cores.superficie },
  ou: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  traco: { flex: 1, height: 1, backgroundColor: cores.linha },
  ouTexto: { fontSize: 12, ...f[500], color: cores.texto3 },
  marca: { backgroundColor: cores.marca, alignItems: 'center', justifyContent: 'center' },
  ilustracao: { width: 300, height: 210, alignSelf: 'center', justifyContent: 'center', alignItems: 'center' },
  cartao: {
    width: 240,
    height: 150,
    borderRadius: 20,
    padding: 18,
    backgroundColor: '#004AAD',
    transform: [{ rotate: '-6deg' }],
    justifyContent: 'space-between',
    elevation: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
  },
  cartaoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartaoNome: { color: '#FFFFFF', fontSize: 14, ...f[800], letterSpacing: -0.2 },
  cartaoChip: { width: 36, height: 26, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.35)' },
  cartaoNumero: { color: 'rgba(255,255,255,0.9)', fontSize: 14, ...f[600], letterSpacing: 1 },
  aviso: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 7,
    paddingLeft: 7,
    paddingRight: 14,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  avisoCima: { top: 4, right: 0 },
  avisoBaixo: { bottom: 6, left: 0 },
  avisoIcone: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avisoTexto: { fontSize: 12, ...f[700], color: '#0E1726' },
}))
