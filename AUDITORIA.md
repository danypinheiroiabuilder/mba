# Auditoria — Dashboard de Fluxo de Caixa

**Data:** 2026-07-16
**Escopo:** código, arquitetura, design, UX, acessibilidade, segurança, autenticação, banco de dados, permissões, performance, testes, documentação, lógica de negócio, riscos para produção, riscos para venda/uso por terceiros.

---

## O que está bom

- **RLS bem desenhado nas tabelas base** (`categories`, `transactions`): policies de select/insert/update/delete corretas, filtrando por `user_id = auth.uid()` (`supabase/schema.sql:50-82`).
- **Validação client-side consistente** com Zod (`src/lib/types.ts`) espelhando as constraints do banco (`amount > 0`, formato de data, tipos enum).
- **Componentes de UI reutilizáveis e coesos** (`Button`, `Card`, `Dialog`, `Input`, `Select`, `FieldError`) com Tailwind, tema único, tokens de cor consistentes.
- **`Dialog` com boa acessibilidade**: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap manual funcional e fechamento por `Escape` (`src/components/ui/Dialog.tsx`).
- **Formulários com `react-hook-form` + `zodResolver`**, mensagens de erro associadas via `FieldError`, labels com `htmlFor` em praticamente todo lugar.
- **Estado global simples e direto** com Zustand, sem overengineering (`useAuthStore`, `useDataStore`).
- **Middleware usa `getUser()`** (valida o JWT com o servidor Supabase) em vez de `getSession()` — decisão correta, evita confiar em cookie não verificado.
- **Build e lint limpos**, sem erros de TypeScript, deploy validado em produção sem erros de runtime.

---

## Problemas encontrados

### 1. ~~Rotas `/extrato` e `/resumo` sem proteção no middleware~~ — CORRIGIDO, e era mais grave do que o relatado

**Atualização:** ao reler este relatório com outro achado externo, descobrimos que o problema real era **muito pior**: existiam **dois arquivos de middleware** no projeto — `middleware.ts` na raiz (um stub vazio, só `NextResponse.next()`) e `src/middleware.ts` (o de verdade, com toda a lógica de proteção). O Next.js estava usando o **da raiz** (o vazio). Confirmado com `curl` direto, sem cookies:

```
GET /transacoes → HTTP 200 (nenhuma proteção de servidor)
GET /            → HTTP 200 (nenhuma proteção de servidor)
```

Ou seja: **nenhuma rota privada tinha proteção real no servidor** — não só `/extrato`/`/resumo`. A única proteção existente era o guard client-side em `AppShell.tsx`, que só age depois do JS carregar no navegador. RLS no banco ainda protegia os *dados*, mas o *HTML/shell* das páginas era servido sem checagem.

**Correção aplicada:**
- Removido `middleware.ts` (raiz) — o stub morto.
- `/extrato` e `/resumo` adicionados a `PRIVATE_ROUTES` em `src/middleware.ts`, que agora é o único middleware ativo.
- Reconfirmado com `curl`: todas as rotas privadas agora retornam `307 → /login` sem cookies.

**Prioridade:** ~~Alto~~ → **Crítico** (era o real, não o relatado)
**Arquivos:** `middleware.ts` (removido), `src/middleware.ts`
**Status:** ✅ Corrigido em 2026-07-16

---

### 1b. CSP em produção com `unsafe-inline` e `unsafe-eval`

**Por que importa:** `next.config.ts` define `script-src 'self' 'unsafe-inline' 'unsafe-eval'` e `style-src 'self' 'unsafe-inline' ...` sem diferenciar ambiente. Com sessão do Supabase persistida no navegador, um XSS bem-sucedido teria muito mais poder de ação com essas diretivas liberadas — elas anulam boa parte do valor de ter uma CSP.

**Como corrigir:** diferenciar CSP por ambiente — em produção, remover `unsafe-eval` e evitar `unsafe-inline` (usar nonce/hash se algum script inline for realmente necessário). Também vale restringir `connect-src` ao host exato do projeto Supabase em vez de `https://*.supabase.co`.

**Prioridade:** Alto
**Arquivos:** `next.config.ts`

---

### 1c. Falta FK composta garantindo que a categoria de uma transação pertence ao mesmo usuário

