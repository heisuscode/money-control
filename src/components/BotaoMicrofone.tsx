import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, Mic, MicOff, Square } from 'lucide-react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { lerTranscricao, SEGUNDOS_MAX_AUDIO } from '@/lib/assistente'
import { cn } from '@/lib/cn'

type Estado = 'parado' | 'gravando' | 'transcrevendo'

/** Por que o microfone não abriu — cada caso tem uma orientação diferente. */
type Problema = 'pedir' | 'bloqueado' | 'sistema' | 'sem-microfone' | 'em-uso' | 'app-embutido' | 'inseguro'

const CHAVE_JA_PERMITIU = 'mc_microfone_explicado'

// Navegadores dentro de outros apps (Instagram, Facebook, WhatsApp, webview
// do Android) costumam negar o microfone sem perguntar.
function dentroDeOutroApp() {
  return /Instagram|FBAN|FBAV|WhatsApp|Line\/|; wv\)/i.test(navigator.userAgent)
}

async function estadoDaPermissao(): Promise<PermissionState | 'desconhecido'> {
  try {
    const r = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return r.state
  } catch {
    return 'desconhecido' // Safari antigo/Firefox: só dá para saber tentando
  }
}

/**
 * Microfone do assistente: toca para gravar, toca de novo para parar (para
 * sozinho em 1 minuto). Antes da primeira vez explica e dispara o pedido de
 * permissão do navegador; se estiver bloqueado, ensina a liberar.
 */
