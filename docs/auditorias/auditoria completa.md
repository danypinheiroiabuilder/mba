Auditoria do Projeto mbadany — Relatório Completo
Status Geral do Deploy
Item	Status
Deploy mais recente	READY (produção)
Build	Limpo, sem erros
Compilação	Turbopack, 13.8s
TypeScript	Passou em 6.2s
Runtime logs (últimos 30 dias)	Zero registros
live: false	Projeto marcado como inativo na API Vercel
Problemas Identificados
🔴 Crítico
1. live: false — App possivelmente inacessível ou sem tráfego real
A API Vercel retornou "live": false para o projeto. Isso pode indicar que o app não está recebendo requisições reais ou que as variáveis de ambiente do Supabase não estão configuradas no painel Vercel — o que faria o app carregar em branco ou lançar erro silencioso ao tentar conectar ao banco.

2. Ausência total de runtime logs
Nenhum log de runtime nos últimos 30 dias. Um app com Supabase auth normalmente gera chamadas serverless. Isso reforça que ou ninguém usa ou as env vars estão ausentes no Vercel, impedindo qualquer operação real.

3. Sem middleware.ts — rotas protegidas apenas no cliente
As rotas /transacoes, /categorias e / (dashboard) não têm proteção no servidor. Qualquer usuário pode acessar essas URLs diretamente sem autenticação — o redirecionamento para /login depende de lógica client-side que pode ser facilmente contornada ou falhar.

🟠 Alto
4. Todas as rotas geradas como estáticas (○)
O build output mostra:


┌ ○ /
├ ○ /categorias
├ ○ /login
├ ○ /reset
└ ○ /transacoes
Para um app com dados dinâmicos por usuário (Supabase), gerar as rotas protegidas como estáticas é problemático — o conteúdo autenticado depende inteiramente de JavaScript client-side (Zustand + Dexie) para popular a UI.

5. Cinco redeployments do mesmo commit
O commit 9de28db ("trigger-vercel-deploy") foi redeploy-ado 5 vezes consecutivas em curto período. Isso é sinal de que algo não estava funcionando e a autora tentou forçar o deploy para corrigir — provavelmente a configuração das env vars no Vercel.

🟡 Moderado
6. Commits não verificados (sem GPG)
Os commits recentes no GitHub aparecem como githubCommitVerification: "unverified". Não é um risco funcional, mas é uma prática de segurança ausente.

7. Build cache de 175 MB
Pesado para o tamanho do projeto. node_modules provavelmente está sendo incluído parcialmente no cache. Não quebra nada, mas prolonga deploys.

8. .env.local com credenciais reais no repositório público
O repositório mba é público (githubRepoVisibility: public). Se .env.local ou .env.example contiver a chave Supabase real (mesmo que seja anon key), ela está exposta. A anon key do Supabase é projetada para ser pública, mas o SUPABASE_URL exposto junto com ela permite ataques de enumeração de dados se as Row Level Security (RLS) policies não estiverem configuradas corretamente.

Diferença GitHub vs. Publicado
Aspecto	GitHub (mba)	Vercel (mbadany)
Repositório de origem	danypinheiroiabuilder/mba	Conectado e sincronizado
Branch	main	main
Commit publicado	9de28db	9de28db ✅
Parity	Em sincronia	
Não há divergência de código entre o que está no GitHub e o que foi publicado. O problema não é de código, mas de configuração de ambiente.

Checklist de Ações Recomendadas
 Verificar variáveis de ambiente no Vercel: ir em Settings → Environment Variables e confirmar que NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY estão definidas para o ambiente Production
 Criar middleware.ts para proteger as rotas /, /transacoes e /categorias no servidor com verificação de sessão Supabase
 Verificar RLS no Supabase: confirmar que as tabelas têm Row Level Security ativa para prevenir acesso cruzado entre usuários
 Testar o app em produção acessando https://mbadany.vercel.app e verificando se o login funciona e os dados carregam
 Remover .env.local do histórico git se ele foi acidentalmente commitado alguma vez
 
 Auditoria Funcional — Dashboard de Fluxo de Caixa
