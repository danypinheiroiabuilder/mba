# PRD — Dashboard de Fluxo de Caixa

**Versão**: 1.0  
**Data**: julho de 2026  
**Público**: Proprietários, usuários, stakeholders, e pessoa responsável pelo projeto

---

## 1. Visão Geral do Produto

O **Dashboard de Fluxo de Caixa** é um aplicativo web para você controlar seu dinheiro pessoal. Você registra cada receita (como salário, freelance, venda) e cada despesa (como aluguel, comida, internet), e o app mostra para você como está a saúde do seu orçamento mês a mês.

O app já está funcionando na internet e sendo usado. Foi desenvolvido como projeto de conclusão de MBA.

### Origem

O app é a evolução de um controle financeiro que já existia em planilha, preservado neste repositório em [`docs/produto/Controle Financeiro Youtube.xlsx`](Controle%20Financeiro%20Youtube.xlsx). A planilha foi o **projeto inicial da pós-graduação**; este aplicativo é a versão que a substitui, mantendo a mesma lógica de receitas, despesas, categorias e fluxo mensal, agora multiusuário, acessível pelo celular e com os dados protegidos por conta.

Ela permanece versionada como **referência**, não como dependência: nada no código a lê. Serve para comparar comportamento e conferir se alguma regra do controle original ficou de fora.

---

## 2. Problema que o Produto Resolve

Muitas pessoas guardam seus gastos em caderno, planilha desorganizada ou só na cabeça — e aí fica difícil saber:

- **Quanto eu gasto por mês?**
- **Estou gastando muito com comida? Com transporte?**
- **Meu gasto cresceu comparado ao mês passado?**
- **Quanto eu realmente sobra no final do mês?**

Este app responde essas perguntas de forma rápida e visual, tudo em um só lugar.

---

## 3. Quem Usa

- **Pessoa individual** que quer organizar suas finanças pessoais.
- Alguém que quer entender seus hábitos de gastos.
- Pessoa que recebe salário ou renda variável e quer acompanhar.

**Importante**: Hoje, cada pessoa tem sua própria conta isolada. Se você e seu cônjuge quiserem acompanhar junto, vocês precisam de duas contas separadas (não dá para compartilhar uma conta entre dois usuários).

---

## 4. Funcionalidades Atuais

### 4.1 Autenticação (Login e Cadastro)

**O que você faz**: Cria uma conta com e-mail e senha, faz login, ou recupera a senha se esquecer.

**Como funciona**:
- Na primeira vez, clique em **"Não tem conta? Cadastre-se"** e crie uma conta.
- Se esquecer a senha, clique em **"Esqueci minha senha"** — recebe um e-mail com um link para criar uma nova senha.
- Depois de login, você é redirecionado automaticamente para o dashboard (tela inicial).
- Existe um botão "Sair" em todos os lugares do app para logout.

**Segurança**: Seus dados são privados. Cada pessoa só vê seus próprios lançamentos e categorias.

---

### 4.2 Dashboard (Tela Inicial)

**O que você vê**: Um resumo do mês que você está consultando, com 4 cards principais:

1. **Receitas do mês**: quanto você ganhou (salário, freelance, vendas, bônus, etc.).
2. **Despesas do mês**: quanto você gastou em tudo.
3. **Saldo do mês**: Receitas − Despesas (quanto sobrou, ou ficou em negativo).
4. **Comprometimento**: mostra em porcentagem quanto você gastou em relação ao que ganhou. Tem um "semáforo" que diz se está Saudável (verde), com Atenção (amarelo) ou Alto (vermelho).

**Variação do mês anterior**: cada card mostra como você estava no mês passado (ex: "↓ 5%" significa que esse mês caiu 5%).

**Navegação por mês**: setas (< e >) para voltar e avançar meses. Seleciona o ano e mês atual para comparar.

**Quando você acessa, o app abre no mês atual** (hoje, julho de 2026, abrirá em julho de 2026).

---

### 4.3 Extrato (removido em 2026-07-31)