export function BotaoMicrofone({
  aoTranscrever,
  aoErro,
  desabilitado,
}: {
  aoTranscrever: (texto: string) => void
  aoErro: (mensagem: string) => void
  desabilitado?: boolean
}) {
  const [estado, setEstado] = useState<Estado>('parado')
  const [segundos, setSegundos] = useState(0)
  const [problema, setProblema] = useState<Problema | null>(null)
  /** nome e mensagem do erro do navegador, para diagnóstico */
  const [detalhe, setDetalhe] = useState<string | null>(null)
  const gravador = useRef<MediaRecorder | null>(null)
  const pedacos = useRef<Blob[]>([])
  const relogio = useRef<number | null>(null)

  const suportado = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined'

  // saiu da página gravando: solta o microfone
  useEffect(
    () => () => {
      if (relogio.current) window.clearInterval(relogio.current)
      gravador.current?.stream.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  async function enviar(audio: Blob) {
    setEstado('transcrevendo')
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return aoErro('Sua sessão expirou. Entre de novo.')
      const resposta = await fetch('/api/transcrever', {
        method: 'POST',
        headers: { 'content-type': audio.type || 'audio/webm', authorization: `Bearer ${token}` },
        body: audio,
      })
      const r = await lerTranscricao(resposta)
      if (r.texto) aoTranscrever(r.texto)
      else aoErro(r.erro ?? 'Não consegui entender o áudio.')
    } catch {
      aoErro('Sem conexão. Tente de novo ou digite.')
    } finally {
      setEstado('parado')
    }
  }

  function parar() {
    if (relogio.current) window.clearInterval(relogio.current)
    relogio.current = null
    if (gravador.current?.state === 'recording') gravador.current.stop()
  }

  /** Abre o microfone (aqui o navegador mostra a pergunta "Permitir?"). */
  async function abrirMicrofone() {
    setProblema(null)
    setDetalhe(null)
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return setProblema('inseguro')
    let fluxo: MediaStream
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      const nome = e instanceof Error ? e.name : ''
      const mensagem = e instanceof Error ? e.message : String(e)
      setDetalhe(`${nome || 'Erro'}: ${mensagem || 'sem mensagem'}`)
      console.warn('[microfone]', nome, mensagem)
      if (nome === 'NotFoundError' || nome === 'OverconstrainedError') return setProblema('sem-microfone')
      if (nome === 'NotReadableError' || nome === 'AbortError') return setProblema('em-uso')
      if (dentroDeOutroApp()) return setProblema('app-embutido')
      // site liberado mas negado mesmo assim = o sistema (Windows/Android) bloqueou o navegador
      const permissao = await estadoDaPermissao()
      if (permissao === 'granted' || /system|sistema/i.test(mensagem)) return setProblema('sistema')
      return setProblema('bloqueado')
    }
    try {
      localStorage.setItem(CHAVE_JA_PERMITIU, '1')
    } catch {
      /* sem armazenamento: só vai explicar de novo na próxima */
    }
    // Chrome/Firefox gravam webm; Safari grava mp4
    const tipo = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t))
    const rec = new MediaRecorder(fluxo, tipo ? { mimeType: tipo } : undefined)
    pedacos.current = []
    rec.ondataavailable = (e) => e.data.size && pedacos.current.push(e.data)
    rec.onstop = () => {
      fluxo.getTracks().forEach((t) => t.stop())
      const audio = new Blob(pedacos.current, { type: rec.mimeType || tipo || 'audio/webm' })
      gravador.current = null
      enviar(audio)
    }
    gravador.current = rec
    rec.start()
    setSegundos(0)
    setEstado('gravando')
    relogio.current = window.setInterval(() => {
      setSegundos((s) => {
        if (s + 1 >= SEGUNDOS_MAX_AUDIO) parar()
        return s + 1
      })
    }, 1000)
  }

  async function aoTocar() {
    if (estado === 'gravando') return parar()
    const permissao = await estadoDaPermissao()
    if (permissao === 'granted') return abrirMicrofone()
    if (permissao === 'denied') return setProblema(dentroDeOutroApp() ? 'app-embutido' : 'bloqueado')
    // ainda não perguntou: explica antes do pedido do navegador (só na primeira vez)
    let jaExplicou = false
    try {
      jaExplicou = localStorage.getItem(CHAVE_JA_PERMITIU) === '1'
    } catch {
      /* ignora */
    }
    if (jaExplicou) return abrirMicrofone()
    setProblema('pedir')
  }

  if (!suportado) return null

  const gravando = estado === 'gravando'
  return (
    <>
      <div className="flex items-center gap-2">
        {gravando && (
          <span className="num text-[13px] font-semibold text-danger" aria-live="polite">
            0:{String(segundos).padStart(2, '0')}
          </span>
        )}
        <button
          type="button"
          onClick={aoTocar}
          disabled={desabilitado || estado === 'transcrevendo'}
          aria-label={gravando ? 'Parar e transcrever' : estado === 'transcrevendo' ? 'Transcrevendo' : 'Falar em vez de digitar'}
          title={gravando ? 'Parar' : 'Falar'}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl border transition disabled:opacity-50',
            gravando ? 'animate-pulse border-danger bg-danger text-white' : 'border-line text-text-2 hover:bg-subtle',
          )}
        >
          {estado === 'transcrevendo' ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : gravando ? (
            <Square size={16} fill="currentColor" />
          ) : (
            <Mic size={18} />
          )}
        </button>
      </div>

      <Modal
        open={!!problema}
        onOpenChange={(v) => !v && setProblema(null)}
        title={problema === 'pedir' ? 'Falar com o assistente' : 'Microfone indisponível'}
        maxWidth={420}
      >
        {problema && (
          <Orientacao problema={problema} detalhe={detalhe} aoPermitir={abrirMicrofone} aoFechar={() => setProblema(null)} />
        )}
      </Modal>
    </>
  )
}

