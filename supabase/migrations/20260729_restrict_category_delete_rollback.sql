-- 2026-07-29 — Issue #7 — ROLLBACK
--
-- Reverte 20260729_restrict_category_delete.sql, restaurando exatamente o
-- estado anterior do banco:
--   constraint .............. FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
--   is_nullable(category_id)  YES
--
-- ATENÇÃO: este script restaura apenas a ESTRUTURA. Ele não recupera dados.
-- Para dados, usar o backup JSON de scratchpad/backup-20260729/ ou o ponto
-- de restauração do Supabase.
--
-- Reverter reintroduz o defeito da issue #7: excluir categoria em uso volta a
-- apagar silenciosamente a classificação dos lançamentos. Use apenas se a
-- migração causar problema pior.

begin;

-- 1. Voltar a permitir nulo
alter table public.transactions
  alter column category_id drop not null;

-- 2. Voltar para ON DELETE SET NULL
alter table public.transactions
  drop constraint transactions_category_id_fkey;

alter table public.transactions
  add constraint transactions_category_id_fkey
  foreign key (category_id) references public.categories(id)
  on delete set null;

commit;
