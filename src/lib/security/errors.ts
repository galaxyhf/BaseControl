export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const safeError = (error: unknown): string => {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.cause instanceof Error && error.cause !== error)
    return safeError(error.cause);
  const message = error instanceof Error ? error.message : "";
  if (message.includes("The server does not support SSL connections"))
    return "O servidor não aceita SSL. Configure BASECONTROL_EXTERNAL_TLS=false no backend para conectar sem SSL.";
  const number =
    typeof error === "object" && error !== null && "number" in error ? Number(error.number) : 0;
  if ([229, 230, 262, 297, 15151, 15247].includes(number))
    return "O usuário não possui permissão para executar esta operação.";
  if (number === 3702) return "A database possui conexões ativas. Encerre-as antes de excluir.";
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (["28P01", "28000", "ELOGIN"].includes(code))
    return "Autenticação recusada. Verifique o usuário e a senha.";
  if (
    [
      "DEPTH_ZERO_SELF_SIGNED_CERT",
      "SELF_SIGNED_CERT_IN_CHAIN",
      "CERT_HAS_EXPIRED",
      "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
      "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
      "ERR_TLS_CERT_ALTNAME_INVALID",
    ].includes(code)
  )
    return "Não foi possível validar o certificado TLS do servidor. Verifique o certificado e a cadeia de confiança no backend.";
  if (code === "3D000")
    return "A database administrativa postgres não está disponível neste servidor.";
  if (["42703", "42P01"].includes(code))
    return "A estrutura do banco não corresponde ao código em execução. Verifique as migrations e reinicie a aplicação e o worker.";
  if (["42501", "EACCES"].includes(code))
    return "O usuário não possui permissão para executar esta operação.";
  if (["ECONNREFUSED", "ENOTFOUND", "EHOSTUNREACH", "ESOCKET"].includes(code))
    return "Servidor indisponível. Verifique host, porta, rede e firewall.";
  if (["ETIMEDOUT", "ETIMEOUT", "57014"].includes(code))
    return "O servidor excedeu o tempo limite. Verifique o estado antes de repetir a operação.";
  if (code === "55006") return "A database possui conexões ativas. Encerre-as antes de excluir.";
  if (code === "23505")
    return "Já existe um registro ou uma operação em andamento para este recurso.";
  return "Não foi possível concluir. Verifique a conexão, as permissões e a configuração do serviço.";
};
