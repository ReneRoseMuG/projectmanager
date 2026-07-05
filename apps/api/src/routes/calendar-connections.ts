import type { FastifyInstance, FastifyRequest } from "fastify";
import { deleteCalendarConnection, listCalendarConnections, requireOwnedConnection } from "../services/calendar-connection.service.js";
import { listCalendarJournal } from "../services/calendar-journal.service.js";
import { listGoogleCalendars, selectGoogleCalendar } from "../services/google/google-calendar.service.js";
import { syncAllUserConnections, syncCalendarConnection } from "../services/calendar-sync.service.js";
import { connectNextCloud, type ConnectNextCloudInput } from "../services/nextcloud-connection.service.js";
import { buildGoogleAuthUrl, handleGoogleCallback } from "../services/google/google-oauth.service.js";
import { handlePushNotification, stopGoogleWatch, watchGoogleCalendar } from "../services/google/google-push.service.js";
import { config } from "../config.js";
import { badRequest, unauthorized } from "../utils/errors.js";
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

const googleSelectSchema = {
  type: "object",
  required: ["calendarId"],
  additionalProperties: false,
  properties: { calendarId: { type: "string", minLength: 1 } }
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

  // Sync-Journal des Nutzers (AP-4.3): Anlage/Trennung, Sync, Fehler, Konflikte — neueste zuerst.
  app.get("/calendar-connections/journal", { schema: { response: { 200: arrayResponseSchema } } }, async (request) =>
    listCalendarJournal(app.db, requireUserId(request))
  );

  // Server-Konfigurationsstatus für die UI: ist Google einrichtbar, läuft der automatische Abgleich?
  app.get("/calendar-connections/config", { schema: { response: { 200: objectResponseSchema } } }, async (request) => {
    requireUserId(request);
    return { googleConfigured: Boolean(config.googleClientId && config.googleClientSecret), autoSyncEnabled: config.calendarSyncEnabled };
  });

  // Manueller Sammel-Abgleich aller eigenen Verbindungen.
  app.post("/calendar-connections/sync-all", { schema: { response: { 200: objectResponseSchema } } }, async (request) =>
    syncAllUserConnections(app.db, requireUserId(request))
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

  // Google Push-Benachrichtigung (offen, da von Google aufgerufen; der HMAC-Token in
  // X-Goog-Channel-Token schützt gegen Fälschung). Google erwartet stets 200 (sonst Retry-Sturm).
  app.post("/calendar-connections/google/notifications", async (request, reply) => {
    const channelId = request.headers["x-goog-channel-id"];
    const token = request.headers["x-goog-channel-token"];
    const resourceState = request.headers["x-goog-resource-state"];
    // "sync" ist der initiale Handshake nach der Registrierung — nur quittieren, nicht synchronisieren.
    if (resourceState !== "sync" && typeof channelId === "string" && typeof token === "string") {
      await handlePushNotification(app.db, channelId, token);
    }
    return reply.status(200).send();
  });

  app.get<{ Params: { id: number } }>(
    "/calendar-connections/:id/google/calendars",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (request) => {
      await requireOwnedConnection(app.db, request.params.id, requireUserId(request));
      return listGoogleCalendars(app.db, request.params.id);
    }
  );

  app.post<{ Params: { id: number }; Body: { calendarId: string } }>(
    "/calendar-connections/:id/google/select",
    { schema: { params: idParamSchema, body: googleSelectSchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      await requireOwnedConnection(app.db, request.params.id, requireUserId(request));
      const result = await selectGoogleCalendar(app.db, request.params.id, request.body.calendarId);
      // Push-Kanal automatisch aktivieren, sofern eine Webhook-URL konfiguriert ist (best-effort — ein
      // Fehler hier darf die Kalenderauswahl nicht scheitern lassen; Polling bleibt das Sicherheitsnetz).
      if (config.googlePushWebhookUrl) {
        try {
          await watchGoogleCalendar(app.db, request.params.id, config.googlePushWebhookUrl);
        } catch {
          app.log.warn(`Push-Kanal für Verbindung ${request.params.id} konnte nicht aktiviert werden.`);
        }
      }
      return result;
    }
  );

  // Google Push aktivieren (events.watch) — erfordert eine konfigurierte öffentliche Webhook-URL.
  app.post<{ Params: { id: number } }>(
    "/calendar-connections/:id/google/watch",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      await requireOwnedConnection(app.db, request.params.id, requireUserId(request));
      if (!config.googlePushWebhookUrl) {
        throw badRequest("Google Push ist nicht konfiguriert (GOOGLE_PUSH_WEBHOOK_URL fehlt).");
      }
      return watchGoogleCalendar(app.db, request.params.id, config.googlePushWebhookUrl);
    }
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
      const userId = requireUserId(request);
      const connection = await requireOwnedConnection(app.db, request.params.id, userId);
      // Google-Push-Kanal abmelden, bevor die Verbindung samt Kanaldaten entfernt wird (best-effort).
      if (connection.provider === "google" && config.googlePushWebhookUrl) {
        try {
          await stopGoogleWatch(app.db, request.params.id);
        } catch {
          app.log.warn(`Push-Kanal für Verbindung ${request.params.id} konnte nicht abgemeldet werden.`);
        }
      }
      await deleteCalendarConnection(app.db, request.params.id, userId);
      return reply.status(204).send();
    }
  );
}