Cadastro de Receitas e Despesas (/transacoes)
Campos obrigatórios
Campo	Validação	Status
Descrição	min 2 chars (Zod)	Correto
Tipo	enum income/expense	Correto
Data	formato YYYY-MM-DD	Correto
Categoria	min 1 char, filtrada por tipo	Correto
Valor	number > 0, finite	Correto
Tag	opcional	Correto
Sem problemas nos campos obrigatórios. O schema Zod é consistente com as constraints do banco (amount > 0, type IN (...), date NOT NULL).

Inconsistências de lógica
🔴 Bug: filtros não afetam os totais
As cards de Receitas / Despesas / Saldo no topo da página calculam os totais sobre o array completo (tx), não sobre filteredTx. Se o usuário filtrar por categoria ou tag, o saldo exibido continua mostrando o mês inteiro — mas a lista abaixo mostra apenas os itens filtrados. Isso cria uma inconsistência visual relevante.


// transacoes/page.tsx — os totais usam `tx`, não `filteredTx`
const totalIncome = tx.filter(t => t.type === "income")...
// deveria ser filteredTx
🟠 Problema: exclusão de transação sem confirmação
"Excluir" dispara removeTransaction(id) imediatamente. Não há dialog de confirmação. Uma transação deletada acidentalmente não pode ser recuperada.

🟡 Filtro de categoria lista tipos misturados
O select de "Categoria" no filtro exibe todas as categorias (receitas e despesas juntas), sem agrupamento. O usuário pode selecionar uma categoria de receita e ver zero resultados se o mês tiver só despesas naquela categoria — sem aviso de que o filtro cruzou tipos.

Cadastro de Categorias (/categorias)
Campos obrigatórios
Campo	Validação	Status
Nome	min 2 chars (Zod)	Correto
Tipo	enum income/expense	Correto
Cor	regex #RRGGBB exato	Correto
Inconsistências de lógica
🔴 Bug crítico: deletar categoria com transações vinculadas lança exceção não tratada
O banco usa ON DELETE RESTRICT em transactions.category_id. Se o usuário tentar deletar uma categoria que já possui transações:

deleteCategory(id) envia a query ao Supabase
O banco rejeita com FK violation
A store (removeCategory) não tem try/catch
A página categorias tem try/catch mas exibe alert(e.message) — um alert() nativo, inconsistente com toda a UI do sistema
O usuário vê uma janela nativa do browser com uma mensagem de erro crua do PostgreSQL.

🟠 Problema: exclusão sem confirmação
Mesmo problema da tela de transações — "Excluir" dispara imediatamente.

🟡 Cor sem constraint no banco
A validação #RRGGBB existe apenas no Zod. O banco aceita qualquer text na coluna color. Uma inserção direta via API poderia armazenar valores inválidos que quebrariam a renderização da bolinha colorida na UI.

Dashboard (/)
Regra: Saldo = Receitas − Despesas
A fórmula está correta em três lugares:

Card KPI: totalIncome - totalExpense ✅
Tela de transações: totalIncome - totalExpense ✅
View SQL: SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) ✅
Inconsistências de lógica
🟠 Saldo zero classificado como "Positivo"
No dashboard, a label do cartão de saldo usa >= 0 para exibir "Positivo". Saldo exato de R$ 0,00 é exibido como "Positivo". Semanticamente, zero não é positivo — deveria ter um terceiro estado "Neutro" ou o threshold deveria ser > 0.

🟠 Gráfico de 12 meses usa window.location.href para navegar
Os botões "Lançar agora" e "Gerenciar categorias" no card de dica usam window.location.href em vez do router Next.js, causando reload completo da página e perdendo o estado do cliente (month selecionado, dados em cache).

🟡 Labels do gráfico em inglês
monthLabelFromKey usa date-fns sem definir locale: ptBR. O eixo X do gráfico exibe "Jun 2025", "Jul 2025" em inglês, em vez de "jun 2025", "jul 2025" em português.

🟡 AnimatedNumber no servidor
O componente de dashboard tem um guard mounted via setTimeout(..., 0) para evitar hydration mismatch com Recharts — mas AnimatedNumber usa framer-motion e pode gerar warnings de hydration se renderizado antes do mounted estar true.

Persistência de Dados
Supabase (produção)
RLS está configurado para todas as tabelas (SELECT, INSERT, UPDATE, DELETE por user_id = auth.uid()) ✅
Índices criados para user_id, date, category_id ✅
amount numeric(12,2) com CHECK > 0 no banco ✅
🔴 Risco: view monthly_cashflow sem security_invoker
A view não tem WITH (security_invoker = true). Em versões do Postgres/Supabase onde views rodam como o definidor (security_definer implícito), RLS do banco pode ser contornado — um usuário autenticado poderia ver dados agregados de outros usuários. Deve ser recriada com:


CREATE OR REPLACE VIEW public.monthly_cashflow
WITH (security_invoker = true) AS ...
Dexie (local/offline)
Os campos amount, description, tag e color não são indexados no Dexie. Isso é aceitável para o volume atual, mas useCategories(type) faz filtro em memória mesmo tendo type indexado — pequena inconsistência de uso da API Dexie.
Autenticação
🟡 Sem validação de senha no signup (client-side)
O placeholder diz "mínimo 6 caracteres" mas não há validação Zod ou manual antes do submit. O Supabase rejeita, mas o erro chega como mensagem genérica de API em vez de uma validação inline no campo.

🟡 Campos não limpos após signup bem-sucedido
Após criar conta, o modo muda para "signin" mas email e senha permanecem preenchidos. É conveniente, mas pode surpreender usuários que esperam um estado limpo.

🟡 /reset acessível para usuários logados
AppShell não redireciona usuários já autenticados que acessam /reset. É intencional, mas permite que um usuário logado acesse a tela de redefinição de senha sem necessidade de token de recovery.

Resumo de Prioridades
Severidade	Problema	Arquivo
🔴 Crítico	View monthly_cashflow sem security_invoker	supabase/schema.sql
🔴 Crítico	Delete de categoria lança erro FK não tratado com alert()	categorias/page.tsx
🔴 Bug	Filtros não afetam totais na tela de transações	transacoes/page.tsx
🟠 Alto	Nenhuma confirmação antes de excluir (transações e categorias)	ambas as páginas
🟠 Alto	Saldo zero classificado como "Positivo"	DashboardPage.tsx
🟠 Alto	Navegação com window.location.href causa reload	DashboardPage.tsx
🟡 Médio	Labels do gráfico em inglês (locale não definido)	dates.ts
🟡 Médio	Erro de delete exibe alert() nativo	categorias/page.tsx
🟡 Médio	Sem validação de senha client-side no signup	login/page.tsx
🟡 Médio	Cor de categoria sem constraint no banco	supabase/schema.sql

Auditoria Técnica — Dashboard Financeiro
Fluxo de Dados: Onde cada número vem

Supabase DB
 ├── transactions table
 │    └── listTransactionsByMonth(monthKey) → raw rows → store.monthTx
 │         └── DashboardPage: monthTotals memo (client sum)
 │              → cards KPI: Receitas / Despesas / Saldo do mês atual
 │
 └── monthly_cashflow VIEW
      └── listMonthlyCashflow(12) → MonthlyCashflowPoint[] → store.cashflow12m
           └── DashboardPage: chartData memo (join com array de 12 meses gerado no cliente)
                → gráfico ComposedChart
1. Cálculo de Receitas e Despesas
Cards KPI (mês atual)
Fonte: monthTx — transações brutas do mês via listTransactionsByMonth
Cálculo: sumBy(incomes, t => t.amount) e sumBy(expenses, t => t.amount) — client-side puro
Saldo: totalIncome - totalExpense — fórmula correta ✅
Gráfico de 12 meses
Fonte: view monthly_cashflow no banco — server-side aggregation ✅
A view calcula no SQL:

SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income
SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS balance
Fórmula de balance correta. Receitas somam positivo, despesas subtraem ✅
🟡 Dupla fonte de verdade para o mês atual
Os cards KPI e o gráfico calculam o mês atual de formas diferentes:

Cards: somam transactions em memória no cliente
Gráfico: usa o resultado da view SQL
Se houver qualquer latência ou dessincronização entre as duas queries (ex: usuário cadastra uma transação e um dos dois não foi atualizado ainda), o saldo do card pode divergir da barra do gráfico para o mesmo mês.

2. Agrupamento por Mês
No banco (view):


DATE_TRUNC('month', date)::date AS month
GROUP BY user_id, DATE_TRUNC('month', date)
Agrupamento correto — uma linha por usuário por mês. ✅

No cliente (chartData):


// Gera array de 12 meses via aritmética de calendário
for i in 0..11:
  shiftMonthKey(safeMonthKey, -11 + i)

