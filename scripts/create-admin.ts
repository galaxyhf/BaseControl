import { config } from "dotenv";
import { createInterface } from "node:readline/promises";
import { hashPassword } from "../src/lib/security/passwords";
import { db, getPool } from "../src/db";
import { users } from "../src/db/schema";
import { z } from "zod";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
const main = async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const email = z
      .email()
      .parse((await rl.question("Email do administrador: ")).trim().toLowerCase());
    const name = z
      .string()
      .min(1)
      .max(80)
      .parse((await rl.question("Nome: ")).trim());
    rl.close();
    if (!process.stdin.isTTY) throw new Error("Use um terminal interativo.");
    process.stdout.write("Senha (mínimo 9 caracteres, entrada oculta): ");
    const password = await new Promise<string>((resolve, reject) => {
      let value = "";
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      const read = (chunk: string) => {
        if (chunk === "\u0003" || /[\r\n]/.test(chunk)) {
          process.stdin.off("data", read);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          if (chunk === "\u0003") reject(new Error("Cancelado"));
          else resolve(value);
        } else if (chunk === "\u007f" || chunk === "\b") value = value.slice(0, -1);
        else value += chunk;
      };
      process.stdin.on("data", read);
    });
    z.string().min(9).max(256).parse(password);
    await db()
      .insert(users)
      .values({ email, name, passwordHash: await hashPassword(password) });
    console.log("Administrador criado.");
  } finally {
    rl.close();
    if (process.env.DATABASE_URL) await getPool().end();
  }
};
main().catch(() => {
  console.error(
    "Não foi possível criar o administrador. Verifique os campos, migrations e se o email já existe.",
  );
  process.exitCode = 1;
});
