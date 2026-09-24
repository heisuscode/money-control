// Assistente financeiro (site e app). Conversa sobre as finanças do usuário e
// registra receitas/despesas ditas no chat.
//
// IA: qualquer API no formato "compatível com OpenAI" (chat/completions com
// tools). Padrão: Groq, plano gratuito, modelo pequeno openai/gpt-oss-20b.
// Trocar de provedor (Gemini, OpenRouter...) é só mudar IA_URL/IA_MODELO.
//
// Segurança:
// - A chave da IA fica só aqui (variável IA_CHAVE na Vercel).
// - Toda leitura/gravação no Supabase usa o token do próprio usuário: o RLS
//   garante que ele só vê e grava os próprios dados.
//
// Arquivo autocontido: funções da Vercel não resolvem o alias `@/`, então não
// importa nada de `src/`.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL_PADRAO = 'https://api.groq.com/openai/v1/chat/completions'
const MODELO_PADRAO = 'openai/gpt-oss-20b'
const MAX_MENSAGENS = 20
const MAX_VOLTAS = 5

interface MensagemChat {
  papel: 'usuario' | 'assistente'
  texto: string
}

interface Registro {
  id: string
  tipo: 'receita' | 'despesa'
  valor: number
  descricao: string
  data: string
  categoria: string | null
}

const cabecalhosCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(corpo: unknown, status = 200) {
  return Response.json(corpo, { status, headers: cabecalhosCors })
}

/** yyyy-MM-dd no fuso de São Paulo. */
function hojeSP(deslocamentoDias = 0) {
  const d = new Date(Date.now() + deslocamentoDias * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const soma = (linhas: { valor: number }[]) => Math.round(linhas.reduce((a, l) => a + Number(l.valor), 0) * 100) / 100

/* ----------------------------- contexto ----------------------------- */

interface Contexto {
  uid: string
  categorias: { id: string; nome: string; tipo: 'receita' | 'despesa' }[]
  carteiras: { id: string; nome: string; tipo: string }[]
  resumo: string
}

async function montarContexto(sb: SupabaseClient, uid: string): Promise<Contexto> {
  const hoje = hojeSP()
  const inicioMes = `${hoje.slice(0, 7)}-01`
  const seisMeses = hojeSP(-183)
  const [cats, carts, metas, rec, des, contas, todasRec, todasDes] = await Promise.all([
    sb.from('categorias').select('id, nome, tipo, orcamento').eq('usuario_id', uid).order('nome'),
    sb.from('carteiras').select('id, nome, tipo, limite').eq('usuario_id', uid),
    sb.from('metas').select('objetivo, valor_meta, valor_atual, prazo').eq('usuario_id', uid),
    sb.from('receitas').select('valor, data, categoria_id').eq('usuario_id', uid).gte('data', seisMeses),
    sb.from('despesas').select('valor, data, categoria_id').eq('usuario_id', uid).gte('data', seisMeses),
    sb.from('contas').select('descricao, valor, vencimento, status').eq('usuario_id', uid).neq('status', 'pago').order('vencimento').limit(10),
    sb.from('receitas').select('valor').eq('usuario_id', uid),
    sb.from('despesas').select('valor').eq('usuario_id', uid),
  ])
  for (const r of [cats, carts, metas, rec, des, contas, todasRec, todasDes]) if (r.error) throw r.error

  const categorias = (cats.data ?? []) as (Contexto['categorias'][number] & { orcamento: number })[]
  const nomeCat = (id: string | null) => categorias.find((c) => c.id === id)?.nome ?? 'Sem categoria'

  // totais por mês (últimos 6)
  const meses = new Map<string, { entrou: number; saiu: number }>()
  for (const r of rec.data ?? []) {
    const m = String(r.data).slice(0, 7)
    meses.set(m, { entrou: (meses.get(m)?.entrou ?? 0) + Number(r.valor), saiu: meses.get(m)?.saiu ?? 0 })
  }
  for (const d of des.data ?? []) {
    const m = String(d.data).slice(0, 7)
    meses.set(m, { entrou: meses.get(m)?.entrou ?? 0, saiu: (meses.get(m)?.saiu ?? 0) + Number(d.valor) })
  }
  const linhasMeses = [...meses.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([m, t]) => `- ${m}: entrou ${brl(t.entrou)}, saiu ${brl(t.saiu)}, saldo ${brl(t.entrou - t.saiu)}`)

  // gastos do mês por categoria, com orçamento
  const porCat = new Map<string, number>()
  for (const d of des.data ?? []) {
    if (String(d.data) < inicioMes) continue
    const k = d.categoria_id ?? 'sem'
    porCat.set(k, (porCat.get(k) ?? 0) + Number(d.valor))
  }
  const linhasCat = [...porCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, v]) => {
      const cat = categorias.find((c) => c.id === id)
      const orc = cat && cat.orcamento > 0 ? ` (orçamento ${brl(cat.orcamento)})` : ''
      return `- ${nomeCat(id === 'sem' ? null : id)}: ${brl(v)}${orc}`
    })

  const linhasMetas = (metas.data ?? []).map(
    (m) =>
      `- ${m.objetivo}: guardado ${brl(Number(m.valor_atual))} de ${brl(Number(m.valor_meta))}` +
      (m.prazo ? `, prazo ${m.prazo}` : ', sem prazo'),
  )
  const linhasContas = (contas.data ?? []).map((c) => `- ${c.descricao}: ${brl(Number(c.valor))}, vence ${c.vencimento}`)

  const resumo = [
    `Hoje é ${hoje} (fuso de São Paulo).`,
    `Saldo total (todas as receitas − todas as despesas): ${brl(soma(todasRec.data ?? []) - soma(todasDes.data ?? []))}.`,
    '',
    'Mês a mês (últimos 6 meses):',
    ...(linhasMeses.length ? linhasMeses : ['- sem lançamentos']),
    '',
    'Despesas deste mês por categoria:',
    ...(linhasCat.length ? linhasCat : ['- nenhuma ainda']),
    '',
    'Metas:',
    ...(linhasMetas.length ? linhasMetas : ['- nenhuma cadastrada']),
    '',
    'Contas a pagar pendentes (cadastradas à mão):',
    ...(linhasContas.length ? linhasContas : ['- nenhuma']),
    '',
    'Categorias disponíveis (id → nome, tipo):',
    ...categorias.map((c) => `- ${c.id} → ${c.nome} (${c.tipo})`),
    '',
    'Carteiras (id → nome, tipo):',
    ...((carts.data ?? []).length ? (carts.data ?? []).map((c) => `- ${c.id} → ${c.nome} (${c.tipo})`) : ['- nenhuma']),
  ].join('\n')

  return {
    uid,
    categorias: categorias.map(({ id, nome, tipo }) => ({ id, nome, tipo })),
    carteiras: (carts.data ?? []) as Contexto['carteiras'],
    resumo,
  }
}