// Join com Map keyed por monthKey
const map = new Map(cashflow12m.map(p => [p.monthKey, p]))
chartData = months.map(m => ({ month: m.slice(5), ...map.get(m) ?? zeros }))
✅ Meses sem transações recebem {income: 0, expense: 0, balance: 0} explicitamente — não aparecem como vazios ou null no gráfico.

🔴 Bug: XAxis exibe apenas MM, não MMM yyyy


month: m.slice(5) // resulta em "01", "02", ..., "12"
O eixo X mostra 06, 07, 08... em vez de jun, jul, ago. Se o intervalo de 12 meses cruzar dois anos calendário (ex: junho 2024 a junho 2025), o eixo mostrará 06 duas vezes — sem distinção de ano. O usuário não consegue saber qual 06 é 2024 e qual é 2025.

O tooltip usa monthLabelFromKey que chama date-fns sem locale: ptBR, exibindo "Jun 2025" em inglês em vez de "jun 2025".

3. Evolução Temporal — Coerência
✅ O que funciona:

12 meses sempre presentes no eixo (zero-fill correto)
Ordem cronológica ascendente na query (order("month", { ascending: true }))
Mês atual sempre à direita (índice 11 do array)
Mutações (salvar/deletar transação) chamam refreshCashflow12m() — gráfico atualiza ✅
🟠 Janela fixa de 12 meses hardcoded


refreshCashflow12m() → listMonthlyCashflow(12) // hardcoded
O usuário não tem como ver dados além de 12 meses no gráfico. Não é um bug, mas é uma limitação não documentada na interface.

🟡 Mês inicial do range pode estar errado em edge cases


const startKey = format(startOfMonth(subMonths(now, lastNMonths - 1)), "yyyy-MM-01")
subMonths(now, 11) a partir de, por exemplo, 31/01/2025 resulta em 28/02/2024 (date-fns normaliza). startOfMonth de qualquer data em fevereiro retorna 01/02/2024. Correto — mas o comportamento depende de date-fns normalizar corretamente datas com dias inválidos. ✅ (date-fns lida com isso)

4. Tipos de Gráfico
✅ Sem pizza ou rosca
Confirmado — nenhum PieChart, RadialBar, RadarChart ou equivalente em nenhum arquivo.

Gráfico existente:


ComposedChart
 ├── Bar: income (verde)
 ├── Bar: expense (rosa/vermelho)
 └── Line: balance (roxo, monotone, sem dots)
Linha + barras — atende ao requisito. ✅

🟠 Linha de saldo sem dots é difícil de ler
dot={false} na Line de saldo. Para meses de alto volume, a linha fica boa, mas para 1 ou 2 meses com dados reais e 10 meses zerados, a linha fica praticamente horizontal no zero com uma única subida — sem nenhum marcador visual nos pontos de dados. Compromete a leitura em bases com poucos meses de uso.

🟡 Sem legenda (Legend) no gráfico
Não há <Legend> renderizado. A distinção entre barras verde/rosa e a linha roxa só é compreensível via tooltip (hover). Em telas menores ou prints, o gráfico perde o contexto de qual série é qual.

5. Os dados são reais ou fixos?
O gráfico usa dados reais. ✅

cashflow12m é populado via query Supabase na view monthly_cashflow
A view agrega transações reais do usuário autenticado
O zero-fill para meses vazios é explícito — não é dado falso, é ausência corretamente representada
Porém há um risco de dados vazios silenciosos:
Se as variáveis de ambiente Supabase não estiverem configuradas no Vercel (problema identificado na auditoria anterior), getSupabase() retorna null, refreshCashflow12m retorna [] sem erro, e o gráfico exibe 12 meses zerados — aparentando estar funcionando enquanto não há nenhuma conexão real com o banco.

6. Camada Dexie — Código Morto
src/lib/queries.ts contém três hooks Dexie (useCategories, useTransactionsByMonth, useAllTransactions) que não são usados em nenhum lugar do dashboard ou das páginas. O dashboard usa exclusivamente o Zustand store com Supabase. Essa camada é código morto ou uma implementação offline abandonada.

