-- ============================================================================
-- MoneyControl — Migração 003: compras parceladas no cartão
-- Uma compra parcelada é uma recorrência mensal com número fixo de parcelas.
-- Aditiva e idempotente. Reverter: 003_parcelamento_rollback.sql
-- ============================================================================

-- total de parcelas (null = recorrência sem fim, como assinaturas)
alter table public.recorrencias add column if not exists parcelas_total smallint;
-- valor total da compra: a última parcela absorve a diferença de centavos da divisão
alter table public.recorrencias add column if not exists valor_total numeric(14,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'recorrencias_parcelas_check') then
    alter table public.recorrencias add constraint recorrencias_parcelas_check check (
      parcelas_total is null
      or (parcelas_total between 2 and 48 and valor_total is not null and valor_total > 0 and frequencia = 'mensal')
    );
  end if;
end $$;