A tela de Extrato existiu até 2026-07-31 e foi **removida**: ela mostrava exatamente a mesma lista da tela de Lançamentos, só que sem editar, sem filtros, sem totais e sem o saldo acumulado. Era um subconjunto estrito de "Lançamentos", e o nome parecido com "Lançamentos do mês" confundia mais do que ajudava.

Quem quiser só conferir o mês usa a tela de **Lançamentos** (seção 4.5), que mostra a mesma lista com saldo acumulado linha a linha, filtros por categoria e tag, e os totais no topo.

---

### 4.4 Resumo Anual

**O que você vê**: Um gráfico mostrando os **últimos 12 meses** com três linhas/colunas:
- **Barras azuis** = quanto você ganhou cada mês.
- **Barras vermelhas** = quanto você gastou cada mês.
- **Linha amarela** = saldo acumulado (receita − despesa) mês a mês.

Abaixo do gráfico, uma **tabela expansível** que mostra:
- Cada mês do ano.
- Receita, despesa, saldo.
- Percentual de comprometimento de cada mês.

Você pode clicar em cada mês da tabela para expandir e ver mais detalhes.

**Serve para**: ver a tendência do ano inteiro, identificar meses bons e ruins, e entender padrões de gastos.

---

### 4.5 Lançamentos (Gerenciador de Receitas e Despesas)

**O que você faz**: Adiciona, edita ou exclui receitas e despesas.

**Como criar um lançamento** (receita ou despesa):
1. Clique no botão **"+ Adicionar Lançamento"**.
2. Escolha o **tipo**: Receita ou Despesa.
3. Preencha os dados:
   - **Descrição**: o que é (ex: "Salário", "Compra de groceries", "Fatura de água").
   - **Categoria**: escolha uma categoria existente (ex: "Alimentação", "Salário", "Moradia"). Se não tiver uma, você cria na tela de Categorias antes.
   - **Valor**: quanto (ex: 3000.50).
   - **Data**: em que dia do mês.
   - **Forma de pagamento** (opcional): Pix, débito, crédito, dinheiro, transferência, ou outro.
   - **Tag** (opcional): uma etiqueta própria para filtrar depois (ex: "#trabalho", "#freelance", "#mercado").
4. Clique em **"Salvar"**.

**Como editar**:
1. Na tela de Lançamentos, encontre o que quer mudar (use filtro se precisar).
2. Clique no lançamento → modal de edição.
3. Altere o que desejar e salve.

**Como excluir**:
1. Encontre o lançamento.
2. Clique em excluir → o app pede confirmação (para não deletar sem querer).
3. Clique "confirmar" e pronto, sumiu.

**Filtros**:
- **Por categoria**: mostra só lançamentos de uma categoria (ex: só alimentação).
- **Por tag**: mostra só lançamentos com uma tag específica (ex: só "#mercado").

**Saldo acumulado**: durante o mês, enquanto você navega pelos lançamentos, uma coluna mostra o saldo rodando (quanto você tinha acumulado até cada lançamento).

---

### 4.6 Categorias

**O que você faz**: Cria, visualiza e exclui as categorias que organizam seus lançamentos.

**Como criar**:
1. Clique em **"+ Nova Categoria"**.
2. Dê um nome (ex: "Alimentação", "Salário", "Assinaturas").
3. Escolha o **tipo**: Receita ou Despesa (uma categoria é só para receita OU só para despesa).
4. Escolha uma **cor** (clique na cor para ver opções).
5. Clique em **"Salvar"**.

**Como excluir**:
- Clique no ícone de lixeira da categoria.
- **Importante**: o app só deixa excluir se nenhum lançamento está usando aquela categoria. Se houver lançamentos, ele mostra uma mensagem explicando por quê.

**Serve para**: organizar receitas e despesas por tema, facilitando filtros e entendo onde o dinheiro vai.

---

## 5. Como os Seus Dados são Protegidos

Cada pessoa que faz login tem sua própria conta isolada:

- **Você só enxerga seus próprios lançamentos e categorias.**
- Ninguém pode entrar na sua conta sem a senha.
- Se alguém tiver a senha, consegue ver tudo — por isso, **use uma senha forte e não compartilhe**.
- Os dados são armazenados em servidores de nuvem criptografados.
- Você tem apenas uma conta por e-mail (não dá para ter duas contas com o mesmo e-mail).

