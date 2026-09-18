# Handoff: MoneyControl — Sistema de Planejamento e Controle Financeiro Pessoal

## Overview
MoneyControl é uma plataforma **web responsiva** de gestão financeira pessoal: controle de receitas e despesas, contas a pagar, metas, categorias, relatórios, calendário financeiro, notificações inteligentes e um módulo de moedas internacionais com conversão cambial automática. Este pacote contém o **design completo das telas** (15 telas) em alta fidelidade, pronto para servir de referência de implementação.

A stack-alvo definida no projeto é **React + TypeScript + Vite**, com **Supabase** (auth + Postgres) em produção. Estas telas devem ser **recriadas** nesse ambiente — não copiadas como HTML.

## About the Design Files
Os arquivos `.dc.html` deste bundle são **referências de design criadas em HTML** — protótipos que mostram o visual e o comportamento pretendidos, **não código de produção para copiar diretamente**. A tarefa é **recriar estes designs em React + TypeScript**, usando os padrões e bibliotecas que você escolher para o projeto (sugestões abaixo). O conteúdo (valores, nomes, datas) é fictício, apenas ilustrativo.

> ⚠️ Os arquivos `.dc.html` usam um runtime de preview proprietário (`support.js`) e a sintaxe `<x-dc>` / `<dc-import>`. **Não tente rodar ou portar esse runtime.** Abra-os apenas como referência visual (ou veja os screenshots, se incluídos). Toda a estilização está inline, o que facilita ler os valores exatos de cada elemento.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos, raios e estados são finais. Recrie a UI fielmente usando a biblioteca de componentes que adotar. Onde houver gráficos, use uma lib real (Recharts, visx ou Chart.js) — no design eles são SVGs estáticos.

## Stack sugerida
- **Framework:** React 18 + TypeScript + Vite
- **Roteamento:** React Router
- **Estilo:** Tailwind CSS (recomendado — os tokens abaixo mapeiam direto) ou CSS Modules
- **Componentes/UI:** shadcn/ui ou Radix UI (acessibilidade pronta)
- **Gráficos:** Recharts
- **Backend/Auth/DB:** Supabase (`@supabase/supabase-js`)
- **Datas:** date-fns (locale pt-BR)
- **Formatação monetária:** `Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' })`
- **Fontes:** Plus Jakarta Sans (UI) + Spline Sans Mono (valores numéricos) — via Google Fonts

---

## Design Tokens

### Cores — Marca
| Token | Hex | Uso |
|---|---|---|
| `brand` | `#004AAD` | Cor primária (logo, botões, ativos, links) |
| `brand-700` | `#033B85` | Hover/gradiente escuro da marca |
| `brand-500` | `#2F6BD4` | Gradiente claro da marca |
| `ink` | `#0E1726` | Texto principal / superfícies escuras |

### Cores — Funcionais
| Token | Hex | Uso |
|---|---|---|
| `success` | `#16A34A` | Receitas, positivo, metas atingidas |
| `success-bg` | `#E7F6EC` | Fundo de ícone/realce de receita |
| `danger` | `#E5484D` | Despesas, atrasado, alertas |
| `danger-bg` | `#FDEBEC` / `#FEF1F1` | Fundo de despesa |
| `warning` | `#F59E0B` | A vencer, orçamento perto do limite |
| `warning-bg` | `#FEF3DD` / `#FFFBF2` | Fundo de alerta |
| `accent-violet` | `#A855F7` / `#A78BFA` | Categoria Lazer / fatias de gráfico |

### Cores — Neutros (tema claro)
| Token | Hex | Uso |
|---|---|---|
| `bg-app` | `#F6F8FB` | Fundo da área de conteúdo |
| `bg-surface` | `#FFFFFF` | Cards, sidebar, topbar |
| `bg-subtle` | `#F8FAFD` / `#F1F5FB` | Inputs, chips, hovers |
| `border` | `#EEF1F6` / `#E2E8F1` | Bordas de cards e divisores |
| `text-2` | `#56627A` / `#64748B` | Texto secundário |
| `text-3` | `#8A95A6` / `#A6B0BF` | Texto terciário / placeholders |

