# Log: Junction/Link-APIs

**Datum:** 16.05.26  
**Schritt:** 24 - Junction/Link-APIs  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Link-APIs für Projekt-Features, Task-Features und Task-Use-Cases wurden mit vollständiger PUT-Ersatzsemantik umgesetzt. Jede PUT-Anfrage ersetzt die bestehenden Verknüpfungen vollständig. Alle übergebenen IDs werden vor dem Schreiben validiert; ungültige Feature- oder Use-Case-IDs liefern `400 BAD_REQUEST` mit Fehlerdetails. Leere Arrays entfernen alle Verknüpfungen. Die GET-Endpunkte liefern die verknüpften Entitäten zurück.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/doc-links.ts` | neu | Fastify-Endpunkte für Projekt-/Task-Verknüpfungen |
| `apps/api/src/services/doc-links.service.ts` | neu | Validierung und Ersetzungslogik für Junction-Tabellen |
| `apps/api/src/app.ts` | geändert | Link-Routen registriert |
| `apps/api/tests/helpers/app.ts` | geändert | Link-Routen für Integrationstest-App registriert |

## Selbsttest-Protokoll - Schritt 24: Junction/Link-APIs

### 1. TypeScript-Build
Kommando: `npm run build -w apps/api`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`.

### 2. Migration
Für Schritt 24 nicht nötig. Die Junction-Tabellen wurden in Schritt 18 migriert.

### 3. Schema-Verifikation
Für Schritt 24 nicht erneut nötig. Die Junction-Tabellen wurden in Schritt 18 verifiziert.

### 4. API-Smoke-Tests
Kommando: Vorbereitung per `POST /api/projects`, `POST /api/features` und `POST /api/projects/:id/tasks`  
Antwort: Projekt `id: 6`, Feature `id: 5` und Task `id: 1` wurden angelegt.

Kommando: `PUT /api/projects/6/features` mit `{"featureIds":[5]}`  
Antwort: HTTP `200`.

Kommando: `GET /api/projects/6/features`  
Antwort: Länge `1`.

Kommando: `PUT /api/tasks/1/features` mit `{"featureIds":[5]}`  
Antwort: HTTP `200`.

Kommando: `GET /api/tasks/1/features`  
Antwort: Länge `1`.

Kommando: `PUT /api/projects/6/features` mit `{"featureIds":[]}`, danach `GET /api/projects/6/features`  
Antwort: HTTP `200`, anschließend `[]`.

Kommando: `PUT /api/projects/6/features` mit `{"featureIds":[9999]}`  
Antwort: HTTP `400`.

Kommando: `PUT /api/tasks/:id/use-cases` mit gültigem Use Case  
Antwort: HTTP `200`; `GET /api/tasks/:id/use-cases` lieferte eine Use-Case-Entität.

Kommando: `PUT /api/tasks/:id/use-cases` mit ungültiger Use-Case-ID  
Antwort: HTTP `400`.

### 5. Dateisystem-Check
Für Schritt 24 nicht nötig, weil Junction-APIs keine Markdown-Dateien anlegen.

### 6. Abweichungen vom Plan
Keine fachlichen Abweichungen. Ein PowerShell-Check mit `.Count` auf einem leeren JSON-Array zeigte zunächst irreführend `1`; ein Roh-GET bestätigte anschließend korrekt `[]`.

### Gesamtstatus
Alle Pflicht-Checks sind grün. Schritt 24 ist abgeschlossen.

## Probleme und Abweichungen

Keine fachliche Abweichung.

## Offene Punkte / Folgeaufgaben

Schritt 25: Shared Types.