---

## 6. O Que o App NÃO Faz (Hoje)

- **Não conecta com seu banco**: você não importa automaticamente as transações da conta do banco. Tudo é lançado manualmente.
- **Não importa de planilha ou PDF**: se você tem um arquivo Excel com gastos antigos, não consegue importar de uma vez. Tem que digitar manualmente.
- **Não exporta para arquivo**: você não consegue baixar seus dados em planilha ou PDF (por enquanto).
- **Não é para múltiplos usuários em uma conta**: você não convida amigos ou família para ver a mesma conta. Cada pessoa precisa de sua própria conta.
- **Não tem app mobile nativo**: funciona no navegador do celular (responsivo), mas não é um app que você baixa na Google Play ou App Store.
- **Não sincroniza com outros apps**: calendário, banco, etc. Fica isolado.
- **Não tem orçamento/metas**: você não define "quero gastar máximo R$ 500 com comida" e o app alerta. É só visualização do que já gastou.
- **Não tem recorrência automática**: cada gasto mensal você tem que lançar manualmente. Não há "gasto recorrente" que o app repete.

---

## 7. Estado Atual do Produto

- ✅ **Em produção**: o app está funcionando 24/7 na internet em https://mbadany-exclaexcels-projects.vercel.app.
- ✅ **Sem erros críticos**: ninguém perde dados por bug. Autenticação e isolamento de dados funcionam.
- ⚠️ **Sem testes automatizados formais**: se você faz uma mudança no código, não há testes rodando para verificar se quebrou algo. Risco moderado em atualizações futuras.
- ⚠️ **Alguns reforços de segurança ainda pendentes**: veja seção 8.

---

## 8. Sugestões de Melhoria (Próximos Passos)

Estas são ideias baseadas em auditoria técnica do projeto. Nenhuma está decidida oficialmente — servem para você avaliar se valem a pena.

### 8.1 Segurança

**Senha mais forte**
- **Hoje**: a senha mínima tem 6 caracteres.
- **Sugestão**: aumentar para 8 caracteres ou mais, e avisar se você usar uma senha muito comum ou já vazada.
- **Por quê**: reduz risco de invasão por força bruta.

**Política de Privacidade e LGPD**
- **Hoje**: não há aviso legal sobre privacidade de dados.
- **Sugestão**: criar uma página com Política de Privacidade explicando o que você coleta, como guarda, e dar ao usuário a opção de **excluir sua conta e todos os seus dados**. Importante para estar em conformidade com leis como LGPD (lei de privacidade brasileira).
- **Por quê**: proteção legal; direito do usuário de controlar seus dados.

**Avisos de erro mais claros**
- **Hoje**: algumas mensagens de erro podem expor informações sensíveis.
- **Sugestão**: messages genéricas e amigas (ex: "Usuário ou senha incorretos" em vez de detalhar qual está errado).
- **Por quê**: evita que alguém adivinhe quais e-mails estão cadastrados.

### 8.2 Funcionalidades

**Exportar dados (Planilha / PDF)**
- **Sugestão**: botão "Exportar" que baixa os lançamentos em arquivo Excel (.xlsx) ou PDF.
- **Por quê**: permite backup, análise em outra ferramenta, ou compartilhamento com contador/consultor.

**Importar de arquivo**
- **Sugestão**: possibilidade de fazer upload de uma planilha com lançamentos antigos e importar tudo de uma vez.
- **Por quê**: facilita migração de outro app ou entrada de histórico.

**Suporte a múltiplos usuários em uma conta** (Família / Pequena Empresa)
- **Sugestão**: permitir que você convide outra pessoa para compartilhar a mesma conta, cada uma vendo e editando os mesmos lançamentos.
- **Por quê**: permite usar para casal, pequeno negócio, ou grupo de amigos.
- **Complexidade**: refatoração grande no código.

**Orçamento / Metas**
- **Sugestão**: definir "quero gastar no máximo R$ 500/mês com comida" e o app alertar quando você se aproximar do limite.
- **Por quê**: ajuda a controlar gastos de forma proativa.