### Cores — Neutros (tema escuro — RF13)
| Token | Hex | Uso |
|---|---|---|
| `dk-bg-app` | `#0B1220` | Fundo da área de conteúdo |
| `dk-bg-surface` | `#0E1726` | Sidebar / topbar |
| `dk-bg-card` | `#141D2E` | Cards |
| `dk-border` | `#1C2740` / `#1F2C42` | Bordas |
| `dk-text` | `#EAF1FB` | Texto principal |
| `dk-text-2` | `#93A1B7` | Texto secundário |
| `dk-text-3` | `#6B7C96` / `#5B6B85` | Texto terciário |
| `dk-active-bg` | `rgba(79,132,255,.16)` | Item de menu ativo |
| `dk-active-text` | `#7FA8FF` | Texto/ícone do item ativo |

### Tipografia
- **UI:** `Plus Jakarta Sans`, pesos 400 / 500 / 600 / 700 / 800
- **Numérica (valores, taxas, datas curtas):** `Spline Sans Mono`, pesos 400 / 500 / 600
- Títulos de tela: 17px / 800 / letter-spacing -0.02em
- Título de card: 15px / 700
- Corpo: 13–14px / 600 (labels) e 400 (texto)
- Saldo em destaque: 27–42px / 600 mono, letter-spacing -0.02em
- Microcopy/caption: 11–12px

### Espaçamento, raios e sombras
- **Escala de espaço:** 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26 px
- **Raios:** inputs/itens 10–12px · cards 14–16px · painéis/modais 20–22px · pílulas/avatares 99px/50%
- **Sombra de card:** `0 24px 60px -30px rgba(15,23,42,.4)`
- **Sombra de botão primário:** `0 12px 24px -12px rgba(0,74,173,.8)`
- **Anel de foco (input ativo):** `box-shadow: 0 0 0 3px #EAF1FE` + borda `#C9D8F2`

### Logo
- Símbolo: gráfico de barras ascendente com seta diagonal subindo, em branco sobre quadrado de gradiente `linear-gradient(150deg,#2F6BD4,#033B85)`, raio 9px.
- O SVG do símbolo está em `AppSidebar.dc.html` (procure os `<rect>` + `<path>` dentro do `<aside>`). PNG original da marca em `assets/logo-moneycontrol.png`.
- Lockup: símbolo + wordmark "MoneyControl" (Plus Jakarta Sans 800).

---

## Layout global (telas com app)
Todas as telas autenticadas seguem o mesmo shell:
- **Sidebar fixa à esquerda** (componente `AppSidebar`, ver abaixo) — 236px expandida, 76px recolhida.
- **Topbar** (66–72px de altura): título da tela à esquerda; ações à direita (busca, filtros, troca de moeda, notificações, botão primário "Nova ...").
- **Área de conteúdo** com `padding: 22–24px 26px` sobre `bg-app`, em `flex column` ou `grid`.
- Largura de referência do desktop: **1280px**.

### Componente: AppSidebar (reutilizável — usado em 8 telas)
- **Props:** `active` (enum: dashboard, receitas, despesas, contas, metas, relatorios, calendario, cambio, notificacoes, config) e `theme` (`light` | `dark`).
- **Estado interno:** `collapsed` (boolean) — alternado pelo botão de seta no topo. Recomenda-se persistir em `localStorage` e elevar a um contexto/layout para ficar consistente entre rotas.
- **Estrutura:** cabeçalho (logo + wordmark + botão recolher) → seção "PRINCIPAL" (Dashboard, Receitas, Despesas, Contas a pagar, Metas, Relatórios, Calendário, Câmbio[badge NOVO]) → seção "CONTA" (Notificações[badge 3], Configurações) → card de usuário no rodapé (avatar "HC", nome, plano).
- **Item ativo:** fundo `#EAF1FE` (claro) / `rgba(79,132,255,.16)` (escuro), texto `#033B85`/`#7FA8FF`, peso 700, e uma **barra-acento** vertical de 3×18px arredondada à esquerda.
- **Recolhido:** esconde rótulos/seções/texto do usuário, centraliza ícones, largura 76px, e cada item ganha `title` (tooltip). Transição `width .18s ease`.
- Ícones: 18px, stroke 2, estilo line (Lucide/Feather servem perfeitamente).

