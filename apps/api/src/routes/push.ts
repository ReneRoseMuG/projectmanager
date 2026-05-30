import type { PushSubscriptionInput } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { requireCurrentUser } from "../plugins/auth.js";
import { getPushSubscriptionStatus, getPushVapidKey, subscribeToPushNotifications, unsubscribeFromPushNotifications } from "../services/push-notification.service.js";
import { objectResponseSchema } from "../utils/route-schemas.js";

const pushSubscriptionBodySchema = {
  type: "object",
  required: ["endpoint", "keys"],
  additionalProperties: false,
  properties: {
    endpoint: { type: "string", minLength: 1 },
    keys: {
      type: "object",
      required: ["p256dh", "auth"],
      additionalProperties: false,
      properties: {
        p256dh: { type: "string", minLength: 1 },
        auth: { type: "string", minLength: 1 }
      }
    }
  }
} as const;

const pushUnsubscribeBodySchema = {
  type: "object",
  required: ["endpoint"],
  additionalProperties: false,
  properties: {
    endpoint: { type: "string", minLength: 1 }
  }
} as const;

export async function registerPushRoutes(app: FastifyInstance): Promise<void> {
  app.get("/push/vapid-key", { schema: { response: { 200: objectResponseSchema } } }, async () => getPushVapidKey(config));

  app.get("/push/subscription", { schema: { response: { 200: objectResponseSchema } } }, async (request) => {
    const currentUser = await requireCurrentUser(request);
    return getPushSubscriptionStatus(app.db, currentUser.id);
  });

  app.post<{ Body: PushSubscriptionInput }>(
    "/push/subscribe",
    { schema: { body: pushSubscriptionBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      const currentUser = await requireCurrentUser(request);
      return subscribeToPushNotifications(app.db, currentUser.id, request.body);
    }
  );

  app.delete<{ Body: { endpoint: string } }>(
    "/push/subscribe",
    { schema: { body: pushUnsubscribeBodySchema, response: { 200: objectResponseSchema } } },
    async (request) => {
      const currentUser = await requireCurrentUser(request);
      return unsubscribeFromPushNotifications(app.db, currentUser.id, request.body.endpoint);
    }
  );
}
