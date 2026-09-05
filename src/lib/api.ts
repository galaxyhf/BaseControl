import { ZodError } from "zod";
import { AppError, safeError } from "./security/errors";
export const api = async (action: () => Promise<unknown>) => {
  try {
    return Response.json(await action(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ZodError
            ? "Dados inválidos. Verifique os campos e tente novamente."
            : safeError(error),
      },
      { status: error instanceof ZodError ? 400 : error instanceof AppError ? error.status : 500 },
    );
  }
};
export const readBody = async (request: Request) => {
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("Corpo da requisição ausente.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 1048576) {
        await reader.cancel();
        throw new AppError("Requisição muito grande.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AppError("JSON inválido.");
  }
};
