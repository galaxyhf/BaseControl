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
  const number =
    typeof error === "object" && error !== null && "number" in error ? Number(error.number) : 0;
  if ([229, 230, 262, 297, 15151, 15247].includes(number))
    return "O usuário não possui permissão para executar esta operação.";
  if (number === 3702) return "A database possui conexões ativas. Encerre-as antes de excluir.";
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (["28P01", "28000", "ELOGIN"].includes(code))
    return "Autenticação recusada. Verifique o usuário e a senha.";
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
