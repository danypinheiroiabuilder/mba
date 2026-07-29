-- 2026-07-29 — Issue #7
-- Bloquear exclusão de categoria vinculada a lançamentos.
--
-- Contexto: o banco divergiu de supabase/schema.sql. O schema declara
-- `category_id uuid not null ... on delete restrict`, mas o banco aplicava
-- ON DELETE SET NULL com a coluna anulável. Excluir uma categoria em uso
-- apagava silenciosamente a classificação dos lançamentos.
--
-- Esta migração traz o banco até o que o schema já documenta.
--
-- Estado registrado antes da execução:
--   categorias .............. 9
--   transações .............. 6
--   category_id nulos ....... 0
--   constraint .............. FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
--   is_nullable(category_id)  YES
--
-- O rollback está em 20260729_restrict_category_delete_rollback.sql

begin;

-- Guarda: aborta a transação inteira se existir qualquer lançamento órfão.
-- Sem isso, o SET NOT NULL falharia no meio da migração.
do $$
declare
  orfaos int;
begin
  select count(*) into orfaos
  from public.transactions
  where category_id is null;

  if orfaos > 0 then
    raise exception
      'Migracao abortada: % transacoes com category_id nulo. Reclassifique antes de migrar.',
      orfaos;
  end if;
end $$;

-- 1. Trocar ON DELETE SET NULL por ON DELETE RESTRICT
alter table public.transactions
  drop constraint transactions_category_id_fkey;

alter table public.transactions
  add constraint transactions_category_id_fkey
  foreign key (category_id) references public.categories(id)
  on delete restrict;

-- 2. Tornar a coluna obrigatória, como o schema já declara
alter table public.transactions
  alter column category_id set not null;

commit;
