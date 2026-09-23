-- ============================================================================
-- MoneyControl — Migração 002: carteiras, cartões de crédito e recorrências
-- Execute no SQL Editor do Supabase. É idempotente (pode rodar mais de uma vez)
-- e apenas ADITIVA: tabelas novas + colunas opcionais. O app atual continua
-- funcionando sem mudanças. Reverter: 002_carteiras_recorrencias_rollback.sql
-- ============================================================================

-- Carteiras: conta bancária, dinheiro ou cartão de crédito ----------------------
create table if not exists public.carteiras (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('conta', 'dinheiro', 'cartao_credito')),
  cor text not null default '#004AAD',
  icone text not null default '🏦',
  saldo_inicial numeric(14,2) not null default 0,
  -- só cartão de crédito
  limite numeric(14,2),
  dia_fechamento smallint check (dia_fechamento between 1 and 31),
  dia_vencimento smallint check (dia_vencimento between 1 and 31),
  criado_em timestamptz not null default now(),
  constraint carteiras_cartao_completo check (
    tipo <> 'cartao_credito'
    or (limite is not null and limite > 0 and dia_fechamento is not null and dia_vencimento is not null)
  )
);

-- Recorrências: regras que geram receitas/despesas automaticamente ---------------
create table if not exists public.recorrencias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  ativo boolean not null default true,
  tipo text not null check (tipo in ('despesa', 'receita')),
  descricao text not null,
  valor numeric(14,2) not null check (valor > 0),
  categoria_id uuid references public.categorias (id) on delete set null,
  carteira_id uuid references public.carteiras (id) on delete set null,
  frequencia text not null check (frequencia in ('semanal', 'mensal', 'anual')),
  dia smallint not null check (dia between 0 and 31), -- dia do mês, ou 0-6 (semanal)
  data_inicio date not null,
  ultima_execucao date,
  criado_em timestamptz not null default now()
);

-- Pagamentos de fatura: transferência da conta pagadora para o cartão -----------
create table if not exists public.pagamentos_fatura (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  cartao_id uuid not null references public.carteiras (id) on delete cascade,
  fim_ciclo date not null,
  carteira_id uuid references public.carteiras (id) on delete set null,
  valor numeric(14,2) not null check (valor > 0),
  data date not null default current_date,
  criado_em timestamptz not null default now(),
  unique (cartao_id, fim_ciclo)
);

-- Transações ganham carteira e origem em recorrência --------------------------
alter table public.receitas add column if not exists carteira_id uuid references public.carteiras (id) on delete set null;
alter table public.receitas add column if not exists recorrencia_id uuid references public.recorrencias (id) on delete set null;
alter table public.despesas add column if not exists carteira_id uuid references public.carteiras (id) on delete set null;
alter table public.despesas add column if not exists recorrencia_id uuid references public.recorrencias (id) on delete set null;

-- Cada ocorrência de uma recorrência existe uma única vez (NULLs não conflitam),
-- o que torna a geração automática segura contra execuções repetidas.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'receitas_recorrencia_data_key') then
    alter table public.receitas add constraint receitas_recorrencia_data_key unique (recorrencia_id, data);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'despesas_recorrencia_data_key') then
    alter table public.despesas add constraint despesas_recorrencia_data_key unique (recorrencia_id, data);
  end if;
end $$;

create index if not exists idx_carteiras_usuario on public.carteiras (usuario_id);
create index if not exists idx_recorrencias_usuario on public.recorrencias (usuario_id);
create index if not exists idx_pagamentos_fatura_usuario on public.pagamentos_fatura (usuario_id);
create index if not exists idx_despesas_carteira on public.despesas (carteira_id, data);
create index if not exists idx_receitas_carteira on public.receitas (carteira_id, data);

-- RLS: cada usuário só acessa os próprios dados --------------------------------
alter table public.carteiras enable row level security;
alter table public.recorrencias enable row level security;
alter table public.pagamentos_fatura enable row level security;

drop policy if exists "carteiras_owner" on public.carteiras;
create policy "carteiras_owner" on public.carteiras
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "recorrencias_owner" on public.recorrencias;
create policy "recorrencias_owner" on public.recorrencias
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists "pagamentos_fatura_owner" on public.pagamentos_fatura;
create policy "pagamentos_fatura_owner" on public.pagamentos_fatura
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
