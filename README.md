# BaseControl

Workspace administrativo para PostgreSQL e Microsoft SQL Server, construído com Next.js App Router, TypeScript strict, Tailwind CSS v4, shadcn/ui, TanStack Query, Drizzle e Neon PostgreSQL. Todas as conexões externas são executadas no backend Node.js por `pg` e `mssql`.

## Desenvolvimento

Requer Node.js 22.17+ e pnpm 11. Não utiliza Docker.

```powershell
pnpm install
Copy-Item .env.example .env.local
```

Preencha as variáveis antes de continuar. Se já existir `.env` ou `.env.local`, preserve as credenciais existentes. O Next.js e os scripts dão prioridade a `.env.local`.

| Variável                     | Finalidade                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`               | Conexão interna com o Neon, preferencialmente pooled e com `sslmode=verify-full`.   |
| `DATABASE_URL_UNPOOLED`      | Conexão direta com a mesma branch para migrations.                                  |
| `BASECONTROL_ENCRYPTION_KEY` | 32 bytes em hexadecimal, exatamente 64 caracteres.                                  |
| `APP_URL`                    | Origem exata do aplicativo; `http://localhost:3000` localmente e HTTPS em produção. |
| `BASECONTROL_ALLOWED_HOSTS`  | Hosts externos exatos separados por vírgula. Obrigatório em produção.               |
| `BASECONTROL_WORKER`         | `embedded` para processo Node persistente; `external` para worker separado.         |
| `NEXT_PUBLIC_APP_NAME`       | `BaseControl`.                                                                      |

Para preencher uma chave ausente no arquivo local sem imprimi-la:

```powershell
node -e "const fs=require('fs'),c=require('crypto');const f='.env.local';let s=fs.readFileSync(f,'utf8');if(/^BASECONTROL_ENCRYPTION_KEY=.+$/m.test(s))throw Error('Uma chave já está configurada. Preserve-a.');s=s.replace(/^BASECONTROL_ENCRYPTION_KEY=.*$/m,'BASECONTROL_ENCRYPTION_KEY='+c.randomBytes(32).toString('hex'));fs.writeFileSync(f,s);"
pnpm db:migrate
pnpm admin:create
pnpm dev
```

`admin:create` solicita email, nome e senha de pelo menos 9 caracteres em um terminal interativo. A entrada da senha é oculta. Não há usuário padrão nem cadastro público. Cada administrador tem acesso a todo o workspace.

Abra [localhost:3000](http://localhost:3000). Sem `DATABASE_URL`, a aplicação apresenta a orientação de configuração; os endpoints administrativos continuam exigindo autenticação.

## Funcionalidades

- Dashboard, servidores em cards/tabela e filtros por engine e status.
- Cadastro, edição, teste de conexão, conexão e desconexão do monitoramento.
- Inventário de databases, owner, tamanho, conexões, estado e criação quando disponível.
- Busca global e busca em todos os servidores com concorrência limitada a três consultas externas por processo.
- Ordenação, filtros, paginação, seleção de todas e de todas filtradas.
- Drawer com sessões e tamanho de tabelas, dados e índices.
- Encerramento individual e em lote com confirmação.
- Exclusões individuais e em lote com confirmação digitada e opção de encerrar conexões.
- Fila persistida no Neon, progresso por SSE, resumo, cópia do resultado e auditoria filtrável.
- Tema claro, escuro e sistema; atualização automática configurável.

O texto SQL das sessões é deliberadamente omitido, porque pode conter senhas, tokens e dados pessoais. Contagens de linhas de tabelas são estimativas. PostgreSQL não fornece uma data de criação confiável das databases, então esse campo aparece como indisponível. Databases sem permissão de leitura de tamanho podem retornar tamanho zero no PostgreSQL.

## Operações e segurança

Os endpoints aceitam operações específicas; não existe endpoint de SQL arbitrário. Valores usam parâmetros. Identificadores usam delimitação e escape próprios de cada engine, com limite de tamanho e rejeição de NUL. `KILL` aceita somente um inteiro validado, com checagem da database da sessão.

As databases padrão de sistema, templates PostgreSQL e IDs de sistema SQL Server são protegidos no backend. A conexão PostgreSQL administrativa usa `postgres`; SQL Server usa `master`. O PostgreSQL usa `DROP DATABASE ... WITH (FORCE)` quando a opção de encerrar conexões é selecionada; essa opção requer PostgreSQL 13+. SQL Server usa `SINGLE_USER WITH ROLLBACK IMMEDIATE` e tenta restaurar `MULTI_USER` caso a exclusão falhe.

Senhas externas são cifradas com AES-256-GCM, IV aleatório e identificação do servidor como dados autenticados. A chave não deve ser trocada sem recriptografar as credenciais existentes. Senhas administrativas usam scrypt com salt aleatório. Sessões são persistidas pelo hash do token e expiram após 8 horas; cookies usam HttpOnly, SameSite Strict e Secure em produção.

As confirmações são verificadas no servidor. Rate limiting persistido no Neon protege login, teste de conexão e ações destrutivas. Requisições de escrita exigem a origem de `APP_URL`. Erros de drivers são traduzidos sem expor stack traces ou secrets.

Uma única operação pendente/em andamento é permitida por servidor, com até 1.000 databases por lote. Editar ou remover uma conexão exige que sua operação termine. A remoção do cadastro apaga o ciphertext e arquiva o servidor, preservando operações e auditoria. Não exclui databases externas.

Para registrar o IP em operações, configure `BASECONTROL_TRUST_PROXY=true` apenas atrás de um proxy confiável que remova e reescreva `X-Forwarded-For`. Sem essa garantia, o IP é omitido.

O worker processa itens sequencialmente e registra seu resultado e duração. Reconectar ao SSE recupera o estado persistido. Se um processo morrer, após a expiração da heartbeat a execução é marcada como falha de resultado possivelmente incerto; **nenhuma ação destrutiva é repetida automaticamente**. Sempre atualize o inventário antes de repetir uma operação interrompida. Não há garantia de atomicidade entre a ação em um banco externo e o registro no Neon.

As permissões do usuário externo determinam a visibilidade e as operações permitidas. No PostgreSQL, leitura de estatísticas pode exigir `pg_read_all_stats`/`pg_monitor`, encerramentos podem exigir `pg_signal_backend`, e exclusão exige propriedade ou privilégios adequados. SQL Server exige permissões apropriadas de estado de servidor/banco e administração de sessões/databases; variam conforme a versão. Não conceda privilégios além dos necessários.

## Produção Node.js

```powershell
pnpm build
pnpm start
```

Configure HTTPS no proxy reverso, `APP_URL`, hosts autorizados, certificados TLS válidos dos servidores externos e regras de rede/egress. Não há opção de aceitar certificados inválidos. Conexões internas e externas têm timeouts e limites de pool. Os endereços internos da rede podem ser cadastrados por administradores, desde que permitidos na configuração de produção.

O modo embedded requer um processo persistente. Em um host serverless como Vercel, use `BASECONTROL_WORKER=external` e execute `pnpm worker` em um serviço Node persistente, usando as mesmas variáveis. Verifique saída TCP, conectividade à rede privada, limites de duração e streaming SSE. Não habilite operações sem um worker disponível.

## Manutenção

```powershell
pnpm typecheck
pnpm lint
pnpm format
pnpm db:generate
pnpm db:migrate
```

Schema e migrations ficam em `src/db`. Providers ficam em `src/lib/database`, serviços em `src/services` e endpoints em `src/app/api`. Os componentes shadcn são mantidos como código local em `src/components/ui`.