---

## Screens / Views

> Numeração conforme o arquivo `MoneyControl Telas.dc.html`.

### 01 · Landing (Tela inicial)
- **Propósito:** apresentação pública; CTAs de login e cadastro (Wireframe 14.1).
- **Layout:** dentro de uma moldura de browser. Nav (logo + links Recursos/Câmbio/Preços/Sobre + "Entrar" e "Criar conta grátis"). Hero em 2 colunas: à esquerda badge + headline 52px/800 + subtítulo + 2 CTAs + prova social (avatares + "+9k"); à direita um mock flutuante do app (card de saldo escuro + card de meta + donut de categorias). Faixa de 4 features abaixo.
- **CTA primário:** fundo `brand`, texto branco, raio 13px, sombra de botão.

### 02 · Autenticação (Login + Cadastro)
- **Propósito:** RF01 (cadastro), RF02 (login).
- **Login (desktop):** 2 colunas — painel de marca (gradiente `160deg,#033B85,#0E1726`) + formulário (e-mail, senha com "mostrar", "manter conectado", botão Entrar, divisor "ou", **"Continuar com Google"** com o G oficial colorido, link p/ criar conta).
- **Cadastro (desktop):** nome, e-mail, senha, confirmar senha, **medidor de força** (4 barras), checkbox de termos, botão "Criar minha conta".
- **Login (mobile):** moldura de celular 300px; mesma identidade, campos com alvo ≥44px, inclui "Continuar com Google".
- **Validação esperada:** e-mail válido, senha mín. 8 caracteres, confirmação igual, termos aceitos. (RNF03: senha deve ir criptografada/hash no backend — nunca em texto.)
- **Botão Google:** ícone "G" 4 cores (vermelho `#EA4335`, azul `#4285F4`, amarelo `#FBBC05`, verde `#34A853`), borda `#E2E8F1`, raio 12–13px.

### 03 · Dashboard — claro (principal)
- **Propósito:** visão geral (7.1).
- **Topbar:** "Olá, Heitor" + data; busca; seletor de moeda (R$ BRL); sino com badge; botão "Nova transação".
- **Banda de saldo** (card escuro `#0E1726`, raio 18px, brilho radial `rgba(0,74,173,.5)`): "Saldo total" + valor 42px mono + variação +8,2% (chip verde) + comparativo; à direita 3 mini-cards (Receitas, Despesas, Economia) com ícone, label e valor.
- **Coluna esquerda (1.55fr):** card "Evolução do saldo" (gráfico de área com linha de receitas sólida `brand` + despesas tracejada cinza, toggle 6M/Ano, tooltip) + "Movimentações recentes" (lista com ícone, descrição, categoria·data, valor colorido).
- **Coluna direita (1fr):** "Metas financeiras" (barras de progresso) + "Próximas contas" (data em bloco + descrição + status + valor).

### 04 · Dashboard — escuro (RF13)
- Mesma estrutura da 03 com o tema escuro (tokens `dk-*`). Sidebar `theme="dark"`. Toggle de sol/lua na topbar.

### 05 · Dashboard — mobile (RNF01/04)
- Três celulares 300px: (a) dashboard claro com hero de saldo, ações rápidas (Receita/Despesa/Meta/Câmbio), meta, recentes, **tab bar inferior** com FAB "+" central; (b) versão escura; (c) **bottom sheet "Nova movimentação"** (toggle Despesa/Receita, valor grande, categoria, data, salvar).

### 06 · Recuperação de senha (RF03)
- Três passos lado a lado: (1) solicitar link por e-mail; (2) definir nova senha + confirmar + medidor de força; (3) tela de sucesso (card escuro, check verde, "Ir para o login").

### 07 · Câmbio e conversão (RF15–RF25, módulo 26)
- **Conversor:** campo "Você converte" (valor + moeda origem) → botão de swap circular `brand` → "Você recebe" (valor + moeda destino, destacado). Linha de taxa "1 BRL = 0,18215 USD · taxa registrada na transação".
- **Movimentações em moeda estrangeira:** lista com **exibição dupla** (valor em BRL + valor original na moeda) — RF20.
- **Moedas monitoradas:** lista com bandeira/símbolo, nome, código e cotação + variação 24h (verde/vermelho). Toggle de alerta "Avise-me quando USD < R$ 5,30" (RF22, RN10).
- Topbar com selo "Taxas ao vivo" e "Atualizado HH:MM · BCB/ECB".

