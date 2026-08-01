-- Fluxo de Caixa (Supabase) - Schema + RLS (por usuário)
--
-- ATENÇÃO — o que este arquivo é e o que não é:
-- Ele DOCUMENTA a estrutura esperada do banco. Ele NÃO é um script de
-- recuperação validado: nunca foi executado do zero em um banco descartável
-- duas vezes seguidas para comprovar que é seguro reexecutar. Até que essa
-- validação exista, trate-o como referência, não como ferramenta de restauração.
--
-- NUNCA execute este arquivo no banco de produção. Mudanças em produção são
-- feitas por migrações versionadas em supabase/migrations/, cada uma com o
-- rollback correspondente.
--
-- Para um banco novo/local, executar no SQL Editor do Supabase, schema public.

create extension if not exists pgcrypto;

-- Tabelas
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  type text not null check (type in ('income', 'expense')),
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null,
  tag text null,
  payment_method text null check (payment_method in ('pix', 'debito', 'credito', 'dinheiro', 'transferencia', 'outro')),
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_date on public.transactions(date);
create index if not exists idx_transactions_category_id on public.transactions(category_id);

-- Reset (apagar dados)
-- truncate table public.transactions, public.categories restart identity cascade;

-- Categorias padrão (opcional): rode depois de criar a conta e estar logado no SQL Editor
-- trocando o UUID pelo seu `auth.uid()`.
-- insert into public.categories (user_id, name, type, color) values
-- ('00000000-0000-0000-0000-000000000000','Salário','income','#6E7BFF'),
-- ('00000000-0000-0000-0000-000000000000','Freelas','income','#3DE0C2'),
-- ('00000000-0000-0000-0000-000000000000','Moradia','expense','#FF5B8A'),
-- ('00000000-0000-0000-0000-000000000000','Alimentação','expense','#FF8A3D');

-- RLS
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

-- Policies: uma por tabela, cobrindo ALL (select/insert/update/delete).
-- Reflete o que existe no banco, conforme auditoria de 2026-07-31 (issue #13).
-- Versões anteriores deste arquivo declaravam 4 policies nomeadas por tabela,
-- que nunca existiram no banco: os `drop ... if exists` miravam nomes
-- inexistentes e, na prática, reexecutar o arquivo SOMAVA policies em vez de
-- substituir. Os drops antigos ficam abaixo para limpar bancos que porventura
-- tenham sido criados por aquelas versões.

drop policy if exists "categories_select_own"   on public.categories;
drop policy if exists "categories_insert_own"   on public.categories;
drop policy if exists "categories_update_own"   on public.categories;
drop policy if exists "categories_delete_own"   on public.categories;
drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;

-- Policy Categories
drop policy if exists "categories: acesso próprio" on public.categories;
create policy "categories: acesso próprio" on public.categories
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Policy Transactions
drop policy if exists "transactions: acesso próprio" on public.transactions;
create policy "transactions: acesso próprio" on public.transactions
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- View: fluxo mensal (12+ meses) por usuário
create or replace view public.monthly_cashflow
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', date)::date as month,
  sum(case when type = 'income' then amount else 0 end) as income,
  sum(case when type = 'expense' then amount else 0 end) as expense,
  sum(case when type = 'income' then amount else -amount end) as balance
from public.transactions
where user_id = auth.uid()
group by 1, 2;

-- FK composta: garante que category_id pertence ao mesmo usuário da transação.
--
-- IMPORTANTE: o Postgres usa MATCH SIMPLE por padrão, então esta FK só tem
-- efeito enquanto AMBAS as colunas forem NOT NULL. Se transactions.user_id
-- voltar a aceitar nulo, a verificação passa a ser ignorada silenciosamente e
-- um lançamento sem dono pode referenciar categoria de qualquer proprietário.
--
-- categories.user_id é NOT NULL desde a issue #9; transactions.user_id desde a
-- migração 20260731_transactions_user_id_not_null.sql (issue #13). Até essa
-- data, o comentário aqui afirmava que ambas já eram NOT NULL — não eram, e a
-- proteção não se aplicava.
--
-- As constraints abaixo são criadas apenas se ausentes. Quando o nome existe
-- com definição diferente, o bloco AVISA em vez de assumir que está correto:
-- nome igual com definição divergente passa despercebido e é pior que ausência.
do $$
declare
  def_atual           text;
  def_esperada_unique text := 'UNIQUE (id, user_id)';
  def_esperada_fk     text :=
    'FOREIGN KEY (category_id, user_id) REFERENCES categories(id, user_id)';
begin
  select pg_get_constraintdef(oid) into def_atual
  from pg_constraint
  where conname = 'categories_id_user_unique'
    and conrelid = 'public.categories'::regclass;

  if def_atual is null then
    alter table public.categories
      add constraint categories_id_user_unique unique (id, user_id);
  elsif def_atual <> def_esperada_unique then
    raise warning
      'categories_id_user_unique existe com definicao inesperada: % (esperada: %). Nao alterada — revisar manualmente.',
      def_atual, def_esperada_unique;
  end if;

  select pg_get_constraintdef(oid) into def_atual
  from pg_constraint
  where conname = 'transactions_category_user_fk'
    and conrelid = 'public.transactions'::regclass;

  if def_atual is null then
    alter table public.transactions
      add constraint transactions_category_user_fk
      foreign key (category_id, user_id) references public.categories(id, user_id);
  elsif def_atual <> def_esperada_fk then
    raise warning
      'transactions_category_user_fk existe com definicao inesperada: % (esperada: %). Nao alterada — revisar manualmente.',
      def_atual, def_esperada_fk;
  end if;
end $$;

