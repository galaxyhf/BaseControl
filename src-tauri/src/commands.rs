use std::collections::HashSet;

use tiberius::{AuthMethod, Client as SqlClient, Config as SqlConfig, EncryptionLevel};
use tokio::net::TcpStream;
use tokio_postgres::{Client as PostgresClient, Config as PostgresConfig, NoTls};
use tokio_util::compat::{Compat, TokioAsyncWriteCompatExt};

use crate::models::{ConnectionConfig, DatabaseEngine, DatabaseInfo, DropResult};

type SqlServerClient = SqlClient<Compat<TcpStream>>;

#[tauri::command]
pub async fn list_databases(config: ConnectionConfig) -> Result<Vec<DatabaseInfo>, String> {
    validate_config(&config)?;

    match config.engine {
        DatabaseEngine::Postgres => list_postgres_databases(&config).await,
        DatabaseEngine::Sqlserver => list_sql_server_databases(&config).await,
    }
}

#[tauri::command]
pub async fn drop_databases(
    config: ConnectionConfig,
    names: Vec<String>,
) -> Result<Vec<DropResult>, String> {
    validate_config(&config)?;
    if names.is_empty() {
        return Err("Selecione ao menos uma base.".into());
    }

    match config.engine {
        DatabaseEngine::Postgres => drop_postgres_databases(&config, names).await,
        DatabaseEngine::Sqlserver => drop_sql_server_databases(&config, names).await,
    }
}

fn validate_config(config: &ConnectionConfig) -> Result<(), String> {
    if config.host.trim().is_empty() || config.username.trim().is_empty() {
        return Err("Host e usuário são obrigatórios.".into());
    }
    if config.password.is_empty() {
        return Err("A senha é obrigatória.".into());
    }
    Ok(())
}

async fn connect_postgres(config: &ConnectionConfig) -> Result<PostgresClient, String> {
    let mut postgres = PostgresConfig::new();
    postgres
        .host(config.host.trim())
        .port(config.port)
        .user(config.username.trim())
        .password(&config.password)
        .dbname("postgres");

    let (client, connection) = postgres
        .connect(NoTls)
        .await
        .map_err(|error| format!("Não foi possível conectar ao PostgreSQL: {error}"))?;
    tokio::spawn(async move {
        let _ = connection.await;
    });
    Ok(client)
}

async fn list_postgres_databases(config: &ConnectionConfig) -> Result<Vec<DatabaseInfo>, String> {
    let client = connect_postgres(config).await?;
    let rows = client
        .query(
            "SELECT datname, pg_database_size(datname) FROM pg_database WHERE datallowconn AND NOT datistemplate AND datname <> 'postgres' ORDER BY datname",
            &[],
        )
        .await
        .map_err(|error| format!("Falha ao listar bases PostgreSQL: {error}"))?;

    Ok(rows
        .into_iter()
        .map(|row| DatabaseInfo {
            name: row.get(0),
            size_bytes: row.get(1),
        })
        .collect())
}

async fn drop_postgres_databases(
    config: &ConnectionConfig,
    names: Vec<String>,
) -> Result<Vec<DropResult>, String> {
    let client = connect_postgres(config).await?;
    let available = postgres_deletable_names(&client).await?;
    let mut results = Vec::with_capacity(names.len());

    for name in names {
        if !available.contains(&name) {
            results.push(rejected_result(name));
            continue;
        }

        let statement = format!(
            "DROP DATABASE \"{}\" WITH (FORCE)",
            name.replace('"', "\"\"")
        );
        match client.execute(&statement, &[]).await {
            Ok(_) => results.push(success_result(name)),
            Err(error) => results.push(failed_result(name, error.to_string())),
        }
    }
    Ok(results)
}

