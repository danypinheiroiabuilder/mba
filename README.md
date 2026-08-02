## Fluxo de Caixa (MBA)

Sistema web moderno de controle financeiro pessoal com:

- Cadastro de **categorias** (tipo, cor)
- Cadastro de **receitas/despesas** (descrição, categoria, valor, data, tag)
- **Dashboard** mensal com cards (Receitas, Despesas, Saldo) e gráficos **linha/coluna** (sem pizza/rosca)
- **Supabase Auth + RLS** (dados por usuário)
- Deploy na **Vercel**

O app é a evolução de um controle financeiro em planilha, mantido como referência em [`docs/produto/`](docs/produto/). Nada no código a lê — ver [PRD, seção 1](docs/produto/PRD.md#origem).

## Documentação

- [`docs/produto/`](docs/produto/) — PRD e a planilha que originou o projeto
- [`docs/auditorias/`](docs/auditorias/) — auditorias técnicas e registros de erro
- [`docs/historico/`](docs/historico/) — o que já foi realizado
- [`docs/prints/`](docs/prints/) — evidências de teste manual (imagens ficam locais)
- [`docs/AGENTS.md`](docs/AGENTS.md) — regras locais para assistentes de IA (Claude Code via `CLAUDE.md`)
- [`AGENTS.md`](AGENTS.md) — mesmas regras locais na raiz (Cursor lê automaticamente)
- [`docs/cursor/`](docs/cursor/) — playbook adaptado ao Cursor (User Rules)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment variables

Crie `.env.local` com:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Supabase schema

Execute o script SQL (tabelas + RLS + view):

- `supabase/schema.sql`

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
