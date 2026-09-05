import { AppError } from "./errors";
export const assertAllowedHost = (host: string) => {
  const allowed = (process.env.BASECONTROL_ALLOWED_HOSTS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (
    (process.env.NODE_ENV === "production" || allowed.length > 0) &&
    !allowed.includes(host.toLowerCase())
  )
    throw new AppError(
      "Host não autorizado. Adicione-o à configuração BASECONTROL_ALLOWED_HOSTS.",
      403,
    );
  if (["169.254.169.254", "metadata.google.internal"].includes(host.toLowerCase()))
    throw new AppError("Este endereço não pode ser usado como servidor.", 403);
};
