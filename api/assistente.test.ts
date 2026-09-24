import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OPTIONS, POST } from './assistente'

const pedido = (corpo: unknown, token?: string) =>
  new Request('https://exemplo/api/assistente', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  })

describe('api/assistente — guardas antes de chamar a IA', () => {
  const salvo = { ...process.env }
  beforeEach(() => {
    process.env.IA_CHAVE = 'teste'
    process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co'
    process.env.VITE_SUPABASE_ANON_KEY = 'anon'
  })
  afterEach(() => {
    process.env = { ...salvo }
  })

  it('responde ao preflight do navegador', async () => {
    const r = await OPTIONS()
    expect(r.status).toBe(204)
    expect(r.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('sem chave configurada: 503', async () => {
    delete process.env.IA_CHAVE
    delete process.env.GROQ_API_KEY
    const r = await POST(pedido({ mensagens: [{ papel: 'usuario', texto: 'oi' }] }, 't'))
    expect(r.status).toBe(503)
  })

  it('sem login: 401', async () => {
    const r = await POST(pedido({ mensagens: [{ papel: 'usuario', texto: 'oi' }] }))
    expect(r.status).toBe(401)
  })

  it('corpo inválido: 400', async () => {
    expect((await POST(pedido('{quebrado', 't'))).status).toBe(400)
  })

  it('conversa que não termina com o usuário: 400', async () => {
    const r = await POST(pedido({ mensagens: [{ papel: 'assistente', texto: 'Olá!' }] }, 't'))
    expect(r.status).toBe(400)
  })
})