/* ------------------------------ ferramentas ------------------------------ */

interface Ferramenta {
  name: string
  description: string
  parameters: Record<string, unknown>
}

const FERRAMENTAS: Ferramenta[] = [
  {
    name: 'registrar_transacao',
    description:
      'Grava uma receita ou despesa do usuário. Use só quando souber o valor, o que foi (descrição) e se é receita ou despesa. Nunca invente o que foi: se faltar, pergunte antes.',
    parameters: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['receita', 'despesa'] },
        valor: { type: 'number', description: 'Valor em reais, positivo. Ex.: 45.9' },
        descricao: { type: 'string', description: 'Curta, com inicial maiúscula. Ex.: "Almoço", "Salário de setembro"' },
        categoria_id: {
          type: 'string',
          description: 'Id de uma categoria da lista, do mesmo tipo. Omita se nenhuma combinar.',
        },
        carteira_id: {
          type: 'string',
          description: 'Id da carteira, só se o usuário disser como pagou/recebeu. Receita nunca vai para cartão de crédito.',
        },
        data: { type: 'string', description: 'yyyy-MM-dd. Padrão: hoje.' },
      },
      required: ['tipo', 'valor', 'descricao'],
    },
  },
  {
    name: 'buscar_transacoes',
    description:
      'Lista receitas/despesas do usuário para responder perguntas detalhadas (ex.: "quanto gastei com mercado em agosto?"). Devolve no máximo 40 lançamentos e o total.',
    parameters: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['receita', 'despesa'] },
        de: { type: 'string', description: 'yyyy-MM-dd (inclusive)' },
        ate: { type: 'string', description: 'yyyy-MM-dd (inclusive)' },
        categoria_id: { type: 'string' },
        texto: { type: 'string', description: 'Trecho da descrição' },
      },
      required: ['tipo'],
    },
  },
]

type Entrada = Record<string, unknown>

