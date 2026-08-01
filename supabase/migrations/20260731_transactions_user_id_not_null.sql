-- 2026-07-31 — Issue #13
-- Tornar transactions.user_id obrigatório.
--
-- Contexto: o banco divergiu de supabase/schema.sql. O schema já declara
-- `user_id uuid not null references auth.users(id) on delete cascade`, mas o
-- banco manteve a coluna anulável.
--
-- Por que importa: a FK composta transactions_category_user_fk
-- (category_id, user_id) -> categories(id, user_id) usa MATCH SIMPLE, o padrão
-- do Postgres. Com qualquer coluna da chave nula, a verificação é IGNORADA:
-- um lançamento sem dono poderia referenciar categoria de qualquer
-- proprietário sem violar a constraint.
--
-- Correção de registro: o cabeçalho de
-- 20260729_categories_user_id_not_null.sql afirma que "ambas as colunas NOT
-- NULL em transactions (issue #7)". Está errado — a issue #7 tornou
-- category_id obrigatório, não user_id. O engano foi propagado para o
-- comentário de schema.sql (linhas 97-101). Esta migração fecha a lacuna.
--
-- Não há exposição de dados hoje: a policy ALL de transactions compara
-- auth.uid() = user_id em USING e WITH CHECK. Um registro sem dono resultaria
-- em NULL (nunca true) e ficaria invisível para todas as contas; a criação por
-- conta autenticada já é barrada pelo WITH CHECK. O risco está em importações,
-- scripts, service role e alterações manuais — caminhos que não passam pela
-- RLS e onde a FK seria a última linha de defesa.
--
-- Estado registrado na auditoria de 2026-07-31 (somente leitura):
--   transações .............................. 8
--   transações com user_id nulo ............. 0
--   categorias .............................. 8
--   transações com categoria de outro dono .. 0
--   is_nullable(user_id) .................... YES
--
-- Backup validado e armazenado fora do repositório antes da execução. A
-- localização do backup deve permanecer no registro operacional privado.
--
-- O rollback está em 20260731_transactions_user_id_not_null_rollback.sql

begin;

-- Guarda 1: se a coluna já for obrigatória, abortar em vez de "suceder" em
-- silêncio mascarando um estado inesperado do banco.
do $$
declare
  anulavel text;
begin
  select is_nullable into anulavel
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'transactions'
    and column_name  = 'user_id';

  if anulavel is null then
    raise exception
      'Migracao abortada: coluna transactions.user_id nao encontrada.';
  end if;

  if anulavel <> 'YES' then
    raise exception
      'Migracao abortada: transactions.user_id ja esta NOT NULL (is_nullable=%). Nada a fazer.',
      anulavel;
  end if;
end $$;

-- Guarda 2: condição essencial. Um lançamento sem dono é dado financeiro e
-- precisa ser RECLASSIFICADO, nunca apagado — por isso esta guarda aborta a
-- migração em vez de deletar, diferente do que foi feito com as categorias
-- órfãs na issue #9.
do $$
declare
  sem_dono int;
begin
  select count(*) into sem_dono
  from public.transactions
  where user_id is null;

  if sem_dono > 0 then
    raise exception
      'Migracao abortada: % lancamentos sem proprietario. Reclassifique antes de migrar (NAO apagar).',
      sem_dono;
  end if;
end $$;

-- Guarda 3: consistência multi-tenant antes de a FK composta passar a valer
-- de fato. Se já existir vínculo cruzado entre proprietários, parar e
-- investigar em vez de consolidar um estado inconsistente.
do $$
declare
  cruzados int;
begin
  select count(*) into cruzados
  from public.transactions t
  join public.categories c on c.id = t.category_id
  where c.user_id is distinct from t.user_id;

  if cruzados > 0 then
    raise exception
      'Migracao abortada: % lancamentos usam categoria de outro proprietario. Corrigir antes.',
      cruzados;
  end if;
end $$;

-- Tornar a coluna obrigatória, como o schema já declara desde o início.
alter table public.transactions
  alter column user_id set not null;

commit;
