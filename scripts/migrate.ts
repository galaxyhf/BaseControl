import { config } from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { normalizeInternalConnectionString } from "../src/lib/database/connection-string";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
const main = async () => {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Configure DATABASE_URL_UNPOOLED no .env.local.");
  const pool = new Pool({
    connectionString: normalizeInternalConnectionString(connectionString),
    max: 1,
  });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "src/db/migrations" });
    console.log("Migrations aplicadas.");
  } finally {
    await pool.end();
  }
};
main().catch(() => {
  console.error(
    "Não foi possível aplicar migrations. Verifique URL, conectividade e permissões do Neon.",
  );
  process.exitCode = 1;
});