### 08 · Relatórios (RF10/RF11, 14.4, 7.3)
- 4 KPIs (Total recebido, Total gasto, Economia, Taxa de poupança).
- Gráfico de **barras agrupadas** Receitas×Despesas por mês (6 meses).
- **Donut** de gastos por categoria + "Onde você mais gastou".
- Topbar com filtro Mês/Trimestre/Ano e botões de **exportação PDF / Excel / CSV** (RF11). Filtros previstos: mês, ano, categoria, tipo (7.3).

### 09 · Calendário financeiro (RF14, 7.2)
- Grade mensal 7 colunas; cada dia mostra pontos coloridos (vermelho=despesa, verde=receita); dia atual em destaque escuro; dias com evento têm fundo/borda colorido + rótulo curto.
- Painel lateral "Agenda do dia" com vencimentos do dia selecionado + aviso "lembrete 1 dia antes".

### 10 · Receitas e despesas / Transações (RF04/RF05, 14.3, 5.2)
- Topbar: abas Todas/Receitas/Despesas, busca, "Filtros", botão "Nova".
- 3 mini-cards (Entradas, Saídas, Saldo do mês).
- **Tabela** com colunas Descrição (ícone+nome) · Categoria (chip colorido) · Data (mono) · Valor (verde/escuro). Linhas devem ter ações de **editar/excluir** (5.2) — prever menu de contexto/hover.

### 11 · Contas a pagar (RF08, 5.4)
- 3 cards de status: **Atrasadas** (vermelho), **A vencer 7 dias** (amarelo), **Pagas no mês** (verde) — RN03 classifica vencidas como "Atrasadas" automaticamente.
- Lista de vencimentos: bloco de data + ícone + nome/credor + "Vence em N dias" + valor + botão "Pagar". Itens pagos aparecem esmaecidos com check verde e texto riscado.

### 12 · Metas financeiras (RF07, 5.5)
- Banda escura com total guardado + métricas (ativas, concluídas, aporte/mês).
- Cards de meta: ícone, nome, prazo, valor atual / valor alvo, barra de progresso colorida, % + "faltam R$ X", botão "Adicionar aporte".

### 13 · Notificações e Configurações (RF09, RF12, 5.7)
- **Notificações:** lista com ícone por tipo (vencimento, meta atingida, orçamento perto do limite, variação cambial, crédito recebido), título, descrição, tempo, ponto azul de "não lida". "Marcar lidas".
- **Configurações:** perfil (avatar, nome, e-mail, "Editar perfil"); **Aparência** (Claro/Escuro/Sistema — RF13); **Preferências** (Moeda principal BRL — RF18; Alertas de vencimento toggle; 2FA toggle; Sair da conta).

### 14 · Categorias (RF06, módulo 5.3)
- Abas Despesas/Receitas + botão "Nova categoria".
- **8 categorias padrão:** Alimentação 🍽️, Transporte 🚗, Moradia 🏠, Saúde 🩺, Educação 📚, Lazer 🎬, Compras 🛍️, Investimentos 📈 — cada card com ícone, nome e **barra de orçamento** (gasto/limite). Quando passa do limite, a barra fica vermelha/violeta cheia.
- **Personalizadas:** cards com selo "CUSTOM" + card tracejado "Criar categoria".

### 15 · Nova transação — desktop, multi-moeda (RF15–RF20)
- **Modal** sobre dashboard escurecido. Toggle Despesa/Receita. Campo de **valor com seletor de moeda** (ex.: US$ 149,99 + dropdown USD). **Preview de conversão automática** ("Convertido para R$ 860,94 · taxa 5,74 registrada", selo "ao vivo") — RF16/RF17. Campos Descrição, Categoria (com ícone), Data. Botões Cancelar / Salvar.
- **Painel lateral de seleção de moeda:** busca + lista das moedas com símbolo, código e cotação atual; moeda selecionada destacada. Nota "15 no total" (RNF12: ≥15 moedas).

