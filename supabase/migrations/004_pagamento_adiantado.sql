-- ============================================================================
-- MoneyControl — Migração 004: pagar fatura adiantado ou em partes
-- Uma fatura passa a aceitar vários pagamentos (antes era um só, pelo índice
-- único cartão + fechamento). Ela fica quitada quando a soma cobre o total.
-- Não apaga nem altera dados. Reverter: 004_pagamento_adiantado_rollback.sql
-- ============================================================================

-- o nome é o gerado pelo Postgres para `unique (cartao_id, fim_ciclo)` da 002
alter table public.pagamentos_fatura drop constraint if exists pagamentos_fatura_cartao_id_fim_ciclo_key;

-- consultas por fatura continuam rápidas sem o índice único
create index if not exists idx_pagamentos_fatura_cartao_ciclo on public.pagamentos_fatura (cartao_id, fim_ciclo);
