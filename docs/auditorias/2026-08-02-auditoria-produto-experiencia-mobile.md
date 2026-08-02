# Auditoria de produto e experiência mobile

- **Data:** 2026-08-02
- **Status:** aprovada
- **Escopo:** documento de decisão. Sem código, banco, Supabase, middleware, PWA, metas, filtros globais, gráfico novo ou cor nova.
- **Base verificada por leitura de código:** `src/components/AppShell.tsx`, `src/components/dashboard/DashboardPage.tsx`, `src/app/transacoes/page.tsx`, `src/app/categorias/page.tsx`, `src/components/resumo/ResumoAnualPage.tsx`, `src/stores/auth.ts`, `src/stores/data.ts`.
- **Não verificado:** nada foi conferido em navegador. Não há navegador automatizado neste repositório, então toda afirmação sobre aparência final depende de conferência visual humana.

## Contexto

O app já autentica e faz CRUD, mas a experiência pós-login não parece um app pessoal no celular: não há nome da usuária, não há porta de saída visível no mobile, a tela inicial é um painel de quatro números técnicos sem instrução de uso, e as telas acumulam funções repetidas.

O objetivo é reorganizar a experiência **antes** de implementar novas funções, sob o princípio "sem tempo, irmão": a pessoa abre, bate o olho, entende o mês e sabe o que fazer.

---

## 1. Diagnóstico da experiência atual

### O que existe hoje

| Tela | Rota | O que entrega |
| --- | --- | --- |
| Dashboard | `/` | 4 KPI cards (Receitas, Despesas, Saldo, Comprometimento) + navegador de mês. Sem gráfico, sem lista, sem ação. |
| Lançamentos | `/transacoes` | 3 KPI cards + navegador de mês + botão "Novo lançamento" + lista filtrável (categoria, tag) + diálogos de criar/editar/excluir. |
| Resumo Anual | `/resumo` | Slicers (período 3/6/12, séries, categorias) + gráfico Recharts + tabela "Controle Geral" escondida em `<details>`. |
| Categorias | `/categorias` | Duas colunas Entrada/Saída, CRUD de categoria. |

### Achados com evidência

**Dashboard é subconjunto de Lançamentos.** Os três primeiros cards são os mesmos (`DashboardPage.tsx:154-219` vs `transacoes/page.tsx:195-229`), com markup duplicado e sem componente compartilhado. Só "Comprometimento" é exclusivo.

**Dashboard carrega dado que não usa.** `refreshCashflow12m()` (`DashboardPage.tsx:73`) busca 12 meses para alimentar um gráfico que não existe. `monthTotals.latest` (`:139-141`) monta as 8 últimas transações e `categoryById` (`:88`) o mapa de categorias — nada disso é renderizado. Custo de rede mobile sem retorno de tela.

**O `-100.0%` é bug, não questão de gosto.** `TrendBadge` (`DashboardPage.tsx:41`) imprime a seta `↑`/`↓` e, em seguida, o percentual **com sinal**: mês anterior com receita e mês atual zerado produz `↓ -100.0%` (duplo negativo). Pior: quando o mês anterior é zero, o código força `percentage = 0` (`:125-127`) e a tela mostra `↑ 0.0%` justamente quando houve atividade nova — informação invertida.

**Nenhuma identidade no mobile.** `user?.email` aparece só na sidebar desktop (`AppShell.tsx:95`), que é `hidden ... sm:block`. No celular não há nome, e-mail nem avatar.

**Sem porta de saída no mobile.** O botão "Sair" está só na sidebar desktop (`AppShell.tsx:136-142`). No celular não existe logout — a usuária fica presa na sessão.

**Filtros não têm memória.** Todos são `useState` local. Os dois navegadores de mês (`DashboardPage.tsx:48` e `transacoes/page.tsx:35`) são independentes: escolher agosto no Início e ir para Lançamentos volta ao mês atual, quebrando a leitura contínua do mês.

**Barra mobile só com ícones.** `AppShell.tsx:176-209` — os labels existem apenas em `aria-label`/`title`. Em toque não há título, então distinguir "Resumo Anual" de "Lançamentos" é adivinhação por ícone.

**Regra de negócio copiada.** `classifyCommitment` está duplicada em `DashboardPage.tsx:21-25` e `ResumoAnualPage.tsx:27-31`. O cálculo de totais do mês existe em três versões diferentes (`DashboardPage.tsx:112-143`, `calculateTotals` em `transacoes/page.tsx:152`, `ResumoAnualPage.tsx:124-147`).

---

## 2. Problemas de foco

