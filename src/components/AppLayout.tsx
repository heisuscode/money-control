import { createContext, useContext, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { MobileTabBar } from './MobileTabBar'
import { NovaTransacaoModal } from './NovaTransacaoModal'
import type { Movimentacao, TipoCategoria } from '@/lib/types'

interface NovaTransacaoCtx {
  open: (opts?: { tipo?: TipoCategoria; editar?: Movimentacao }) => void
}
const Ctx = createContext<NovaTransacaoCtx>({ open: () => {} })
export const useNovaTransacao = () => useContext(Ctx)

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const [tipoInicial, setTipoInicial] = useState<TipoCategoria>('despesa')
  const [editar, setEditar] = useState<Movimentacao | undefined>(undefined)

  const abrir: NovaTransacaoCtx['open'] = (opts) => {
    setTipoInicial(opts?.tipo ?? 'despesa')
    setEditar(opts?.editar)
    setOpen(true)
  }

  return (
    <Ctx.Provider value={{ open: abrir }}>
      <div className="flex h-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-app pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
      <MobileTabBar onNew={() => abrir({ tipo: 'despesa' })} />
      <NovaTransacaoModal
        open={open}
        onOpenChange={setOpen}
        tipoInicial={tipoInicial}
        editar={editar}
      />
    </Ctx.Provider>
  )
}
