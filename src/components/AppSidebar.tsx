import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowUp,
  ArrowDown,
  FileText,
  Target,
  BarChart3,
  Calendar,
  ArrowLeftRight,
  Bell,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Repeat,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from './Logo'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { cn } from '@/lib/cn'

interface Item {
  to: string
  label: string
  icon: LucideIcon
  badge?: 'novo' | 'count'
}

const PRINCIPAL: Item[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/receitas', label: 'Receitas', icon: ArrowUp },
  { to: '/despesas', label: 'Despesas', icon: ArrowDown },
  { to: '/carteiras', label: 'Carteiras & Cartões', icon: Wallet, badge: 'novo' },
  { to: '/recorrencias', label: 'Recorrências', icon: Repeat, badge: 'novo' },
  { to: '/contas', label: 'Contas a pagar', icon: FileText },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/calendario', label: 'Calendário', icon: Calendar },
  { to: '/cambio', label: 'Câmbio', icon: ArrowLeftRight, badge: 'novo' },
]

const CONTA: Item[] = [
  { to: '/notificacoes', label: 'Notificações', icon: Bell, badge: 'count' },
  { to: '/configuracoes', label: 'Configurações', icon: SlidersHorizontal },
]

export function AppSidebar() {
  const { collapsed, toggle } = useSidebar()
  const { perfil, user } = useAuth()
  const { notificacoes } = useData()
  const unread = notificacoes.filter((n) => !n.lida).length

  const nome = perfil?.nome || user?.email?.split('@')[0] || 'Usuário'
  const iniciais = nome
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const renderItem = (it: Item) => {
    const Icon = it.icon
    return (
      <NavLink
        key={it.to}
        to={it.to}
        title={collapsed ? it.label : undefined}
        className={({ isActive }) =>
          cn(
            'relative flex items-center gap-[11px] rounded-[11px] p-[11px] text-[14px] transition',
            collapsed ? 'justify-center' : 'justify-start',
            isActive
              ? 'bg-active-bg font-bold text-active-text'
              : 'font-semibold text-text-2 hover:bg-subtle',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span
                className="absolute top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-full bg-active-text"
                style={{ left: collapsed ? 8 : 2 }}
              />
            )}
            <Icon size={18} strokeWidth={2} className="shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{it.label}</span>}
            {!collapsed && it.badge === 'novo' && (
              <span className="ml-auto rounded-md bg-[#DCE8FF] px-1.5 py-[3px] text-[9px] font-extrabold text-[#1D4ED8] dark:bg-[rgba(79,132,255,.2)] dark:text-[#9DB8FF]">
                NOVO
              </span>
            )}            {!collapsed && it.badge === 'count' && unread > 0 && (
              <span className="ml-auto flex h-[18px] w-[18px] items-center justify-center rounded-full bg-danger text-[10px] font-extrabold text-white">
                {unread}
              </span>
            )}
          </>
        )}
      </NavLink>
    )
  }

  return (
    <aside
      className="flex h-full flex-col overflow-hidden border-r border-line bg-surface px-[14px] py-[22px] transition-[width] duration-[180ms] ease"
      style={{ width: collapsed ? 76 : 236, flexShrink: 0 }}
    >
      <div className="flex flex-wrap items-center justify-center gap-2.5 px-1 pb-4">
        {collapsed ? <Logo size={32} /> : <Logo size={32} withWordmark />}
        <button
          onClick={toggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] border border-line text-text-3 hover:bg-subtle"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-2.5 pb-1.5 pt-2 text-[10px] font-bold tracking-[.1em] text-text-3">
          PRINCIPAL
        </div>
      )}
      <nav className="flex flex-col gap-[3px]">{PRINCIPAL.map(renderItem)}</nav>

      {!collapsed && (
        <div className="px-2.5 pb-1.5 pt-[18px] text-[10px] font-bold tracking-[.1em] text-text-3">
          CONTA
        </div>
      )}
      <nav className={cn('flex flex-col gap-[3px]', collapsed && 'mt-3')}>
        {CONTA.map(renderItem)}
      </nav>

      <div
        className={cn(
          'mt-auto flex items-center gap-2.5 rounded-[13px] border border-line bg-subtle p-2.5',
          collapsed ? 'justify-center' : 'justify-start',
        )}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold text-white"
          style={{ background: 'linear-gradient(135deg,#6F9AE8,#004AAD)' }}
        >
          {iniciais}
        </span>
        {!collapsed && (
          <div className="overflow-hidden leading-tight">
            <div className="whitespace-nowrap text-[13px] font-bold text-text-1">{nome}</div>
            <div className="whitespace-nowrap text-[11px] text-text-3">Plano grátis</div>
          </div>
        )}
      </div>
    </aside>
  )
}
