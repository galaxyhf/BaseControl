use std::{collections::HashSet, error::Error as StdError, io::ErrorKind, time::Duration};

use tiberius::{
    AuthMethod, Client as SqlClient, Config as SqlConfig, EncryptionLevel,
    error::Error as SqlServerError,
};
use tokio::net::TcpStream;
use tokio::time::timeout;
use tokio_postgres::{
    Client as PostgresClient, Config as PostgresConfig, Error as PostgresError, NoTls,
    error::SqlState,
};
use tokio_util::compat::{Compat, TokioAsyncWriteCompatExt};

use crate::models::{ConnectionConfig, DatabaseEngine, DatabaseInfo, DropResult};

type SqlServerClient = SqlClient<Compat<TcpStream>>;

const CONNECTION_TIMEOUT: Duration = Duration::from_secs(10);

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
    if config.host.trim().is_empty() {
        return Err("Informe o endereço do servidor.".into());
    }
    if config.username.trim().is_empty() {
        return Err("Informe o usuário do banco de dados.".into());
    }
    if config.password.is_empty() {
        return Err("Informe a senha do banco de dados.".into());
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

    let (client, connection) = timeout(CONNECTION_TIMEOUT, postgres.connect(NoTls))
        .await
        .map_err(|_| connection_timeout_message("PostgreSQL"))?
        .map_err(postgres_connection_error)?;
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
        .map_err(|error| postgres_query_error(&error, "listar as bases"))?;

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
            Err(error) => results.push(failed_result(
                name,
                postgres_query_error(&error, "excluir a base"),
            )),
        }
    }
    Ok(results)
}