async fn postgres_deletable_names(client: &PostgresClient) -> Result<HashSet<String>, String> {
    let rows = client
        .query("SELECT datname FROM pg_database WHERE datallowconn AND NOT datistemplate AND datname <> 'postgres'", &[])
        .await
        .map_err(|error| format!("Falha ao validar as bases: {error}"))?;
    Ok(rows.into_iter().map(|row| row.get(0)).collect())
}

fn sql_server_config(config: &ConnectionConfig) -> SqlConfig {
    let mut sql = SqlConfig::new();
    sql.host(config.host.trim());
    sql.port(config.port);
    sql.database("master");
    sql.authentication(AuthMethod::sql_server(
        config.username.trim(),
        &config.password,
    ));
    sql.encryption(EncryptionLevel::Required);
    sql.trust_cert();
    sql
}

async fn connect_sql_server(config: &ConnectionConfig) -> Result<SqlServerClient, String> {
    let sql = sql_server_config(config);
    let tcp = TcpStream::connect(sql.get_addr())
        .await
        .map_err(|error| format!("Não foi possível acessar o SQL Server: {error}"))?;
    tcp.set_nodelay(true)
        .map_err(|error| format!("Falha ao configurar a conexão: {error}"))?;
    SqlClient::connect(sql, tcp.compat_write())
        .await
        .map_err(|error| format!("Não foi possível conectar ao SQL Server: {error}"))
}

async fn list_sql_server_databases(config: &ConnectionConfig) -> Result<Vec<DatabaseInfo>, String> {
    let mut client = connect_sql_server(config).await?;
    query_sql_server_databases(&mut client).await
}

async fn query_sql_server_databases(
    client: &mut SqlServerClient,
) -> Result<Vec<DatabaseInfo>, String> {
    let rows = client
        .query("SELECT databases.name, CAST(SUM(CAST(master_files.size AS bigint)) * 8192 AS bigint) FROM sys.databases AS databases INNER JOIN sys.master_files AS master_files ON databases.database_id = master_files.database_id WHERE databases.state = 0 AND databases.database_id > 4 GROUP BY databases.name ORDER BY databases.name", &[])
        .await
        .map_err(|error| format!("Falha ao listar bases SQL Server: {error}"))?
        .into_first_result()
        .await
        .map_err(|error| format!("Falha ao ler as bases SQL Server: {error}"))?;

    rows.into_iter()
        .map(|row| {
            let name = row
                .get::<&str, _>(0)
                .ok_or_else(|| "O servidor retornou uma base sem nome.".to_string())?;
            let size_bytes = row
                .get::<i64, _>(1)
                .ok_or_else(|| format!("O servidor não retornou o tamanho da base {name}."))?;
            Ok(DatabaseInfo {
                name: name.to_string(),
                size_bytes,
            })
        })
        .collect()
}

async fn drop_sql_server_databases(
    config: &ConnectionConfig,
    names: Vec<String>,
) -> Result<Vec<DropResult>, String> {
    let mut client = connect_sql_server(config).await?;
    let available: HashSet<String> = query_sql_server_databases(&mut client)
        .await?
        .into_iter()
        .map(|database| database.name)
        .collect();
    let mut results = Vec::with_capacity(names.len());

    for name in names {
        if !available.contains(&name) {
            results.push(rejected_result(name));
            continue;
        }

        let escaped = name.replace(']', "]]");
        let statement = format!(
            "ALTER DATABASE [{escaped}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{escaped}];"
        );
        match client.execute(statement, &[]).await {
            Ok(_) => results.push(success_result(name)),
            Err(error) => results.push(failed_result(name, error.to_string())),
        }
    }
    Ok(results)
}

fn success_result(name: String) -> DropResult {
    DropResult {
        name,
        success: true,
        message: "Base excluída.".into(),
    }
}

fn failed_result(name: String, message: String) -> DropResult {
    DropResult {
        name,
        success: false,
        message,
    }
}

fn rejected_result(name: String) -> DropResult {
    failed_result(name, "Base inexistente ou protegida pelo sistema.".into())
}
