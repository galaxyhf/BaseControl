import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
const main = async () => {
  const { workerTick } = await import("../src/services/worker");
  console.log("Worker BaseControl iniciado.");
  while (true) {
    try {
      await workerTick();
    } catch {
      console.error("Fila indisponível; nova tentativa em 3 segundos.");
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
};
void main();
