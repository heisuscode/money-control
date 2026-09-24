import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OPTIONS, POST } from './transcrever'

const pedido = (corpo: BodyInit, tipo: string, token?: string) =>
  new Request('https://exemplo/api/transcrever', {
    method: 'POST',
    headers: { 'content-type': tipo, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: corpo,
  })

describe('api/transcrever — guardas antes de chamar a transcrição', () => {
  const salvo = { ...process.env }
  beforeEach(() => {
    process.env.IA_CHAVE = 'teste'
    process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co'
    process.env.VITE_SUPABASE_ANON_KEY = 'anon'
  })
  afterEach(() => {
    process.env = { ...salvo }
  })

  it('preflight', async () => {
    expect((await OPTIONS()).status).toBe(204)
  })

  it('sem chave: 503 dizendo o nome do que falta', async () => {
    delete process.env.IA_CHAVE
    delete process.env.GROQ_API_KEY
    const r = await POST(pedido(new Uint8Array(1000), 'audio/webm', 't'))
    expect(r.status).toBe(503)
    expect((await r.json()).faltando).toEqual(['IA_CHAVE'])
  })

  it('sem login: 401', async () => {
    expect((await POST(pedido(new Uint8Array(1000), 'audio/webm'))).status).toBe(401)
  })

  it('não é áudio: 415', async () => {
    expect((await POST(pedido('oi', 'text/plain', 't'))).status).toBe(415)
  })

  it('áudio vazio: 400', async () => {
    expect((await POST(pedido(new Uint8Array(10), 'audio/m4a', 't'))).status).toBe(400)
  })

  it('áudio grande demais: 413', async () => {
    expect((await POST(pedido(new Uint8Array(5 * 1024 * 1024), 'audio/m4a', 't'))).status).toBe(413)
  })
})
