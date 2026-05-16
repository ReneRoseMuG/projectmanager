# Log: Wiki-Seiten API

**Datum:** 16.05.26  
**Schritt:** 22 - Wiki-Seiten API  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Wiki-API wurde mit Root-Seiten, Unterseiten, Detailansicht, Breadcrumb und Schutz vor dem Löschen von Seiten mit Kindern umgesetzt. Markdown-Inhalte werden slug-basiert unter `apps/api/content/wiki/` abgelegt, sodass ein Slug wie `einfuehrung/installation` zur Datei `content/wiki/einfuehrung/installation.md` führt. Slugs sind eindeutig und liefern bei Duplikaten `409 CONFLICT`. Parent-IDs und optionale Projekt-IDs werden validiert. Der Breadcrumb-Endpunkt liefert den Pfad von Root bis aktueller Seite.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/wiki.ts` | neu | Fastify-Endpunkte für Wiki-Seiten |
| `apps/api/src/services/wiki.service.ts` | neu | Wiki-Metadaten, Breadcrumb und Markdown-Dateiverwaltung |
| `apps/api/src/app.ts` | geändert | Wiki-Routen registriert |
| `apps/api/tests/helpers/app.ts` | geändert | Wiki-Routen für Integrationstest-App registriert |

## Selbsttest-Protokoll - Schritt 22: Wiki-Seiten API

### 1. TypeScript-Build
Kommando: `npm run build -w apps/api`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`.

### 2. Migration
Für Schritt 22 nicht nötig. Die Tabellen wurden in Schritt 18 migriert.

### 3. Schema-Verifikation
Für Schritt 22 nicht erneut nötig. Die Tabelle `wiki_pages` wurde in Schritt 18 verifiziert.

### 4. API-Smoke-Tests
Kommando: `POST /api/wiki` mit Root-Seite  
Antwort: Root-Seite wurde mit `id: 1`, `slug: "wiki-smoke-377246220"` und `parentId: null` angelegt.

Kommando: `POST /api/wiki` mit Unterseite  
Antwort: Unterseite wurde mit `id: 2`, `parentId: 1`, `slug: "wiki-smoke-377246220/installation"` und `contentPath: "content/wiki/wiki-smoke-377246220/installation.md"` angelegt.

Kommando: `GET /api/wiki/2/breadcrumb`  
Antwort: `[{"id":1,"title":"Einführung","slug":"wiki-smoke-377246220"},{"id":2,"title":"Installation","slug":"wiki-smoke-377246220/installation"}]`.

Kommando: `DELETE /api/wiki/1` bei vorhandener Unterseite  
Antwort: HTTP `409`.

Kommando: `DELETE /api/wiki/2`, danach `DELETE /api/wiki/1`  
Antwort: jeweils HTTP `204`.

### 5. Dateisystem-Check
Kommando: `Get-ChildItem apps/api/content/wiki -Recurse -Force`  
Ergebnis: Während des Tests existierten `wiki-smoke-377246220.md` und `wiki-smoke-377246220/installation.md`. Nach Cleanup wurden die Dateien und der leere Testordner entfernt; übrig blieb nur `.gitkeep`.

### 6. Abweichungen vom Plan
Keine fachlichen Abweichungen.

### Gesamtstatus
Alle Pflicht-Checks sind grün. Schritt 22 ist abgeschlossen.

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Schritt 23: Backlog API.
