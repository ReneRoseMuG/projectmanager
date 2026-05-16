# Log: Use Cases API

**Datum:** 16.05.26  
**Schritt:** 21 - Use Cases API  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Use-Case-API wurde mit Endpunkten unterhalb von Features und mit Detail-Endpunkten für einzelne Use Cases umgesetzt. Use Cases gehören verpflichtend zu einem existierenden Feature; nicht vorhandene Feature-IDs werden mit `404 NOT_FOUND` abgelehnt. Die Markdown-Inhalte werden über den ContentService unter `apps/api/content/usecases/` gespeichert. Beim Löschen eines Features entfernt der Feature-Service zusätzlich die Use-Case-Dateien, damit die DB-Cascade keine Dateien verwaist zurücklässt. Slugs sind global eindeutig und liefern bei Duplikaten `409 CONFLICT`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/use-cases.ts` | neu | Fastify-Endpunkte für Use Cases |
| `apps/api/src/services/use-cases.service.ts` | neu | Use-Case-Metadaten und Markdown-Dateiverwaltung |
| `apps/api/src/services/features.service.ts` | geändert | Löscht Use-Case-Dateien beim Feature-Delete |
| `apps/api/src/app.ts` | geändert | Use-Case-Routen registriert |
| `apps/api/tests/helpers/app.ts` | geändert | Use-Case-Routen für Integrationstest-App registriert |

## Selbsttest-Protokoll - Schritt 21: Use Cases API

### 1. TypeScript-Build
Kommando: `npm run build -w apps/api`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`.

### 2. Migration
Für Schritt 21 nicht nötig. Die Tabellen wurden in Schritt 18 migriert.

### 3. Schema-Verifikation
Für Schritt 21 nicht erneut nötig. Die Tabelle `use_cases` und ihr Foreign Key auf `features` wurden in Schritt 18 verifiziert.

### 4. API-Smoke-Tests
Kommando: `POST /api/features`  
Antwort: Test-Feature mit `id: 3` wurde angelegt.

Kommando: `POST /api/features/3/use-cases`  
Antwort: Use Case wurde mit `id: 1`, `featureId: 3`, `slug: "uc-smoke-1850056018"` und `contentPath: "content/usecases/usecase-1-uc-smoke-1850056018.md"` angelegt.

Kommando: `POST /api/features/9999/use-cases`  
Antwort: HTTP `404`.

Kommando: `DELETE /api/features/3`  
Antwort: HTTP `204`. Der zugehörige Use Case wurde per Cascade gelöscht.

### 5. Dateisystem-Check
Kommando: `Get-ChildItem apps/api/content/usecases -Force`  
Ergebnis: Die Use-Case-Datei existierte vor dem Feature-Delete und wurde nach dem Feature-Delete entfernt. Danach blieb nur `.gitkeep`.

### 6. Abweichungen vom Plan
Keine fachlichen Abweichungen. Die Use-Case-Listenroute `GET /api/features/:id/use-cases` ist im Use-Case-Routenmodul registriert.

### Gesamtstatus
Alle Pflicht-Checks sind grün. Schritt 21 ist abgeschlossen.

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Schritt 22: Wiki-Seiten API.
