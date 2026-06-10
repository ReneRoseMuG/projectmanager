# Log: MS-67 AP02 — Architekturentscheidung Server-pro-Worker

**Datum:** 10.06.26  
**Uhrzeit:** 08:07:18  
**Schritt:** AP02 — Architekturentscheidung Server-pro-Worker (MS-67)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Design-Gate. Die Verdrahtung der Per-Worker-Isolation wurde am Code festgemacht
und vom Nutzer bestätigt. Entscheidung: **Variante B — Per-Worker Vite ohne
App-Code-Eingriff.**

**Kontext:** `apps/web/src/api/client.ts` liest die API-Basis aus
`import.meta.env.VITE_API_URL` zur Build-/Serve-Zeit (Zeile 3). Playwrights
globaler `webServer` startet Server nur einmal pro Lauf. Für Per-Worker-Isolation
muss der Serverstart in eine **worker-scoped Fixture**.

**Entschiedene Architektur (Variante B):**
- Globaler `webServer` in `playwright.config.ts` entfällt; Start je Worker über eine
  worker-scoped Fixture.
- Pro Worker `w<index>`:
  - Eigene DB `taskmanager_e2e_w<index>` (anlegen, migrieren, seeden, am Ende droppen).
  - Eigener **API-Server** (gebautes `dist/index.js`) als Kindprozess mit eigener
    `DB_NAME`, eigenem `PORT` (Basis + Worker-Index), eigenen Storage-Verzeichnissen
    unter `tests/.runtime/e2e/w<index>/{uploads,previews,content,backups}`,
    `TASKMANAGER_TEST_MODE=1`, `NODE_ENV=test`.
  - Eigener **Vite-Dev-Server** mit eigenem `VITE_API_URL` (zeigt auf den Worker-API-Port)
    auf eigenem Port (Basis + Worker-Index).
  - Eigene **Session**: jeder Worker meldet sich gegen seinen eigenen Server an und
    schreibt seine eigene `storageState` (`w<index>.json`).
- Tests nutzen `baseURL` = Worker-Web-URL; `request`-Context wird mit der Worker-API-
  Basis konfiguriert, sodass `domain-test-utils` relative Pfade verwenden kann.

**Begründung der Variantenwahl:** Variante B fasst keinen Produktionscode an
(client.ts bleibt unverändert) und liefert volle Isolation. Bewusst in Kauf
genommener Nachteil: höherer Ressourcenbedarf (N Vite + N API-Prozesse, mehr Ports,
etwas langsamerer Start). Die leichtere Variante A (Shared Vite + injizierte
API-Basis via `addInitScript`) wurde wegen des nötigen Hooks in `client.ts`
verworfen.

**Port-Schema (festgelegt):** API-Port = `PLAYWRIGHT_API_PORT_BASE` (Default 3101) + Worker-Index;
Web-Port = `PLAYWRIGHT_WEB_PORT_BASE` (Default 5174) + Worker-Index. Worker-Index aus
`testInfo.workerIndex` / `process.env.TEST_PARALLEL_INDEX`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-06-10-08-07-18-ms67-ap02-architektur-server-pro-worker.md` | neu | Dieser Schritt-Log |
| `logs/README.md` | geändert | Index-Eintrag AP02 |

Kein Produktionscode geändert (reine Entscheidung).

## Probleme und Abweichungen

Keine. Entscheidung durch Nutzer bestätigt (Variante B).

## Offene Punkte / Folgeaufgaben

- AP03: Per-Worker-DB-Lifecycle-Helper (anlegen/migrieren/seeden/droppen).
- AP05: Per-Worker-API-Server-Start (Kindprozess, Port, Storage) + Vite je Worker.
- AP08: `playwright.config.ts` von globalem `webServer` auf worker-scoped Fixtures
  umstellen; `domain-test-utils` auf relative Pfade gegen den Worker-`request`-Context.
