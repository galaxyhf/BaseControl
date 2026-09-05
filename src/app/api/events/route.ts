import { getUser } from "@/lib/security/auth";
import { listOperations } from "@/services/operation.service";
export const dynamic = "force-dynamic";
export const GET = async (request: Request) => {
  if (!(await getUser())) return Response.json({ error: "Não autorizado." }, { status: 401 });
  const encoder = new TextEncoder();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
  };
  const stream = new ReadableStream({
    start(controller) {
      const start = Date.now();
      let last = "";
      request.signal.addEventListener("abort", stop, { once: true });
      const tick = async () => {
        if (stopped) return;
        try {
          const data = JSON.stringify(await listOperations());
          if (stopped) return;
          if (data !== last) {
            controller.enqueue(encoder.encode(`event: operations\ndata: ${data}\n\n`));
            last = data;
          } else controller.enqueue(encoder.encode(": heartbeat\n\n"));
          // Reconexão periódica revalida a sessão e mantém compatibilidade com proxies.
          if (Date.now() - start > 55000) {
            stop();
            controller.close();
            return;
          }
          timer = setTimeout(tick, 2000);
        } catch {
          if (!stopped) {
            stop();
            controller.close();
          }
        }
      };
      void tick();
    },
    cancel: stop,
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
};
