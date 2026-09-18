import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button, Field, Input } from '@/components/ui'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { PasswordStrength, passwordScore } from '@/components/auth/PasswordStrength'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export default function Auth({ mode }: { mode: 'login' | 'cadastro' }) {
  const cadastro = mode === 'cadastro'
  const navigate = useNavigate()
  const toast = useToast()
  const { signIn, signUp, signInWithGoogle, configured } = useAuth()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [termos, setTermos] = useState(false)
  const [mostrar, setMostrar] = useState(false)
  const [manter, setManter] = useState(true)
  const [loading, setLoading] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})

  function validar() {
    const e: Record<string, string> = {}
    if (cadastro && !nome.trim()) e.nome = 'Informe seu nome.'
    if (!isEmail(email)) e.email = 'E-mail inválido.'
    if (senha.length < 8) e.senha = 'A senha deve ter ao menos 8 caracteres.'
    if (cadastro && senha !== confirmar) e.confirmar = 'As senhas não conferem.'
    if (cadastro && !termos) e.termos = 'Aceite os termos para continuar.'
    setErros(e)
    return Object.keys(e).length === 0
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (!configured) {
      toast('error', 'Configure o Supabase (.env.local) para autenticar. Veja o README.')
      return
    }
    if (!validar()) return
    setLoading(true)
    try {
      if (cadastro) {
        const { needsConfirm } = await signUp(nome.trim(), email, senha)
        if (needsConfirm) {
          toast('success', 'Conta criada! Confirme seu e-mail para entrar.')
          navigate('/login')
        } else {
          toast('success', 'Conta criada com sucesso!')
          navigate('/dashboard')
        }
      } else {
        await signIn(email, senha)
        navigate('/dashboard')
      }
    } catch (err) {
      toast('error', err instanceof Error ? traduzErro(err.message) : 'Erro ao autenticar.')
    } finally {
      setLoading(false)
    }
  }

  async function google() {
    if (!configured) {
      toast('error', 'Configure o Supabase e o provedor Google para usar este login.')
      return
    }
    try {
      await signInWithGoogle()
    } catch {
      toast('error', 'Não foi possível iniciar o login com Google.')
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-app p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[22px] border border-line bg-surface shadow-card md:grid-cols-2">
        {/* Painel de marca */}
        <div
          className="relative hidden flex-col justify-between p-9 text-white md:flex"
          style={{ background: 'linear-gradient(160deg,#033B85,#0E1726)' }}
        >
          <Logo size={34} withWordmark wordmarkColor="#fff" />
          <div>
            <h2 className="text-[30px] font-extrabold leading-tight tracking-tightest">
              Suas finanças, organizadas e sob controle.
            </h2>
            <div className="mt-6 inline-block rounded-2xl bg-white/10 p-4">
              <div className="text-[12px] text-white/70">Economia este mês</div>
              <div className="num mt-1 text-[22px] font-semibold text-[#4ADE80]">+ R$ 3.290,00</div>
            </div>
          </div>
          <p className="text-[12px] text-white/50">Conexão protegida por criptografia.</p>
        </div>

        {/* Formulário */}
        <div className="p-7 md:p-9">
          <div className="mb-1 md:hidden">
            <Logo size={32} withWordmark />
          </div>
          <h1 className="text-[24px] font-extrabold tracking-tightest text-text-1">
            {cadastro ? 'Crie sua conta grátis' : 'Bem-vindo de volta'}
          </h1>
          <p className="mt-1 text-[13px] text-text-2">
            {cadastro
              ? 'Leva menos de um minuto. Sem cartão de crédito.'
              : 'Entre para acessar seu painel financeiro.'}
          </p>

          {!configured && (
            <div className="mt-4 rounded-xl border border-warning/40 bg-warning-bg px-3 py-2 text-[12px] font-medium text-text-2">
              Supabase não configurado. Defina <code>VITE_SUPABASE_URL</code> e{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> em <code>.env.local</code> (veja o README).
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            {cadastro && (
              <Field label="Nome completo" error={erros.nome}>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  autoComplete="name"
                />
              </Field>
            )}
            <Field label="E-mail" error={erros.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                autoComplete="email"
              />
            </Field>

            <Field
              label="Senha"
              error={erros.senha}
            >
              <div className="relative">
                <Input
                  type={mostrar ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete={cadastro ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setMostrar((m) => !m)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1"
                >
                  {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {!cadastro && (
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text-2">
                  <input
                    type="checkbox"
                    checked={manter}
                    onChange={(e) => setManter(e.target.checked)}
                    className="h-4 w-4 accent-[#004AAD]"
                  />
                  Manter conectado
                </label>
                <Link to="/recuperar-senha" className="text-[13px] font-semibold text-brand">
                  Esqueci a senha
                </Link>
              </div>
            )}

            {cadastro && (
              <>
                <Field label="Confirmar senha" error={erros.confirmar}>
                  <Input
                    type={mostrar ? 'text' : 'password'}
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                  />
                </Field>
                <PasswordStrength password={senha} />
                <label className="flex cursor-pointer items-start gap-2 text-[13px] text-text-2">
                  <input
                    type="checkbox"
                    checked={termos}
                    onChange={(e) => setTermos(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#004AAD]"
                  />
                  <span>
                    Concordo com os <span className="font-semibold text-brand">Termos de Uso</span> e
                    a <span className="font-semibold text-brand">Política de Privacidade</span>.
                  </span>
                </label>
                {erros.termos && (
                  <span className="-mt-2 text-[12px] font-medium text-danger">{erros.termos}</span>
                )}
              </>
            )}

            <Button type="submit" loading={loading} className="w-full py-3">
              {cadastro ? 'Criar minha conta' : 'Entrar'}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[12px] text-text-3">
            <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
          </div>

          <GoogleButton onClick={google} />

          <p className="mt-5 text-center text-[13px] text-text-2">
            {cadastro ? (
              <>
                Já tem conta?{' '}
                <Link to="/login" className="font-semibold text-brand">
                  Entrar
                </Link>
              </>
            ) : (
              <>
                Não tem conta?{' '}
                <Link to="/cadastro" className="font-semibold text-brand">
                  Criar conta grátis
                </Link>
              </>
            )}
          </p>
          {cadastro && passwordScore(senha) >= 3 && (
            <p className="mt-2 text-center text-[11px] text-success">Senha forte 👍</p>
          )}
        </div>
      </div>
    </div>
  )
}

function traduzErro(msg: string): string {
  if (/invalid login/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/already registered|already exists/i.test(msg)) return 'Este e-mail já está cadastrado.'
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.'
  return msg
}