async function registrarTransacao(sb: SupabaseClient, ctx: Contexto, e: Entrada, registros: Registro[]) {
  const tipo = e.tipo === 'receita' ? 'receita' : e.tipo === 'despesa' ? 'despesa' : null
  const valor = Math.round(Number(e.valor) * 100) / 100
  const descricao = String(e.descricao ?? '').trim().slice(0, 120)
  const data = typeof e.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.data) ? e.data : hojeSP()
  if (!tipo) return { erro: 'tipo deve ser receita ou despesa' }
  if (!(valor > 0 && valor < 100_000_000)) return { erro: 'valor inválido' }
  if (!descricao) return { erro: 'falta a descrição (pergunte ao usuário com o que foi)' }

  const categoria = ctx.categorias.find((c) => c.id === e.categoria_id && c.tipo === tipo) ?? null
  const carteira = ctx.carteiras.find((c) => c.id === e.carteira_id) ?? null
  if (carteira && tipo === 'receita' && carteira.tipo === 'cartao_credito') return { erro: 'receita não pode ir para cartão de crédito' }

  const tabela = tipo === 'receita' ? 'receitas' : 'despesas'
  const { data: linha, error } = await sb
    .from(tabela)
    .insert({
      usuario_id: ctx.uid,
      descricao,
      valor,
      valor_convertido: valor,
      valor_original: valor,
      moeda_original: 'BRL',
      taxa: 1,
      taxa_timestamp: new Date().toISOString(),
      data,
      categoria_id: categoria?.id ?? null,
      carteira_id: carteira?.id ?? null,
    })
    .select('id')
    .single()
  if (error) return { erro: 'não foi possível gravar agora' }

  registros.push({ id: linha.id as string, tipo, valor, descricao, data, categoria: categoria?.nome ?? null })
  return { ok: true, id: linha.id, tipo, valor: brl(valor), descricao, data, categoria: categoria?.nome ?? 'sem categoria', carteira: carteira?.nome ?? null }
}

async function buscarTransacoes(sb: SupabaseClient, ctx: Contexto, e: Entrada) {
  const tabela = e.tipo === 'receita' ? 'receitas' : 'despesas'
  let q = sb.from(tabela).select('descricao, valor, data, categoria_id').eq('usuario_id', ctx.uid)
  if (typeof e.de === 'string') q = q.gte('data', e.de)
  if (typeof e.ate === 'string') q = q.lte('data', e.ate)
  if (typeof e.categoria_id === 'string') q = q.eq('categoria_id', e.categoria_id)
  if (typeof e.texto === 'string' && e.texto.trim()) q = q.ilike('descricao', `%${e.texto.trim().replace(/[%_]/g, '')}%`)
  const { data, error } = await q.order('data', { ascending: false }).limit(200)
  if (error) return { erro: 'não foi possível consultar agora' }
  const linhas = data ?? []
  const nome = (id: string | null) => ctx.categorias.find((c) => c.id === id)?.nome ?? 'Sem categoria'
  return {
    quantidade: linhas.length,
    total: brl(soma(linhas)),
    lancamentos: linhas.slice(0, 40).map((l) => `${l.data} · ${l.descricao} · ${brl(Number(l.valor))} · ${nome(l.categoria_id)}`),
  }
}

/* ------------------------------ instruções ------------------------------ */

function instrucoes(ctx: Contexto) {
  return `Você é o assistente financeiro do MoneyControl, um app de controle de finanças pessoais. Fale sempre em português do Brasil, de forma curta, simpática e direta (2 a 5 frases, listas quando ajudar). Valores sempre como "R$ 1.234,56".

O que você faz:
1. Registrar gastos e ganhos que o usuário contar no chat, com a ferramenta registrar_transacao.
   - Só registre quando souber: o valor, o que foi, e se é gasto (despesa) ou ganho (receita).
   - Se o usuário disser só o valor (ex.: "gastei 50", "35 reais"), NÃO registre ainda: pergunte com o que foi, sugerindo 2 a 4 categorias da lista dele (ex.: "Foi com alimentação, compras, transporte…?"). Registre quando ele responder.
   - Se não der para saber se entrou ou saiu dinheiro, pergunte.
   - Escolha a categoria da lista que melhor combina (só categorias do mesmo tipo). Se nenhuma servir, registre sem categoria e avise.
   - Datas: "hoje" é o padrão; entenda "ontem", "anteontem", "dia 10".
   - Carteira: só preencha se o usuário disser como pagou (ex.: "no cartão Nubank", "no Pix da conta Itaú"). Não pergunte a carteira; ela é opcional.
   - Compras parceladas e lançamentos repetidos não são feitos pelo chat: registre só se for à vista e diga que parcelado/recorrente se faz no botão "Nova transação".
   - Vários gastos numa frase: registre cada um separadamente.
   - Depois de registrar, confirme em uma linha: o que, quanto, categoria e data.
2. Responder sobre a situação financeira: gastos, receitas, saldo, orçamento por categoria, metas, viagens, economia. Use os dados abaixo e, quando precisar de detalhe, buscar_transacoes. Nunca invente números: se não tiver o dado, diga.
3. Dar dicas práticas de economia e de como chegar nas metas (quanto guardar por mês até o prazo, onde cortar, com base nos gastos dele). Você não é consultor financeiro licenciado: não recomende investimentos, ações ou produtos específicos.

Não fale de assuntos fora de finanças pessoais; redirecione com gentileza.

Dados atuais do usuário:
${ctx.resumo}`
}

