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
  // de onde saiu/entrou o dinheiro e, se gerada automaticamente, qual recorrência
  carteira_id?: string | null
  recorrencia_id?: string | null
}

export type TipoCarteira = 'conta' | 'dinheiro' | 'cartao_credito'

export interface Carteira {
  id: string
  usuario_id: string
  nome: string
  tipo: TipoCarteira
  cor: string
  icone: string
  saldo_inicial: number
  /** só cartão de crédito */
  limite: number | null
  dia_fechamento: number | null
  dia_vencimento: number | null
  criado_em: string
}

export type FrequenciaRecorrencia = 'semanal' | 'mensal' | 'anual'

export interface Recorrencia {
  id: string
  usuario_id: string
  ativo: boolean
  tipo: TipoCategoria
  descricao: string
  valor: number
  categoria_id: string | null
  carteira_id: string | null
  frequencia: FrequenciaRecorrencia
  /** dia do mês (mensal/anual) ou dia da semana 0-6 (semanal) */
  dia: number
  data_inicio: string
  /** última ocorrência já lançada como receita/despesa */
  ultima_execucao: string | null
  criado_em: string
}

/** Pagamento de fatura: transferência da conta pagadora para o cartão (não é despesa). */
export interface PagamentoFatura {
  id: string
  usuario_id: string
  cartao_id: string
  fim_ciclo: string
  carteira_id: string | null
  valor: number
  data: string
  criado_em: string
}

/** Conta a pagar calculada (fatura de cartão ou próxima ocorrência de recorrência). */
export type ContaVirtual = Conta & {
  virtual: true
  origem: 'fatura' | 'recorrencia'
  cartaoId?: string
  fimCiclo?: string
  /** fatura do ciclo atual: ainda recebe compras, só pode ser paga depois de fechar */
  faturaAberta?: boolean
  fechaEm?: string
  recorrenciaId?: string
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
