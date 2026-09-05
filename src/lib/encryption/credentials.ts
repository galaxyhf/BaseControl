import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { AppError } from "@/lib/security/errors";
const key = () => {
  const value = process.env.BASECONTROL_ENCRYPTION_KEY;
  if (!value || !/^[a-f\d]{64}$/i.test(value))
    throw new AppError("Configure BASECONTROL_ENCRYPTION_KEY com 32 bytes em hexadecimal.", 503);
  return Buffer.from(value, "hex");
};
export const encrypt = (password: string, context: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
};
export const decrypt = (value: string, context: string) => {
  const [version, iv, tag, ciphertext] = value.split(":");
  if (version !== "v1" || !iv || !tag || !ciphertext)
    throw new AppError("Credencial criptografada inválida.", 500);
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
};
