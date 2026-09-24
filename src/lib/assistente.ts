// Cliente do assistente financeiro (api/assistente.ts), usado pelo site e pelo app.
// Sem React e sem import.meta.env: cada plataforma passa o endereço e o token.

export interface MensagemAssistente {
  papel: 'usuario' | 'assistente'
  texto: string
  /** lançamentos que o assistente gravou ao responder esta mensagem */
  registros?: RegistroAssistente[]
  /** registros desfeitos pelo usuário (ids) */
  desfeitos?: string[]
  erro?: boolean
}

export interface RegistroAssistente {
  id: string
  tipo: 'receita' | 'despesa'
  valor: number
  descricao: string
  data: string
  categoria: string | null
}

export const SUGESTOES_ASSISTENTE = [
  'Gastei 45 no almoço',
  'Como estão meus gastos este mês?',
  'Quanto falta para a minha meta?',
  'Onde posso economizar?',
]

export const BOAS_VINDAS_ASSISTENTE =
  'Oi! Me conta o que você gastou ou recebeu que eu já registro — por exemplo "gastei 32 no mercado". Também posso responder sobre seus gastos, metas e dar dicas de economia.'

/** Manda a conversa (só texto) e devolve a resposta do assistente. Nunca lança erro. */
export async function perguntarAoAssistente(
  endereco: string,
  token: string,
  conversa: MensagemAssistente[],
): Promise<{ resposta: string; registros: RegistroAssistente[]; erro?: boolean }> {
  try {
    const resposta = await fetch(endereco, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        mensagens: conversa.filter((m) => !m.erro).map(({ papel, texto }) => ({ papel, texto })),
      }),
    })
    const corpo = (await resposta.json().catch(() => ({}))) as { resposta?: string; registros?: RegistroAssistente[]; erro?: string }
    if (!resposta.ok || corpo.erro) {
      return { resposta: corpo.erro ?? 'O assistente não respondeu. Tente de novo.', registros: [], erro: true }
    }
    return { resposta: corpo.resposta ?? '', registros: corpo.registros ?? [] }
  } catch {
    return { resposta: 'Sem conexão com o assistente. Verifique a internet e tente de novo.', registros: [], erro: true }
  }
}
