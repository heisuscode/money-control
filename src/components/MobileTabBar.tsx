import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BarChart3, Calendar, SlidersHorizontal, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Tab bar inferior do mobile com FAB "+" central (abre Nova transação). */
export function MobileTabBar({ onNew }: { onNew: () => void }) {
  const navigate = useNavigate()
  const item = (to: string, Icon: typeof LayoutDashboard, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition',
          isActive ? 'text-brand' : 'text-text-3',
        )
      }
    >
      <Icon size={20} />
      <span>{label}</span>
    </NavLink>
  )

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-line bg-surface px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1 md:hidden">
      {item('/dashboard', LayoutDashboard, 'Início')}
      {item('/relatorios', BarChart3, 'Relatórios')}
      <button
        onClick={onNew}
        className="-mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-btn"
        title="Nova transação"
      >
        <Plus size={26} />
      </button>
      {item('/calendario', Calendar, 'Agenda')}
      <button
        onClick={() => navigate('/configuracoes')}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-text-3"
      >
        <SlidersHorizontal size={20} />
        <span>Ajustes</span>
      </button>
    </nav>
  )
}
