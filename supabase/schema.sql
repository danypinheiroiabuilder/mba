-- Fluxo de Caixa (Supabase) - Schema + RLS (por usuário)
-- Execute no SQL Editor do Supabase, schema public.

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

-- Policies Categories
drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own" on public.categories
for select using (user_id = auth.uid());

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own" on public.categories
for insert with check (user_id = auth.uid());

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own" on public.categories
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own" on public.categories
for delete using (user_id = auth.uid());

-- Policies Transactions
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
for select using (user_id = auth.uid());

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
for insert with check (user_id = auth.uid());

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions
for delete using (user_id = auth.uid());

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

-- Policy para view
alter view public.monthly_cashflow owner to postgres;
drop policy if exists "monthly_cashflow_select_own" on public.monthly_cashflow;
create policy "monthly_cashflow_select_own" on public.monthly_cashflow
for select using (user_id = auth.uid());

