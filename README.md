# Growfy

Plataforma em desenvolvimento para cursos de educação financeira. O Express serve o frontend e a API; o PostgreSQL persiste usuários, sessões, pedidos, pagamentos e matrículas. JSON é usado somente para comunicação da API, não como banco de dados.

## Situação atual

- Cadastro, login, sessão, logout e solicitação/conclusão de redefinição de senha estão implementados na API.
- PostgreSQL é o banco de dados. As migrations ficam em `Backend/src/db/migrations/`.
- Checkout Stripe está integrado para cartão em BRL. Uma matrícula só é liberada após um webhook Stripe válido e compatível com o pedido.
- O fluxo de recuperação de senha ainda precisa de SMTP configurado.
- A área do aluno e os módulos exibidos no frontend ainda não entregam aulas protegidas pela API; o conteúdo atual é apenas uma prévia pública.
- Os preços no catálogo do backend são provisórios até confirmação comercial.

## Roteiro dos próximos passos

Siga as etapas na ordem. Não habilite cobranças reais nem anuncie o lançamento antes de completar as etapas de homologação e produção.

### 1. Preparar o ambiente de desenvolvimento

Requisitos: Node.js 20 ou superior e acesso a um PostgreSQL. Você pode usar um projeto Supabase de desenvolvimento ou o Docker Desktop local.

1. Abra um PowerShell na pasta raiz do repositório.
2. Crie `Backend/.env` a partir do exemplo, somente se o arquivo ainda não existir. Se já existir, preserve-o e edite somente as variáveis necessárias:

   ```powershell
   if (!(Test-Path Backend\.env)) { Copy-Item Backend\.env.example Backend\.env }
   ```

3. Configure uma das opções de banco abaixo.
4. Instale as dependências, aplique as migrations e inicie a API:

   ```powershell
   cd Backend
   npm install
   npm run db:migrate
   npm run dev
   ```

5. Abra `http://localhost:3000` para ver o site. Confirme que `http://localhost:3000/api/health` retorna sucesso e inclui `"database":"connected"`.

#### Opção A — Supabase

1. Crie um projeto Supabase para desenvolvimento e guarde a senha do banco num gerenciador de senhas.
2. No painel do projeto, abra **Connect** e copie uma connection string PostgreSQL adequada para conexões de sessão: conexão direta ou **Session pooler**. Evite o pooler em modo transaction para migrations, que usam advisory lock.
3. No `Backend/.env`, defina `DATABASE_URL` com a connection string e `PGSSL=true`.
4. Não habilite acesso direto do navegador ao banco. Não coloque credenciais do banco ou chaves privilegiadas Supabase no frontend.

#### Opção B — PostgreSQL local com Docker

Com Docker Desktop instalado e iniciado, rode na raiz do repositório:

```powershell
if (!(Test-Path Backend\.env)) { Copy-Item Backend\.env.example Backend\.env }
docker compose up -d db
cd Backend
npm install
npm run db:migrate
npm run dev
```

O Compose usa PostgreSQL em `localhost:5432` e mantém os dados num volume Docker. A senha definida no `docker-compose.yml` serve somente para desenvolvimento local; nunca a reutilize em produção. Para parar o banco preservando os dados, use `docker compose stop db`; para iniciá-lo de novo, `docker compose start db`.

> Se você iniciou apenas um servidor estático para visualizar o frontend, login, cadastro, pagamentos e outras funções da API não estarão disponíveis. Para o fluxo completo, inicie o backend com um banco conectado.

### 2. Validar o que já está implementado

Com PostgreSQL disponível, rode os testes do backend:

```powershell
cd Backend
npm test
npm audit
```

Em seguida, teste manualmente no navegador:

1. Crie uma conta com dados fictícios e confirme que consegue entrar e sair.
2. Confirme que a sessão continua protegida e que páginas/API de aluno não exibem dados de outra conta.
3. Teste o pedido de redefinição de senha depois de configurar SMTP (etapa 3).
4. Verifique a saúde do serviço em `/api/health`.
5. Confirme erros esperados para dados inválidos, usuário não autenticado, banco indisponível e pagamento não confirmado.

Não use senhas reais de outras contas durante testes. Não interprete a página de retorno do checkout como confirmação de pagamento: a confirmação deve vir do webhook assinado.

### 3. Configurar e validar e-mail de recuperação

