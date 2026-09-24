import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, Mic, Square } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { lerTranscricao, SEGUNDOS_MAX_AUDIO } from '@/lib/assistente'
import { cn } from '@/lib/cn'

type Estado = 'parado' | 'gravando' | 'transcrevendo'

/**
 * Microfone do assistente: toca para gravar, toca de novo para parar (para
 * sozinho em 1 minuto). O áudio vira texto em api/transcrever e volta por
 * `aoTranscrever`, para a pessoa conferir antes de enviar.
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
  const gravador = useRef<MediaRecorder | null>(null)
  const pedacos = useRef<Blob[]>([])
  const relogio = useRef<number | null>(null)

  const suportado = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'

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

  async function gravar() {
    let fluxo: MediaStream
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      return aoErro('O navegador não liberou o microfone. Permita o acesso no cadeado ao lado do endereço.')
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

  if (!suportado) return null

  const gravando = estado === 'gravando'
  return (
    <div className="flex items-center gap-2">
      {gravando && (
        <span className="num text-[13px] font-semibold text-danger" aria-live="polite">
          0:{String(segundos).padStart(2, '0')}
        </span>
      )}
      <button
        type="button"
        onClick={gravando ? parar : gravar}
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
  )
}