1. **Dashboard não tem função própria.** É um subconjunto de Lançamentos mais um card extra. Duas telas competem pelo mesmo trabalho.
2. **Lançamentos faz três coisas.** Resume o mês, lista e cadastra. A parte de resumir pertence ao Início.
3. **Nenhuma tela responde "e agora?".** O app informa e nunca orienta — o oposto do "sem tempo, irmão".
4. **Percentual como linguagem principal.** `-100.0%`, `0.0%` e `↓ -100.0%` exigem cálculo mental para uma leitura que deveria ser instantânea.
5. **Conta e sessão não têm lugar.** Nome, tema e logout estão espalhados na sidebar desktop e ausentes no mobile.
6. **Resumo Anual tem duas naturezas.** Gráfico (leitura visual) e tabela detalhada (consulta) na mesma tela, com a tabela escondida em `<details>` — quem precisa dela não a encontra.

### Respostas diretas

| # | Pergunta | Resposta |
| --- | --- | --- |
| 1 | Cada tela tem função clara? | Lançamentos e Categorias sim. Dashboard **não**. Resumo Anual **parcialmente** (mistura gráfico e tabela). |
| 2 | Onde há duplicidade? | Cards Receitas/Despesas/Saldo em duas telas; navegador de mês em dois estados separados; `classifyCommitment` em dois arquivos; totais do mês em três. |
| 3 | "Dashboard" deve virar "Início"? | **Sim.** É jargão e não diz o que fazer ali. A tela também precisa mudar de conteúdo, não só de nome. |
| 4 | "Resumo Anual" deve virar o quê? | **"Fluxo de Caixa"** — termo já usado no projeto e que descreve exatamente o conteúdo: entradas, saídas e saldo mês a mês. "Análises" promete mais do que a tela entrega. |
| 5 | Lista só em Lançamentos? | **Sim.** A lista completa e editável é a função de Lançamentos. O Início mostra no máximo os **3 últimos**, em leitura, como atalho — a prop `showActions={false}` de `TransactionRow` já existe. |
| 6 | Gráfico só em Fluxo de Caixa? | **Sim.** Gráfico é leitura comparativa, não leitura de 5 segundos. Também elimina o `refreshCashflow12m()` desnecessário do Início. |

---

## 3. Nova navegação

### Mobile — barra inferior, 4 abas com ícone + label visível

```text
[ Início ]  [ Lançamentos ]  [ Fluxo ]  [ Categorias ]
```

- Label sempre visível. Label curto "Fluxo" na barra; título completo "Fluxo de Caixa" no cabeçalho da tela.
- Alvo de toque mínimo de 44px de altura.
- Ícone sozinho não é navegação, é enigma.

### Conta fora da barra

Botão circular com a inicial da usuária no canto superior direito do cabeçalho, levando a `/conta`. Mantém 4 abas confortáveis e dá à conta um lugar previsível.

### Desktop — sidebar

Mesmos 4 itens. O card de topo (hoje "Fluxo / Caixa mensal" + e-mail) vira o botão de conta. "Tema" e "Sair" saem da sidebar e passam a viver em `/conta`, eliminando a divergência desktop-vs-mobile.

A ordem das abas segue a frequência real de uso: leitura diária, registro diário, leitura mensal, configuração rara.

### Decisão de 2026-08-02 — referência visual avaliada

Avaliada uma referência de dashboard mobile com barra flutuante em que **apenas a aba ativa** mostra texto. Decisão: **manter os 4 labels sempre visíveis**, priorizando descoberta e acessibilidade acima do ganho de espaço.

Aproveitável da mesma referência em fases posteriores, tudo sem cor ou fonte nova:

- **anatomia do card** — número grande, depois variação absoluta ("vs mês anterior"), depois pílula de percentual. É exatamente a correção proposta na seção 12: valor absoluto e percentual separados, cada um no seu lugar;
- **avatar no topo direito** → Passo 3;
- **botão primário na linha do título** e **cards 2×2 no celular** → Passo 4, com a ressalva de que valores em reais (`R$ 5.000,00`) são bem mais largos que os números da referência e 2 colunas podem exigir fonte menor, o que está fora de escopo;
- **chips de filtro na linha do título da seção** → Passo 6, reusando `SlicerChip`.

Descartados: busca no topo, notificações e gráfico de área novo.

---

## 4. Função recomendada para cada tela

