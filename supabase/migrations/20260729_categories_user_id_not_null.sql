-- 2026-07-29 — Issue #9
-- Remover categorias sem dono e tornar categories.user_id obrigatório.
--
-- Contexto: o banco divergiu de supabase/schema.sql. O schema já declara
-- `user_id uuid not null references auth.users(id) on delete cascade`, mas o
-- banco mantinha a coluna anulável, o que permitiu 3 registros sem dono
-- criados em 2026-05-30 (todos no mesmo instante, resquício de seed inicial).
--
-- Auditoria RLS (issue #9): a única policy de categories é ALL para o role
-- `authenticated`, com qual e with_check iguais a `auth.uid() = user_id`,
-- sem nenhuma cláusula tolerante a nulo. Com user_id nulo a comparação
-- resulta em NULL, nunca true — os órfãos estavam invisíveis para TODAS as
-- contas. Não houve vazamento entre contas. Confirmado sob `role
-- authenticated` com o sub do usuário real: ele via 6 das 9 categorias,
-- 0 órfãs. Não há policy para `anon` e a aplicação nunca usa service_role.
--
-- A FK composta transactions_category_user_fk (category_id, user_id) ->
-- categories(id, user_id) já impedia usar essas categorias em lançamentos:
-- com ambas as colunas NOT NULL em transactions (issue #7), o MATCH SIMPLE é
-- aplicado e nunca casa com user_id nulo do lado da categoria. Verificado por
-- insert real revertido:
--   "violates foreign key constraint transactions_category_user_fk"
-- A proteção era real, mas acidental e não documentada.
--
-- Estado registrado antes da execução:
--   categorias .................... 9
--   categorias com user_id nulo ... 3
--   transações .................... 6
--   transações usando as órfãs .... 0
--   is_nullable(user_id) .......... YES
--   usuários com categoria ........ 1
--
-- Backup validado em (fora do versionamento):
--   C:\Users\daany\Backups\dashboard-de-fluxo\20260729-pre-issue9\
--
-- O rollback está em 20260729_categories_user_id_not_null_rollback.sql

begin;

-- Guarda 1: reconfirma, no instante da execução, que nenhum lançamento passou
-- a referenciar as categorias sem dono. Se passou, aborta em vez de apagar.
do $$
declare
  em_uso int;
begin
  select count(*) into em_uso
  from public.transactions t
  join public.categories c on c.id = t.category_id
  where c.user_id is null;

  if em_uso > 0 then
    raise exception
      'Migracao abortada: % lancamentos referenciam categorias sem dono. Reclassifique antes de migrar.',
      em_uso;
  end if;
end $$;

-- Guarda 2: o escopo auditado é de exatamente 3 órfãs. Qualquer divergência
-- significa que o banco mudou desde a auditoria — parar e reauditar.
do $$
declare
  orfas int;
begin
  select count(*) into orfas
  from public.categories
  where user_id is null;

  if orfas <> 3 then
    raise exception
      'Migracao abortada: esperava 3 categorias sem dono, encontrei %. Reauditar antes de migrar.',
      orfas;
  end if;
end $$;

-- 1. Remover os registros sem dono
delete from public.categories where user_id is null;

-- 2. Tornar a coluna obrigatória, como o schema já declara
alter table public.categories
  alter column user_id set not null;

commit;
