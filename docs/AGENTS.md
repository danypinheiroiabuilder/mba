<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Verificação de alegações (auditoria, segurança, correções)

Toda alegação de segurança, funcionamento ou correção feita neste projeto — por qualquer assistente de IA — deve vir acompanhada de uma prova reproduzível: um comando e seu output real, um teste que passa, um log verificável. Uma lista de bullets sem evidência não é uma conclusão, é uma hipótese.

Antes de declarar uma auditoria completa ou uma falha corrigida:
- Rode o comando que prova o comportamento (ex.: `curl` sem cookies para confirmar redirecionamento de rota protegida, não só ler o código e assumir que funciona).
- Ao investigar o projeto inteiro (buscas por arquivos, `Glob`/`find`), confirme que a busca não foi truncada ou limitada antes de concluir "não existe X" — prefira várias buscas direcionadas a uma genérica que pode estourar limite de resultados.
- Para auditorias de segurança ou mudanças de arquitetura, trate um único relatório de IA como rascunho, não como veredito — sinalize explicitamente ao usuário que uma segunda verificação independente é recomendada antes de agir sobre achados críticos.

# Banco: o que é específico deste projeto

As regras gerais de banco, migração e deploy valem para qualquer projeto e não são repetidas aqui. Abaixo, apenas o que é particular deste repositório — e o que já causou incidente.

**Preview e Produção usam o MESMO banco.** As variáveis `NEXT_PUBLIC_SUPABASE_*` dos dois ambientes apontam para o mesmo projeto Supabase (`ozfqpfuvufiqtewducxx`). Não existe banco de teste. Portanto:

- nenhum teste em Preview é isolado: ele grava, edita e apaga dados reais;
- validar uma migração "no Preview antes de ir para produção" é ilusão — o banco já foi alterado;
- criar ou excluir lançamento durante um teste altera os números que a Dany usa de verdade.

**Não há backup automático.** PITR desabilitado e zero backups no plano gratuito. Isso é limitação esperada do plano, **não** defeito de configuração nem incidente — não propor upgrade, serviço pago ou habilitação de PITR. A estratégia acordada é backup manual antes de migrações e após alterações estruturais, fora do repositório, com quantidades validadas.

**`supabase/schema.sql` não é reflexo do banco.** Já divergiu três vezes, cada uma com consequência real: `ON DELETE SET NULL` onde o arquivo dizia `restrict` (issue #7), `categories.user_id` anulável (issue #9) e `transactions.user_id` anulável, o que desativava silenciosamente a FK composta por `MATCH SIMPLE` (issue #13). **Sempre consultar o banco real** — `pg_policies`, `pg_constraint`, `information_schema.columns` — antes de afirmar qualquer coisa sobre a estrutura.

O arquivo também **não é script de recuperação validado**: nunca foi executado duas vezes seguidas em banco descartável. Não executá-lo em produção.

# Contraste em superfície composta

Este app usa painéis translúcidos (`bg-panel`, `bg-card/30`, `backdrop-blur`), então medir o contraste de um token isolado produz um número que não existe na tela — e uma aprovação falsa.

- Meça sempre a **superfície composta**, como o navegador realmente pinta o pixel: cor do texto sobre o resultado da mistura entre painel, opacidade e fundo da página. O utilitário do projeto é `scripts/verificar-contraste.mjs`.
- Quando uma cor reprovar, ataque primeiro a causa (opacidade, camada de superfície) antes de escurecer uma cor que já foi aprovada visualmente.
- Sem navegador automatizado neste repositório, `lint` e `build` verdes **não são prova** de que a tela está certa. Diga sempre o que não foi verificado visualmente e aponte quais telas precisam do olho da pessoa — começando pelas que têm gráfico, diálogo ou transparência.