**Por que importa:** `transactions.category_id` referencia só `categories(id)` — não valida que a categoria referenciada pertence ao mesmo `user_id` da transação. RLS impede que um usuário *veja* categorias de outro (então não consegue descobrir o UUID pela UI), mas não impede uma inconsistência de integridade se algum UUID de outra categoria for usado diretamente (bug futuro, migração malfeita, ou chamada direta à API).

**Como corrigir:**
```sql
alter table public.categories add constraint categories_id_user_unique unique (id, user_id);
alter table public.transactions
  add constraint transactions_category_user_fk
  foreign key (category_id, user_id) references public.categories(id, user_id);
```

**Prioridade:** Alto
**Arquivos:** `supabase/schema.sql` (nova migration)

---

### 1d. `schema.sql` pode falhar silenciosamente no `CREATE POLICY` sobre a view `monthly_cashflow`

**Por que importa:** Postgres não permite `CREATE POLICY` diretamente em uma `VIEW` (só em tabelas). Se `supabase/schema.sql` for reexecutado do zero, essa instrução falha — e **foi exatamente isso que causou o incidente de segurança corrigido mais cedo nesta mesma sessão**: a view `monthly_cashflow` em produção estava sem o filtro `WHERE user_id = auth.uid()` e sem `security_invoker`, expondo dados agregados entre usuários. Já corrigimos a view em produção via migration, mas o `schema.sql` do repositório ainda contém a instrução problemática, então quem rodar esse script do zero (novo ambiente, restauração) pode reintroduzir o mesmo bug.

**Como corrigir:** remover a tentativa de `CREATE POLICY`/`ALTER VIEW` no arquivo de schema; manter só a definição da view já com `security_invoker = true` e `WHERE user_id = auth.uid()` (que sozinhos já são suficientes e é o que está ativo em produção agora).

**Prioridade:** Alto
**Arquivos:** `supabase/schema.sql`

---

### 2. Senha mínima de 6 caracteres + sem proteção contra senha vazada

**Por que importa:** `src/app/login/page.tsx:91` exige só 6 caracteres no cadastro — abaixo do recomendado (8+) para dados financeiros pessoais. O advisor de segurança do próprio Supabase já sinalizou "Leaked Password Protection Disabled" (checagem contra HaveIBeenPwned).

**Como corrigir:**
- Subir o mínimo client-side para 8 caracteres em `transactionSchema`/login (`password.length < 8`).
- Ativar "Leaked Password Protection" no painel do Supabase (Authentication → Policies).

**Prioridade:** Moderado
**Arquivos:** `src/app/login/page.tsx`, configuração do Supabase (dashboard, não código)

---

### 3. Mensagens de erro do Supabase repassadas cruas ao usuário (risco de enumeração de conta)

**Por que importa:** em `src/app/login/page.tsx:110` e `64`, `error.message` do Supabase é exibido diretamente. Dependendo da configuração do projeto, isso pode diferenciar "e-mail já cadastrado" de "credenciais inválidas", permitindo que alguém descubra quais e-mails têm conta no sistema.

**Como corrigir:** mapear os erros conhecidos do Supabase Auth para mensagens genéricas próprias antes de exibir (ex.: sempre "Não foi possível concluir o cadastro" no signup, sem detalhar o motivo).

**Prioridade:** Baixo
**Arquivos:** `src/app/login/page.tsx`

---

### 4. Nenhum teste automatizado, e CI não roda lint

**Correção sobre a versão anterior deste relatório:** eu tinha dito que não existia CI — errado, existe `.github/workflows/ci.yml`, rodando `tsc --noEmit` e `npm run build` a cada push/PR. O que falta de fato: nenhum teste automatizado (`*.test.*`/`*.spec.*`) em lugar nenhum do projeto, e o CI não roda `npm run lint`.

**Por que importa:** toda a lógica de negócio (cálculo de totais, comprometimento, validações) depende só de teste manual — qualquer regressão futura (como a da view `monthly_cashflow` encontrada nesta sessão) só é detectada testando na mão. E sem lint no CI, problemas de qualidade só aparecem se alguém rodar `npm run lint` localmente por conta própria.

