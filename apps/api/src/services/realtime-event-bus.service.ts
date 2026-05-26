import type { RealtimeEvent } from "@taskmanager/shared-types";

export type RealtimeEventSubscriber = (event: RealtimeEvent) => void;

export interface RealtimeEventBus {
  publish(event: RealtimeEvent): void;
  subscribe(subscriber: RealtimeEventSubscriber): () => void;
  subscriberCount(): number;
}

export function createRealtimeEventBus(): RealtimeEventBus {
  const subscribers = new Set<RealtimeEventSubscriber>();

  return {
    publish(event) {
      for (const subscriber of subscribers) {
        subscriber(event);
      }
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => {
        subscribers.delete(subscriber);
      };
    },
    subscriberCount() {
      return subscribers.size;
    }
  };
}
