import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button, Field, Input } from '@/components/ui'
import { PasswordStrength } from '@/components/auth/PasswordStrength'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'

type Step = 'solicitar' | 'nova' | 'sucesso'

export default function RecuperarSenha() {
  const [params] = useSearchParams()
  const initial = (params.get('step') as Step) || 'solicitar'
  const [step, setStep] = useState<Step>(initial)
  const { resetPassword, updatePassword, configured } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)

  async function solicitar(e: FormEvent) {
    e.preventDefault()
    if (!configured) return toast('error', 'Configure o Supabase para usar a recuperação.')
    setLoading(true)
    try {
      await resetPassword(email)
      toast('success', 'Enviamos um link de recuperação para seu e-mail.')
    } catch {
      toast('error', 'Não foi possível enviar o link.')
    } finally {
      setLoading(false)
    }
  }

  async function redefinir(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 8) return toast('error', 'A senha deve ter ao menos 8 caracteres.')
    if (senha !== confirmar) return toast('error', 'As senhas não conferem.')
    setLoading(true)
    try {
      await updatePassword(senha)
      setStep('sucesso')
    } catch {
      toast('error', 'Não foi possível redefinir a senha. Reabra o link do e-mail.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-app p-4">
      <div className="w-full max-w-md">
        {step === 'solicitar' && (
          <div className="panel p-7">
            <Logo size={32} withWordmark />
            <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-active-bg text-brand">
              <Mail size={22} />
            </div>
            <h1 className="mt-4 text-[22px] font-extrabold tracking-tightest text-text-1">
              Esqueceu a senha?
            </h1>
            <p className="mt-1 text-[13px] text-text-2">
              Informe o e-mail da sua conta e enviaremos um link seguro para redefinir.
            </p>
            <form onSubmit={solicitar} className="mt-6 flex flex-col gap-4">
              <Field label="E-mail">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                />
              </Field>
              <Button type="submit" loading={loading} className="w-full py-3">
                Enviar link de recuperação
              </Button>
            </form>
            <p className="mt-5 text-center text-[13px] text-text-2">
              Lembrou?{' '}
              <Link to="/login" className="font-semibold text-brand">
                Voltar ao login
              </Link>
            </p>
          </div>
        )}

        {step === 'nova' && (
          <div className="panel p-7">
            <Logo size={32} withWordmark />
            <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-active-bg text-brand">
              <Lock size={22} />
            </div>
            <h1 className="mt-4 text-[22px] font-extrabold tracking-tightest text-text-1">
              Nova senha
            </h1>
            <p className="mt-1 text-[13px] text-text-2">
              Crie uma senha forte que você ainda não usou em outro serviço.
            </p>
            <form onSubmit={redefinir} className="mt-6 flex flex-col gap-4">
              <Field label="Nova senha">
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
              </Field>
              <Field label="Confirmar senha">
                <Input
                  type="password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  placeholder="Repita a senha"
                />
              </Field>
              <PasswordStrength password={senha} />
              <Button type="submit" loading={loading} className="w-full py-3">
                Redefinir senha
              </Button>
            </form>
          </div>
        )}

        {step === 'sucesso' && (
          <div
            className="rounded-[22px] p-9 text-center text-white shadow-card"
            style={{ background: 'linear-gradient(160deg,#033B85,#0E1726)' }}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="mt-5 text-[22px] font-extrabold tracking-tightest">Senha atualizada!</h1>
            <p className="mt-2 text-[13px] text-white/70">
              Sua senha foi redefinida com segurança. Já pode acessar sua conta normalmente.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 w-full rounded-xl bg-white py-3 text-[14px] font-bold text-ink"
            >
              Ir para o login
            </button>
            <p className="mt-4 text-[11px] text-white/50">Conexão protegida por criptografia</p>
          </div>
        )}
      </div>
    </div>
  )
}
