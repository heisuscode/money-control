import { useNavigate } from 'react-router-dom'
import { Bell, Moon, Sun, Menu } from 'lucide-react'
import { type ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useData } from '@/contexts/DataContext'
import { useSidebar } from '@/contexts/SidebarContext'

interface TopbarProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Ações específicas da tela (busca, filtros, botão primário). */
  actions?: ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const { resolved, toggle } = useTheme()
  const { notificacoes } = useData()
  const { toggle: toggleSidebar } = useSidebar()
  const navigate = useNavigate()
  const unread = notificacoes.filter((n) => !n.lida).length

  return (
    <header className="sticky top-0 z-30 flex min-h-[66px] flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-3 md:px-[26px]">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-text-2 hover:bg-subtle max-md:hidden"
          title="Alternar menu"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="screen-title truncate text-text-1">{title}</h1>
          {subtitle && <p className="truncate text-[12px] text-text-3">{subtitle}</p>}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        {actions}
        <button
          onClick={toggle}
          title="Alternar tema"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-text-2 hover:bg-subtle"
        >
          {resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={() => navigate('/notificacoes')}
          title="Notificações"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line text-text-2 hover:bg-subtle"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-extrabold text-white">
              {unread}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
