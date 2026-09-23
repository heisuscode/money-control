-- ============================================================================
-- Rollback da migração 002 (carteiras, cartões e recorrências).
-- ATENÇÃO: apaga carteiras, recorrências e pagamentos de fatura cadastrados.
-- As receitas/despesas geradas por recorrências continuam existindo, só perdem
-- o vínculo com carteira e recorrência.
-- ============================================================================

alter table public.receitas drop constraint if exists receitas_recorrencia_data_key;
alter table public.despesas drop constraint if exists despesas_recorrencia_data_key;

alter table public.receitas drop column if exists recorrencia_id;
alter table public.receitas drop column if exists carteira_id;
alter table public.despesas drop column if exists recorrencia_id;
alter table public.despesas drop column if exists carteira_id;

drop table if exists public.pagamentos_fatura;
drop table if exists public.recorrencias;
drop table if exists public.carteiras;
