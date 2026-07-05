import type { DbClient } from "../db/client.js";
import { calendarConnectionRepository } from "../repositories/calendar.repository.js";
import { runConnectionSync } from "./calendar-sync.service.js";

/**
 * Sync-Scheduler (AP-4.1). Stößt in festem Intervall den Abgleich aller Kalenderverbindungen an.
 * Robustheit: Ein Fehler je Verbindung wird isoliert (die übrigen laufen weiter), und überlappende
 * Ticks werden verhindert (dauert ein Lauf länger als das Intervall, wird der nächste übersprungen).
 * Der Timer ist unref'd — er hält den Prozess nicht am Leben und blockiert kein Server-Shutdown.
 */

export interface ScheduledSyncResult {
  processed: number;
  synced: number;
  failed: number;
}

/** Ein Scheduler-Tick: synchronisiert alle Verbindungen einmal, fehlertolerant je Verbindung. */
export async function runScheduledSync(database: DbClient): Promise<ScheduledSyncResult> {
  const connections = await calendarConnectionRepository.listAll(database);
  let synced = 0;
  let failed = 0;
  for (const connection of connections) {
    try {
      const result = await runConnectionSync(database, connection);
      if (result.status === "error") {
        failed += 1;
      } else {
        synced += 1;
      }
    } catch {
      // Unerwartete Fehler (z. B. DB) einer Verbindung dürfen die übrigen nicht stoppen.
      failed += 1;
    }
  }
  return { processed: connections.length, synced, failed };
}

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

async function tick(database: DbClient): Promise<void> {
  if (running) {
    return; // vorheriger Lauf noch aktiv → Überlappung vermeiden
  }
  running = true;
  try {
    await runScheduledSync(database);
  } finally {
    running = false;
  }
}

/** Startet den periodischen Scheduler (idempotent — ein bereits laufender Timer wird nicht dupliziert). */
export function startCalendarSyncScheduler(database: DbClient, intervalMs: number): void {
  if (timer) {
    return;
  }
  timer = setInterval(() => {
    void tick(database);
  }, intervalMs);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

/** Stoppt den Scheduler und gibt den Timer frei. */
export function stopCalendarSyncScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  running = false;
}

/** Nur für Tests: laufender Timer? */
export function isCalendarSyncSchedulerRunning(): boolean {
  return timer !== null;
}
