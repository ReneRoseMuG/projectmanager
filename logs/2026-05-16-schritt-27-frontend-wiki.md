# Log: Frontend Wiki

**Datum:** 16.05.26  
**Schritt:** 27 - Frontend Wiki  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Wiki-Frontend wurde mit Route `/wiki` und `/wiki/:id` umgesetzt. Es gibt API-Funktionen und einen Hook für Root-Seiten, Unterseiten, Detailseite, Breadcrumb, Create, Update und Delete. Die UI enthält einen hierarchischen WikiTree, Breadcrumb, Detailbearbeitung und ein Formular für Root- und Sub-Seiten. Wiki-Inhalte werden über den vorhandenen MarkdownEditor als Markdown-String bearbeitet. Das Löschen von Seiten mit Unterseiten wird über die API abgefangen und im Frontend als Fehler angezeigt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/api/wiki.ts` | neu | API-Funktionen für Wiki-Seiten |
| `apps/web/src/hooks/useWiki.ts` | neu | Wiki-Tree, Detail und Breadcrumb laden |
| `apps/web/src/components/wiki/WikiTree.tsx` | neu | Aufklappbarer Wiki-Baum |
| `apps/web/src/components/wiki/WikiPageDetail.tsx` | neu | Detailbearbeitung mit MarkdownEditor |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | neu | Formular für Root- und Sub-Seiten |
| `apps/web/src/components/wiki/WikiBreadcrumb.tsx` | neu | Breadcrumb-Komponente |
| `apps/web/src/pages/WikiPage.tsx` | neu | Wiki-Seite für `/wiki` und `/wiki/:id` |
| `apps/web/src/App.tsx` | geändert | Wiki-Routen registriert |

## Selbsttest-Protokoll - Schritt 27: Frontend Wiki

### 1. TypeScript-Build
Kommando: `npm run build -w apps/web`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`. Vite meldete nur die bekannte Bundle-Größenwarnung.

### 2. Migration
Für Schritt 27 nicht nötig.

### 3. Schema-Verifikation
Für Schritt 27 nicht nötig.

### 4. API-/Frontend-Smoke-Tests
Kommando: `Invoke-WebRequest http://localhost:5173/wiki`  
Antwort: HTTP `200`.

Kommando: Wiki-Smoke über API mit Root-Seite und Sub-Seite  
Antwort: Breadcrumb-Länge `2`, Löschen der Root-Seite mit vorhandener Sub-Seite liefert HTTP `409`, danach Sub-Seite und Root-Seite erfolgreich gelöscht.

### 5. Dateisystem-Check
Kommando: `Get-ChildItem apps/api/content/wiki -Recurse -Force`  
Ergebnis: Nach Cleanup blieb nur `.gitkeep`.

### 6. Lint
Kommando: `npm run lint -w apps/web`  
Ergebnis: Fehlerfrei.

### 7. Abweichungen vom Plan
Keine fachlichen Abweichungen.

### Gesamtstatus
Alle Pflicht-Checks sind grün. Schritt 27 ist abgeschlossen.

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Schritt 28: Frontend Backlog.
