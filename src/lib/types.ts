// Tipos de dados do MoneyControl (alinhados ao schema do Supabase)

export type TipoCategoria = 'despesa' | 'receita'
export type StatusConta = 'pendente' | 'pago' | 'atrasado'
export type TipoNotificacao = 'vencimento' | 'meta' | 'orcamento' | 'cambio' | 'credito'

export interface Usuario {
  id: string
  nome: string
  email: string
  moeda_principal: string
  criado_em: string
}

export interface Categoria {
  id: string
  usuario_id: string
  nome: string
  icone: string
  cor: string
  tipo: TipoCategoria
  orcamento: number
  is_padrao: boolean
  criado_em: string
}

export interface Movimentacao {
  id: string
  usuario_id: string
  descricao: string
  valor: number
  data: string
  categoria_id: string | null
  moeda_original: string
  valor_original: number
  valor_convertido: number
  taxa: number
  taxa_timestamp: string
  criado_em: string
  // join opcional
  categoria?: Categoria | null
  // marcação local
  tipo?: TipoCategoria
}

export interface Conta {
  id: string
  usuario_id: string
  descricao: string
  valor: number
  vencimento: string
  status: StatusConta
  pago_em: string | null
  criado_em: string
}

export interface Meta {
  id: string
  usuario_id: string
  objetivo: string
  valor_meta: number
  valor_atual: number
  prazo: string | null
  icone: string
  cor: string
  criado_em: string
}

export interface Notificacao {
  id: string
  usuario_id: string
  tipo: TipoNotificacao
  titulo: string
  descricao: string
  lida: boolean
  chave: string | null
  criado_em: string
}