/* ------------------------------ chamada à IA ------------------------------ */

interface ChamadaFerramenta {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type MensagemIA =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ChamadaFerramenta[] }
  | { role: 'tool'; tool_call_id: string; content: string }

class LimiteDaIA extends Error {}

async function chamarIA(url: string, chave: string, modelo: string, mensagens: MensagemIA[]) {
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${chave}` },
    body: JSON.stringify({
      model: modelo,
      messages: mensagens,
      tools: FERRAMENTAS.map((f) => ({ type: 'function', function: f })),
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })
  if (resposta.status === 429) throw new LimiteDaIA()
  if (!resposta.ok) throw new Error(`IA respondeu ${resposta.status}: ${(await resposta.text()).slice(0, 300)}`)
  const corpo = (await resposta.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: ChamadaFerramenta[] } }[]
  }
  return corpo.choices?.[0]?.message ?? {}
}

/* ------------------------------- handler ------------------------------- */

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cabecalhosCors })
}

export async function POST(request: Request) {
  const chave = process.env.IA_CHAVE ?? process.env.GROQ_API_KEY
  const urlIA = process.env.IA_URL || URL_PADRAO
  const modelo = process.env.IA_MODELO || MODELO_PADRAO
  const urlSupabase = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const chaveSupabase = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  if (!chave || !urlSupabase || !chaveSupabase) {
    return json({ erro: 'O assistente ainda não foi configurado no servidor.' }, 503)
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ erro: 'Entre na sua conta para usar o assistente.' }, 401)

  let corpo: { mensagens?: MensagemChat[] }
  try {
    corpo = await request.json()
  } catch {
    return json({ erro: 'Pedido inválido.' }, 400)
  }
  const historico = (corpo.mensagens ?? [])
    .filter((m) => (m.papel === 'usuario' || m.papel === 'assistente') && typeof m.texto === 'string' && m.texto.trim())
    .slice(-MAX_MENSAGENS)
  // a conversa tem de começar e terminar com o usuário
  while (historico.length && historico[0].papel !== 'usuario') historico.shift()
  if (!historico.length || historico[historico.length - 1].papel !== 'usuario') {
    return json({ erro: 'Mande uma mensagem.' }, 400)
  }

  // cliente com o token do usuário: tudo passa pelo RLS dele
  const sb = createClient(urlSupabase, chaveSupabase, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: usuario, error: erroUsuario } = await sb.auth.getUser(token)
  if (erroUsuario || !usuario.user) return json({ erro: 'Sua sessão expirou. Entre de novo.' }, 401)

  try {
    const ctx = await montarContexto(sb, usuario.user.id)
    const mensagens: MensagemIA[] = [
      { role: 'system', content: instrucoes(ctx) },
      ...historico.map((m): MensagemIA =>
        m.papel === 'usuario' ? { role: 'user', content: m.texto.slice(0, 2000) } : { role: 'assistant', content: m.texto.slice(0, 2000) },
      ),
    ]
    const registros: Registro[] = []

    for (let volta = 0; volta < MAX_VOLTAS; volta++) {
      const resposta = await chamarIA(urlIA, chave, modelo, mensagens)
      const chamadas = resposta.tool_calls ?? []
      if (!chamadas.length) {
        return json({ resposta: (resposta.content ?? '').trim() || 'Pronto.', registros })
      }

      mensagens.push({ role: 'assistant', content: resposta.content ?? null, tool_calls: chamadas })
      for (const chamada of chamadas) {
        let entrada: Entrada = {}
        try {
          entrada = JSON.parse(chamada.function.arguments || '{}') as Entrada
        } catch {
          /* argumentos quebrados: a ferramenta devolve erro e a IA tenta de novo */
        }
        const nome = chamada.function.name
        const saida =
          nome === 'registrar_transacao'
            ? await registrarTransacao(sb, ctx, entrada, registros)
            : nome === 'buscar_transacoes'
              ? await buscarTransacoes(sb, ctx, entrada)
              : { erro: 'ferramenta desconhecida' }
        mensagens.push({ role: 'tool', tool_call_id: chamada.id, content: JSON.stringify(saida) })
      }
    }

    return json({ resposta: 'Fiz o que deu. Pode repetir o pedido de outro jeito?', registros })
  } catch (e) {
    if (e instanceof LimiteDaIA) {
      return json({ erro: 'O limite gratuito da IA foi atingido por agora. Espere um minuto e tente de novo.' }, 429)
    }
    console.error('[assistente]', e)
    return json({ erro: 'O assistente não conseguiu responder agora. Tente de novo em instantes.' }, 502)
  }
}
