-- 2026-07-31 — Issue #13 — ROLLBACK
--
-- Reverte 20260731_transactions_user_id_not_null.sql, devolvendo
-- transactions.user_id ao estado anulável.
--
-- ATENÇÃO: reverter reintroduz o defeito. Com a coluna anulável, a FK composta
-- transactions_category_user_fk volta a ser ignorada (MATCH SIMPLE) sempre que
-- user_id for nulo, e um lançamento sem dono pode referenciar categoria de
-- qualquer proprietário — ficando invisível para todas as contas por causa da
-- RLS, que nunca avalia a comparação como verdadeira.
--
-- Nenhum dado é alterado por este script: apenas a restrição da coluna.
-- Ele não recria nem remove nenhum lançamento.
--
-- Backup validado e armazenado fora do repositório antes da execução. A
-- localização do backup deve permanecer no registro operacional privado.
-- Para restaurar dados, usar esse backup ou o ponto de restauração do Supabase
-- anotado antes da migração.
--
-- Use apenas se a migração causar problema pior que o defeito que ela corrige.

begin;

alter table public.transactions
  alter column user_id drop not null;

commit;
