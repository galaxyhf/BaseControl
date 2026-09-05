import { AppError } from "@/lib/security/errors";

export const externalTlsEnabled = () => {
  const value = process.env.BASECONTROL_EXTERNAL_TLS ?? "true";
  if (value !== "true" && value !== "false")
    throw new AppError("BASECONTROL_EXTERNAL_TLS deve ser true ou false.", 503);
  return value === "true";
};
