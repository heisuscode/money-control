-- Rollback da migração 004. Volta a um pagamento por fatura: primeiro junta os
-- pagamentos de uma mesma fatura num só (soma os valores, fica a data e a conta
-- do mais recente), depois recria o índice único.
with somados as (
  select cartao_id, fim_ciclo, sum(valor) as total,
         (array_agg(id order by data desc, criado_em desc))[1] as manter
  from public.pagamentos_fatura
  group by cartao_id, fim_ciclo
  having count(*) > 1
)
update public.pagamentos_fatura p
set valor = s.total
from somados s
where p.id = s.manter;

delete from public.pagamentos_fatura p
using (
  select cartao_id, fim_ciclo, (array_agg(id order by data desc, criado_em desc))[1] as manter
  from public.pagamentos_fatura
  group by cartao_id, fim_ciclo
  having count(*) > 1
) s
where p.cartao_id = s.cartao_id and p.fim_ciclo = s.fim_ciclo and p.id <> s.manter;

drop index if exists public.idx_pagamentos_fatura_cartao_ciclo;
alter table public.pagamentos_fatura
  add constraint pagamentos_fatura_cartao_id_fim_ciclo_key unique (cartao_id, fim_ciclo);
