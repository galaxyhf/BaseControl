import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${((await derive(password, salt, 64)) as Buffer).toString("hex")}`;
};
export const verifyPassword = async (password: string, hash: string) => {
  const [salt, stored] = hash.split(":");
  const actual = (await derive(password, salt, 64)) as Buffer;
  const expected = Buffer.from(stored, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
