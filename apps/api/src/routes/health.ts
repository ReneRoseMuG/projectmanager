import type { FastifyInstance } from "fastify";

const healthResponseSchema = {
  type: "object",
  required: ["status", "uptime"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["ok"] },
    uptime: { type: "number" }
  }
} as const;

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", { schema: { response: { 200: healthResponseSchema } } }, async () => ({
    status: "ok" as const,
    uptime: process.uptime()
  }));
}
