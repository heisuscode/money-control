-- Rollback da migração 003 (parcelamento). Recorrências parceladas passam a
-- se repetir sem fim; desative-as antes, se quiser evitar novos lançamentos.
alter table public.recorrencias drop constraint if exists recorrencias_parcelas_check;
alter table public.recorrencias drop column if exists valor_total;
alter table public.recorrencias drop column if exists parcelas_total;