1. Escolha um provedor SMTP e crie credenciais próprias para o ambiente de desenvolvimento/homologação.
2. Preencha `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` e `MAIL_FROM` no `Backend/.env`, de acordo com as instruções do provedor.
3. Reinicie o backend e teste solicitação e conclusão de redefinição de senha, incluindo token expirado/inválido e e-mail não cadastrado.
4. Confirme que a resposta ao usuário não revela se um endereço está cadastrado e que tokens não aparecem em logs.
5. Planeje credenciais SMTP separadas para produção; não reutilize nem publique segredos.

### 4. Decidir e concluir a entrega dos cursos

Antes de implementar, defina quais cursos/conteúdos entram no lançamento, como serão atualizados e quem pode administrá-los.

1. Armazene as aulas fora de páginas públicas do frontend: use a API com autorização ou armazenamento privado com links de acesso controlado.
2. Exija sessão válida e matrícula ativa no servidor antes de liberar cada aula. Nunca dependa apenas de esconder links ou elementos no navegador.
3. Planeje a estrutura dos cursos, módulos, aulas e progresso, incluindo migrations SQL versionadas.
4. Implemente e teste acesso permitido para aluno matriculado, acesso negado para não matriculado, matrícula revogada e usuário deslogado.
5. Verifique se arquivos, URLs de mídia, downloads e metadados não podem ser acessados publicamente sem autorização.

### 5. Confirmar produto, preços e regras de venda

1. Confirme nome, descrição, conteúdo, duração, preço final, moeda e condições de cada curso.
2. Atualize `Backend/src/payments/catalog.js` para que o preço validado no servidor seja a fonte de verdade; mantenha valores em centavos. O navegador nunca deve decidir o valor cobrado.
3. Confirme regras de cancelamento, reembolso, suporte ao aluno e comunicação pós-compra.
4. Decida explicitamente se o primeiro lançamento aceita somente cartão. Pix, boleto, parcelamento, cupons, tributos e outros métodos exigem configuração, validação e testes próprios.
5. Revise termos de uso, política de privacidade, política de cancelamento/reembolso e avisos sobre o conteúdo educacional antes de vender.

### 6. Homologar o Stripe em modo de teste

1. Use uma conta Stripe no **test mode** e configure somente chaves de teste em `Backend/.env`: `STRIPE_MODE=test` e `STRIPE_SECRET_KEY` com uma chave `sk_test_...`.
2. Instale e autentique o Stripe CLI. Com o backend rodando, abra outro terminal e encaminhe os webhooks:

   ```powershell
   stripe listen --forward-to localhost:3000/api/payments/stripe/webhook
   ```

3. Copie o segredo `whsec_...` gerado pelo CLI para `STRIPE_WEBHOOK_SECRET`. Ele é específico daquele listener e deve ser mantido em segredo.
4. Faça compras de teste usando os métodos de teste oficiais do Stripe, nunca dados de cartões reais.
5. Verifique os casos: pagamento aprovado, pagamento recusado/cancelado, webhook repetido, valor ou metadados divergentes, reembolso parcial e reembolso total.
6. Confirme que pedido, pagamento e matrícula ficam consistentes e que uma matrícula só é concedida para evento assinado, pago e correspondente ao pedido.
7. Confirme os preços e o fluxo ponta a ponta novamente depois de qualquer alteração no catálogo ou no webhook.

### 7. Preparar segurança e operação

Antes da publicação:

1. Faça revisão de segurança das rotas, autorização, cookies, validação de entrada, rate limits, dependências e configuração do servidor.
2. Use HTTPS em toda a aplicação. Em produção, configure `NODE_ENV=production`, `PUBLIC_APP_URL` com a origem HTTPS pública e `FRONTEND_ORIGINS` com as origens exatas permitidas.
3. Configure cookies seguros e revise cabeçalhos, política de conteúdo, CORS e proteção contra abuso no domínio final.
4. Guarde segredos em variáveis protegidas do provedor de hospedagem/gerenciador de segredos. Nunca os inclua no Git, frontend, logs, tickets ou documentação.
5. Configure PostgreSQL de produção com credenciais próprias, SSL conforme o provedor, privilégios mínimos, backups automáticos e teste periódico de restauração.
6. Defina monitoramento de disponibilidade, erros, espaço do banco, falhas de webhook e alertas. Evite registrar senhas, tokens, dados de cartão ou outros dados sensíveis.
7. Defina processo de deploy e rollback. Aplique migrations compatíveis e aditivas, com backup antes de mudanças de banco de risco.
8. Execute testes e uma homologação ponta a ponta em ambiente separado de produção.

