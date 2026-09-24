import { useEffect, useRef, useState } from 'react'
import { Bot, SendHorizontal, Trash2, Undo2 } from 'lucide-react'
import { BotaoMicrofone } from '@/components/BotaoMicrofone'
import { Topbar } from '@/components/Topbar'
import { PageBody } from '@/components/PageBody'
import { Card } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { useData } from '@/contexts/DataContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import {
  BOAS_VINDAS_ASSISTENTE,
  perguntarAoAssistente,
  SUGESTOES_ASSISTENTE,
  type MensagemAssistente,
  type RegistroAssistente,
} from '@/lib/assistente'

const CHAVE_CONVERSA = 'mc_assistente_conversa'

function lerConversa(): MensagemAssistente[] {
  try {
    const bruto = sessionStorage.getItem(CHAVE_CONVERSA)
    return bruto ? (JSON.parse(bruto) as MensagemAssistente[]) : []
  } catch {
    return []
  }
}

export default function Assistente() {
  const { reload } = useData()
  const toast = useToast()
  const [conversa, setConversa] = useState<MensagemAssistente[]>(lerConversa)
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const fim = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLTextAreaElement>(null)

  // conversa fica guardada enquanto a aba estiver aberta
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE_CONVERSA, JSON.stringify(conversa.slice(-40)))
    } catch {
      /* sem armazenamento: tudo bem */
    }
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [conversa, pensando])

  async function enviar(mensagem: string) {
    const limpo = mensagem.trim()
    if (!limpo || pensando) return
    const nova: MensagemAssistente[] = [...conversa, { papel: 'usuario', texto: limpo }]
    setConversa(nova)
    setTexto('')
    setPensando(true)
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const r = token
      ? await perguntarAoAssistente('/api/assistente', token, nova)
      : { resposta: 'Sua sessão expirou. Entre de novo.', registros: [], erro: true }
    setConversa((atual) => [...atual, { papel: 'assistente', texto: r.resposta, registros: r.registros, erro: r.erro }])
    setPensando(false)
    if (r.registros.length) reload(['receitas', 'despesas'])
    campo.current?.focus()
  }

  async function desfazer(indice: number, reg: RegistroAssistente) {
    const { error } = await supabase.from(reg.tipo === 'receita' ? 'receitas' : 'despesas').delete().eq('id', reg.id)
    if (error) {
      toast('error', 'Não foi possível desfazer.')
      return
    }
    setConversa((atual) =>
      atual.map((m, i) => (i === indice ? { ...m, desfeitos: [...(m.desfeitos ?? []), reg.id] } : m)),
    )
    reload([reg.tipo === 'receita' ? 'receitas' : 'despesas'])
    toast('success', `"${reg.descricao}" foi desfeito.`)
  }

  function limpar() {
    setConversa([])
    campo.current?.focus()
  }

  return (
    <>
      <Topbar
        title="Assistente"
        subtitle="Conte seus gastos e pergunte sobre suas finanças"
        actions={
          conversa.length ? (
            <button className="btn-ghost" onClick={limpar}>
              <Trash2 size={16} /> Nova conversa
            </button>
          ) : null
        }
      />
      <PageBody>
        <Card className="mx-auto flex h-[calc(100vh-170px)] min-h-[480px] w-full max-w-3xl flex-col !p-0">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6" aria-live="polite">
            <Balao papel="assistente" texto={BOAS_VINDAS_ASSISTENTE} />
            {conversa.map((m, i) => (
              <div key={i} className="space-y-2">
                <Balao papel={m.papel} texto={m.texto} erro={m.erro} />
                {m.registros?.map((reg) => {
                  const desfeito = m.desfeitos?.includes(reg.id)
                  return (
                    <div
                      key={reg.id}
                      className={cn(
                        'ml-11 flex max-w-md items-center gap-3 rounded-xl border border-line bg-subtle px-3 py-2 text-[13px]',
                        desfeito && 'opacity-60',
                      )}
                    >
                      <span className={cn('font-bold', reg.tipo === 'receita' ? 'text-success' : 'text-text-1')}>
                        {reg.tipo === 'receita' ? '+ ' : '− '}
                        {formatCurrency(reg.valor)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-text-2">
                        {reg.descricao} · {reg.categoria ?? 'sem categoria'} · {formatDate(reg.data, 'dd/MM')}
                      </span>
                      {desfeito ? (
                        <span className="text-[12px] font-semibold text-text-3">Desfeito</span>
                      ) : (
                        <button
                          onClick={() => desfazer(i, reg)}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
                        >
                          <Undo2 size={13} /> Desfazer
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
            {pensando && (
              <div className="flex items-center gap-3">
                <Avatar />
                <span className="inline-flex gap-1 rounded-2xl bg-subtle px-4 py-3" aria-label="Pensando">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-text-3" style={{ animationDelay: `${i * 120}ms` }} />
                  ))}
                </span>
              </div>
            )}
            <div ref={fim} />
          </div>

          {conversa.length === 0 && (
            <div className="flex flex-wrap gap-2 px-4 pb-3 md:px-6">
              {SUGESTOES_ASSISTENTE.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="rounded-full border border-line px-3 py-1.5 text-[13px] font-semibold text-text-2 hover:bg-subtle"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex items-end gap-2 border-t border-line p-3 md:p-4"
            onSubmit={(e) => {
              e.preventDefault()
              enviar(texto)
            }}
          >
            <label htmlFor="mensagem-assistente" className="sr-only">Mensagem para o assistente</label>
            <textarea
              id="mensagem-assistente"
              ref={campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  enviar(texto)
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder='Digite ou toque no microfone: "gastei 80 no mercado"'
              className="input-base max-h-32 min-h-[44px] flex-1 resize-none py-2.5"
            />
            <BotaoMicrofone
              desabilitado={pensando}
              aoErro={(m) => toast('error', m)}
              aoTranscrever={(falado) => {
                // cai no campo para conferir (valores ditos em voz podem vir errados)
                setTexto((atual) => (atual.trim() ? `${atual.trim()} ${falado}` : falado))
                campo.current?.focus()
              }}
            />
            <button type="submit" className="btn-primary h-11 !px-4" disabled={!texto.trim() || pensando} aria-label="Enviar">
              <SendHorizontal size={18} />
            </button>
          </form>
        </Card>
      </PageBody>
    </>
  )
}

function Avatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-active-bg text-brand">
      <Bot size={17} aria-hidden />
    </span>
  )
}

function Balao({ papel, texto, erro }: { papel: 'usuario' | 'assistente'; texto: string; erro?: boolean }) {
  if (papel === 'usuario') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[14px] text-white">
          {texto}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3">
      <Avatar />
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-md px-4 py-2.5 text-[14px]',
          erro ? 'bg-danger-bg text-danger' : 'bg-subtle text-text-1',
        )}
      >
        {texto}
      </div>
    </div>
  )
}
