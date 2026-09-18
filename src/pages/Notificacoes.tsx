import { AlertTriangle, Target, BarChart3, ArrowLeftRight, CheckCircle2, Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Topbar } from '@/components/Topbar'
import { PageBody } from '@/components/PageBody'
import { Card, EmptyState, Skeleton } from '@/components/ui'
import { useData } from '@/contexts/DataContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import type { TipoNotificacao } from '@/lib/types'
import { cn } from '@/lib/cn'

const ICONS: Record<TipoNotificacao, { icon: typeof Bell; tone: string }> = {
  vencimento: { icon: AlertTriangle, tone: 'bg-danger-bg text-danger' },
  meta: { icon: Target, tone: 'bg-success-bg text-success' },
  orcamento: { icon: BarChart3, tone: 'bg-warning-bg text-warning' },
  cambio: { icon: ArrowLeftRight, tone: 'bg-active-bg text-brand' },
  credito: { icon: CheckCircle2, tone: 'bg-success-bg text-success' },
}

export default function Notificacoes() {
  const { notificacoes, loading, reload } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const unread = notificacoes.filter((n) => !n.lida).length

  async function marcarLidas() {
    if (!user || unread === 0) return
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('usuario_id', user.id)
      .eq('lida', false)
    if (error) return toast('error', 'Não foi possível atualizar.')
    reload(['notificacoes'])
  }

  return (
    <>
      <Topbar
        title="Notificações"
        subtitle="Central de alertas"
        actions={
          <button
            onClick={marcarLidas}
            disabled={unread === 0}
            className="btn-ghost disabled:opacity-50"
          >
            Marcar lidas
          </button>
        }
      />
      <PageBody>
        <Card className="!p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : notificacoes.length === 0 ? (
            <EmptyState
              icon={<Bell size={28} />}
              title="Nenhuma notificação"
              description="Alertas de vencimentos, metas e orçamento aparecerão aqui."
            />
          ) : (
            <div className="flex flex-col">
              {notificacoes.map((n) => {
                const cfg = ICONS[n.tipo] ?? ICONS.cambio
                const Icon = cfg.icon
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-start gap-3 border-b border-line px-5 py-4 last:border-0',
                      !n.lida && 'bg-active-bg/40',
                    )}
                  >
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', cfg.tone)}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-text-1">{n.titulo}</span>
                        {!n.lida && <span className="h-2 w-2 rounded-full bg-brand" />}
                      </div>
                      <p className="mt-0.5 text-[13px] text-text-2">{n.descricao}</p>
                      <span className="mt-1 block text-[11px] text-text-3">
                        {formatDistanceToNow(new Date(n.criado_em), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </PageBody>
    </>
  )
}
