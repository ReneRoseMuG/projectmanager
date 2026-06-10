# Log: MS-67 AP03 — Per-Worker-DB-Lifecycle

**Datum:** 10.06.26  
**Uhrzeit:** 08:16:18  
**Schritt:** AP03 — Per-Worker-DB-Lifecycle (MS-67)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Ein Lifecycle-Helfer für isolierte E2E-Worker-Datenbanken wurde angelegt
(`tests/fixtures/e2e/worker-db.ts`):
- `workerDbName(index)` → `taskmanager_e2e_w<index>`.
- `createWorkerDb(index)` → droppt eine evtl. liegengebliebene Alt-DB, legt die DB neu
  an, migriert über den produktionsnahen Pfad (Migrations-Tabelle
  `__drizzle_migrations_taskmanager`, identisch zu `apps/api/src/db/migrate.ts`) und
  seedet Auth + Katalog. Liefert Verbindungsdaten zurück.
- `dropWorkerDb(index)` → entfernt die DB (idempotent).

Statt eines zweiten Seed-Pfads wird die **vorhandene** Logik aus
`tests/fixtures/api/db.ts` wiederverwendet. Dafür wurden `baseConnectionConfig`,
`seedDefaultAuth` und `seedDefaultCatalogEntries` aus `db.ts` exportiert (vorher
modul-privat). Der DB-Safety-Guard aus AP04 wird vor jeder destruktiven Operation
aufgerufen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/fixtures/e2e/worker-db.ts` | neu | Per-Worker-DB-Lifecycle (create/migrate/seed/drop) |
| `tests/fixtures/api/db.ts` | geändert | `baseConnectionConfig`, `seedDefaultAuth`, `seedDefaultCatalogEntries` exportiert |
| `tests/integration/api/worker-db-lifecycle.test.ts` | neu | Integrationstest für den Lifecycle |
| `logs/2026-06-10-08-16-18-ms67-ap03-per-worker-db-lifecycle.md` | neu | Dieser Schritt-Log |
| `logs/README.md` | geändert | Index-Eintrag AP03 |

## Testleitplanken

- Testebene: **Integration** (echte MySQL aus `.env.test`, eigene `taskmanager_e2e_w9999`).
- Beobachtbares Verhalten: nach `createWorkerDb` existiert der Admin-User `admin@local`,
  3 Rollen und >0 Katalogeinträge; nach `dropWorkerDb` ist die DB weg; ein zweiter
  `createWorkerDb` auf eine vorhandene DB läuft sauber (drop-before-create).
- Isolation: nur eine `taskmanager_e2e_w*`-DB (Guard-konform), Produktions-DB unberührt.
- Ergebnis: **2/2 Tests grün**.

## Probleme und Abweichungen

- Erstlauf lief ins Default-`testTimeout` (15s): eine vollständige Migration dauert
  ~18s. Tests erhielten daher explizite Timeouts (120s/180s), analog zum
  `hookTimeout` (120s) der bestehenden Integrationstests.
- **Beobachtung:** ~18s Migrationszeit pro Worker-DB ist relevant für die Startzeit
  bei N Workern (einmalig pro Worker, parallel). Wird in AP10/AP12 bewertet.

## Offene Punkte / Folgeaufgaben

- AP05 nutzt `createWorkerDb`/`dropWorkerDb` in der worker-scoped Fixture und startet
  danach den API-Server gegen diese DB.
- AP06: Per-Worker-Storage-Pfade bereitstellen.
