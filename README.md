# BaseControl

Aplicativo desktop enxuto para listar e excluir bases PostgreSQL e SQL Server.

## Stack

- Tauri 2 e Rust para janela, conexões e operações de banco
- React 19, TypeScript strict e Vite
- Tailwind CSS v4 via PostCSS
- pnpm

Não há servidor web, API routes, banco interno, autenticação própria, worker ou cache de dados. O aplicativo preserva localmente o tipo de banco, host, porta e usuário da última conexão; a senha existe somente na memória enquanto o aplicativo está aberto e nunca é persistida pelo BaseControl.

## Requisitos

- Node.js 22+
- pnpm 11+
- Rust com toolchain MSVC
- Microsoft Edge WebView2

## Desenvolvimento

```powershell
pnpm install
pnpm tauri dev
```

O Cargo está configurado com um único job em `.cargo/config.toml`. Isso evita bloqueios intermitentes de artefatos Rust quando o projeto está dentro de uma pasta sincronizada pelo OneDrive.

## Validação

```powershell
pnpm typecheck
pnpm lint
pnpm build
cargo check --manifest-path src-tauri\Cargo.toml
```

## Instalador Windows

```powershell
pnpm tauri build
```

O instalador NSIS é criado em `src-tauri\target\release\bundle\nsis`.

Os binários da versão validada também estão em `artifacts\`, fora do versionamento. A pasta `src-tauri\target` pode ser apagada após o build sem afetar o projeto.

## Segurança da exclusão

- Bases padrão do sistema não aparecem na listagem.
- O backend consulta novamente o servidor antes de excluir e rejeita bases protegidas.
- A confirmação mostra os nomes exatos antes da operação permanente.
- PostgreSQL usa `DROP DATABASE ... WITH (FORCE)`.
- SQL Server encerra conexões com `SINGLE_USER WITH ROLLBACK IMMEDIATE` antes do `DROP DATABASE`.

PostgreSQL usa conexão sem TLS. SQL Server usa conexão criptografada e aceita o certificado apresentado pelo servidor.

## Problemas de compilação no Windows

Se o Cargo informar apenas `process didn't exit successfully` em uma dependência aleatória, feche outras compilações do projeto e execute novamente:

```powershell
cargo check --manifest-path src-tauri\Cargo.toml
```

As compilações do projeto já são serializadas para impedir que o OneDrive ou o antivírus bloqueiem arquivos intermediários usados por vários processos `rustc` simultaneamente.
