# Log: Features API

**Datum:** 16.05.26  
**Schritt:** 20 - Features API  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die CRUD-API für Features wurde als eigenes Fastify-Routenmodul mit ausgelagerter Service-Logik umgesetzt. Feature-Inhalte werden nicht in SQLite gespeichert, sondern über den ContentService in Markdown-Dateien unter `apps/api/content/features/` geschrieben, gelesen, umbenannt und gelöscht. Die Listenantwort liefert nur Metadaten und lässt `content` bewusst weg. Slug-Duplikate werden mit `409 CONFLICT` beantwortet, fehlende Features mit `404 NOT_FOUND`. Der Endpunkt für Use Cases eines Features ist im Use-Case-Routenmodul registriert, damit die fachliche Route vorhanden ist, ohne Fastify-Duplikate zu erzeugen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/features.ts` | neu | Fastify-Endpunkte für Feature-CRUD |
| `apps/api/src/services/features.service.ts` | neu | Feature-Metadaten, Slug-Prüfung und Markdown-Dateiverwaltung |
| `apps/api/src/app.ts` | geändert | Feature-Routen registriert |
| `apps/api/tests/helpers/app.ts` | geändert | Feature-Routen für Integrationstest-App registriert |

## Selbsttest-Protokoll - Schritt 20: Features API

### 1. TypeScript-Build
Kommando: `npm run build -w apps/api`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`.

### 2. Migration
Für Schritt 20 nicht nötig. Die Tabellen wurden in Schritt 18 migriert.

### 3. Schema-Verifikation
Für Schritt 20 nicht erneut nötig. Die Tabelle `features` wurde in Schritt 18 verifiziert.

### 4. API-Smoke-Tests
Kommando: `curl.exe -s -X POST http://localhost:3001/api/features -H "Content-Type: application/json" --data-binary "@<temp-json>"`  
Antwort: Feature wurde mit `id: 2`, `slug: "ft-smoke-1725606713"` und `contentPath: "content/features/feature-2-ft-smoke-1725606713.md"` angelegt.

Kommando: `curl.exe -s http://localhost:3001/api/features/2`  
Antwort: Das Feature enthielt den Markdown-Content `# FT Smoke\n\nBeschreibung.`.

Kommando: `curl.exe -s -X PATCH http://localhost:3001/api/features/2 -H "Content-Type: application/json" --data-binary "@<temp-json>"`  
Antwort: Der gespeicherte Content wurde auf `# FT Smoke aktualisiert` geändert.

Kommando: `curl.exe -s http://localhost:3001/api/features`  
Antwort: Die Listenantwort enthielt Metadaten; das Feld `content` war in der Listenantwort nicht vorhanden.

Kommando: Duplikat-Slug per `POST /api/features`  
Antwort: HTTP `409`.

Kommando: `curl.exe -s -X DELETE http://localhost:3001/api/features/2 -w " HTTP:%{http_code}"`  
Antwort: HTTP `204`.

### 5. Dateisystem-Check
Kommando: `Get-ChildItem apps/api/content/features -Force`  
Ergebnis: Die angelegte Feature-Datei existierte während des Tests und wurde beim Löschen des Features entfernt. Nach Cleanup blieb nur `.gitkeep`.

### 6. Abweichungen vom Plan
PowerShell hat Inline-JSON bei `curl -d` verfälscht. Für die Smoke-Tests wurden deshalb temporäre JSON-Payload-Dateien mit `--data-binary` verwendet. Fachlich gibt es keine Abweichung.

### Gesamtstatus
Alle Pflicht-Checks sind grün. Schritt 20 ist abgeschlossen.

## Probleme und Abweichungen

Keine fachliche Abweichung. Die `curl`-Ausführung wurde nur wegen PowerShell-Quoting technisch angepasst.

## Offene Punkte / Folgeaufgaben

Schritt 21: Use Cases API.
