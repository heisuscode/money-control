import { createContext, useContext, useState, type ReactNode } from 'react'

interface SidebarCtx {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
}

const Ctx = createContext<SidebarCtx | null>(null)
const KEY = 'mc_sidebar_collapsed'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(
    () => localStorage.getItem(KEY) === '1',
  )
  const setCollapsed = (v: boolean) => {
    localStorage.setItem(KEY, v ? '1' : '0')
    setCollapsedState(v)
  }
  const toggle = () => setCollapsed(!collapsed)
  return <Ctx.Provider value={{ collapsed, toggle, setCollapsed }}>{children}</Ctx.Provider>
}

export function useSidebar() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSidebar deve ser usado dentro de SidebarProvider')
  return ctx
}