### 8. Publicar e fazer a checagem final

1. Escolha hospedagem para Node.js e PostgreSQL, configure domínio, DNS, HTTPS e variáveis de ambiente de produção.
2. Faça deploy do backend e frontend na mesma origem sempre que possível; se forem origens distintas, configure e teste explicitamente cookies, CORS e `FRONTEND_ORIGINS`.
3. Confirme `/api/health`, cadastro/login, recuperação de senha, acesso aos cursos e fluxo completo no ambiente de homologação.
4. No Stripe Dashboard, configure o endpoint live `https://seu-dominio/api/payments/stripe/webhook` para os eventos usados pela integração e copie o signing secret live para o ambiente de produção.
5. Só então, após aprovação dos testes, confirmação de preços e revisão das regras de venda, altere para `STRIPE_MODE=live` e configure a chave `sk_live_...` no provedor de hospedagem. Nunca use chave live em desenvolvimento.
6. Faça uma checagem de baixo risco em produção, monitore logs/alertas e confirme a entrega da compra antes de divulgar amplamente.

## Banco de dados e migrations

PostgreSQL é o banco de dados. Não use arquivos JSON nem armazenamento do navegador para persistir dados de conta, matrícula ou pagamento. As migrations SQL ordenadas ficam em `Backend/src/db/migrations/`; o runner registra versão e checksum em `schema_migrations`, usa transação e bloqueia execuções concorrentes.

O servidor aplica migrations pendentes ao iniciar. Também é possível aplicá-las manualmente:

```powershell
cd Backend
npm run db:migrate
```

Não altere migrations já aplicadas em nenhum ambiente compartilhado: crie uma nova migration numerada. Para alterações de banco em produção, planeje compatibilidade com a versão anterior do código e faça backup de acordo com o plano operacional.

## Configuração

`Backend/.env.example` lista as variáveis esperadas. As principais são:

- Banco: `DATABASE_URL` ou `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e `PGSSL`.
- Aplicação: `NODE_ENV`, `PORT`, `PUBLIC_APP_URL` e `FRONTEND_ORIGINS`.
- E-mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` e `MAIL_FROM`.
- Pagamentos: `STRIPE_MODE`, `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`.

Mantenha `Backend/.env` local e fora do controle de versão. Nunca coloque dados reais de cartão, senhas bancárias ou credenciais de contas de alunos no sistema; a cobrança deve ser processada pelo provedor de pagamentos.

## Estrutura do projeto

```text
Frontend/
  css/                 estilos
  js/                  lógica do navegador e configuração da API
  *.html               páginas
Backend/
  server.js            configuração de ambiente, migrations e inicialização HTTP
  scripts/             comandos de manutenção do banco
  src/
    app.js             rotas, middleware e entrega do frontend
    config/            conexão PostgreSQL
    db/
      migrate.js       runner de migrations
      migrations/      histórico versionado de schema SQL
    payments/          catálogo e integração Stripe
  test/                testes da API, migrations e pagamentos
docker-compose.yml     PostgreSQL opcional para desenvolvimento local
```

## Comandos úteis

Na raiz do repositório:

```powershell
# Criar o arquivo local de configuração sem sobrescrever um existente
if (!(Test-Path Backend\.env)) { Copy-Item Backend\.env.example Backend\.env }

# Iniciar PostgreSQL local (requer Docker Desktop)
docker compose up -d db

# Instalar, migrar e iniciar a API
cd Backend
npm install
npm run db:migrate
npm run dev

# Executar testes e verificar dependências
npm test
npm audit
```

## Checklist de lançamento

- [ ] Banco de produção, backups e restauração verificados.
- [ ] Testes automatizados e homologação ponta a ponta aprovados.
- [ ] Recuperação de senha testada com SMTP.
- [ ] Aulas entregues com autorização por sessão e matrícula.
- [ ] Conteúdo, preços e regras de venda confirmados.
- [ ] Stripe test mode validado, incluindo webhooks e reembolsos.
- [ ] Domínio, HTTPS, cookies, origens e segredos de produção configurados.
- [ ] Monitoramento, alertas, deploy e rollback preparados.
- [ ] Endpoint e chave live Stripe configurados somente após aprovação final.
