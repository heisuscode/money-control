// Motor de notificações inteligentes (RF09).
// Gera notificações de: contas a vencer/vencidas, meta atingida e orçamento
// perto do limite. Usa uma "chave" única por evento para não duplicar
// (índice único usuario_id + chave no banco).

import { supabase } from './supabase'
import type { Categoria, Conta, Meta, Movimentacao, Notificacao } from './types'
import { daysUntil, formatCurrency } from './format'

interface EngineInput {
  uid: string
  contas: Conta[]
  metas: Meta[]
  despesas: Movimentacao[]
  categorias: Categoria[]
  existentes: Notificacao[]
}

interface NovaNotif {
  tipo: Notificacao['tipo']
  titulo: string
  descricao: string
  chave: string
}

function mesAtual(d: string) {
  return d.slice(0, 7) // yyyy-MM
}

/** Calcula as notificações que deveriam existir a partir do estado atual. */
export function computeNotifications(input: EngineInput): NovaNotif[] {
  const { contas, metas, despesas, categorias } = input
  const out: NovaNotif[] = []
  const hojeMes = new Date().toISOString().slice(0, 7)

  // 1) Contas a vencer (<= 3 dias) e vencidas
  for (const c of contas) {
    if (c.status === 'pago') continue
    const dias = daysUntil(c.vencimento)
    if (dias < 0) {
      out.push({
        tipo: 'vencimento',
        titulo: 'Conta atrasada',
        descricao: `${c.descricao} — ${formatCurrency(c.valor)} venceu há ${Math.abs(dias)} dia(s).`,
        chave: `conta-atrasada-${c.id}`,
      })
    } else if (dias <= 3) {
      out.push({
        tipo: 'vencimento',
        titulo: dias === 0 ? 'Conta vence hoje' : `Conta vence em ${dias} dia(s)`,
        descricao: `${c.descricao} — ${formatCurrency(c.valor)}.`,
        chave: `conta-vencer-${c.id}-${c.vencimento}`,
      })
    }
  }

  // 2) Metas atingidas (>= 100%)
  for (const m of metas) {
    if (m.valor_meta > 0 && m.valor_atual >= m.valor_meta) {
      out.push({
        tipo: 'meta',
        titulo: 'Meta concluída!',
        descricao: `Você atingiu a meta "${m.objetivo}" (${formatCurrency(m.valor_meta)}).`,
        chave: `meta-atingida-${m.id}`,
      })
    }
  }

  // 3) Orçamento perto do limite (>= 80%) ou estourado (>= 100%) — mês corrente
  const gastoPorCategoria = new Map<string, number>()
  for (const d of despesas) {
    if (mesAtual(d.data) !== hojeMes || !d.categoria_id) continue
    gastoPorCategoria.set(
      d.categoria_id,
      (gastoPorCategoria.get(d.categoria_id) ?? 0) + Number(d.valor),
    )
  }
  for (const cat of categorias) {
    if (cat.tipo !== 'despesa' || cat.orcamento <= 0) continue
    const gasto = gastoPorCategoria.get(cat.id) ?? 0
    const pct = (gasto / cat.orcamento) * 100
    if (pct >= 100) {
      out.push({
        tipo: 'orcamento',
        titulo: `Orçamento de ${cat.nome} estourado`,
        descricao: `Você usou ${formatCurrency(gasto)} dos ${formatCurrency(cat.orcamento)} planejados.`,
        chave: `orcamento-estouro-${cat.id}-${hojeMes}`,
      })
    } else if (pct >= 80) {
      out.push({
        tipo: 'orcamento',
        titulo: `Orçamento de ${cat.nome} em ${Math.round(pct)}%`,
        descricao: `Você usou ${formatCurrency(gasto)} dos ${formatCurrency(cat.orcamento)} planejados.`,
        chave: `orcamento-limite-${cat.id}-${hojeMes}`,
      })
    }
  }

  return out
}

/**
 * Insere no banco as notificações novas (que ainda não existem por chave).
 * Retorna true se criou alguma (para recarregar a lista).
 */
export async function runNotificationEngine(input: EngineInput): Promise<boolean> {
  const desejadas = computeNotifications(input)
  if (!desejadas.length) return false

  const chavesExistentes = new Set(input.existentes.map((n) => n.chave).filter(Boolean))
  const novas = desejadas.filter((n) => !chavesExistentes.has(n.chave))
  if (!novas.length) return false

  const { error } = await supabase.from('notificacoes').insert(
    novas.map((n) => ({
      usuario_id: input.uid,
      tipo: n.tipo,
      titulo: n.titulo,
      descricao: n.descricao,
      chave: n.chave,
      lida: false,
    })),
  )
  if (error) {
    // colisão por índice único = corrida; ignore
    if (!error.message.includes('duplicate')) console.warn('[notif]', error.message)
    return false
  }
  return true
}
