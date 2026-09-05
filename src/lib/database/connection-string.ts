import { AppError } from "@/lib/security/errors";

export const normalizeInternalConnectionString = (value: string) => {
  if (!value) return value;
  try {
    const url = new URL(value);
    const mode = url.searchParams.get("sslmode");
    // Mantém a validação completa que o pg já aplicava a esses modos.
    if (
      mode &&
      ["prefer", "require", "verify-ca"].includes(mode) &&
      url.searchParams.get("uselibpqcompat") !== "true"
    ) {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    throw new AppError(
      "A URL do banco interno é inválida. Verifique as variáveis de ambiente.",
      503,
    );
  }
};
