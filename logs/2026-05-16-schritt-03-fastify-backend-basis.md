# Log: Fastify Backend Basis

**Datum:** 16.05.26  
**Schritt:** 3 — Fastify-Backend: projects, tasks, subtasks, comments  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Fastify-App wurde mit CORS, Multipart, Static-Serving und einheitlichem Fehlerhandler aufgebaut. Projekte, Aufgaben, Unteraufgaben und Kommentare wurden als eigene Routen registriert. Die Business-Logik liegt in Service-Dateien, Route-Handler bleiben dünn und verwenden JSON-Schemas für Request-Validierung. Der TypeScript-Build für die API läuft erfolgreich durch.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/app.ts` | neu | Fastify-App-Factory |
| `apps/api/src/index.ts` | neu | Serverstart |
| `apps/api/src/routes/projects.ts` | neu | Projekt-Endpunkte |
| `apps/api/src/routes/tasks.ts` | neu | Aufgaben-Endpunkte |
| `apps/api/src/routes/subtasks.ts` | neu | Subtask-Endpunkte |
| `apps/api/src/routes/comments.ts` | neu | Kommentar-Endpunkte |
| `apps/api/src/services/projects.service.ts` | neu | Projektlogik |
| `apps/api/src/services/tasks.service.ts` | neu | Aufgabenlogik |
| `apps/api/src/services/comments.service.ts` | neu | Kommentarlogik |

## Probleme und Abweichungen

Runtime-Prüfung gegen SQLite ist wegen des blockierten `better-sqlite3`-Native-Bindings nicht möglich.

## Offene Punkte / Folgeaufgaben

Nach erfolgreicher Native-Installation API-Integrationstests ergänzen und ausführen.
