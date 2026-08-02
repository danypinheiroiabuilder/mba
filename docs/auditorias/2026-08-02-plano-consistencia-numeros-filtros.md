# Plano — consistência dos números e filtros globais

**Data:** 2026-08-02
**Status:** 📋 **Documentado, NÃO executado.** Congelado para retomada futura.
**Prioridade atual:** ⚠️ Este plano **não é a frente ativa**. Ver "Ordem de retomada" no fim.

---

## Contexto

A Dany percebeu que os filtros não são globais entre páginas: ao filtrar nos gráficos,
a página "Resumo Anual" não acompanha o mesmo contexto, gerando sensação de números
divergentes.

A auditoria de 2026-08-02 (leitura de código, sem execução de app ou build) confirmou
que **nenhum filtro é global** — todos são `useState` local, perdidos a cada navegação.
Mas encontrou também que **filtro global sozinho não resolve o problema**: existem três
causas mais profundas, duas delas bugs de cálculo.

Objetivo final: um mesmo número em Dashboard, Resumo Anual e Receitas e Despesas.

---

## Diagnóstico resumido

### Filtros existentes (todos locais, todos `useState`)

| # | Filtro | Página | Arquivo:linha |
|---|---|---|---|
| 1 | `monthKey` — mês de referência | Dashboard | `src/components/dashboard/DashboardPage.tsx:48` |
| 2 | `monthKey` — mês de referência | Lançamentos | `src/app/transacoes/page.tsx:35` |
| 3 | `months` — período 3/6/12 | Resumo Anual | `src/components/resumo/ResumoAnualPage.tsx:85` |
| 4 | `activeSeries` — séries do gráfico | Resumo Anual | `src/components/resumo/ResumoAnualPage.tsx:86` |
| 5 | `selectedCategoryIds` — **multi** categoria | Resumo Anual | `src/components/resumo/ResumoAnualPage.tsx:87` |
| 6 | `filterCategoryId` — **uma** categoria | Lançamentos | `src/app/transacoes/page.tsx:137` |
| 7 | `filterTag` — busca textual | Lançamentos | `src/app/transacoes/page.tsx:138` |

`/categorias` não tem filtro.

**Mecanismo de armazenamento:** exclusivamente `useState` local. Sem query params
(`useSearchParams` não é usado em lugar nenhum do app), sem Context, sem Zustand de
filtro, sem `localStorage`.

**Armadilha:** o Zustand `useDataStore` tem um campo `monthKey` (`src/stores/data.ts:91`)
que *parece* filtro global, mas **não é** — é só o registro de qual mês foi buscado por
último, usado para revalidar após salvar/excluir. Nenhuma tela lê esse valor para pintar.

**Preservação ao navegar:** nenhuma. O menu usa `<Link>` (`src/components/AppShell.tsx:106`),
o componente desmonta, o `useState` morre. Dashboard e Lançamentos voltam sempre ao mês
atual; Resumo Anual volta sempre a 12 meses / todas as categorias.

### Quais deveriam ser globais

| Filtro | Global? | Entre quais telas |
|---|---|---|
| Mês / período de referência | **Sim — o principal** | Dashboard, Lançamentos, Resumo Anual |
| Categoria | **Sim** | Resumo Anual, Lançamentos |
| Tag | Sim (menor prioridade) | Lançamentos, e Resumo se ganhar o filtro |
| Séries do gráfico | **Não** — preferência visual de um gráfico só | — |

### Causa real da divergência (além do filtro)

**A. Duas fontes de dados para o mesmo número**
Dashboard lê da view agregada `monthly_cashflow` (`src/services/transactions.ts:127`);
Resumo Anual soma transações brutas no navegador
(`src/components/resumo/ResumoAnualPage.tsx:124-147`). Dois caminhos de cálculo divergem
por construção, mesmo com filtro idêntico.

**B. 🐛 O gráfico do Dashboard mente ao navegar para trás**
`listMonthlyCashflow(12)` busca sempre os 12 meses contados a partir de `now`
(`src/services/transactions.ts:129-131`), mas o Dashboard monta a janela terminando no
mês **selecionado** (`DashboardPage.tsx:90-93`). Meses fora da janela buscada não existem
no mapa e viram `0` — não "sem dado", mas zero. O card de tendência compara contra esse
zero (`DashboardPage.tsx:120-127`) e produz variação percentual falsa.

