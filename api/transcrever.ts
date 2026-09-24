// Transcreve o áudio do botão de microfone do assistente (site e app).
//
// Recebe o áudio cru no corpo (Content-Type audio/webm, audio/mp4, audio/m4a...)
// e devolve { texto }. Usa o Whisper da Groq com a mesma chave do assistente
// (IA_CHAVE). O áudio não é guardado: vai para a transcrição e é descartado.
// Só usuários logados (token do Supabase) podem usar, para ninguém gastar a
// cota gratuita de fora.

import { createClient } from '@supabase/supabase-js'

const URL_PADRAO = 'https://api.groq.com/openai/v1/audio/transcriptions'
const MODELO_PADRAO = 'whisper-large-v3-turbo'
/** a Vercel aceita até ~4,5 MB no corpo; 1 minuto de voz fica bem abaixo disso */
const TAMANHO_MAXIMO = 4 * 1024 * 1024

// palavras comuns no app ajudam o Whisper a acertar a grafia
const DICA =
  'Conversa sobre finanças pessoais em português do Brasil: gastei, recebi, reais, centavos, mercado, almoço, Uber, ' +
  'salário, Pix, cartão Nubank, fatura, meta, viagem, economia.'

const cabecalhosCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(corpo: unknown, status = 200) {
  return Response.json(corpo, { status, headers: cabecalhosCors })
}

function extensao(tipo: string) {
  if (tipo.includes('webm')) return 'webm'
  if (tipo.includes('ogg')) return 'ogg'
  if (tipo.includes('wav')) return 'wav'
  if (tipo.includes('mpeg') || tipo.includes('mp3')) return 'mp3'
  return 'm4a' // audio/mp4, audio/m4a, audio/x-m4a (celular e Safari)
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cabecalhosCors })
}

export async function POST(request: Request) {
  const chave = process.env.IA_CHAVE ?? process.env.GROQ_API_KEY
  const urlSupabase = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const chaveSupabase = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  if (!chave || !urlSupabase || !chaveSupabase) {
    const faltando = [!chave && 'IA_CHAVE', !urlSupabase && 'VITE_SUPABASE_URL', !chaveSupabase && 'VITE_SUPABASE_ANON_KEY'].filter(Boolean)
    return json({ erro: 'A transcrição ainda não foi configurada no servidor.', faltando }, 503)
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ erro: 'Entre na sua conta para usar o microfone.' }, 401)

  const tipo = (request.headers.get('content-type') ?? '').toLowerCase()
  if (!tipo.startsWith('audio/') && !tipo.startsWith('video/')) {
    return json({ erro: 'Envie um áudio.' }, 415)
  }

  const audio = await request.arrayBuffer()
  if (audio.byteLength < 500) return json({ erro: 'Não deu para ouvir nada. Segure o botão e fale de novo.' }, 400)
  if (audio.byteLength > TAMANHO_MAXIMO) return json({ erro: 'O áudio ficou longo demais. Fale em até 1 minuto.' }, 413)

  const sb = createClient(urlSupabase, chaveSupabase, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: usuario, error } = await sb.auth.getUser(token)
  if (error || !usuario.user) return json({ erro: 'Sua sessão expirou. Entre de novo.' }, 401)

  const ext = extensao(tipo)
  const formulario = new FormData()
  formulario.append('file', new Blob([audio], { type: tipo.split(';')[0] }), `audio.${ext}`)
  formulario.append('model', process.env.IA_MODELO_AUDIO || MODELO_PADRAO)
  formulario.append('language', 'pt')
  formulario.append('response_format', 'json')
  formulario.append('temperature', '0')
  formulario.append('prompt', DICA)

  try {
    const resposta = await fetch(process.env.IA_URL_AUDIO || URL_PADRAO, {
      method: 'POST',
      headers: { authorization: `Bearer ${chave}` },
      body: formulario,
    })
    if (resposta.status === 429) {
      return json({ erro: 'O limite gratuito de áudio foi atingido por agora. Espere um minuto ou digite.' }, 429)
    }
    if (!resposta.ok) {
      console.error('[transcrever]', resposta.status, (await resposta.text()).slice(0, 300))
      return json({ erro: 'Não consegui entender o áudio. Tente de novo ou digite.' }, 502)
    }
    const corpo = (await resposta.json()) as { text?: string }
    const texto = (corpo.text ?? '').trim()
    if (!texto) return json({ erro: 'Não ouvi nenhuma fala. Tente de novo mais perto do microfone.' }, 422)
    return json({ texto })
  } catch (e) {
    console.error('[transcrever]', e)
    return json({ erro: 'Não consegui entender o áudio. Tente de novo ou digite.' }, 502)
  }
}
