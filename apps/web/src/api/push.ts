import type { PushSubscriptionInput, PushSubscriptionStatus, PushVapidKeyResponse } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getPushVapidKey(): Promise<PushVapidKeyResponse> {
  return api.get("push/vapid-key").json<PushVapidKeyResponse>();
}

export async function getPushSubscriptionStatus(): Promise<PushSubscriptionStatus> {
  return api.get("push/subscription").json<PushSubscriptionStatus>();
}

export async function subscribeToPush(input: PushSubscriptionInput): Promise<PushSubscriptionStatus> {
  return api.post("push/subscribe", { json: input }).json<PushSubscriptionStatus>();
}

export async function unsubscribeFromPush(endpoint: string): Promise<PushSubscriptionStatus> {
  return api.delete("push/subscribe", { json: { endpoint } }).json<PushSubscriptionStatus>();
}
