# Teste manual em celular — 2026-07-30

Primeira conferência do tema claro em produção, feita pela Dany em celular real,
depois do merge do PR #11 (issue #6). As imagens ficam fora do versionamento
(ver `.gitignore`); este arquivo registra o que cada uma mostra.

**Aprovado:** as cores do tema claro. Seletor de tema funcionando no cabeçalho,
fundo cinza `#bcbcbc` com painel branco sobreposto, cartões se separando do
fundo, valores em verde e rosa legíveis, navegação inferior intacta.

## Achados

| Print | Tela | Achado | Gravidade |
|---|---|---|---|
| `01-resumo-anual-tooltip-cobre-grafico` | Resumo Anual | O tooltip ocupa quase toda a área do gráfico — fonte e espaçamento não reduzem no celular | média |
| `02-resumo-anual-grafico-sem-filtro` | Resumo Anual | Gráfico sem nenhum controle de período; pedido de filtro de datas no estilo slicer do Power BI | média |
| `03-lancamentos-data-quebra-em-tres-linhas` | Lançamentos · Lista do mês | A linha de detalhe empilha e a data se parte em três linhas (`2026-` / `07-` / `30`); Editar e Excluir disputam espaço com o texto. Sobra largura na tela — é distribuição, não falta de espaço | média |
| `04-bug-forma-de-pagamento-opcional-bloqueia-salvar` | Novo lançamento | **Impede salvar.** "Forma de pagamento (opcional)" em "Selecione…" dispara erro cru do Zod em inglês e bloqueia o Salvar | **alta** |

## Sobre o item 04

`<option value="">` em `src/app/transacoes/page.tsx` envia string vazia, e
`paymentMethod: z.enum([...]).optional()` em `src/lib/types.ts:59` aceita
`undefined`, não `""`. Além do bloqueio, a mensagem chega ao usuário em inglês.

**Não é regressão do tema:** os commits de 2026-07-29 e 30 não tocaram
`src/app/transacoes/page.tsx`. O defeito é anterior e só apareceu agora porque a
tela passou a ser usada de verdade.

## Também em aberto

- Demora percebida ao trocar de página, mais forte no Dashboard. (O caso do
  Extrato deixou de existir: rota removida em 2026-07-31.)
- ~~Dúvida de nomenclatura: "Lançamentos do mês" × "Extrato" — se a diferença não
  está óbvia para quem construiu o app, a interface não está comunicando.~~
  Resolvido em 2026-07-31 pela remoção da tela de Extrato, que duplicava
  "Receitas e Despesas".
- Sistema de cores das Tags não compreendido. Hipótese: cor é atributo de
  **categoria**, e `tag` é texto livre sem cor — o marcador colorido ao lado do
  lançamento parece pertencer à tag quando é da categoria.
