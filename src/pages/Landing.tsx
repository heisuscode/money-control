import { Link } from 'react-router-dom'
import { BarChart3, RefreshCw, Bell, Target, TrendingUp } from 'lucide-react'
import { Logo } from '@/components/Logo'

export default function Landing() {
  return (
    <div className="min-h-full bg-app">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo size={34} withWordmark />
        <div className="hidden items-center gap-7 text-[14px] font-semibold text-text-2 md:flex">
          <a href="#recursos" className="hover:text-text-1">Recursos</a>
          <a href="#cambio" className="hover:text-text-1">Câmbio</a>
          <a href="#precos" className="hover:text-text-1">Preços</a>
          <a href="#sobre" className="hover:text-text-1">Sobre</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-[14px] font-semibold text-text-2 hover:text-text-1">
            Entrar
          </Link>
          <Link to="/cadastro" className="btn-primary">
            Criar conta grátis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-10 md:grid-cols-2 md:py-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-active-bg px-3 py-1.5 text-[12px] font-bold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Agora com conversão cambial automática
          </span>
          <h1 className="mt-5 text-[44px] font-extrabold leading-[1.05] tracking-tightest text-text-1 md:text-[52px]">
            Controle total do seu dinheiro, sem complicação.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-text-2">
            Registre receitas e despesas, acompanhe metas e nunca mais perca um vencimento. Tudo em
            um painel claro — em reais ou em qualquer moeda.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/cadastro" className="btn-primary px-6 py-3.5 text-[15px]">
              Começar grátis
            </Link>
            <Link to="/login" className="btn-ghost px-6 py-3.5 text-[15px]">
              Já tenho conta
            </Link>
          </div>
        </div>

        {/* Mock do app */}
        <div className="relative">
          <div
            className="rounded-[20px] p-6 text-white shadow-card"
            style={{ background: '#0E1726' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#93A1B7]">Saldo atual</span>
              <span className="rounded-full bg-[rgba(22,163,74,.2)] px-2 py-1 text-[11px] font-bold text-[#4ADE80]">
                +8,2%
              </span>
            </div>
            <div className="num mt-2 text-[34px] font-semibold">R$ 12.480</div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-[11px] text-[#93A1B7]">Receitas</div>
                <div className="num mt-1 text-[15px] font-semibold text-[#4ADE80]">+ R$ 8.200</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-[11px] text-[#93A1B7]">Despesas</div>
                <div className="num mt-1 text-[15px] font-semibold text-[#F87171]">- R$ 4.910</div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-7 -right-4 hidden w-56 rounded-2xl border border-line bg-surface p-4 shadow-card sm:block">
            <div className="flex items-center justify-between text-[13px] font-bold text-text-1">
              <span>Viagem Europa</span>
              <span className="text-brand">72%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-subtle">
              <div className="h-2 w-[72%] rounded-full bg-brand" />
            </div>
            <div className="num mt-2 text-[11px] text-text-3">R$ 10.800 / R$ 15.000</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="mx-auto grid max-w-6xl gap-4 px-5 py-12 md:grid-cols-4">
        {[
          { icon: BarChart3, t: 'Relatórios claros', d: 'Veja para onde seu dinheiro vai com gráficos e exportação.' },
          { icon: RefreshCw, t: 'Câmbio automático', d: 'Registre em 15 moedas com conversão e taxa registrada.' },
          { icon: Bell, t: 'Alertas inteligentes', d: 'Vencimentos, metas e orçamento perto do limite.' },
          { icon: Target, t: 'Metas que motivam', d: 'Acompanhe o progresso e adicione aportes.' },
        ].map((f) => (
          <div key={f.t} className="panel p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-active-bg text-brand">
              <f.icon size={20} />
            </div>
            <h3 className="mt-3 text-[15px] font-bold text-text-1">{f.t}</h3>
            <p className="mt-1 text-[13px] text-text-2">{f.d}</p>
          </div>
        ))}
      </section>

      <footer className="mx-auto flex max-w-6xl items-center justify-between border-t border-line px-5 py-8 text-[13px] text-text-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-brand" /> MoneyControl © {new Date().getFullYear()}
        </div>
        <span>Feito com cuidado para a sua vida financeira.</span>
      </footer>
    </div>
  )
}
