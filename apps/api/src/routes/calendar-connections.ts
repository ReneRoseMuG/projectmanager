import type { FastifyInstance, FastifyRequest } from "fastify";
import { deleteCalendarConnection, listCalendarConnections } from "../services/calendar-connection.service.js";
import { syncCalendarConnection } from "../services/calendar-sync.service.js";
import { unauthorized } from "../utils/errors.js";
import { arrayResponseSchema, idParamSchema, objectResponseSchema } from "../utils/route-schemas.js";

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
