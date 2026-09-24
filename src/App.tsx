import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { DataProvider } from './contexts/DataContext'
import { FinanceiroProvider } from './financeiro/FinanceiroContext'
import { AppLayout } from './components/AppLayout'
import { Spinner } from './components/ui'
import { type ReactNode } from 'react'

import Landing from './pages/Landing'
import Auth from './pages/Auth'
import RecuperarSenha from './pages/RecuperarSenha'
import Dashboard from './pages/Dashboard'
import Transacoes from './pages/Transacoes'
import Contas from './pages/Contas'
import Metas from './pages/Metas'
import Relatorios from './pages/Relatorios'
import Calendario from './pages/Calendario'
import Cambio from './pages/Cambio'
import Notificacoes from './pages/Notificacoes'
import Configuracoes from './pages/Configuracoes'
import Categorias from './pages/Categorias'
import CarteirasPage from './financeiro/CarteirasPage'
import RecorrenciasPage from './financeiro/RecorrenciasPage'
import Assistente from './pages/Assistente'

function FullScreenLoader() {
  return (
    <div className="flex h-full items-center justify-center bg-app text-brand">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

function Protected({ children }: { children: ReactNode }) {
  const { session, loading, configured } = useAuth()
  if (loading) return <FullScreenLoader />
  if (configured && !session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (session) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Auth mode="login" />
          </PublicOnly>
        }
      />
      <Route
        path="/cadastro"
        element={
          <PublicOnly>
            <Auth mode="cadastro" />
          </PublicOnly>
        }
      />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />

      {/* Autenticadas (shell com sidebar + data) */}
      <Route
        element={
          <Protected>
            <SidebarProvider>
              <DataProvider>
                <FinanceiroProvider>
                  <AppLayout />
                </FinanceiroProvider>
              </DataProvider>
            </SidebarProvider>
          </Protected>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assistente" element={<Assistente />} />
        <Route path="/receitas" element={<Transacoes filtroInicial="receitas" />} />
        <Route path="/despesas" element={<Transacoes filtroInicial="despesas" />} />
        <Route path="/transacoes" element={<Transacoes filtroInicial="todas" />} />
        <Route path="/contas" element={<Contas />} />
        <Route path="/metas" element={<Metas />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/cambio" element={<Cambio />} />
        <Route path="/notificacoes" element={<Notificacoes />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/carteiras" element={<CarteirasPage />} />
        <Route path="/recorrencias" element={<RecorrenciasPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
