/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Realtime-Eventbus verteilt Events an aktive Subscriber.
 * - Unsubscribe entfernt Subscriber zuverlässig.
 *
 * Fehlerfälle:
 * - Abgemeldete Subscriber dürfen keine weiteren Events erhalten.
 *
 * Ziel:
 * Den app-internen Eventbus gegen Regressionsfehler bei Publish/Subscribe absichern.
 */

import { describe, expect, it, vi } from "vitest";
import { createRealtimeEventBus } from "../../../../apps/api/src/services/realtime-event-bus.service.js";

describe("Realtime event bus", () => {
  it("verteilt Events an Subscriber und entfernt sie nach unsubscribe", () => {
    const bus = createRealtimeEventBus();
    const subscriber = vi.fn();
    const unsubscribe = bus.subscribe(subscriber);

    expect(bus.subscriberCount()).toBe(1);

    bus.publish({
      type: "invalidate",
      scope: "projects",
      sourceTabId: "tab-a",
      occurredAt: "2026-05-23T10:00:00.000Z"
    });

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({ scope: "projects", sourceTabId: "tab-a" }));

    unsubscribe();
    expect(bus.subscriberCount()).toBe(0);

    bus.publish({
      type: "invalidate",
      scope: "tasks",
      sourceTabId: null,
      occurredAt: "2026-05-23T10:01:00.000Z"
    });

    expect(subscriber).toHaveBeenCalledTimes(1);
  });
});
