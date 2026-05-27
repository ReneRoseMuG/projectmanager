import type { PushSubscriptionInput } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { getPushSubscriptionStatus, getPushVapidKey, subscribeToPush, unsubscribeFromPush } from "../api/push";
import { invalidatePushNotifications } from "../queries/invalidation";
import { queryKeys } from "../queries/queryKeys";
import { toQueryError } from "../queries/queryErrors";

function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToArrayBuffer(value: string): ArrayBuffer {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }
  return buffer;
}

function toInput(subscription: PushSubscription): PushSubscriptionInput {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error("Push subscription is incomplete");
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh, auth }
  };
}

export function usePushNotifications() {
  const queryClient = useQueryClient();
  const supported = useMemo(() => isPushSupported(), []);

  const vapidQuery = useQuery({
    queryKey: queryKeys.pushNotifications.vapidKey(),
    queryFn: getPushVapidKey,
    enabled: supported,
    retry: false
  });

  const statusQuery = useQuery({
    queryKey: queryKeys.pushNotifications.status(),
    queryFn: getPushSubscriptionStatus,
    enabled: supported,
    retry: false
  });

  const enableMutation = useMutation({
    mutationFn: async () => {
      if (!supported) {
        throw new Error("Desktop-Benachrichtigungen werden von diesem Browser nicht unterstützt.");
      }
      const vapid = vapidQuery.data ?? (await getPushVapidKey());
      if (!vapid.enabled || !vapid.publicKey) {
        throw new Error("Desktop-Benachrichtigungen sind serverseitig nicht aktiviert.");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Desktop-Benachrichtigungen wurden nicht erlaubt.");
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(vapid.publicKey)
        }));
      return subscribeToPush(toInput(subscription));
    },
    onSuccess: async (status) => {
      queryClient.setQueryData(queryKeys.pushNotifications.status(), status);
      await invalidatePushNotifications(queryClient);
    }
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      if (!supported) {
        throw new Error("Desktop-Benachrichtigungen werden von diesem Browser nicht unterstützt.");
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      const endpoint = subscription?.endpoint ?? statusQuery.data?.endpoint;
      if (subscription) {
        await subscription.unsubscribe();
      }
      if (!endpoint) {
        return getPushSubscriptionStatus();
      }
      return unsubscribeFromPush(endpoint);
    },
    onSuccess: async (status) => {
      queryClient.setQueryData(queryKeys.pushNotifications.status(), status);
      await invalidatePushNotifications(queryClient);
    }
  });

  return {
    supported,
    serverEnabled: Boolean(vapidQuery.data?.enabled),
    subscribed: Boolean(statusQuery.data?.subscribed),
    loading: vapidQuery.isLoading || statusQuery.isLoading,
    saving: enableMutation.isPending || disableMutation.isPending,
    error: toQueryError(vapidQuery.error) ?? toQueryError(statusQuery.error),
    enable: enableMutation.mutateAsync,
    disable: disableMutation.mutateAsync
  };
}
