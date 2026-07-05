import type { FastifyInstance, FastifyRequest } from "fastify";
import { deleteCalendarConnection, listCalendarConnections } from "../services/calendar-connection.service.js";
import { syncCalendarConnection } from "../services/calendar-sync.service.js";
import { connectNextCloud, type ConnectNextCloudInput } from "../services/nextcloud-connection.service.js";
import { buildGoogleAuthUrl, handleGoogleCallback } from "../services/google/google-oauth.service.js";
import { config } from "../config.js";
import { unauthorized } from "../utils/errors.js";
import { arrayResponseSchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

const nextCloudConnectSchema = {
  type: "object",
  required: ["displayName", "baseUrl", "username", "appPassword"],
  additionalProperties: false,
  properties: {
    displayName: { type: "string", minLength: 1 },
    baseUrl: { type: "string", minLength: 1 },
    username: { type: "string", minLength: 1 },
    appPassword: { type: "string", minLength: 1 }
  }
} as const;

/** Der globale Auth-Guard erzwingt bereits die Rolle (calendarConnections/read|write|delete);
 *  hier wird zusätzlich die Eigentümerschaft je Verbindung im Service geprüft. */
function requireUserId(request: FastifyRequest): number {
  const userId = request.currentUser?.id;
  if (!userId) {
    throw unauthorized("Authentication required");
  }
  return userId;
}

export async function registerCalendarConnectionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/calendar-connections", { schema: { response: { 200: arrayResponseSchema } } }, async (request) =>
    listCalendarConnections(app.db, requireUserId(request))
  );

  app.post<{ Body: ConnectNextCloudInput }>(
    "/calendar-connections/nextcloud",
    { schema: { body: nextCloudConnectSchema, response: { 201: objectResponseSchema } } },
    async (request, reply) => reply.status(201).send(await connectNextCloud(app.db, requireUserId(request), request.body))
  );

  app.get("/calendar-connections/google/auth-url", { schema: { response: { 200: objectResponseSchema } } }, async (request) => ({
    url: buildGoogleAuthUrl(requireUserId(request))
  }));

  // OAuth-Rücksprung von Google (offen, da vom Browser-Redirect aufgerufen — der signierte State schützt).
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>("/calendar-connections/google/callback", async (request, reply) => {
    const target = `${config.corsOrigin}/settings/calendar-connections`;
    const { code, state, error } = request.query;
    if (error || !code || !state) {
      return reply.redirect(`${target}?google=error`);
    }
    try {
      await handleGoogleCallback(app.db, code, state);
      return reply.redirect(`${target}?google=connected`);
    } catch {
      return reply.redirect(`${target}?google=error`);
    }
  });

  app.post<{ Params: { id: number } }>(
    "/calendar-connections/:id/sync",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => syncCalendarConnection(app.db, request.params.id, requireUserId(request))
  );

  app.delete<{ Params: { id: number } }>(
    "/calendar-connections/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (request, reply) => {
      await deleteCalendarConnection(app.db, request.params.id, requireUserId(request));
      return reply.status(204).send();
    }
  );
}