**Como corrigir:**
- Adicionar `run: npm run lint` como step no `.github/workflows/ci.yml`.
- Começar pequeno com testes: funções puras em `src/lib/helpers.ts`, `src/lib/dates.ts`, `src/lib/money.ts` (fáceis de testar, sem mock de Supabase). Sugestão: Vitest.

**Prioridade:** Moderado
**Arquivos:** `.github/workflows/ci.yml`, novos arquivos `src/lib/*.test.ts`

---

### 5. ~~Ausência de README de projeto~~ — correção: README já existe

**Correção sobre a versão anterior deste relatório:** eu tinha dito que não havia `README.md` — errado, ele existe na raiz do projeto. Removendo este item da lista de problemas (não verifiquei o conteúdo em detalhe; se estiver desatualizado ou incompleto, vale uma checada rápida, mas não é mais um "achado").

---

### 6. Soma de valores financeiros em ponto flutuante (JS `number`)

**Por que importa:** `calculateTotals` (`src/lib/helpers.ts:3-12`) soma `amount` (vindo do banco como `numeric(12,2)`, mas convertido para `number` em `mapTransaction`) usando `+` de ponto flutuante. Em volumes pequenos isso raramente aparece, mas somas repetidas de centavos podem gerar erros de arredondamento (ex.: `0.1 + 0.2 !== 0.3` em JS). Para um app financeiro, mesmo que "pequeno", é um padrão arriscado de carregar adiante.

**Como corrigir:** somar em centavos (inteiros) e converter para reais só na formatação, ou usar uma lib de decimal (`decimal.js`) nos pontos de agregação. Não é urgente para o volume atual, mas vale corrigir antes de qualquer eventual escala.

**Prioridade:** Baixo
**Arquivos:** `src/lib/helpers.ts`, `src/services/transactions.ts` (`mapTransaction`)

---

### 7. Sem limite de tamanho em campos de texto livre

**Por que importa:** `categorySchema`/`transactionSchema` (`src/lib/types.ts`) validam mínimo, mas não máximo, para `name`, `description`, `tag`. Um usuário (ou script malicioso, se o app for exposto a terceiros) pode inserir textos enormes, inflando o banco e potencialmente quebrando o layout de cards/listas.

**Como corrigir:** adicionar `.max(80)` (categoria/descrição) e `.max(30)` (tag), por exemplo.

**Prioridade:** Baixo
**Arquivos:** `src/lib/types.ts`

---

### 8. Modelo de dados é single-tenant "hardcoded" por usuário — risco para venda a terceiros

**Por que importa:** hoje cada `user_id` é dono direto de suas categorias/transações, sem conceito de organização, plano, ou papéis (admin/membro). Isso é adequado para uso pessoal, mas se a ideia é vender/oferecer a terceiros no futuro (ex.: um MBA que vira produto), vai exigir refatoração de schema (tabela `organizations`, `memberships`) e das policies de RLS.

**Como corrigir:** não é urgente agora — é uma decisão de arquitetura para quando (e se) o produto for além de uso pessoal/pequena escala. Vale já ter em mente para não acoplar demais a suposição "1 usuário = 1 dono de tudo" em partes novas do código.

**Prioridade:** Baixo (hoje) / Alto (se e quando o objetivo for comercializar)
**Arquivos:** `supabase/schema.sql`, toda a camada `src/services/`

---

### 9. Ausência de Política de Privacidade / Termos de Uso (LGPD)

**Por que importa:** o app coleta e armazena dados financeiros pessoais (receitas, despesas, valores). Mesmo em fase de TCC/uso pessoal, se qualquer terceiro (colega, professor, usuário de teste) criar conta, a LGPD já se aplica — inclusive para exclusão de conta/dados a pedido do titular. Hoje não existe fluxo de "excluir minha conta e meus dados".

**Como corrigir:** para o escopo acadêmico atual, não é bloqueante. Se o projeto avançar para uso por terceiros reais, adicionar: página de política de privacidade, e uma function/RPC para o usuário solicitar exclusão de conta (cascata já existe no schema via `on delete cascade`, falta só a interface).

**Prioridade:** Baixo (acadêmico) / Alto (produção real)
**Arquivos:** N/A (feature nova)

---

### 10. Bundle JS compartilhado moderado (~1.9 MB em `.next/static/chunks`)

