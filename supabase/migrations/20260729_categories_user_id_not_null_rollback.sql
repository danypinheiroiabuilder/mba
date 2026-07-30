-- Rollback da migração 20260729_categories_user_id_not_null.sql (Issue #9)
--
-- Reverte APENAS a restrição de schema. Os 3 registros removidos não são
-- recriados de propósito: eles não têm dono, e recriá-los reintroduziria
-- exatamente o defeito que a migração corrigiu. Se a restauração dos dados
-- for realmente necessária, ela vem do backup em
--   C:\Users\daany\Backups\dashboard-de-fluxo\20260729-pre-issue9\
--
-- Atenção: rodar este rollback devolve a coluna ao estado anulável, ou seja,
-- permite que o problema se repita via seed, importação ou script manual.
-- Nenhuma categoria existente é afetada.

begin;

alter table public.categories
  alter column user_id drop not null;

commit;