**Recorrência automática**
- **Sugestão**: marcar um lançamento como "aluguel (todo dia 1º)" ou "internet (todo mês)" e o app criar automaticamente.
- **Por quê**: menos digitação para gastos previsíveis.

**Integração com banco** (Open Finance)
- **Sugestão**: conectar a conta do seu banco e importar automaticamente as transações.
- **Por quê**: zero digitação, mais precisão.
- **Complexidade**: alta, depende de APIs de bancos brasileiros.

### 8.3 Confiabilidade

**Testes Automatizados**
- **Sugestão**: criar testes que rodam a cada mudança no código, verificando se as funcionalidades principais ainda funcionam.
- **Por quê**: reduz risco de bugs em atualizações; facilita manutenção futura.

---

## 9. Especificações Técnicas (para o time de desenvolvimento)

### 9.1 Tecnologias em uso

- **Next.js 16** (framework web moderno em JavaScript/TypeScript).
- **React 19** (biblioteca para interface).
- **Supabase** (banco de dados PostgreSQL + autenticação na nuvem).
- **Tailwind CSS** (estilos visuais).
- **Recharts** (gráficos).
- Hosting: **Vercel** (plataforma de deploy de aplicações web).

### 9.2 Arquitetura de segurança

- Cada usuário tem uma conta isolada por e-mail/senha.
- Dados são filtrados por usuário no banco (só você enxerga seus lançamentos).
- Middleware (código que roda antes de cada página) protege rotas privadas — sem login, você é redirecionado para o login.

### 9.3 Dados armazenados

- **Categorias**: nome, tipo (receita/despesa), cor.
- **Lançamentos**: descrição, tipo, categoria, valor, data, forma de pagamento, tag (opcional).
- **Usuários**: e-mail, senha (criptografada), data de criação.

---

## 10. Como Usar o Produto (Para Usuários Novos)

### Passo 1: Cadastre-se
1. Vá para https://mbadany-exclaexcels-projects.vercel.app.
2. Clique em "Não tem conta? Cadastre-se".
3. Digite seu e-mail e uma senha.
4. Clique em "Cadastrar".
5. Você é direcionado para o login — faça login com as credenciais que criou.

### Passo 2: Crie suas categorias
1. Na navegação, clique em **Categorias**.
2. Crie categorias que façam sentido para você (Salário, Alimentação, Transporte, Moradia, Lazer, etc.).
3. Para cada, escolha o tipo (Receita ou Despesa) e uma cor.

### Passo 3: Adicione seus lançamentos
1. Clique em **Lançamentos**.
2. Clique em "+ Adicionar Lançamento".
3. Preencha descrição, categoria, valor, data, e salve.
4. Repita para cada receita ou despesa que tiver.

### Passo 4: Acompanhe no Dashboard
1. Clique em **Dashboard** (tela inicial).
2. Veja o resumo do mês: receita, despesa, saldo, e comprometimento.
3. Use as setas para navegar meses anteriores e futuros.

### Passo 5: Analise o Resumo Anual
1. Clique em **Resumo**.
2. Veja o gráfico dos últimos 12 meses.
3. Clique em meses na tabela para expandir e ver detalhes.

---

## 11. Roadmap (Ideias Futuras)

Sem compromisso de datas, mas sendo consideradas:

| Trimestre | Ideia |
|-----------|-------|
| Q3-Q4 2026 | Exportar para Excel/PDF; testes automatizados |
| 2027 | Orçamento e metas; suporte a múltiplos usuários |
| 2027+ | Integração com banco (Open Finance); app mobile nativo |

---

## 12. Perguntas e Suporte

Se você tiver dúvidas sobre como usar, verifique:
- Rodapé da tela (pode haver um link de suporte ou FAQ — hoje não há, mas é uma sugestão).
- Documentação no repositório (para desenvolvedores): https://github.com/seu-usuario/dashboard-de-fluxo (ajuste URL conforme necessário).

Para relatar bugs ou sugerir features, entre em contato com a pessoa responsável pelo projeto.

---

## 13. Histórico de Revisões

| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 1.0 | jul/2026 | Time | PRD inicial — mapeamento completo de funcionalidades atuais e sugestões de melhoria |

---

**Fim do Documento**
