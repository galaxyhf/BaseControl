export const register = async () => {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.BASECONTROL_WORKER !== "external") {
    const { startWorker } = await import("@/services/worker");
    startWorker();
  }
};
