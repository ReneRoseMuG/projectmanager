import type { BackupProgressEvent, BackupProgressOperation } from "@taskmanager/shared-types";
import { useSyncExternalStore } from "react";

type BackupProgressByOperation = Record<BackupProgressOperation, BackupProgressEvent | null>;

interface BackupProgressState {
  byOperation: BackupProgressByOperation;
  lastEvent: BackupProgressEvent | null;
  updatedAt: number | null;
}

const emptyByOperation: BackupProgressByOperation = {
  full_backup: null,
  import: null
};

let state: BackupProgressState = {
  byOperation: emptyByOperation,
  lastEvent: null,
  updatedAt: null
};

const subscribers = new Set<() => void>();

function emitChange(): void {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

function subscribe(subscriber: () => void): () => void {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

function getSnapshot(): BackupProgressState {
  return state;
}

export function publishBackupProgress(event: BackupProgressEvent): void {
  state = {
    byOperation: {
      ...state.byOperation,
      [event.operation]: event
    },
    lastEvent: event,
    updatedAt: Date.now()
  };
  emitChange();
}

export function clearBackupProgress(operation?: BackupProgressOperation): void {
  if (!operation) {
    state = {
      byOperation: emptyByOperation,
      lastEvent: null,
      updatedAt: null
    };
    emitChange();
    return;
  }

  const byOperation = {
    ...state.byOperation,
    [operation]: null
  };
  state = {
    byOperation,
    lastEvent: state.lastEvent?.operation === operation ? null : state.lastEvent,
    updatedAt: Date.now()
  };
  emitChange();
}

export function useBackupProgress(): BackupProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
