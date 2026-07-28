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
