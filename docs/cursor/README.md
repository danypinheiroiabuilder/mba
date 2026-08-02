# Pacote Cursor da Dany

Cópia das instruções pessoais **adaptada só para o Cursor**. Não altera nem substitui `~/.claude/CLAUDE.md`.

## Arquivos

| Arquivo | Uso |
|---|---|
| [`USER_RULES.md`](USER_RULES.md) | Colar em **Cursor → Customize → Rules → User Rules** (global em todos os projetos no Cursor) |
| [`../../AGENTS.md`](../../AGENTS.md) | Regras **deste** repo (Cursor lê na raiz) |
| [`../AGENTS.md`](../AGENTS.md) | Mesmo conteúdo local para o Claude Code (`CLAUDE.md` → `@docs/AGENTS.md`) |

## Como ativar (uma vez)

1. Abra `docs/cursor/USER_RULES.md`.
2. Copie o conteúdo.
3. No Cursor: **Customize → Rules → User Rules** → cole e salve.
4. Neste repo, o `AGENTS.md` na raiz já cobre banco/Next/contraste.

## Manutenção

- Mudou método/tom/PACIF? Atualize `USER_RULES.md` **e** cole de novo nas User Rules.
- Mudou regra só deste app? Atualize `AGENTS.md` **e** `docs/AGENTS.md` juntos.
- Não edite o Claude global a partir destes arquivos (e vice-versa), salvo decisão explícita de sincronizar.
