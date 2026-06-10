# Log: MS-67 AP05 — Per-Worker-Server & Port

**Datum:** 10.06.26  
**Uhrzeit:** 08:21:10  
**Schritt:** AP05 — Per-Worker-Server & Port (MS-67)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Ein Server-Spawner für isolierte Worker-Serverpaare wurde angelegt
(`tests/fixtures/e2e/worker-servers.ts`):
- `workerApiPort(index)` = `PLAYWRIGHT_API_PORT_BASE` (Default 3101) + Index;
  `workerWebPort(index)` = `PLAYWRIGHT_WEB_PORT_BASE` (Default 5174) + Index.
- `startWorkerServers({ index, dbName, db, storage })` startet:
  - den gebauten **API-Server** (`apps/api/dist/index.js`) via `node` mit eigener
    `DB_NAME`, eigenem `PORT`, Storage-Pfaden aus AP06, `NODE_ENV=test`,
    `TASKMANAGER_TEST_MODE=1`, festen Test-Admin-/Session-Variablen, deaktiviertem
    Attachment-Sync und Notifications.
  - einen eigenen **Vite-Dev-Server** (`node node_modules/vite/bin/vite.js`,
    cwd `apps/web`) mit eigenem `VITE_API_URL` auf eigenem Port.
- Wartet auf `GET /health` (API) und den Web-Root, bevor es zurückkehrt.
- `stop()` beendet auf Windows den **gesamten Prozessbaum** via `taskkill /T /F`
  (Vite startet esbuild-Kinder), sonst `SIGTERM`; mit 5s-Sicherheitsnetz.

Der API-Build wird einmalig im globalen Setup erzeugt (AP08); dieses Modul startet/
stoppt nur Prozesse. Migrationen laufen über AP03 (`createWorkerDb`), nicht über den
Server.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/fixtures/e2e/worker-servers.ts` | neu | Spawner für API- + Vite-Server pro Worker + Port-Schema |
| `logs/2026-06-10-08-21-10-ms67-ap05-per-worker-server-port.md` | neu | Dieser Schritt-Log |
| `logs/README.md` | geändert | Index-Eintrag AP05 |

## Testleitplanken

- Testebene: **Integration-Smoke** (temporär, danach entfernt — Server-Spawn ist zu
  schwer für die Dauer-Suite; der End-to-End-Beweis folgt über den echten Playwright-
  Lauf in AP08/AP09).
- Beobachtbares Verhalten (verifiziert): Worker 9998 startete API auf Port 13099 und
  Vite auf 15172; `GET /health` → 200; Web-Root antwortete; `stop()` beendete beide
  Prozesse sauber.
- Isolation: eigene DB `taskmanager_e2e_w9998`, eigenes Storage, eigene Ports.

## Probleme und Abweichungen

- Bewusst kein permanenter Server-Spawn-Test in der Dauer-Suite (würde jeden
  `npm run test`-Lauf um ~20s verlängern). Verifikation per Wegwerf-Smoke, danach
  gelöscht.

## Offene Punkte / Folgeaufgaben

- AP07: Per-Worker-Login/Session gegen den jeweiligen Worker-Server.
- AP08: worker-scoped Fixture, die DB+Storage+Server kombiniert; `playwright.config.ts`
  von globalem `webServer` auf Fixtures umstellen; `domain-test-utils` auf relative Pfade.