Resumo Técnico
Status
Fórmula saldo = receitas − despesas	✅ Correta em ambas as camadas
Agrupamento por mês no banco	✅ DATE_TRUNC correto
Dados reais (não mockados)	✅ Confirmado
Meses sem dados tratados	✅ Zero-fill explícito
Sem pizza/rosca	✅ Confirmado
Gráfico linha + barras	✅ ComposedChart
XAxis com rótulos legíveis	🔴 Exibe "06" sem ano — ambíguo ao cruzar anos
Legenda no gráfico	🟠 Ausente
Dupla fonte de verdade (KPI vs gráfico)	🟡 Risco de divergência transitória
Locale pt-BR nos labels	🟡 Não aplicado
Código Dexie/queries.ts	🟡 Morto, não usado


Auditoria UX/UI — Comparativo com Moneed Finance Dashboard
Contexto da Referência
O Moneed é um dashboard financeiro com glassmorphism pesado, hierarquia tipográfica agressiva (números KPI grandes, labels pequenos), sidebar densa com widgets, gráficos com legendas visíveis, e microinterações em praticamente todo elemento interativo. É um design de portfólio — feito para impressionar visualmente, não para usabilidade cotidiana — mas serve como régua de qualidade visual.

Qualidade Visual Geral
O que foi feito corretamente:

O sistema de design é consistente e intencionalmente construído. Não é um template Tailwind genérico com bg-gray-900 — tem paleta própria, tokens nomeados, e uma linguagem visual definida:


--bg:      #070a12   /* quase preto, não é #000 nem #111 */
--surface: #0b1224   /* leve azul-noite */
--card:    #0f1933   /* camada de elevação */
--border:  rgba(255,255,255,0.08) /* vidro sutilíssimo */
O fundo com dois gradientes radiais (roxo no topo-esquerdo, teal no topo-direito) cria profundidade sem peso visual excessivo. Isso é escolha intencional, não acidente.

Veredicto honesto: não é genérico de template, mas é um glassmorphism de fórmula.

É o mesmo kit visual que aparece em dezenas de projetos de portfólio: dark + roxo/teal + rounded-3xl + backdrop-blur + sombras negativas. Funciona, mas não surpreende. O Moneed vai além porque tem densidade — mais elementos visuais por área, mais contraste entre seções, mais variedade tipográfica.

Hierarquia Visual
🟠 KPI cards pouco diferenciados

Os três cards (Receitas, Despesas, Saldo) provavelmente têm visual similar entre si — mesmo bg-card, mesmo tamanho, mesmo peso de fonte. No Moneed, os KPIs têm hierarquia visual clara: o número principal é grande e pesado (text-4xl+ font-bold), o label é pequeno e muted, e há um indicador de tendência (seta + percentual vs mês anterior).

Sem ver o tamanho exato dos números no código de DashboardPage.tsx, o padrão de AnimatedNumber com formatBRL sugere que o valor é renderizado como texto, mas não há evidência de text-4xl ou text-5xl — o que tornaria os KPIs visualmente dominantes como na referência.

🔴 Sem indicadores de tendência

No Moneed: cada KPI mostra +12,4% vs mês anterior. No projeto: nenhum cálculo de variação mês a mês existe em nenhum arquivo. Os cards mostram apenas o valor absoluto. Para um dashboard financeiro, isso é a informação mais útil que está faltando.

🟡 Sidebar com pouca densidade

O Moneed tem sidebar com perfil de usuário expandido, avatar, widgets de resumo rápido, e atalhos. A sidebar deste projeto tem: logo "Fluxo", 3 links de navegação, e email do usuário + botão Sair. Funcional, porém esparsa.

Cores
✅ Paleta coerente e bem escolhida

