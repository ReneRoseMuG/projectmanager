import type { DbClient } from "../db/client.js";
import { calendarConnectionRepository } from "../repositories/calendar.repository.js";
import { getEffectiveCalendarConfig } from "./calendar-config.service.js";
import { runConnectionSync } from "./calendar-sync.service.js";
import { renewExpiringChannels } from "./google/google-push.service.js";

/**
 * Sync-Scheduler (AP-4.1). Stößt in gejittertem Intervall den Abgleich aller Kalenderverbindungen an.
 * Robustheit:
 * - Fehlerisolation: ein Fehler je Verbindung stoppt die anderen nicht.
 * - Überlappungsschutz: dauert ein Lauf länger als das Intervall, wird der nächste übersprungen.
 * - Jitter (±25 %): verhindert, dass alle Verbindungen exakt gleichzeitig gegen die Fremd-APIs laufen.
 * - Backoff pro Verbindung: nach einem Fehler wird die betroffene Verbindung mit Truncated Exponential
 *   Backoff seltener erneut versucht (schützt vor 429/5xx-Sturm), ohne die anderen zu bremsen; nach
 *   einem erfolgreichen Lauf wird der Backoff zurückgesetzt.
 * Der Timer ist unref'd — er hält den Prozess nicht am Leben und blockiert kein Server-Shutdown.
 */

export interface ScheduledSyncResult {
  processed: number;
  synced: number;
  failed: number;
  skipped: number;
}

export const schedulerBackoff = { baseDelayMs: 60_000, maxDelayMs: 30 * 60_000 };

interface BackoffEntry {
  failures: number;
  nextAttempt: number;
}

const backoffState = new Map<number, BackoffEntry>();

/** Nur für Tests: Backoff-Zustand zurücksetzen, um einen definierten Ausgangszustand herzustellen. */
export function resetSchedulerBackoff(): void {
  backoffState.clear();
}

function registerFailure(connectionId: number, now: number): void {
  const failures = (backoffState.get(connectionId)?.failures ?? 0) + 1;
  const delay = Math.min(schedulerBackoff.baseDelayMs * 2 ** (failures - 1), schedulerBackoff.maxDelayMs);
  backoffState.set(connectionId, { failures, nextAttempt: now + delay });
}

/** ±25 % Jitter auf ein Basisintervall (nie negativ). */
export function jitteredDelay(intervalMs: number): number {
  const spread = intervalMs * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(intervalMs + spread));
}

/**
 * Ein Scheduler-Tick: synchronisiert alle fälligen Verbindungen, fehlertolerant je Verbindung.
 * `now` ist injizierbar (Testzeit); Verbindungen im Backoff-Fenster werden übersprungen.
 */
export async function runScheduledSync(database: DbClient, now: number = Date.now()): Promise<ScheduledSyncResult> {
  const connections = await calendarConnectionRepository.listAll(database);
  let synced = 0;
  let failed = 0;
  let skipped = 0;
  for (const connection of connections) {
    const backoff = backoffState.get(connection.id);
    if (backoff && backoff.nextAttempt > now) {
      skipped += 1;
      continue;
    }
    try {
      const result = await runConnectionSync(database, connection);
      if (result.status === "error") {
        registerFailure(connection.id, now);
        failed += 1;
      } else {
        backoffState.delete(connection.id);
        synced += 1;
      }
    } catch {
      // Unerwartete Fehler (z. B. DB) einer Verbindung dürfen die übrigen nicht stoppen.
      registerFailure(connection.id, now);
      failed += 1;
    }
  }
  return { processed: connections.length, synced, failed, skipped };
}

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let currentIntervalMs: number | null = null;

async function tick(database: DbClient): Promise<void> {
  if (running) {
    return; // vorheriger Lauf noch aktiv → Überlappung vermeiden
  }
  running = true;
  try {
    await runScheduledSync(database);
    // Ablaufende Google-Push-Kanäle erneuern (nur wenn Push konfiguriert ist; best-effort).
    // Webhook-URL aus der wirksamen Konfiguration (DB → .env), damit Änderungen ohne Neustart greifen.
    const effective = await getEffectiveCalendarConfig(database);
    if (effective.googlePushWebhookUrl) {
      try {
        await renewExpiringChannels(database, effective.googlePushWebhookUrl, Date.now());
      } catch {
        // Ein Renewal-Fehler darf den regulären Abgleich nicht stören.
      }
    }
  } finally {
    running = false;
  }
}

function scheduleNext(database: DbClient, intervalMs: number): void {
  timer = setTimeout(() => {
    void tick(database).finally(() => {
      if (timer) {
        scheduleNext(database, intervalMs);
      }
    });
  }, jitteredDelay(intervalMs));
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

/** Startet den periodischen Scheduler (idempotent — ein bereits laufender Timer wird nicht dupliziert). */
export function startCalendarSyncScheduler(database: DbClient, intervalMs: number): void {
  if (timer) {
    return;
  }
  currentIntervalMs = intervalMs;
  scheduleNext(database, intervalMs);
}

/** Stoppt den Scheduler und gibt den Timer frei. */
export function stopCalendarSyncScheduler(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  running = false;
  currentIntervalMs = null;
}

/**
 * Bringt den Scheduler in Einklang mit der wirksamen Konfiguration (DB → .env): startet ihn bei
 * aktiviertem Sync, stoppt ihn bei deaktiviertem und startet ihn bei geändertem Intervall neu.
 * Idempotent — für den Boot und für die Nachführung nach jeder Konfig-Änderung gedacht.
 */
export async function applyCalendarSchedulerState(database: DbClient): Promise<void> {
  const effective = await getEffectiveCalendarConfig(database);
  if (!effective.syncEnabled) {
    stopCalendarSyncScheduler();
    return;
  }
  if (timer && currentIntervalMs === effective.syncIntervalMs) {
    return;
  }
  stopCalendarSyncScheduler();
  startCalendarSyncScheduler(database, effective.syncIntervalMs);
}

/** Nur für Tests: laufender Timer? */
export function isCalendarSyncSchedulerRunning(): boolean {
  return timer !== null;
}
