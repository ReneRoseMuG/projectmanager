import type { FastifyInstance } from "fastify";
import type { RealtimeEvent } from "@taskmanager/shared-types";
import { config } from "../config.js";

const keepAliveIntervalMs = 25000;

function writeEvent(response: NodeJS.WritableStream, event: RealtimeEvent): void {
  response.write(`event: ${event.type}\n`);
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

export async function registerRealtimeRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/realtime/stream",
    {
      config: { auth: { resource: "realtime", action: "read" } }
    },
    async (request, reply) => {
      const origin = typeof request.headers.origin === "string" ? request.headers.origin : config.corsOrigin;
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": origin === config.corsOrigin ? origin : config.corsOrigin,
        "Access-Control-Allow-Credentials": "true",
        Vary: "Origin",
        "X-Accel-Buffering": "no"
      });
      reply.raw.write(": connected\n\n");

      const unsubscribe = app.realtimeBus.subscribe((event) => {
        writeEvent(reply.raw, event);
      });
      const keepAlive = setInterval(() => {
        reply.raw.write(": keepalive\n\n");
      }, keepAliveIntervalMs);

      const cleanup = () => {
        clearInterval(keepAlive);
        unsubscribe();
      };

      reply.raw.on("close", cleanup);
      reply.raw.on("error", cleanup);
    }
  );
}
