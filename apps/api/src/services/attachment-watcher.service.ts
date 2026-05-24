import fs from "node:fs";
import path from "node:path";
import type { DbClient } from "../db/client.js";
import { attachmentRepository } from "../repositories/attachment.repository.js";

const DEFAULT_WATCHER_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 1000;
const DEFAULT_SETTLE_DELAY_MS = 100;

interface ActiveWatcher {
  watcher: fs.FSWatcher;
  timer: NodeJS.Timeout;
  pollTimer: NodeJS.Timeout;
  settleTimer: NodeJS.Timeout | null;
}

const activeWatchers = new Map<number, ActiveWatcher>();
let watcherTimeoutMs = DEFAULT_WATCHER_TIMEOUT_MS;
let pollIntervalMs = DEFAULT_POLL_INTERVAL_MS;
let settleDelayMs = DEFAULT_SETTLE_DELAY_MS;

function stopWatcher(attachmentId: number): void {
  const entry = activeWatchers.get(attachmentId);
  if (!entry) {
    return;
  }
  entry.watcher.close();
  clearTimeout(entry.timer);
  clearInterval(entry.pollTimer);
  if (entry.settleTimer) {
    clearTimeout(entry.settleTimer);
  }
  activeWatchers.delete(attachmentId);
}

function finishWatcherAfterChange(attachmentId: number, onSettled: () => void): void {
  const entry = activeWatchers.get(attachmentId);
  if (!entry || entry.settleTimer) {
    return;
  }
  entry.watcher.close();
  clearTimeout(entry.timer);
  clearInterval(entry.pollTimer);
  entry.settleTimer = setTimeout(() => {
    activeWatchers.delete(attachmentId);
    onSettled();
  }, settleDelayMs);
}

function applyAttachmentFileChange(database: DbClient, attachmentId: number, diskPath: string, actorUserId: number | null): void {
  try {
    const stat = fs.statSync(diskPath);
    const record = attachmentRepository.findById(database, attachmentId);
    if (!record) {
      return;
    }
    attachmentRepository.updateSizeAndVersion(database, attachmentId, {
      size: stat.size,
      updatedBy: actorUserId
    });
  } catch {
    // The editor may delete or replace the file while the watcher fires. Opening must stay non-fatal.
  }
}

export function watchAttachmentForChanges(database: DbClient, attachmentId: number, diskPath: string, actorUserId?: number | null): void {
  stopWatcher(attachmentId);

  let lastStat: { size: number; mtimeMs: number };
  let watcher: fs.FSWatcher;
  try {
    const initialStat = fs.statSync(diskPath);
    lastStat = { size: initialStat.size, mtimeMs: initialStat.mtimeMs };
    const watchedFileName = path.basename(diskPath);
    watcher = fs.watch(path.dirname(diskPath), { persistent: false }, (_eventType, fileName) => {
      if (fileName && fileName.toString() !== watchedFileName) {
        return;
      }
      handleDetectedChange();
    });
  } catch {
    return;
  }

  const hasFileChanged = (): boolean => {
    try {
      const stat = fs.statSync(diskPath);
      return stat.size !== lastStat.size || stat.mtimeMs !== lastStat.mtimeMs;
    } catch {
      return true;
    }
  };
  const handleDetectedChange = (): void => {
    if (!hasFileChanged()) {
      return;
    }
    finishWatcherAfterChange(attachmentId, () => applyAttachmentFileChange(database, attachmentId, diskPath, actorUserId ?? null));
  };

  const timer = setTimeout(() => stopWatcher(attachmentId), watcherTimeoutMs);
  const pollTimer = setInterval(handleDetectedChange, pollIntervalMs);
  timer.unref?.();
  pollTimer.unref?.();
  activeWatchers.set(attachmentId, { watcher, timer, pollTimer, settleTimer: null });

  watcher.on("error", () => stopWatcher(attachmentId));
}

export function stopAllAttachmentWatchers(): void {
  for (const attachmentId of [...activeWatchers.keys()]) {
    stopWatcher(attachmentId);
  }
}

export function getActiveAttachmentWatcherCountForTests(): number {
  return activeWatchers.size;
}

export function setAttachmentWatcherTimeoutForTests(timeoutMs: number | null): void {
  watcherTimeoutMs = timeoutMs ?? DEFAULT_WATCHER_TIMEOUT_MS;
}

export function setAttachmentWatcherPollIntervalForTests(intervalMs: number | null): void {
  pollIntervalMs = intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
}

export function setAttachmentWatcherSettleDelayForTests(delayMs: number | null): void {
  settleDelayMs = delayMs ?? DEFAULT_SETTLE_DELAY_MS;
}
