import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Botao, Icone } from '~/components/ui'
import { usePreferencias } from '~/context/Preferencias'
import { pedirPermissaoLembretes } from '~/lib/lembretes'
import { cores, f } from '~/theme'

/** Explica os lembretes antes do pedido de permissão do Android (só aparece uma vez). */
export default function AtivarLembretes() {
  const p = usePreferencias()

  async function ativar() {
    const ok = await pedirPermissaoLembretes()
    p.mudar({ lembretesApresentados: true, lembretes: { ...p.lembretes, ativo: ok } })
    router.back()
  }

  function agoraNao() {
    p.mudar({ lembretesApresentados: true, lembretes: { ...p.lembretes, ativo: false } })
    router.back()
  }

  const hora = `${String(p.lembretes.hora).padStart(2, '0')}:00`

  return (
    <SafeAreaView style={st.tela}>
      <View style={st.sino}>
        <Icone nome="notifications-outline" tamanho={56} cor="#FFFFFF" />
      </View>
      <Text style={st.titulo}>Nunca mais esqueça um vencimento</Text>
      <Text style={st.texto}>O MoneyControl avisa um dia antes, às {hora.slice(0, 2)}h. Só isso: nada de propaganda.</Text>

      <View style={st.exemplo} accessibilityLabel="Exemplo de lembrete">
        <View style={st.exemploIcone}>
          <Icone nome="stats-chart" tamanho={18} cor="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={st.entre}>
            <Text style={[st.pequeno, f[700]]}>MoneyControl</Text>
            <Text style={st.pequeno}>{hora}</Text>
          </View>
          <Text style={st.exemploTitulo}>Vence amanhã</Text>
          <Text style={st.exemploTexto}>Fatura do cartão · R$ 334,80</Text>
        </View>
      </View>

      <View style={{ gap: 12, marginTop: 24 }}>
        {['Contas a pagar e faturas de cartão', 'Recorrências como aluguel e assinaturas', 'Horário e antecedência ajustáveis'].map((t) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icone nome="checkmark" tamanho={20} cor={cores.sucesso} />
            <Text style={st.item}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      <Botao onPress={ativar}>Ativar lembretes</Botao>
      <Botao variante="texto" onPress={agoraNao} style={{ marginTop: 4 }}>
        <Text style={{ color: cores.texto2 }}>Agora não</Text>
      </Botao>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 16 },
  entre: { flexDirection: 'row', justifyContent: 'space-between' },
  sino: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: cores.marca,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: cores.marca,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 16 },
  },
  titulo: { marginTop: 32, textAlign: 'center', fontSize: 26, lineHeight: 32, ...f[800], color: cores.texto1, letterSpacing: -0.5 },
  texto: { marginTop: 10, textAlign: 'center', fontSize: 15, lineHeight: 22, ...f[400], color: cores.texto2 },
  exemplo: {
    marginTop: 28,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    elevation: 2,
  },
  exemploIcone: { width: 36, height: 36, borderRadius: 10, backgroundColor: cores.marca, alignItems: 'center', justifyContent: 'center' },
  pequeno: { fontSize: 12, ...f[400], color: cores.texto3 },
  exemploTitulo: { fontSize: 14, ...f[700], color: cores.texto1, marginTop: 2 },
  exemploTexto: { fontSize: 13, ...f[400], color: cores.texto2 },
  item: { fontSize: 14, ...f[500], color: cores.texto2 },
})
