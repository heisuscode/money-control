import { router, type Href } from 'expo-router'
import { useState } from 'react'
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Notificacao, TipoNotificacao } from '@/lib/types'
import { Botao, Cartao, Icone, ItemMenu, Tela, Vazio, type NomeIcone } from '~/components/ui'
import { useDados } from '~/context/DadosProvider'
import { cores, f } from '~/theme'

const TIPO: Record<TipoNotificacao, { icone: NomeIcone; cor: string; fundo: string; destino: Href }> = {
  vencimento: { icone: 'receipt-outline', cor: cores.aviso, fundo: cores.avisoFundo, destino: '/contas' },
  credito: { icone: 'card-outline', cor: cores.marca, fundo: cores.ativoFundo, destino: '/carteiras' },
  orcamento: { icone: 'pie-chart-outline', cor: cores.perigo, fundo: cores.perigoFundo, destino: '/categorias' },
  meta: { icone: 'flag-outline', cor: cores.sucesso, fundo: cores.sucessoFundo, destino: '/metas' },
  cambio: { icone: 'swap-horizontal-outline', cor: cores.texto2, fundo: cores.sutil, destino: '/cambio' },
}

export default function Notificacoes() {
  const d = useDados()
  const [atualizando, setAtualizando] = useState(false)
  const naoLidas = d.notificacoes.filter((n) => !n.lida)

  function abrir(n: Notificacao) {
    if (!n.lida) d.marcarNotificacoesLidas([n.id]).catch(() => {})
    router.push(TIPO[n.tipo]?.destino ?? '/')
  }

  async function atualizar() {
    setAtualizando(true)
    await d.recarregar()
    setAtualizando(false)
  }

  return (
    <Tela
      titulo="Notificações"
      subtitulo={naoLidas.length ? `${naoLidas.length} não lidas` : undefined}
      voltar
      aoAtualizar={<RefreshControl refreshing={atualizando} onRefresh={atualizar} colors={[cores.marca]} />}
    >
      {naoLidas.length > 0 ? (
        <Botao variante="texto" icone="checkmark-done" onPress={() => d.marcarNotificacoesLidas().catch(() => {})} style={{ alignSelf: 'flex-end', minHeight: 36, paddingHorizontal: 0 }}>
          Marcar todas como lidas
        </Botao>
      ) : null}

      {d.notificacoes.length === 0 ? (
        <Cartao>
          <Vazio icone="notifications-outline" titulo="Nenhuma notificação" descricao="Avisos de vencimento, orçamento e metas aparecem aqui." />
        </Cartao>
      ) : (
        <Cartao style={{ paddingVertical: 2, paddingHorizontal: 0, overflow: 'hidden' }}>
          {d.notificacoes.map((n, i) => {
            const t = TIPO[n.tipo] ?? TIPO.vencimento
            return (
              <Pressable
                key={n.id}
                onPress={() => abrir(n)}
                style={({ pressed }) => [st.linha, i > 0 && st.divisor, !n.lida && st.naoLida, pressed && { opacity: 0.6 }]}
              >
                <View style={[st.icone, { backgroundColor: t.fundo }]}>
                  <Icone nome={t.icone} tamanho={19} cor={t.cor} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[st.titulo, !n.lida && f[800]]} numberOfLines={1}>{n.titulo}</Text>
                    {!n.lida ? <View style={st.ponto} accessibilityLabel="não lida" /> : null}
                  </View>
                  <Text style={st.descricao} numberOfLines={2}>{n.descricao}</Text>
                  <Text style={st.quando}>{formatDistanceToNow(new Date(n.criado_em), { addSuffix: true, locale: ptBR })}</Text>
                </View>
              </Pressable>
            )
          })}
        </Cartao>
      )}

      <Cartao style={{ paddingVertical: 2 }}>
        <ItemMenu
          primeiro
          icone="alarm-outline"
          titulo="Lembretes no celular"
          detalhe="Horário e antecedência dos avisos"
          aoTocar={() => router.push('/configuracoes')}
        />
      </Cartao>
    </Tela>
  )
}

const st = StyleSheet.create({
  linha: { flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  divisor: { borderTopWidth: 1, borderTopColor: cores.sutil },
  naoLida: { backgroundColor: '#F5F8FF' },
  icone: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 14, ...f[600], color: cores.texto1, flexShrink: 1 },
  ponto: { width: 8, height: 8, borderRadius: 4, backgroundColor: cores.marca },
  descricao: { fontSize: 13, ...f[400], color: cores.texto2, lineHeight: 18 },
  quando: { fontSize: 11, ...f[500], color: cores.texto3 },
})
