# Log: DB-Resilienz gegen Aiven-Verbindungsabbruch + Crash-Logging + sauberer Start

**Datum:** 23.06.26  
**Uhrzeit:** 11:07:22  
**Schritt:** Fix (Klasse 5 — mehrschichtig: API-Code + Deploy-Skript)  
**Status:** ✅ Abgeschlossen (Code verifiziert; Re-Deploy durch Nutzer ausstehend)

## Was wurde umgesetzt

Diagnose eines wiederkehrenden Symptoms: App über Tray starten, wenige Sekunden später „Verbindung weg". Ursache eindeutig eingegrenzt: Die API (Port 3001) startet sauber (`api ready` im start.log), stirbt aber im Betrieb. Die App hängt an einer entfernten Cloud-MySQL (Aiven, SSL); bricht eine Pool-Verbindung weg (Aiven trennt Idle-Verbindungen), feuert `mysql2` ein `error`-Event. Da weder ein Pool-`error`-Listener noch ein globaler Prozess-Handler existierte, behandelte Node das als unbehandelten Fehler und beendete den Prozess.

Drei abgestimmte Eingriffe:
1. **`pool.on('error')`** auf dem Core-Pool. Wichtige Erkenntnis: Der `mysql2` PromisePool leitet das `error`-Event **nicht** weiter (nur acquire/connection/enqueue/release via `inheritEvents`). Ein Listener auf dem Wrapper wäre wirkungslos gewesen — daher Registrierung auf `mysqlPool.pool` (Core-Pool, öffentlich typisiert als `CorePool`). mysql2 verwirft die kaputte Verbindung und öffnet bei der nächsten Query transparent eine neue → der Idle-Disconnect wird überlebt.
2. **Globales Sicherheitsnetz** in `index.ts`: `process.on('unhandledRejection')` und `process.on('uncaughtException')` loggen über den Fastify-Logger und lassen den Prozess weiterlaufen (kein `process.exit`), da es keinen Auto-Restart-Manager gibt.
3. **`deploy.ps1`** (Generator der deployten `Start.ps1`): API/Web/MCP schreiben stdout+stderr nach `runtime-logs\*.out.log`/`*.err.log` (bisherige Blindstelle bei Abstürzen behoben); zusätzlich räumt `Start.ps1` zu Beginn via `Stop.ps1` auf, damit Mehrfachstarts keine Prozesse stapeln oder Ports blockieren.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/client.ts` | geändert | `mysqlPool.pool.on('error')`-Handler gegen Crash bei DB-Disconnect |
| `apps/api/src/index.ts` | geändert | `unhandledRejection`/`uncaughtException`-Handler (loggen, weiterlaufen) |
| `scripts/deploy.ps1` | geändert | Generierte `Start.ps1`: Cleanup vor Start + stdout/stderr-Logging api/web/mcp |

## Probleme und Abweichungen

- **mysql2-Eigenheit:** PromisePool forwardet `error` nicht — ohne Registrierung auf dem Core-Pool wäre der Fix wirkungslos geblieben (im Code-Quellen verifiziert: `node_modules/mysql2/lib/promise/pool.js`).
- **Keine automatisierten Tests:** Pool-`error`-Event, Prozess-Handler und PowerShell-Deploy sind im vorhandenen Vitest/Playwright-Rahmen nicht sinnvoll abbildbar; kein leeres Testgerüst angelegt (agents.md §11). Verifikation stattdessen beobachtbar: `npm run build -w apps/api` grün; `deploy.ps1` Syntax grün; generierte `Start.ps1` Syntax grün + Cleanup/Redirects vorhanden; Smoke-Start der API stabil (`Server listening at 3001`, kein STDERR).
- Auth/Rollen/Permissions, DB-Schema/Migration, UI: nicht betroffen (reine Infrastruktur).

## Offene Punkte / Folgeaufgaben

- **Re-Deploy durch Nutzer** per Tray → „Updaten" steht aus (Nutzer-Entscheidung). Erst danach wirkt der Fix in der laufenden App.
- **Live-Verifikation** des Idle-Disconnect-Überlebens erst nach Deploy und längerer Laufzeit beobachtbar; künftige Abstürze sind dann in `runtime-logs\api.err.log` nachlesbar.
- Optional auf Wunsch: Pool-Error-Behandlung in eine reine Funktion extrahieren und unit-testen.