**C. 🐛 Flash de números do mês errado**
`refreshTransactions` grava o novo `monthKey` imediatamente, mas as transações antigas
seguem em tela até a rede responder (`src/stores/data.ts:130`). Por um instante o
cabeçalho diz "março" e os cards mostram fevereiro.

**D. Resumo Anual ignora qualquer mês**
`endMonthKey` é fixo em hoje (`ResumoAnualPage.tsx:89`). Não existe hoje nenhuma forma —
nem manual — de alinhar o Resumo com o mês do Dashboard.

### Restrição descoberta na view

`supabase/schema.sql:93-103` declara `monthly_cashflow` agregando **sem categoria**:

```sql
create or replace view public.monthly_cashflow with (security_invoker = true) as
select user_id, date_trunc('month', date)::date as month,
       sum(case when type = 'income' then amount else 0 end) as income,
       sum(case when type = 'expense' then amount else 0 end) as expense,
       sum(case when type = 'income' then amount else -amount end) as balance
from public.transactions where user_id = auth.uid() group by 1, 2;
```

Como está, a view **não consegue** atender o filtro por categoria do Resumo Anual.

⚠️ Conforme `docs/AGENTS.md`, este arquivo já divergiu do banco real **três vezes**
(issues #7, #9, #13). A definição acima é **hipótese**, não fato — confirmar contra o
banco real antes de qualquer decisão. É exatamente o objeto da etapa 2a.

---

## Etapas

Regra transversal: **um PR por etapa**, mergeado e validado antes do próximo.
Nada de banco sem aprovação explícita da Dany.

### Etapa 1 — Corrigir a janela do gráfico do Dashboard

- **Objetivo:** gráfico e cards de tendência refletirem o mês realmente selecionado;
  distinguir "zero" de "sem dado".
- **Arquivos:** `src/services/transactions.ts` (`listMonthlyCashflow` aceita mês final em
  vez de ancorar em `now`); `src/stores/data.ts` (`refreshCashflow12m` + chave de cache);
  `src/components/dashboard/DashboardPage.tsx` (`TrendBadge`).
- **Risco:** 🟡 Moderado — muda assinatura usada em 3 pontos e a chave de cache; cache mal
  chaveado troca números entre meses silenciosamente. Mudança contida em leitura.
- **Como validar:** navegar 3–4 meses para trás e ver barras em vez de vazio; comparar um
  mês antigo do gráfico com o total da mesma competência em Lançamentos; mês sem
  lançamento anterior deve mostrar `—`, não `+100%`.
- **Build:** sim (`npm run build` + `npm run lint`)
- **Teste manual:** sim, obrigatório — é o coração da correção
- **Banco:** não
- **PR separado:** sim — **PR 1**, primeiro por ser o que mais distorce número hoje

### Etapa 2 — Decidir a fonte única de receitas/despesas/saldo

#### 2a — Investigação (somente leitura) — ⛔ NÃO AUTORIZADA em 2026-08-02

Registrada para depois. Quando autorizada, consultar o banco real:
- definição real da view via `pg_get_viewdef` — confirmar se bate com `schema.sql`;
- soma via view × soma via `transactions` nos mesmos 12 meses — provar se divergem;
- tratamento de `NULL`, arredondamento e fuso na coluna `date`.

Entrega: número contra número, não bullet. Se baterem, a causa é só a janela (etapa 1) e
a 2b vira trivial. **Não gera PR, gera relatório.**

#### 2b — Decisão

| Opção | Avaliação |
|---|---|
| **Padronizar em transações brutas** ✅ recomendado | A view não tem categoria, então nunca serve ao filtro do Resumo. Um único caminho de cálculo, sem alterar banco. Custo: mais dados trafegados |
| Padronizar na view | Exigiria alterar a view para incluir categoria → mexe em banco, migração versionada, backup manual e aprovação da Dany. Só se o volume justificar |

- **Arquivos:** `src/services/transactions.ts`, `src/stores/data.ts`,
  `src/components/dashboard/DashboardPage.tsx`
- **Risco:** 🔴 **Alto** — mexe na definição dos números que a Dany usa de verdade
- **Como validar:** print dos totais **antes**, em 3 meses distintos; aplicar, recarregar,
  comparar valor a valor; qualquer divergência = **parar** e diagnosticar, sem correção
  automática; conferir Dashboard × Resumo × Lançamentos no mesmo mês
- **Build:** sim
- **Teste manual:** sim — o mais rigoroso do plano
- **Banco:** 2a é só leitura. 2b só mexe em banco na opção **não** recomendada — e nesse
  caso, parar e pedir aprovação antes de qualquer SQL, com migração versionada, rollback
  e backup manual
- **PR separado:** sim — **PR 2**

### Etapa 3 — Mês de referência no Resumo Anual

- **Objetivo:** dar seletor de mês ao Resumo (hoje fixo em `ResumoAnualPage.tsx:89`).
  **Pré-requisito da etapa 4** — sem isso não há contexto para compartilhar.
  Modelo: "mês de referência" + "quantos meses olhar para trás" (chips 3/6/12 já
  existentes). Evita fundir "um mês" e "janela de N meses" num campo só.
- **Arquivos:** `src/components/resumo/ResumoAnualPage.tsx`;
  `src/components/MonthNavigator.tsx` (reuso; verificar se a trava de mês futuro cabe aqui)
- **Risco:** 🟢 Baixo — adiciona controle, não altera cálculo. Ainda `useState` local nesta
  etapa; globalizar é a etapa 4
- **Como validar:** selecionar mês passado → gráfico e tabela deslocam junto; com o mês em
  "hoje" os números devem ser idênticos aos de antes (não-regressão); filtro de categoria
  segue funcionando combinado
- **Build:** sim · **Teste manual:** sim · **Banco:** não
- **PR separado:** sim — **PR 3**

### Etapa 4 — Filtros globais via URL / query params

- **Objetivo:** fonte única de verdade na URL —
  `?mes=2026-07&meses=12&cat=abc,def&tag=mercado`. Sobrevive a F5 e ao botão voltar, é
  linkável e deixa o filtro **visível**, para que filtro esquecido não vire número
  misterioso.
  **Escopo:** mês, janela de meses, categorias, tag. **Fora:** `activeSeries` (visual de
  um gráfico só, fica local).
- **Arquivos:** *novo* `src/hooks/useFiltros.ts` (leitura/escrita dos params + validação,
  reusando `clampMonthKey` de `src/lib/dates.ts:16`); *novo* `src/components/FilterBar.tsx`
  (filtros ativos + "Limpar filtros"); `DashboardPage.tsx`, `ResumoAnualPage.tsx`,
  `src/app/transacoes/page.tsx`, `src/components/MonthNavigator.tsx`
- **Riscos:**
  - 🔴 **Filtro invisível** — filtrar no Resumo e chegar em Lançamentos com lista vazia sem
    entender por quê. Mitigação: `FilterBar` obrigatória, não opcional
  - 🟡 **Categoria multi vs única** — Resumo aceita várias (`:87`), Lançamentos aceita uma
    (`:137`). Padronizar em lista; o `<select>` de Lançamentos vira multi
  - 🟡 **`useSearchParams` exige `<Suspense>`** no App Router — sem isso o build quebra ou
    a página vira client-render inteira. Consultar `node_modules/next/dist/docs/` antes de
    escrever (esta versão do Next tem breaking changes)
  - 🟢 URL inválida colada → validar mês e IDs de categoria contra a lista real
- **Como validar:** filtrar no Resumo → navegar para Lançamentos → preservado e visível;
  F5 mantém estado; botão voltar desfaz o filtro anterior; `?mes=banana&cat=inexistente`
  cai no padrão sem quebrar; "Limpar filtros" zera tudo
- **Build:** sim — e aqui o build é *diagnóstico*, por causa do Suspense
- **Teste manual:** sim, o mais extenso — navegação, refresh e botão voltar
- **Banco:** não
- **PR separado:** sim — **PR 4**, o maior. Se crescer, dividir em 4a (hook + Resumo) e
  4b (Dashboard + Lançamentos)

### Etapa 5 — Corrigir o flash de números do mês errado

- **Objetivo:** eliminar a janela em que o cabeçalho mostra um mês e os cards mostram
  outro (`src/stores/data.ts:130`)
- **Arquivos:** `src/stores/data.ts` (não deixar `monthKey` e `transactions`
  dessincronizados; carregando por mês); `DashboardPage.tsx`; `src/app/transacoes/page.tsx`
- **Risco:** 🟡 Moderado — mexe no store que todas as telas usam. Cuidado para não
  introduzir piscada de esqueleto a cada troca de mês; o cache de 30s existe para evitar isso
- **Como validar:** com throttling do DevTools, trocar de mês → nunca mostrar número do mês
  anterior sob o cabeçalho novo; trocar de página e voltar em <30s deve usar cache sem
  piscar; salvar lançamento atualiza sem estado intermediário errado
- **Build:** sim · **Teste manual:** sim, **com throttling** — sem isso o bug não aparece
- **Banco:** não
- **PR separado:** sim — **PR 5**

### Etapa 6 — Avaliar `categoryById` e `latest` no Dashboard

- **Objetivo:** decidir o destino de `categoryById` (`DashboardPage.tsx:88`) e
  `monthTotals.latest` (`DashboardPage.tsx:139-141`), hoje calculados e nunca renderizados.
- ⚠️ **NÃO é código morto confirmado.** Decisão da Dany em 2026-08-02: o Dashboard/Início
  **pode** exibir os **últimos 3 lançamentos em modo leitura**. Se for isso, `latest` é
  **funcionalidade faltando**, não sobra — o caminho é implementar, não remover.
  **A decisão final fica para a reconstrução da tela Início** (frente de experiência).
- **Arquivos:** `src/components/dashboard/DashboardPage.tsx`
- **Risco:** 🟢 Baixo (remoção) ou 🟡 Moderado (se virar funcionalidade)
- **Como validar:** `lint` sem avisos de variável não usada; Dashboard visualmente idêntico
- **Build:** sim · **Teste manual:** leve · **Banco:** não
- **PR separado:** sim — **PR 6**, o último e mais barato. Provavelmente absorvido pela
  reconstrução da Início

---

## Resumo dos PRs

| PR | Etapa | Risco | Banco | Bloqueia |
|---|---|---|---|---|
| 1 | Janela do gráfico | 🟡 | não | — |
| — | 2a Investigação | 🟢 | só leitura (⛔ não autorizada) | PR 2 |
| 2 | Fonte única | 🔴 | só se opção não recomendada | PR 4 |
| 3 | Mês no Resumo | 🟢 | não | PR 4 |
| 4 | Filtros na URL | 🔴 | não | — |
| 5 | Flash de números | 🟡 | não | — |
| 6 | `latest` / código morto | 🟢 | não | — |

**Por que esta ordem:** filtros globais (4) antes da fonte única (2) sincronizaria os
filtros mantendo os números divergentes — o pior cenário, porque *parece* resolvido.
A etapa 3 precisa existir antes da 4, senão não há mês no Resumo para compartilhar.

---

## Pontos de atenção antes de retomar

- **Não há nenhum teste automatizado no projeto** — `package.json` só tem `dev`, `build`,
  `start`, `lint` e `check:contraste`. Toda validação é manual, e isso pesa mais nos PRs 2
  e 4. Considerar incluir testes de cálculo puro junto com o PR 2 (decisão da Dany).
- **Preview e Produção usam o mesmo banco** (ver `docs/AGENTS.md`). Testar em Preview
  altera dados reais. Criar lançamentos de teste identificáveis e apagá-los, ou testar só
  em leitura.
- **Nenhuma decisão de cor ou tipografia** neste plano. Se a `FilterBar` do PR 4 exigir
  escolha visual, apresentar amostras aplicadas e esperar o "sim".
- **Nada foi verificado em navegador.** Este plano é análise de código: leitura de
  `DashboardPage.tsx`, `ResumoAnualPage.tsx`, `transacoes/page.tsx`, `stores/data.ts`,
  `services/transactions.ts`, `MonthNavigator.tsx`, `lib/dates.ts` e `AppShell.tsx`.
  Nenhum build ou app foi executado para produzi-lo.

---

## Decisões registradas em 2026-08-02

1. **Investigação 2a: não autorizada por ora.** Fica registrada para depois.
2. **`latest` não é código morto por enquanto.** O Início pode mostrar os últimos 3
   lançamentos em modo leitura; decisão final na reconstrução da Início.
3. **Este plano não será executado agora.** Documentado apenas para retomada.

---

## Ordem de retomada

⚠️ **A prioridade mudou para a auditoria de produto e experiência mobile.**
Antes de mexer em filtros, fonte única, `monthly_cashflow`, gráfico, cache ou query
params, executar a frente de experiência:

1. Salvar a auditoria de produto/mobile em `docs/`
2. Passo 1: labels e barra mobile
3. Corrigir `TrendBadge`
4. Criar `/conta` com nome de exibição e logout
5. Reconstruir a tela Início

Só depois disso retomar este plano, começando pelo **PR 1**.

**Nota de sobreposição:** os itens 3 e 5 da frente de experiência tocam
`DashboardPage.tsx`, o mesmo arquivo das etapas 1, 5 e 6 daqui. Ao retomar, reler este
plano contra o código já alterado — as referências de linha acima valem para o estado do
repositório em 2026-08-02 e podem ter mudado.
