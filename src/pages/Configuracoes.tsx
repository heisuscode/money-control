import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, Monitor, ArrowLeftRight, Bell, ShieldCheck, LogOut, Check } from 'lucide-react'
import { Topbar } from '@/components/Topbar'
import { PageBody } from '@/components/PageBody'
import { Button, Card, Field, Input } from '@/components/ui'
import { Switch } from '@/components/ui/Switch'
import { useTheme, type ThemePref } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { CURRENCIES } from '@/lib/currencies'
import { cn } from '@/lib/cn'

export default function Configuracoes() {
  const { pref, setPref } = useTheme()
  const { perfil, user, signOut, refreshPerfil } = useAuth()
  const { reload } = useData()
  const toast = useToast()
  const navigate = useNavigate()

  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(perfil?.nome ?? '')
  const [moeda, setMoeda] = useState(perfil?.moeda_principal ?? 'BRL')
  const [alertas, setAlertas] = useState(true)
  const [doisFatores, setDoisFatores] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const nomeExibido = perfil?.nome || user?.email?.split('@')[0] || 'Usuário'
  const iniciais = nomeExibido.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  async function salvarPerfil() {
    if (!user) return
    setSalvando(true)
    const { error } = await supabase.from('usuarios').update({ nome }).eq('id', user.id)
    setSalvando(false)
    if (error) return toast('error', 'Não foi possível salvar.')
    toast('success', 'Perfil atualizado.')
    setEditando(false)
    refreshPerfil()
  }

  async function trocarMoeda(code: string) {
    setMoeda(code)
    if (!user) return
    await supabase.from('usuarios').update({ moeda_principal: code }).eq('id', user.id)
    refreshPerfil()
    reload(['receitas', 'despesas'])
    toast('success', `Moeda principal: ${code}.`)
  }

  async function sair() {
    await signOut()
    navigate('/login')
  }

  const temas: { value: ThemePref; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Escuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ]

  return (
    <>
      <Topbar title="Configurações" subtitle="Perfil e preferências" />
      <PageBody className="max-w-3xl">
        {/* Perfil */}
        <Card>
          <div className="flex items-center gap-4">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full text-[18px] font-extrabold text-white"
              style={{ background: 'linear-gradient(135deg,#6F9AE8,#004AAD)' }}
            >
              {iniciais}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-bold text-text-1">{nomeExibido}</div>
              <div className="truncate text-[13px] text-text-3">{user?.email}</div>
            </div>
            <Button variant="ghost" onClick={() => { setNome(perfil?.nome ?? ''); setEditando((v) => !v) }}>
              Editar perfil
            </Button>
          </div>
          {editando && (
            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end">
              <Field label="Nome" htmlFor="nome">
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </Field>
              <Button loading={salvando} onClick={salvarPerfil}>Salvar</Button>
            </div>
          )}
        </Card>

        {/* Aparência */}
        <Card>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-text-3">Aparência</h3>
          <div className="grid grid-cols-3 gap-3">
            {temas.map((t) => {
              const ativo = pref === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => setPref(t.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition',
                    ativo ? 'border-brand bg-active-bg' : 'border-line hover:bg-subtle',
                  )}
                >
                  <t.icon size={20} className={ativo ? 'text-brand' : 'text-text-2'} />
                  <span className={cn('text-[13px] font-semibold', ativo ? 'text-brand' : 'text-text-2')}>
                    {t.label}
                  </span>
                  {ativo && <Check size={14} className="text-brand" />}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Preferências */}
        <Card className="!p-0">
          <h3 className="px-5 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wide text-text-3">
            Preferências
          </h3>
          <Linha
            icon={<ArrowLeftRight size={18} />}
            titulo="Moeda principal"
            sub="Exibição padrão dos valores"
            right={
              <select
                value={moeda}
                onChange={(e) => trocarMoeda(e.target.value)}
                className="rounded-lg border border-line bg-subtle px-3 py-2 text-[13px] font-semibold text-text-1 outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.symbol}
                  </option>
                ))}
              </select>
            }
          />
          <Linha
            icon={<Bell size={18} />}
            titulo="Alertas de vencimento"
            sub="Avisar 1 dia antes"
            right={<Switch checked={alertas} onCheckedChange={setAlertas} />}
          />
          <Linha
            icon={<ShieldCheck size={18} />}
            titulo="Autenticação em duas etapas"
            sub="Camada extra de segurança"
            right={<Switch checked={doisFatores} onCheckedChange={setDoisFatores} />}
          />
          <button
            onClick={sair}
            className="flex w-full items-center gap-3 border-t border-line px-5 py-4 text-left transition hover:bg-danger-bg"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-bg text-danger">
              <LogOut size={18} />
            </span>
            <div>
              <div className="text-[14px] font-bold text-danger">Sair da conta</div>
              <div className="text-[12px] text-text-3">Encerrar a sessão neste dispositivo</div>
            </div>
          </button>
        </Card>
      </PageBody>
    </>
  )
}

function Linha({
  icon,
  titulo,
  sub,
  right,
}: {
  icon: React.ReactNode
  titulo: string
  sub: string
  right: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-t border-line px-5 py-4 first:border-t-0">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-subtle text-text-2">
        {icon}
      </span>
      <div className="flex-1">
        <div className="text-[14px] font-semibold text-text-1">{titulo}</div>
        <div className="text-[12px] text-text-3">{sub}</div>
      </div>
      {right}
    </div>
  )
}