| Rota | Nome | Função única | O que sai |
| --- | --- | --- | --- |
| `/` | **Início** | "Como está o mês e o que eu faço agora." Leitura de 5 segundos mais ação. | Sai a ideia de painel completo. |
| `/transacoes` | **Lançamentos** | Registrar, editar e encontrar lançamentos do mês. | Saem os 3 KPI cards, que viram uma linha de resumo `Receitas X · Despesas Y · Resultado Z`. |
| `/resumo` | **Fluxo de Caixa** | Comparar meses: gráfico e tabela do período. | A tabela **sai do `<details>`** e ganha título visível. |
| `/categorias` | **Categorias** | Manter as categorias de entrada e saída. | Nada. Já é focada. |
| `/conta` | **Conta** (nova) | Quem sou, tema e sair. | — |

As rotas permanecem as mesmas nesta fase. Renomear URL mexeria em `middleware.ts` e arrisca link salvo — fica para depois, se houver motivo.

---

## 5. Nova estrutura da tela Início

```text
┌─────────────────────────────────────────┐
│ Oi, Dany                         (D)    │  saudação + botão de conta
│ agosto de 2026          ‹ hoje ›        │  mês + navegador
├─────────────────────────────────────────┤
│ SITUAÇÃO DO MÊS                         │
│ Você fechou agosto no positivo.         │  uma frase, fonte grande
│ Sobraram R$ 1.240,00.                   │
├─────────────────────────────────────────┤
│ Resultado do mês        R$ 1.240,00     │  número principal
│ ─────────────────────────────────────── │
│ Receitas   R$ 5.000,00                  │
│ Despesas   R$ 3.760,00                  │
├─────────────────────────────────────────┤
│ [  + Novo lançamento  ]                 │  primário, largura total
├─────────────────────────────────────────┤
│ ATENÇÃO RÁPIDA                          │
│ ⚠ Suas despesas já usam 75% da receita. │  0 a 2 avisos, ou nada
├─────────────────────────────────────────┤
│ ÚLTIMOS LANÇAMENTOS          ver todos ›│  3 itens, leitura só
└─────────────────────────────────────────┘
```

### Decisões de conteúdo

- **Resultado do mês** = receitas menos despesas do mês selecionado. É o número principal, o maior da tela. Hoje se chama "Saldo" e concorre com o conceito de saldo acumulado; a confusão é real e o rename resolve.
- **Receitas** e **Despesas** do mês: presentes, mas em segundo plano — linhas, não cards grandes. São o detalhamento do resultado.
- **Saldo acumulado** é **item opcional** (decisão de 2026-08-02). Definição pretendida: tudo que entrou menos tudo que saiu até o fim do mês selecionado. **Se a regra não estiver clara no código na hora de implementar, não exibir na primeira versão.** Prioridade para Resultado do mês, Receitas e Despesas. Melhor omitir do que mostrar um número cuja regra ninguém sabe explicar.
- **Botão "Novo lançamento"**: largura total, abrindo o mesmo diálogo de `/transacoes` — reaproveitar o formulário existente, não duplicar. É a ação diária e não deve exigir uma navegação antes.
- **Atenção rápida**: bloco condicional, no máximo 2 avisos, uma frase cada. Regras candidatas, todas calculáveis com o dado que já existe: despesas ≥ 70% da receita; despesas ≥ 90% da receita; resultado do mês negativo; nenhum lançamento no mês; nenhuma receita no mês. Sem avisos, **o bloco não aparece** — não mostrar "tudo ok" só para preencher espaço.
- **Situação do mês**: frase em linguagem humana no topo, derivada do resultado e do comprometimento. É o "bate o olho".
- **Comprometimento (%)** sai do lugar de card com número, onde seria o quarto número técnico, e passa a ser **a frase** de Situação ou Atenção. O percentual em si volta com contexto na tela Fluxo de Caixa, que já o calcula na tabela.

### Estados que hoje não existem

- **Mês sem nenhum lançamento** — o primeiro uso e o caso mais provável de abandono: "Nenhum lançamento em agosto ainda. Comece registrando uma receita ou despesa." mais o botão. Nunca mostrar R$ 0,00 quatro vezes.
- **Carregando** — esqueleto, não zeros. Zero é um valor; zero falso mente.

---

## 6. Mensagens que substituem o percentual confuso

Regra geral: **frase antes de percentual**; percentual só quando os dois meses têm valor comparável; nunca seta e sinal na mesma expressão.