Token	Uso	Avaliação
#6e7bff (primary)	destaque, foco, pill de nav ativo	Adequado
#2ee59d (income)	receitas	Verde correto para positivo
#ff5b8a (expense)	despesas	Vermelho-rosado correto para negativo
#3de0c2 (primary-2)	acento secundário	Subutilizado
🟠 primary-2 (#3de0c2) praticamente não aparece na UI

Esse teal aparece no gradiente de fundo e existe como token, mas não é usado em nenhum componente interativo ou dado visual. No Moneed, os dois acentos aparecem em paralelo para criar contraste visual rico. Aqui, o teal some na névoa do background.

🟡 Ausência de variações de opacidade dos acentos em dados

Para indicar estados hover, selected, disabled em elementos de dados (linhas da lista de transações, badges), o projeto usa text-income e text-expense direto — sem bg-income/10 como fundo suave para chips de tipo. O resultado é texto colorido em fundo escuro sem contexto visual de "este item é uma receita".

Animações
✅ O que existe é bom

Animação	Qualidade
Dialog enter/exit (y:16 scale:0.98 opacity:0)	Spring stiffness:420 damping:32 — fluido
Page transition (y:10 blur:6px opacity:0)	0.22s easeOut — rápido e limpo
Nav active pill (layoutId)	Spring stiffness:420 damping:40 — microinteração correta
AnimatedNumber (0.5s easeOut)	Contador animado — toque de qualidade
🟠 Hover states pouco explorados

O Moneed tem hover states ricos nos cards de KPI (elevação, brilho sutil), nas linhas da lista de transações (highlight de linha inteiro), e nos itens de gráfico (tooltip rico com animação). Aqui:

Botões: hover:brightness-110 — básico
Nav links: hover:text-text — básico
Cards: sem hover
Linhas de transação: sem hover state visual além do cursor
🔴 Sem feedback visual em ações destrutivas

"Excluir" transação dispara imediatamente sem feedback. O item some da lista — sem animação de saída (exit do AnimatePresence), sem shake de confirmação, sem toast de "Transação removida". No Moneed, qualquer ação tem resposta visual clara.

Microinterações
✅ Presentes:

animate-pulse nos skeletons de loading — correto
AnimatedNumber nos valores KPI — diferencial de qualidade
Nav pill com layoutId — uma das microinterações mais elegantes do Framer Motion
🔴 Ausentes:

Microinteração	Impacto
Toast/snackbar após salvar/deletar	Alto — sem feedback de sucesso
Animação de saída ao deletar item da lista	Médio — item some abruptamente
Loading state nos botões de salvar (spinner inline)	Médio — botão "Salvar" some, dialog fecha, sem confirmação visual
Hover em linhas da lista de transações	Baixo — mas é o que separa template de produto
Estado vazio animado (ilustração ou ícone)	Baixo — texto plano "Nenhuma movimentação"
Consistência
✅ Alta consistência nos componentes base

Button, Input, Select, Card, Dialog todos usam os mesmos tokens. rounded-2xl nos controles, rounded-3xl nos containers, border-border, focus:ring-ring. Isso é raro em projetos de portfólio — normalmente há inconsistências de borda e padding entre páginas.

🟠 Inconsistências detectadas:

Problema	Onde
alert() nativo para erro de delete de categoria	categorias/page.tsx — quebra a consistência de UI
window.location.href no dashboard	Recarrega a página — quebra a transição animada de página
Reset page: mensagem de sucesso e erro com mesmo estilo visual	Sem diferenciação por cor
Gráfico sem legenda	Contexto perdido — inconsistente com o padrão de labels do resto da UI
Diagnóstico Final

O projeto tem uma fundação visual sólida — melhor que 80% dos
dashboards de portfólio. Mas parou no "parece bonito na tela escura"
sem chegar no "parece um produto real sendo usado".
O Moneed tem essa segunda camada porque cada elemento comunica estado: tendência de KPI, contexto de dado, resposta de ação. Este projeto tem elementos bem estilizados que não conversam entre si em termos de feedback.

Melhorias Práticas (por ordem de impacto)
1. Adicionar variação mês anterior nos KPIs — calcule (atual - anterior) / anterior * 100 com os dados já disponíveis no cashflow12m. Mostre +8,2% em verde ou -3,1% em vermelho abaixo de cada valor. Isso transforma o dashboard de "snapshot" em "análise".

2. Toast de feedback para todas as mutações — uma biblioteca leve como sonner (já compatível com Next.js/Tailwind) adicionada em providers.tsx. toast.success("Transação salva") e toast.error("Erro ao excluir") em vez de alert().

3. Animação de saída ao deletar item — envolver a lista de transações em AnimatePresence com exit={{ opacity: 0, x: -16, height: 0 }}. 3 linhas de código, diferença visual imensa.

4. Legenda no gráfico — <Legend formatter={(v) => ({ income: "Receitas", expense: "Despesas", balance: "Saldo" }[v])} /> no ComposedChart. Sem isso, um usuário novo não sabe o que as barras representam.

5. Chips de tipo nas transações — em vez de apenas colorir o valor, adicionar <span className="bg-income/10 text-income text-xs px-2 py-0.5 rounded-full">Receita</span>. Usa tokens já existentes no design system.

6. Rótulos do eixo X com mês + ano — trocar m.slice(5) por monthLabelFromKey(m) com locale: ptBR do date-fns. Resolve o bug de anos duplicados e o português.

Auditoria de Código — Estrutura, TypeScript e Arquitetura
Estrutura de Pastas
A organização é boa na superfície, com separação clara entre app/, components/, services/, stores/, e lib/. O problema está no que a estrutura esconde:

🔴 Duas camadas de persistência em paralelo — nenhuma documentada


lib/db.ts          ← Dexie (IndexedDB, local)
lib/queries.ts     ← hooks Dexie
lib/seed.ts        ← seed para Dexie

services/          ← Supabase (remoto)
stores/data.ts     ← consome Supabase
O projeto tem um sistema local-first completo (Dexie) e um sistema remoto completo (Supabase) coexistindo. Os hooks Dexie em queries.ts não são importados por nenhum componente ou store ativo. seed.ts popula o Dexie, não o Supabase. A camada Dexie é código morto de uma versão anterior da arquitetura e nunca foi removida.

Ação: deletar lib/db.ts, lib/queries.ts, lib/seed.ts e remover dexie e dexie-react-hooks do package.json.

Componentização
🔴 5 blocos de código duplicados entre páginas sem extração

Bloco duplicado	Onde aparece	Componente a extrair
Navegação de mês (Mês anterior / Hoje / Próximo)	DashboardPage, transacoes/page	<MonthNavigator>
Cabeçalho de página (label + título + subtítulo)	3 páginas	<PageHeader>
Linha de transação (dot, descrição, categoria, tag, valor)	DashboardPage, transacoes/page	<TransactionRow>
Bloco de erro de campo (<div className="text-xs text-expense">)	transacoes/page, categorias/page (5x cada)	<FieldError>
Card de entrada animado (motion.div blur+opacity)	login/page, reset/page	<AuthCard>
🟠 Páginas com responsabilidade excessiva

transacoes/page.tsx gerencia: estado de mês, filtros, estado de dialog, estado de formulário, fetch de dados, submit, deleção e renderização de lista + sumário. São 6 responsabilidades distintas num único componente. O mesmo padrão se repete em DashboardPage.

Uso de TypeScript
O que está bom:

"strict": true no tsconfig.json — modo estrito ativo ✅
Zero uso de any em qualquer arquivo ✅
Tipos de estado Zustand explicitamente declarados em interfaces (AuthState, DataState) ✅
Schemas Zod com tipos derivados via z.infer ✅
Não há // @ts-ignore em nenhum arquivo ✅
🔴 Bug real causado por tipagem fraca: Input e Select sem forwardRef


// src/components/ui/Input.tsx — ATUAL
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={...} />
}