**Por que importa:** `framer-motion` é usado no `AppShell` (layout compartilhado por todas as páginas autenticadas), então seu peso entra em toda navegação. `recharts` já deve estar isolado nas rotas que o usam (Next App Router faz code-splitting por rota automaticamente), mas vale confirmar com `next build` + análise de bundle se não há import acidental em componente compartilhado.

**Como corrigir:** não é crítico no estágio atual (poucos usuários, app simples). Se performance virar problema, considerar `next/dynamic` para `recharts` nas páginas Dashboard/Resumo, e avaliar se todas as animações de `framer-motion` são necessárias.

**Prioridade:** Baixo
**Arquivos:** `src/components/AppShell.tsx`, `src/components/resumo/ResumoAnualPage.tsx`, `src/components/dashboard/DashboardPage.tsx`

---

### 11. Inputs não sinalizam estado inválido para leitores de tela

**Por que importa:** os formulários mostram erro visualmente via `FieldError`, mas os `Input`/`Select` não têm `aria-invalid` nem `aria-describedby` apontando pro id da mensagem de erro — quem usa leitor de tela não é avisado que o campo está inválido nem ouve a mensagem automaticamente.

**Como corrigir:** propagar `aria-invalid={!!error}` e `aria-describedby={errorId}` nos componentes `Input`/`Select`, conectando ao `id` gerado pelo `FieldError`.

**Prioridade:** Baixo
**Arquivos:** `src/components/ui/Input.tsx`, `src/components/ui/Select.tsx`, `src/components/ui/FieldError.tsx`

---

## Não encontrado / fora de escopo nesta rodada

- **Monitoramento/observabilidade em produção**: não há Sentry ou equivalente configurado. Para uso pessoal não é crítico; se o app crescer, vale considerar.
- **Backup do banco**: gerenciado pelo Supabase (backups automáticos existem nos planos pagos); não verificamos o plano atual do projeto.
- **Rate limiting customizado**: hoje depende só do rate limiting padrão do Supabase Auth. Suficiente para o estágio atual.

---

## Ordem sugerida de execução

1. ~~**Crítico** — Remover middleware morto da raiz + proteger `/extrato`/`/resumo`~~ ✅ feito em 2026-07-16
2. **Alto** — Endurecer CSP em produção (remover `unsafe-eval`, reduzir `unsafe-inline`)
3. **Alto** — FK composta `(category_id, user_id)` para integridade multi-tenant
4. **Alto** — Remover `CREATE POLICY`/`ALTER VIEW` inválidos de `supabase/schema.sql` (deixar só `security_invoker` + `WHERE`)
5. **Moderado** — Adicionar `npm run lint` ao CI + começar testes unitários dos helpers
6. **Moderado** — Subir senha mínima para 8 caracteres + ativar proteção de senha vazada no Supabase
7. **Baixo** — Adicionar `.max()` nos schemas Zod de texto livre
8. **Baixo** — Sanitizar mensagens de erro do Supabase no login/signup
9. **Baixo** — Revisar soma financeira para evitar drift de ponto flutuante
10. **Baixo** — `aria-invalid`/`aria-describedby` nos inputs
11. **Backlog** — Multi-tenancy real (organizações) e LGPD, só se/quando o projeto for além de uso pessoal

---

## Histórico do que já foi corrigido antes desta auditoria formal (mesma sessão)

- **Crítico (corrigido)**: view `monthly_cashflow` sem filtro por usuário, expondo fluxo de caixa agregado entre contas — corrigida via migration no Supabase.
- **Crítico (corrigido)**: projeto Supabase pausado, causando falha total de autenticação em produção — reativado, chave atualizada.
- Bug de estado desatualizado ao trocar de conta (dados da sessão anterior continuavam na tela) — corrigido com reset de store + effects dependentes de `user`.
- 6 registros órfãos (`user_id = NULL`) removidos do banco.
- `engines.node` e `turbopack.root` configurados para build mais previsível na Vercel.
- Ajustes de UX/consistência visual: direção da seta de tendência, ícones nos cards (padronizados em Dashboard, Resumo, Extrato, Categorias, Lançamentos), estado vazio do "Comprometimento", tooltip da bolinha de status na sidebar.
