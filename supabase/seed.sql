-- Seed data de desenvolvimento. Execute com:
--   SEED_USER_ID=<uuid> psql ... -f seed.sql
-- Nunca rode em produção com um UUID de usuário real.
DO $$
DECLARE
  v_user_id uuid := COALESCE(
    current_setting('app.seed_user_id', true)::uuid,
    '00000000-0000-0000-0000-000000000001'  -- placeholder para dev local
  );
  v_cat_salario uuid;
  v_cat_freela  uuid;
  v_cat_moradia uuid;
  v_cat_mercado uuid;
  v_cat_transporte uuid;
BEGIN

  -- Categorias: 3 income + 2 expense
  INSERT INTO public.categories (user_id, name, type, color) VALUES
    (v_user_id, 'Salário',     'income',  '#6E7BFF') RETURNING id INTO v_cat_salario;
  INSERT INTO public.categories (user_id, name, type, color) VALUES
    (v_user_id, 'Freelas',     'income',  '#3DE0C2') RETURNING id INTO v_cat_freela;
  INSERT INTO public.categories (user_id, name, type, color) VALUES
    (v_user_id, 'Bônus',       'income',  '#00D084') RETURNING id INTO v_cat_freela;
  INSERT INTO public.categories (user_id, name, type, color) VALUES
    (v_user_id, 'Moradia',     'expense', '#FF5B8A') RETURNING id INTO v_cat_moradia;
  INSERT INTO public.categories (user_id, name, type, color) VALUES
    (v_user_id, 'Mercado',     'expense', '#FF8A3D') RETURNING id INTO v_cat_mercado;
  INSERT INTO public.categories (user_id, name, type, color) VALUES
    (v_user_id, 'Transporte',  'expense', '#FFC43D') RETURNING id INTO v_cat_transporte;

  -- 3 Receitas
  INSERT INTO public.transactions (user_id, description, type, category_id, amount, date) VALUES
    (v_user_id, 'Salário Junho',   'income', v_cat_salario, 5000.00, '2026-06-05'),
    (v_user_id, 'Freela site',     'income', v_cat_freela,  1200.00, '2026-06-10'),
    (v_user_id, 'Bônus projeto',   'income', v_cat_freela,  800.00, '2026-06-15');

  -- 3 Despesas
  INSERT INTO public.transactions (user_id, description, type, category_id, amount, date) VALUES
    (v_user_id, 'Aluguel Junho',   'expense', v_cat_moradia,    1800.00, '2026-06-01'),
    (v_user_id, 'Compras mercado', 'expense', v_cat_mercado,     450.00, '2026-06-08'),
    (v_user_id, 'Uber mensal',     'expense', v_cat_transporte,  200.00, '2026-06-11');

END $$;