---

## Interactions & Behavior
- **Sidebar collapse:** botão de seta alterna 236px↔76px (transição 180ms). Recolhido mostra tooltips. Persistir preferência.
- **Tema claro/escuro (RF13):** alternar via Configurações; aplicar a todo o app (recomenda-se `data-theme` + CSS vars ou Tailwind `dark:`). Persistir; opção "Sistema" segue `prefers-color-scheme`.
- **Nova transação:** abre modal (desktop) / bottom sheet (mobile). Ao escolher moeda ≠ BRL, buscar cotação e exibir conversão em tempo real (RF16). Salvar grava valor original + convertido + taxa + timestamp (RF17, RN07 — taxa não muda retroativamente).
- **Filtros/busca:** Transações e Relatórios filtram por categoria, data, tipo, mês/ano.
- **Notificações:** marcar como lidas; badge reflete não lidas.
- **Validação de formulários:** valor > 0 (RN02); campos obrigatórios; e-mail único (RF01).
- **Estados a implementar:** loading (skeletons nos cards/listas), vazio ("nenhuma movimentação ainda"), erro (ex.: API de câmbio fora — RN08/RNF11: permitir taxa manual e usar última cotação conhecida).
- **Responsivo:** sidebar vira tab bar inferior no mobile; grids de 3–4 colunas colapsam para 1; modais viram bottom sheets.

## State Management
- **auth:** usuário logado, sessão (Supabase). RN01/RN04 — só dados do próprio usuário (RLS no Supabase).
- **theme:** 'light' | 'dark' | 'system' (persistido).
- **sidebar:** collapsed (persistido).
- **transações/contas/metas/categorias/notificações:** coleções por usuário (fetch Supabase).
- **câmbio:** cotações por moeda (cache + revalidação por frequência configurável — RF21), moeda padrão do perfil (RF18), lista de moedas monitoradas (RN10).

## Modelo de dados (do PDF, seção 16) — para o Supabase
- **usuarios**(id uuid pk, nome, email único, senha hash, criado_em)
- **receitas**(id, usuario_id fk, descricao, valor decimal, data, categoria_id fk)
- **despesas**(id, usuario_id fk, descricao, valor decimal, data, categoria_id fk)
- **contas**(id, usuario_id fk, valor, vencimento, status enum[pendente|pago|atrasado])
- **metas**(id, usuario_id fk, objetivo, valor_meta, valor_atual, prazo)
- **categorias**(id, usuario_id fk nullable p/ padrão, nome, icone, cor, tipo)
- **notificacoes**(id, usuario_id fk, tipo, titulo, descricao, lida, criado_em)
- Para câmbio: armazenar em cada movimentação `moeda_original`, `valor_original`, `valor_convertido`, `taxa`, `taxa_timestamp` (RF17, RN07).

## Assets
- `assets/logo-moneycontrol.png` — logo original da marca (referência de cor/forma). O símbolo já está recriado em SVG dentro de `AppSidebar.dc.html`; reaproveite-o como componente `<Logo/>`.
- Ícones de UI: usar Lucide/Feather (line, stroke 2). Ícones de categoria: emojis no design — substituíveis por um set próprio se preferir.
- Fontes: Google Fonts — Plus Jakarta Sans + Spline Sans Mono.

## Files
- `screenshots/` — **imagens das 15 telas** em largura cheia (01–15, mesma numeração das telas abaixo). Use como referência visual do resultado pretendido.
- `MoneyControl Telas.dc.html` — todas as 15 telas (estilos inline = valores exatos por elemento).
- `AppSidebar.dc.html` — componente da barra lateral (lógica de active/theme/collapsed + SVG do logo).
- `support.js` — runtime do preview (apenas para abrir os `.dc.html`; **não portar**).
- `assets/logo-moneycontrol.png` — logo da marca.

## Escopo fora desta v1 (do PDF)
WON'T v1: Open Finance, app nativo iOS/Android, IA de análise, sincronização bancária, investimentos, criptomoedas, carteira multi-moeda com saldos separados. Não implementar agora.
