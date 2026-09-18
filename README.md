# MoneyControl 💸

Plataforma web de **controle financeiro pessoal**: receitas, despesas, contas a pagar, metas,
categorias com orçamento, relatórios com exportação, calendário financeiro, notificações
inteligentes e um módulo de **câmbio com conversão automática em 15 moedas**.

Interface 100% em **português (Brasil)**, com tema claro/escuro persistente.

---

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Front-end | React 18 + TypeScript + Vite |
| Estilo | Tailwind CSS (design tokens do handoff como CSS vars) |
| Roteamento | React Router |
| Componentes acessíveis | Radix UI (Dialog, Switch, Tabs, Label, Dropdown) |
| Gráficos | Recharts |
| Backend / Auth / DB | Supabase (`@supabase/supabase-js`) |
| Datas | date-fns (locale pt-BR) |
| Moeda | `Intl.NumberFormat('pt-BR')` |
| Câmbio | AwesomeAPI (cotações em relação ao BRL) |
| Exportação | jsPDF + jspdf-autotable (PDF), SheetJS/xlsx (Excel), CSV nativo |
| Fontes | Plus Jakarta Sans (UI) + Spline Sans Mono (valores) — Google Fonts |

---

## 🚀 Como rodar localmente

### 1. Pré-requisitos
- Node.js 18+ (recomendado 20+)
- Uma conta no [Supabase](https://supabase.com) (plano grátis serve)

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar o Supabase

1. Crie um projeto no [painel do Supabase](https://app.supabase.com).
2. Em **SQL Editor**, cole e execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
   Isso cria todas as tabelas, ativa **Row Level Security** (cada usuário só vê os próprios
   dados) e instala o trigger que, a cada novo cadastro, cria o perfil e **semeia as 8
   categorias padrão**.
3. (Opcional) Em **Authentication → Providers**, habilite **Google** para o botão
   "Continuar com Google". Configure o `Authorized redirect URL` apontando para
   `http://localhost:5173/dashboard` (dev) e a URL de produção.
4. Em **Authentication → URL Configuration**, adicione `http://localhost:5173` em
   *Site URL* / *Redirect URLs* (necessário para a recuperação de senha funcionar).

### 4. Variáveis de ambiente

Copie o exemplo e preencha com os valores do seu projeto
(**Project Settings → API**):

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

> Sem essas variáveis o app ainda abre, mas exibe um aviso e a autenticação fica desativada.

### 5. Rodar

```bash
npm run dev      # ambiente de desenvolvimento (http://localhost:5173)
npm run build    # build de produção (typecheck + bundle em dist/)
npm run preview  # serve o build de produção localmente
```

---

## 🗂️ Estrutura

```
src/
├── components/        # Logo, AppSidebar, Topbar, AppLayout, MobileTabBar,
│   │                  # NovaTransacaoModal, CurrencyChip, auth/, ui/
│   └── ui/            # Button, Input, Card, Modal, Switch, Tabs, Toast, etc.
├── contexts/          # Theme, Auth, Sidebar, Data (estado + CRUD + notificações)
├── lib/               # supabase, format, finance, currencies, exchange,
│                      # notifications, export, types
├── pages/             # As 15 telas (Landing, Auth, Dashboard, ...)
├── App.tsx            # Rotas (públicas / protegidas)
└── main.tsx           # Providers (Theme → Toast → Auth)
supabase/schema.sql    # Schema + RLS + seed das categorias
```

---

## ✅ Telas implementadas (15)

Landing · Login/Cadastro · Recuperação de senha · Dashboard (claro + escuro) ·
Dashboard mobile (tab bar + bottom sheet) · Câmbio · Relatórios (export PDF/Excel/CSV) ·
Calendário · Transações (receitas/despesas com filtros) · Contas a pagar ·
Metas · Notificações · Configurações · Categorias · Modal **Nova transação** multi-moeda.

---

## 💱 Módulo de câmbio

- Cotações da **AwesomeAPI** em relação ao BRL, com **cache** (30 min) em `localStorage` e
  **fallback** para a última cotação conhecida / valores estáticos caso a API esteja fora
  (o app continua funcional — RN08/RNF11).
- Ao registrar uma transação em moeda estrangeira, o sistema grava **valor original +
  valor convertido + taxa + timestamp**. A taxa fica congelada na transação e **nunca muda
  retroativamente** (RN07).
- Exibição dupla (valor em BRL + valor na moeda original) nas listas.
- Suporte a **15 moedas** (BRL, USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, ARS, MXN, CLP, UYU,
  PYG, PEN).

---

## 🔔 Notificações inteligentes

Geradas automaticamente (sem duplicar, via chave única por evento):

- **Contas a vencer** (≤ 3 dias) e **vencidas** — contas pendentes vencidas viram
  *Atrasadas* automaticamente (RN03).
- **Meta atingida** (≥ 100%).
- **Orçamento perto do limite** (≥ 80%) ou **estourado** (≥ 100%) no mês corrente.

---

## 🔒 Segurança

- Autenticação e hash de senha são responsabilidade do **Supabase Auth** — a senha nunca
  trafega/armazena em texto puro (RNF03).
- **Row Level Security** em todas as tabelas: cada linha pertence a `auth.uid()` e só é
  acessível pelo dono (RN01/RN04).

---

## 📋 Validações

- Valor sempre **> 0** (banco + formulário — RN02).
- Campos obrigatórios validados no cliente.
- Estados de **loading** (skeletons), **vazio** e **erro** (com retry) em todas as listagens.

---

## 🎨 Design tokens

Os tokens de cor, tipografia, raios e sombras do handoff estão mapeados em
[`src/index.css`](src/index.css) (CSS variables, com troca de tema via classe `.dark`) e em
[`tailwind.config.js`](tailwind.config.js).

---

## 🚫 Fora do escopo v1

Open Finance, app nativo, IA de análise, sincronização bancária, investimentos, cripto e
carteira multi-moeda com saldos separados — conforme o handoff.