| Situação | Hoje | Proposta |
| --- | --- | --- |
| Mês anterior tinha valor, este está zerado | `↓ -100.0%` | "Nenhuma receita registrada neste mês" |
| Mês anterior zerado, este tem valor | `↑ 0.0%` (errado) | "Primeiro mês com receita registrada" |
| Ambos os meses zerados | `—` | "Sem movimento nos dois meses" |
| Variação normal, ambos com valor | `↑ 12.5%` | "12% acima de julho" / "12% abaixo de julho" |
| Variação minúscula (< 2%) | `↑ 0.8%` | "Praticamente igual a julho" |
| Resultado do mês negativo | — | "Você gastou R$ 320,00 mais do que recebeu" |
| Comprometimento sem receita | `Sem receita no mês` | manter, já está bom |

Se mantiver percentual, usar valor absoluto e indicar a direção por palavra.

---

## 7. Nome da usuária, sem e-mail como nome visível

**Onde exibir:** dois lugares, um propósito cada.

1. **Saudação no Início** — "Oi, Dany" no topo. É o que faz o app parecer pessoal.
2. **Botão de conta no cabeçalho** — círculo com a inicial, em todas as telas, mobile e desktop, levando a `/conta`.

**De onde vem o nome:** campo editável "Como quer ser chamada" na nova página `/conta`, gravado em `user_metadata` via `supabase.auth.updateUser({ data: { display_name } })`. Isso mora no **auth**, não em tabela nova — sem migração, sem schema, sem RLS. O store já expõe o `User` inteiro (`stores/auth.ts:13`), então o valor fica disponível em qualquer tela sem nova busca.

**Cadeia de fallback:**

1. `user_metadata.display_name` → "Oi, Dany".
2. Vazio → **saudação sem nome** ("Oi!" / "Seu mês"), com um convite discreto em `/conta` para preencher.
3. **E-mail nunca é usado como nome visível.** "Oi, excla.excel" é pior do que não cumprimentar: parece dado de sistema vazando na interface, e o e-mail é um identificador — exibi-lo em tela é risco desnecessário se alguém olhar o celular por cima do ombro.
4. **O e-mail continua visível em um lugar só:** dentro de `/conta`, rotulado "E-mail da conta", onde responde à pergunta legítima "estou logada com qual conta?". Fora dali sai, inclusive do card da sidebar desktop (`AppShell.tsx:95`).
5. **Não derivar nome do e-mail** (cortar antes do `@`, capitalizar). Adivinhar nome errado é pior que não ter nome.

---

## 8. Logout e porta de saída

Hoje o logout existe só no desktop; no celular não há saída.

- **`/conta` é a porta de saída canônica**, alcançável de qualquer tela pelo botão de conta. Contém nome, e-mail, tema e o botão "Sair da conta".
- O botão fica no **fim** da página, com variante `ghost` — visível para quem procura, difícil de tocar por acidente.
- **Confirmação antes de sair**, com o `Dialog` já existente: "Sair da conta? Você vai precisar entrar de novo com e-mail e senha." Em app financeiro no celular, um toque acidental que derruba a sessão é fricção real.
- Reaproveitar `signOut()` (`stores/auth.ts:66`) e o `router.replace("/login")` já usado hoje: comportamento idêntico, lugar novo.
- **Não** colocar "Sair" na barra inferior. Ação rara e irreversível não merece um dos 4 slots mais valiosos da tela.

---

## 9. Filtros: globais e locais

Nesta fase **todos continuam locais**, sem exceção.

Quando a mudança acontecer, apenas **um** filtro deve virar global: o **mês**, compartilhado entre Início, Lançamentos e Fluxo de Caixa. Categoria, tag, período e séries são específicos da tarefa de cada tela e devem permanecer locais — torná-los globais só atrapalharia.

---

## 10. O que fica para depois

| Item | Por quê depois |
| --- | --- |
| **Metas financeiras** | Depende de decidir o que é meta (por categoria? valor total? mensal ou anual?), precisa de dado novo e provavelmente tabela e migração. Só faz sentido quando o Início já comunicar bem o presente — meta sem leitura clara do mês vira mais um número técnico. |
| **Filtros globais (mês compartilhado)** | É a correção certa e vai acontecer, mas muda a arquitetura de estado e toca três telas. Junto com o redesenho do Início, dobra a superfície de erro. |
| **PWA / instalar no celular** | Só vale depois que a experiência mobile estiver boa. Instalar uma tela confusa não a melhora. |
| **Renomear rotas** (`/resumo` → `/fluxo`, `/transacoes` → `/lancamentos`) | Labels resolvem toda a confusão da usuária. URL é detalhe técnico, mexe em `middleware.ts` e arrisca link salvo. |
| **Gráfico novo, cores novas** | Fora de escopo por decisão. |
| **Extrair `KpiCard`, unificar `classifyCommitment` e os três cálculos de total** | Dívida técnica real, mas refatorar antes do formato final das telas seria refatorar algo que vai mudar. Faxina depois. |
| **Busca por texto e filtro por período em Lançamentos** | Melhoria de uso, não de foco. |