async fn postgres_deletable_names(client: &PostgresClient) -> Result<HashSet<String>, String> {
    let rows = client
        .query("SELECT datname FROM pg_database WHERE datallowconn AND NOT datistemplate AND datname <> 'postgres'", &[])
        .await
        .map_err(|error| postgres_query_error(&error, "validar as bases"))?;
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
    let tcp = timeout(CONNECTION_TIMEOUT, TcpStream::connect(sql.get_addr()))
        .await
        .map_err(|_| connection_timeout_message("SQL Server"))?
        .map_err(|error| io_connection_error("SQL Server", &error))?;
    tcp.set_nodelay(true)
        .map_err(|_| "Não foi possível preparar a conexão com o SQL Server.".to_string())?;
    timeout(
        CONNECTION_TIMEOUT,
        SqlClient::connect(sql, tcp.compat_write()),
    )
    .await
    .map_err(|_| connection_timeout_message("SQL Server"))?
    .map_err(sql_server_connection_error)
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
        .map_err(|error| sql_server_query_error(&error, "listar as bases"))?
        .into_first_result()
        .await
        .map_err(|error| sql_server_query_error(&error, "ler as bases"))?;

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
            Err(error) => results.push(failed_result(
                name,
                sql_server_query_error(&error, "excluir a base"),
            )),
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

fn postgres_connection_error(error: PostgresError) -> String {
    match error.code() {
        Some(code)
            if code == &SqlState::INVALID_PASSWORD
                || code == &SqlState::INVALID_AUTHORIZATION_SPECIFICATION =>
        {
            credentials_error_message("PostgreSQL")
        }
        Some(code) if code == &SqlState::TOO_MANY_CONNECTIONS => {
            "O PostgreSQL atingiu o limite de conexões. Aguarde e tente novamente.".into()
        }
        Some(code) if code == &SqlState::CANNOT_CONNECT_NOW => {
            "O PostgreSQL está temporariamente indisponível. Aguarde e tente novamente.".into()
        }
        _ => {
            if let Some(io_error) = find_io_error(&error) {
                return io_connection_error("PostgreSQL", io_error);
            }
            classify_connection_error("PostgreSQL", &error_chain(&error))
        }
    }
}

fn sql_server_connection_error(error: SqlServerError) -> String {
    match error.code() {
        Some(18456 | 18452) => credentials_error_message("SQL Server"),
        Some(4060) => "O usuário não tem acesso ao banco de sistema do SQL Server.".into(),
        Some(10928 | 10929) => {
            "O SQL Server atingiu o limite de conexões. Aguarde e tente novamente.".into()
        }
        _ => match &error {
            SqlServerError::Io { kind, message } => {
                classify_io_error("SQL Server", *kind, message)
            }
            SqlServerError::Tls(_) => "Não foi possível estabelecer uma conexão segura com o SQL Server. Verifique a configuração de criptografia do servidor.".into(),
            _ => classify_connection_error("SQL Server", &error.to_string()),
        },
    }
}

fn io_connection_error(database: &str, error: &std::io::Error) -> String {
    classify_io_error(database, error.kind(), &error.to_string())
}

fn classify_io_error(database: &str, kind: ErrorKind, details: &str) -> String {
    match kind {
        ErrorKind::ConnectionRefused => connection_refused_message(database),
        ErrorKind::TimedOut => connection_timeout_message(database),
        ErrorKind::NotFound | ErrorKind::AddrNotAvailable => server_not_found_message(),
        _ => classify_connection_error(database, details),
    }
}

fn classify_connection_error(database: &str, details: &str) -> String {
    let details = details.to_ascii_lowercase();

    if contains_any(
        &details,
        &[
            "no such host",
            "failed to lookup",
            "name or service not known",
            "nodename nor servname",
            "11001",
        ],
    ) {
        return server_not_found_message();
    }
    if contains_any(
        &details,
        &["connection refused", "actively refused", "10061"],
    ) {
        return connection_refused_message(database);
    }
    if contains_any(&details, &["timed out", "timeout", "10060"]) {
        return connection_timeout_message(database);
    }
    if contains_any(
        &details,
        &[
            "network is unreachable",
            "network unreachable",
            "host unreachable",
            "10051",
            "10065",
        ],
    ) {
        return "Não foi possível alcançar o servidor. Verifique sua rede, VPN e firewall.".into();
    }
    if contains_any(
        &details,
        &["password authentication failed", "login failed"],
    ) {
        return credentials_error_message(database);
    }
    if contains_any(&details, &["certificate", "tls", "ssl", "handshake"]) {
        return format!(
            "Não foi possível estabelecer uma conexão segura com o {database}. Verifique a configuração de criptografia do servidor."
        );
    }

    format!("Não foi possível conectar ao {database}. Confira servidor, porta, usuário e senha.")
}

fn postgres_query_error(error: &PostgresError, action: &str) -> String {
    match error.code() {
        Some(code) if code == &SqlState::INSUFFICIENT_PRIVILEGE => {
            format!("O usuário conectado não tem permissão para {action}.")
        }
        Some(code) if code == &SqlState::UNDEFINED_DATABASE => {
            "A base informada não existe mais.".into()
        }
        _ => format!(
            "Não foi possível {action} no PostgreSQL. Verifique as permissões e tente novamente."
        ),
    }
}

fn sql_server_query_error(error: &SqlServerError, action: &str) -> String {
    match error.code() {
        Some(229 | 230 | 262) => {
            format!("O usuário conectado não tem permissão para {action}.")
        }
        Some(3701) => "A base informada não existe mais.".into(),
        Some(3702) => "A base está em uso e não pôde ser excluída.".into(),
        Some(1205) => "A operação encontrou um bloqueio no servidor. Tente novamente.".into(),
        _ => format!(
            "Não foi possível {action} no SQL Server. Verifique as permissões e tente novamente."
        ),
    }
}

fn contains_any(details: &str, values: &[&str]) -> bool {
    values.iter().any(|value| details.contains(value))
}

fn find_io_error<'a>(error: &'a (dyn StdError + 'static)) -> Option<&'a std::io::Error> {
    let mut source = error.source();
    while let Some(current) = source {
        if let Some(io_error) = current.downcast_ref::<std::io::Error>() {
            return Some(io_error);
        }
        source = current.source();
    }
    None
}

fn error_chain(error: &(dyn StdError + 'static)) -> String {
    let mut details = error.to_string();
    let mut source = error.source();
    while let Some(current) = source {
        details.push(' ');
        details.push_str(&current.to_string());
        source = current.source();
    }
    details
}

fn credentials_error_message(database: &str) -> String {
    format!(
        "Usuário ou senha incorretos para o {database}. Confira as credenciais e tente novamente."
    )
}

fn server_not_found_message() -> String {
    "Servidor não encontrado. Confira o endereço informado.".into()
}

fn connection_refused_message(database: &str) -> String {
    format!(
        "O {database} recusou a conexão. Confira a porta e se o serviço do banco está em execução."
    )
}

fn connection_timeout_message(database: &str) -> String {
    format!("O {database} não respondeu a tempo. Confira o endereço, a porta, a rede e o firewall.")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_unknown_host() {
        assert_eq!(
            classify_connection_error("PostgreSQL", "No such host is known (os error 11001)"),
            "Servidor não encontrado. Confira o endereço informado."
        );
    }

    #[test]
    fn classifies_refused_connection() {
        assert_eq!(
            classify_connection_error("SQL Server", "connection actively refused (os error 10061)"),
            "O SQL Server recusou a conexão. Confira a porta e se o serviço do banco está em execução."
        );
    }

    #[test]
    fn classifies_login_failure_without_leaking_details() {
        assert_eq!(
            classify_connection_error("SQL Server", "login failed for user 'admin'"),
            "Usuário ou senha incorretos para o SQL Server. Confira as credenciais e tente novamente."
        );
    }
}
