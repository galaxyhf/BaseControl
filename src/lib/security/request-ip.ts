import { isIP } from "node:net";
export const requestIp = (request: Request) => {
  // Habilitar apenas quando o proxy remove e reescreve headers de origem.
  if (process.env.BASECONTROL_TRUST_PROXY !== "true") return null;
  const value = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return value && isIP(value) ? value : null;
};
