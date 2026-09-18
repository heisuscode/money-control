-- ============================================================================
-- MoneyControl — Schema do banco (Supabase / PostgreSQL)
-- Execute este arquivo no SQL Editor do Supabase (uma vez).
-- Inclui: tabelas, Row Level Security (cada usuário só vê os próprios dados),
-- trigger de criação de perfil + seed das 8 categorias padrão por usuário.
-- ============================================================================

-- Extensões -----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ============================================================================
-- TABELAS
-- ============================================================================

-- Perfil do usuário (espelha auth.users). A senha NÃO é guardada aqui:
-- o Supabase Auth já armazena o hash com segurança (RNF03).
create table if not exists public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  email text unique not null,
  moeda_principal text not null default 'BRL',
  criado_em timestamptz not null default now()
);

-- Categorias (padrão = usuario_id, criadas por seed; personalizadas = CUSTOM)
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  icone text not null default '🏷️',
  cor text not null default '#004AAD',
  tipo text not null default 'despesa' check (tipo in ('despesa', 'receita')),
  orcamento numeric(14,2) not null default 0,        -- limite de orçamento (0 = sem limite)
  is_padrao boolean not null default false,
  criado_em timestamptz not null default now()
);

-- Receitas
create table if not exists public.receitas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  descricao text not null,
  valor numeric(14,2) not null check (valor > 0),     -- valor em BRL (convertido)
  data date not null default current_date,
  categoria_id uuid references public.categorias (id) on delete set null,
  -- Câmbio (RF17 / RN07): a taxa registrada nunca muda retroativamente
  moeda_original text not null default 'BRL',
  valor_original numeric(14,2) not null,
  valor_convertido numeric(14,2) not null,
  taxa numeric(18,6) not null default 1,
  taxa_timestamp timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

-- Despesas
create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  descricao text not null,
  valor numeric(14,2) not null check (valor > 0),
  data date not null default current_date,
  categoria_id uuid references public.categorias (id) on delete set null,
  moeda_original text not null default 'BRL',
  valor_original numeric(14,2) not null,
  valor_convertido numeric(14,2) not null,
  taxa numeric(18,6) not null default 1,
  taxa_timestamp timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

-- Contas a pagar (status calculado no app: pendente | pago | atrasado — RN03)
create table if not exists public.contas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  descricao text not null,
  valor numeric(14,2) not null check (valor > 0),
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado')),
  pago_em date,
  criado_em timestamptz not null default now()
);

-- Metas
create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  objetivo text not null,
  valor_meta numeric(14,2) not null check (valor_meta > 0),
  valor_atual numeric(14,2) not null default 0,
  prazo date,
  icone text not null default '🎯',
  cor text not null default '#004AAD',
  criado_em timestamptz not null default now()
);

-- Notificações
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null,                -- vencimento | meta | orcamento | cambio | credito
  titulo text not null,
  descricao text not null default '',
  lida boolean not null default false,
  -- chave para evitar duplicatas geradas pelo motor de notificações
  chave text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_receitas_usuario on public.receitas (usuario_id, data);
create index if not exists idx_despesas_usuario on public.despesas (usuario_id, data);
create index if not exists idx_contas_usuario on public.contas (usuario_id, vencimento);
create index if not exists idx_metas_usuario on public.metas (usuario_id);
create index if not exists idx_categorias_usuario on public.categorias (usuario_id, tipo);
create index if not exists idx_notif_usuario on public.notificacoes (usuario_id, criado_em);
create unique index if not exists uq_notif_chave on public.notificacoes (usuario_id, chave) where chave is not null;

-- ============================================================================
-- ROW LEVEL SECURITY — cada usuário só acessa os próprios dados (RN01/RN04)
-- ============================================================================

alter table public.usuarios     enable row level security;
alter table public.categorias   enable row level security;
alter table public.receitas     enable row level security;
alter table public.despesas     enable row level security;
alter table public.contas       enable row level security;
alter table public.metas        enable row level security;
alter table public.notificacoes enable row level security;

-- usuarios: o dono é a própria linha (id = auth.uid())
drop policy if exists "usuarios_self" on public.usuarios;
create policy "usuarios_self" on public.usuarios
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Helper macro repetido por tabela (usuario_id = auth.uid())
drop policy if exists "categorias_owner" on public.categorias;
create policy "categorias_owner" on public.categorias
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "receitas_owner" on public.receitas;
create policy "receitas_owner" on public.receitas
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "despesas_owner" on public.despesas;
create policy "despesas_owner" on public.despesas
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "contas_owner" on public.contas;
create policy "contas_owner" on public.contas
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "metas_owner" on public.metas;
create policy "metas_owner" on public.metas
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "notificacoes_owner" on public.notificacoes;
create policy "notificacoes_owner" on public.notificacoes
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ============================================================================
-- TRIGGER: ao criar usuário no Auth → cria perfil + seed das 8 categorias
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;

  -- 8 categorias padrão (RF06 / módulo 5.3)
  insert into public.categorias (usuario_id, nome, icone, cor, tipo, orcamento, is_padrao)
  values
    (new.id, 'Alimentação',   '🍽️', '#16A34A', 'despesa', 1000, true),
    (new.id, 'Transporte',    '🚗', '#E5484D', 'despesa', 500,  true),
    (new.id, 'Moradia',       '🏠', '#004AAD', 'despesa', 4000, true),
    (new.id, 'Saúde',         '🩺', '#06B6D4', 'despesa', 400,  true),
    (new.id, 'Educação',      '📚', '#2F6BD4', 'despesa', 300,  true),
    (new.id, 'Lazer',         '🎬', '#A855F7', 'despesa', 600,  true),
    (new.id, 'Compras',       '🛍️', '#F59E0B', 'despesa', 800,  true),
    (new.id, 'Investimentos', '📈', '#16A34A', 'receita', 0,    true)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
