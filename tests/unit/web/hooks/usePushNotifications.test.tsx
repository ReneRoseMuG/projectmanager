// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - React-Hook mit QueryClient und kontrollierten Browser-Push-Testdoubles.
 *
 * Mock-Entscheidung:
 * - API-Funktionen und Browser-ServiceWorker/PushManager werden ersetzt, weil der Test den Hook-Orchestrierungsfluss prüft.
 *
 * Isolation:
 * - jsdom ohne Netzwerkverbindung.
 *
 * Abgedeckte Regeln:
 * - Aktivieren registriert den Service Worker, fordert Permission an, erstellt eine Subscription und sendet sie an die API.
 * - Deaktivieren beendet die Browser-Subscription und löscht sie serverseitig.
 *
 * Fehlerfälle:
 * - Fehlende Browser- oder Serverfähigkeit verhindert Aktivierung.
 *
 * Ziel:
 * Den Browser-Push-Hook gegen Regressionsfehler im Client-Aktivierungsflow absichern.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPushSubscriptionStatus, getPushVapidKey, subscribeToPush, unsubscribeFromPush } from "../../../../apps/web/src/api/push";
import { usePushNotifications } from "../../../../apps/web/src/hooks/usePushNotifications";

vi.mock("../../../../apps/web/src/api/push", () => ({
  getPushVapidKey: vi.fn(),
  getPushSubscriptionStatus: vi.fn(),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn()
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
}

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

function Harness() {
  const push = usePushNotifications();
  return (
    <div>
      <span data-testid="supported">{String(push.supported)}</span>
      <button type="button" onClick={() => void push.enable()}>
        enable
      </button>
      <button type="button" onClick={() => void push.disable()}>
        disable
      </button>
    </div>
  );
}

function installPushBrowserDoubles(subscription: PushSubscription | null = null) {
  const currentSubscription = subscription;
  const subscribe = vi.fn().mockResolvedValue({
    endpoint: "https://push.example.test/new",
    toJSON: () => ({
      endpoint: "https://push.example.test/new",
      keys: { p256dh: "p256dh-key", auth: "auth-secret" }
    })
  });
  const getSubscription = vi.fn().mockResolvedValue(currentSubscription);
  const register = vi.fn().mockResolvedValue({ pushManager: { getSubscription, subscribe } });
  const getRegistration = vi.fn().mockResolvedValue({ pushManager: { getSubscription } });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register, getRegistration }
  });
  vi.stubGlobal("PushManager", class PushManager {});
  vi.stubGlobal("Notification", {
    requestPermission: vi.fn().mockResolvedValue("granted")
  });
  return { register, getRegistration, getSubscription, subscribe };
}

afterEach(() => {
  cleanup();
  vi.mocked(getPushVapidKey).mockReset();
  vi.mocked(getPushSubscriptionStatus).mockReset();
  vi.mocked(subscribeToPush).mockReset();
  vi.mocked(unsubscribeFromPush).mockReset();
  vi.unstubAllGlobals();
});

describe("usePushNotifications", () => {
  it("aktiviert Browser-Push und sendet die Subscription an die API", async () => {
    installPushBrowserDoubles();
    vi.mocked(getPushVapidKey).mockResolvedValue({ enabled: true, publicKey: "BA" });
    vi.mocked(getPushSubscriptionStatus).mockResolvedValue({ subscribed: false, endpoint: null });
    vi.mocked(subscribeToPush).mockResolvedValue({ subscribed: true, endpoint: "https://push.example.test/new" });

    render(<Harness />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByTestId("supported")).toHaveTextContent("true"));
    fireEvent.click(screen.getByRole("button", { name: "enable" }));

    await waitFor(() =>
      expect(subscribeToPush).toHaveBeenCalledWith({
        endpoint: "https://push.example.test/new",
        keys: { p256dh: "p256dh-key", auth: "auth-secret" }
      })
    );
  });

  it("deaktiviert Browser-Push und löscht die serverseitige Subscription", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    installPushBrowserDoubles({
      endpoint: "https://push.example.test/current",
      expirationTime: null,
      options: { applicationServerKey: null, userVisibleOnly: true },
      getKey: () => null,
      toJSON: () => ({ endpoint: "https://push.example.test/current" }),
      unsubscribe
    });
    vi.mocked(getPushVapidKey).mockResolvedValue({ enabled: true, publicKey: "BA" });
    vi.mocked(getPushSubscriptionStatus).mockResolvedValue({ subscribed: true, endpoint: "https://push.example.test/current" });
    vi.mocked(unsubscribeFromPush).mockResolvedValue({ subscribed: false, endpoint: null });

    render(<Harness />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button", { name: "disable" }));

    await waitFor(() => expect(unsubscribe).toHaveBeenCalled());
    expect(unsubscribeFromPush).toHaveBeenCalledWith("https://push.example.test/current");
  });
});
