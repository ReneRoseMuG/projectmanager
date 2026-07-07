import { CALENDAR_SYNC_MIN_INTERVAL_MS, type UpdateCalendarSyncConfigRequest } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { requireCurrentUser } from "../plugins/auth.js";
import { getCalendarSyncConfigView, updateCalendarSyncConfig } from "../services/calendar-config.service.js";
import { applyCalendarSchedulerState } from "../services/calendar-scheduler.service.js";
import { objectResponseSchema } from "../utils/route-schemas.js";

// Secret optional: weglassen = unverändert, "" = entfernen, nicht-leer = neu setzen (im Service verschlüsselt).
const updateBodySchema = {
  type: "object",
  required: ["googleClientId", "googleRedirectUri", "syncEnabled", "syncIntervalMs", "googlePushWebhookUrl", "expectedVersion"],
  additionalProperties: false,
  properties: {
    googleClientId: { type: "string" },
    googleClientSecret: { type: "string" },
    googleRedirectUri: { type: "string" },
    syncEnabled: { type: "boolean" },
    syncIntervalMs: { type: "integer", minimum: CALENDAR_SYNC_MIN_INTERVAL_MS },
    googlePushWebhookUrl: { type: "string" },
    expectedVersion: { type: "integer", minimum: 0 }
  }
} as const;

/**
 * Admin-Konfiguration der Kalender-Synchronisation (MS-79). Der globale Auth-Guard erzwingt über den
 * config.auth-Override die Rolle: Lesen mit settings:read, Schreiben mit settings:admin. Das Client-Secret
 * wird nur maskiert ausgeliefert; der Klartext verlässt den Server nie.
 */
export async function registerCalendarSettingsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/calendar-settings",
    { config: { auth: { resource: "settings", action: "read" } }, schema: { response: { 200: objectResponseSchema } } },
    async (request) => {
      await requireCurrentUser(request);
      return getCalendarSyncConfigView(app.db);
    }
  );

  app.put<{ Body: UpdateCalendarSyncConfigRequest }>(
    "/calendar-settings",
    { config: { auth: { resource: "settings", action: "admin" } }, schema: { body: updateBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      const currentUser = await requireCurrentUser(request);
      const view = await updateCalendarSyncConfig(app.db, currentUser, request.body);
      // Scheduler an die neue Konfiguration angleichen (an/aus, Intervall) — ohne Serverneustart.
      await applyCalendarSchedulerState(app.db);
      return view;
    }
  );
}
