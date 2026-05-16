# Log: Backlog API

**Datum:** 16.05.26  
**Schritt:** 23 - Backlog API  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Backlog-API wurde für projektgebundene Backlog-Items umgesetzt. Ein Item gehört immer zu einem existierenden Projekt und kann optional mit einem Feature oder Use Case verknüpft werden. Filter für `featureId`, `useCaseId` und `status` sind auf der Projekt-Backlog-Liste verfügbar. Statuswechsel werden gemäß Auftrag validiert: `open -> in_progress -> done` und `open -> rejected`. Backlog-Items haben keine Markdown-Dateien; die Beschreibung wird direkt in SQLite gespeichert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/backlog.ts` | neu | Fastify-Endpunkte für Projekt-Backlog und Einzelitems |
| `apps/api/src/services/backlog.service.ts` | neu | Backlog-Validierung, Filter und Statuswechsel |
| `apps/api/src/app.ts` | geändert | Backlog-Routen registriert |
| `apps/api/tests/helpers/app.ts` | geändert | Backlog-Routen für Integrationstest-App registriert |

## Selbsttest-Protokoll - Schritt 23: Backlog API

### 1. TypeScript-Build
Kommando: `npm run build -w apps/api`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`.

### 2. Migration
Für Schritt 23 nicht nötig. Die Tabellen wurden in Schritt 18 migriert.

### 3. Schema-Verifikation
Für Schritt 23 nicht erneut nötig. Die Tabelle `backlog_items` und ihre Foreign Keys wurden in Schritt 18 verifiziert.

### 4. API-Smoke-Tests
Kommando: Vorbereitung per `POST /api/projects` und `POST /api/features`  
Antwort: Projekt `id: 5` und Feature `id: 4` wurden angelegt.

Kommando: `POST /api/projects/5/backlog`  
Antwort: Backlog-Item wurde mit `id: 1`, `projectId: 5`, `featureId: 4`, `status: "open"` und `priority: "high"` angelegt.

Kommando: `GET /api/projects/5/backlog?featureId=4`  
Antwort: Länge `1`.

Kommando: `GET /api/projects/5/backlog?status=open`  
Antwort: Länge `1`.

Kommando: `PATCH /api/backlog/1` mit `{"status":"in_progress"}`  
Antwort: `status: "in_progress"`.

Kommando: `POST /api/projects/9999/backlog`  
Antwort: HTTP `404`.

### 5. Dateisystem-Check
Für Schritt 23 nicht nötig, weil Backlog-Items keine Markdown-Dateien anlegen.

### 6. Abweichungen vom Plan
Keine fachlichen Abweichungen.

### Gesamtstatus
Alle Pflicht-Checks sind grün. Schritt 23 ist abgeschlossen.

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Schritt 24: Junction/Link-APIs.