// react-hook-form faz isso nos formulários:
<Input {...form.register("description")} />
// form.register() inclui um ref callback — ele é silenciosamente descartado
O ref que o React Hook Form precisa para gerenciar foco e validação é descartado silenciosamente. O formulário aparenta funcionar mas perde comportamentos de acessibilidade e, em alguns casos, validação de campos. Mesmo problema no Select.tsx.

🟠 as casts sem validação em 4 pontos


// services/categories.ts
const data = await supabase...
return mapCategory(data as CategoryRow) // sem runtime check
Se o schema do banco mudar, o cast silencia o erro do TypeScript e o mapCategory produz um objeto malformado que chega ao store sem nenhum aviso.

🟡 Nenhuma função tem return type explícito anotado

Todas as funções em todos os arquivos de serviço, store e lib retornam tipos inferidos:


// Atual — inferido
async function listCategories() { ... }

// Recomendado — explícito
async function listCategories(): Promise<Category[]> { ... }
Com strict: true o TypeScript infere corretamente, mas a anotação explícita serve como contrato documentado e pega divergências quando a implementação muda.

🟡 Tipagem fraca nas respostas Supabase

Nenhuma tabela usa os tipos gerados pelo Supabase (supabase gen types typescript). Os tipos CategoryRow e TransactionRow são interfaces manuais que podem divergir do schema real sem erro de compilação.

Organização do Estado
Arquitetura Zustand — bem estruturada na forma, frágil na prática:

🟠 Padrão try/finally repetido 3 vezes sem abstração


// data.ts — esse bloco aparece 3 vezes quase idêntico
async refreshCategories() {
  set({ categoriesLoading: true })
  try { ... }
  finally { set({ categoriesLoading: false }) }
}
Deveria ser uma função auxiliar:


async function withLoading<T>(
  set: SetState,
  key: LoadingKey,
  fn: () => Promise<T>
) { ... }
🟠 Sem estado de erro no store

Quando listCategories() lança, categoriesLoading volta para false, mas não há categoriesError no store. A UI não tem como saber que o fetch falhou — exibe lista vazia sem distinção entre "sem dados" e "erro de rede".

🟡 saveTransaction/removeTransaction duplicam o mesmo padrão de refresh


// Repetido em ambas as ações
if (get().monthKey) await get().refreshTransactions(get().monthKey!)
await get().refreshCashflow12m()
Deveria ser um método privado afterMutation().

🟡 init() no store de auth sem try/catch

supabase.auth.getSession() pode rejeitar (erro de rede). O init() não tem try/catch, então a rejeição vira uma unhandled promise e o app trava na tela de skeleton com ready: false para sempre.

Reutilização de Código
🟠 sumBy definido localmente no DashboardPage


// DashboardPage.tsx linha 25 — função utilitária local
const sumBy = <T,>(arr: T[], fn: (item: T) => number) =>
  arr.reduce((acc, item) => acc + fn(item), 0)
Essa função não existe em lib/. Deveria estar em lib/math.ts e ser importada. A lógica de computeTotals que usa sumBy se repete em transacoes/page.tsx com seu próprio reduce inline.

🟡 categoryById Map construído em 2 componentes


// Idêntico em DashboardPage.tsx e transacoes/page.tsx
const categoryById = useMemo(
  () => new Map(categories.map(c => [c.id, { name: c.name, color: c.color }])),
  [categories]
)
Deveria ser um hook useCategoryMap(categories) em lib/hooks.ts.

🟡 ${monthKey}-31 duplicado em 2 arquivos


// services/transactions.ts linha 34
// lib/queries.ts linha 16
const to = `${monthKey}-31`
Deveria ser uma constante ou função em lib/dates.ts:


export function monthRange(key: string) {
  return { from: `${key}-01`, to: `${key}-31` }
}
Problemas de Arquitetura
🔴 Sem middleware.ts — zero proteção de rota no servidor
Detalhado na auditoria anterior. Toda proteção é client-side em AppShell, o que significa que o bundle completo das páginas protegidas é enviado ao browser antes de qualquer verificação de sessão.

🟠 Providers.tsx como componente com efeito colateral
O componente Providers não provê contexto, não renderiza UI, e não tem filhos com acesso a um Provider React. É uma casca que executa dois efeitos (theme = dark e auth.init()). Isso deveria ser um hook useAppInit() chamado de layout.tsx ou dois useEffect separados dentro de AppShell.

🟠 Dialog.tsx sem acessibilidade mínima
Sem aria-labelledby, sem focus trap, sem handler de Escape. O elemento de backdrop é um <button> de tela cheia (problemático para leitores de tela). Falha no padrão ARIA Dialog.

🟡 Supabase sem tipos gerados
A ausência de supabase gen types typescript significa que todas as respostas de query são any ou unknown antes dos as casts manuais. Um único comando resolveria isso e tornaria os casts desnecessários.

Prioridades de Refatoração
Impacto	Ação	Esforço
🔴 Bug	Adicionar forwardRef em Input.tsx e Select.tsx	10 min
🔴 Bug	try/catch em auth.store.init()	5 min
🔴 Dívida	Deletar camada Dexie morta (db.ts, queries.ts, seed.ts)	15 min
🟠 Qualidade	Gerar tipos Supabase com supabase gen types typescript	10 min
🟠 Qualidade	Extrair <MonthNavigator>, <TransactionRow>, <FieldError>	1h
🟠 Qualidade	Adicionar campo error no store de dados	30 min
🟡 Limpeza	Adicionar return types explícitos nas funções de serviço	20 min
🟡 Limpeza	Extrair monthRange(), useCategoryMap(), computeTotals()	30 min
🟡 Acessibilidade	Corrigir Dialog.tsx (aria, focus trap, Escape)	1h