function Orientacao({
  problema,
  detalhe,
  aoPermitir,
  aoFechar,
}: {
  problema: Problema
  detalhe: string | null
  aoPermitir: () => void
  aoFechar: () => void
}) {
  const celular = /Android|iPhone|iPad/i.test(navigator.userAgent)

  if (problema === 'pedir') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-xl bg-active-bg p-3 text-brand">
          <Mic size={22} aria-hidden />
          <p className="text-[14px] text-text-1">
            Fale seus gastos em vez de digitar. O navegador vai perguntar se pode usar o microfone: toque em <b>Permitir</b>.
          </p>
        </div>
        <p className="text-[12px] text-text-3">O áudio vira texto, vai para o assistente e não fica guardado.</p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={aoFechar}>Agora não</Button>
          <Button className="flex-1" onClick={aoPermitir}>
            <Mic size={16} /> Permitir microfone
          </Button>
        </div>
      </div>
    )
  }

  const passos: Record<Exclude<Problema, 'pedir'>, { titulo: string; itens: string[] }> = {
    bloqueado: celular
      ? {
          titulo: 'O microfone está bloqueado para este site. Para liberar:',
          itens: [
            'No Chrome: toque no ícone à esquerda do endereço (cadeado ou ajustes).',
            'Toque em Permissões → Microfone → Permitir.',
            'Se não aparecer: ⋮ → Configurações → Configurações do site → Microfone, e tire este site da lista de bloqueados.',
            'Volte aqui e toque em Tentar de novo.',
          ],
        }
      : {
          titulo: 'O microfone está bloqueado para este site. Para liberar:',
          itens: [
            'Clique no ícone à esquerda do endereço (cadeado ou ajustes).',
            'Em Microfone, escolha Permitir.',
            'Se pedir, recarregue a página.',
            'Clique em Tentar de novo.',
          ],
        },
    sistema: celular
      ? {
          titulo: 'O site está liberado, mas o celular não deixa o navegador usar o microfone.',
          itens: [
            'Abra as Configurações do Android → Apps → Chrome (ou o navegador que você usa).',
            'Toque em Permissões → Microfone → Permitir.',
            'Volte aqui e toque em Tentar de novo.',
          ],
        }
      : {
          titulo: 'O site está liberado, mas o Windows não deixa o navegador usar o microfone.',
          itens: [
            'Abra Configurações do Windows → Privacidade e segurança → Microfone.',
            'Ligue "Acesso ao microfone" e "Permitir que os aplicativos acessem o microfone".',
            'Mais abaixo, ligue também "Permitir que aplicativos da área de trabalho acessem o microfone".',
            'Feche e abra o navegador de novo, volte aqui e clique em Tentar de novo.',
          ],
        },
    'app-embutido': {
      titulo: 'Esta página foi aberta dentro de outro app (WhatsApp, Instagram…), que não deixa usar o microfone.',
      itens: ['Toque em ⋮ ou no menu do app e escolha "Abrir no Chrome" (ou no navegador).', 'Entre na sua conta lá e use o microfone.'],
    },
    'sem-microfone': {
      titulo: 'Nenhum microfone foi encontrado neste aparelho.',
      itens: ['Conecte um fone com microfone ou use o celular.', 'Depois clique em Tentar de novo.'],
    },
    'em-uso': {
      titulo: 'O microfone está sendo usado por outro programa (chamada, gravador…).',
      itens: ['Feche a chamada ou o programa que está usando o microfone.', 'Depois clique em Tentar de novo.'],
    },
    inseguro: {
      titulo: 'O navegador só libera o microfone em páginas seguras (https).',
      itens: ['Abra o site pelo endereço com https://.'],
    },
  }
  const p = passos[problema]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-xl bg-danger-bg p-3 text-danger">
        <MicOff size={20} className="mt-0.5 shrink-0" aria-hidden />
        <p className="text-[14px] font-semibold">{p.titulo}</p>
      </div>
      <ol className="list-decimal space-y-1.5 pl-5 text-[14px] text-text-2">
        {p.itens.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ol>
      {detalhe && <p className="text-[11px] text-text-3">Detalhe técnico: {detalhe}</p>}
      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={aoFechar}>Fechar</Button>
        {problema !== 'app-embutido' && problema !== 'inseguro' && (
          <Button className="flex-1" onClick={aoPermitir}>Tentar de novo</Button>
        )}
      </div>
    </div>
  )
}