---

## 11. Ordem segura de implementação

Cada passo é entregável isolado, testável no celular e reversível sozinho, com aprovação entre os passos.

| # | Passo | Por que nessa posição | Risco |
| --- | --- | --- | --- |
| 1 | **Labels e barra mobile**: "Dashboard" → "Início", "Resumo Anual" → "Fluxo de Caixa"; label visível na barra inferior; alvos de toque ≥ 44px. | Maior ganho de clareza pelo menor risco. Só texto e classes de layout. | Mínimo |
| 2 | **Corrigir `TrendBadge`**: acabar com `↓ -100.0%` e com o `↑ 0.0%` falso, aplicando as mensagens da seção 6. | É bug, não redesenho. Corrigir antes de reorganizar evita levar o defeito para a tela nova. | Baixo |
| 3 | **Página `/conta`** + botão de conta no cabeçalho + logout com confirmação + campo "Como quer ser chamada". Remover e-mail da sidebar; mover "Tema" e "Sair" para lá. | Desbloqueia o nome, de que o Passo 4 depende, e fecha a falha de não haver saída no mobile. Toca `auth`, não banco. | Médio |
| 4 | **Reconstruir o Início**: situação do mês, resultado, receitas e despesas, botão Novo lançamento, atenção rápida, últimos 3, saudação com nome. Remover `refreshCashflow12m()` e o código morto. | O passo grande, feito quando nome e correção de percentual já existem. | Médio |
| 5 | **Limpar Lançamentos**: 3 KPI cards viram uma linha de resumo; a lista fica protagonista. | Só depois que o Início assumir o papel de resumir, senão a informação desaparece do app por um momento. | Baixo |
| 6 | **Fluxo de Caixa**: tirar a tabela do `<details>`, dar título visível, conferir gráfico e tabela no celular. | Última porque é a tela menos usada no dia a dia. | Baixo |

Regra em todos os passos: `lint` e `build` verdes **não são prova visual**. Cada passo termina com conferência em celular real — prioridade para Início (números e frases), `/conta` (fluxo de sair e voltar) e Fluxo de Caixa (gráfico e tabela em tela estreita). Nada de commit, push ou deploy sem pedido explícito.

---

## 12. Arquivos provavelmente envolvidos

### Vão mudar

- `src/components/AppShell.tsx` — labels do `nav` (`:26-31`), label visível na barra mobile (`:176-209`), botão de conta no cabeçalho (`:148-153`), remover e-mail do card (`:95`), mover "Tema" e "Sair" (`:131-143`) para `/conta`.
- `src/components/dashboard/DashboardPage.tsx` — reescrita da tela, correção do `TrendBadge` (`:27-44`) e remoção do código morto (`:73`, `:88`, `:90-110`, `:139-141`).
- `src/app/transacoes/page.tsx` — KPI cards (`:195-229`) viram linha de resumo. O formulário em diálogo precisa ser extraído para ser reusado pelo Início.
- `src/components/resumo/ResumoAnualPage.tsx` — título e tabela fora do `<details>` (`:374-401`).

### Vão nascer

- `src/app/conta/page.tsx` — nova página Conta.
- `src/components/AccountButton.tsx` — botão circular com a inicial.
- `src/components/TransactionFormDialog.tsx` — formulário extraído de `/transacoes`, para o Início reusar sem duplicar.
- `src/lib/insights.ts` — frases de situação, atenção e variação num só lugar, para não repetir o erro de copiar `classifyCommitment`.

### Reusados sem modificar

`src/components/ui/{Card,Button,Dialog,Input,Select,FieldError}.tsx`, `src/components/PageHeader.tsx`, `src/components/MonthNavigator.tsx`, `src/components/AnimatedNumber.tsx`, `src/components/TransactionRow.tsx` (com `showActions={false}` para os últimos 3 do Início), `src/lib/{dates,money,helpers}.ts`, `src/stores/{auth,data,theme}.ts`.

### Não serão tocados

`src/middleware.ts`, `src/services/supabase/client.ts`, `src/config/env.ts`, `supabase/**`, `src/app/globals.css` (nenhuma cor nova).

---

## 13. Cuidado ao testar

Preview e Produção usam o **mesmo** projeto Supabase, conforme `docs/AGENTS.md`. Não existe banco de teste. Ao validar "Novo lançamento", ou testar apenas a abertura do diálogo sem salvar, ou usar um valor reconhecível e apagar depois — qualquer criação altera os números reais.
