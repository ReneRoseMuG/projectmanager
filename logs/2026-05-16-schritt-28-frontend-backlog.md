# Log: Frontend Backlog

**Datum:** 16.05.26  
**Schritt:** 28 - Frontend Backlog  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Backlog wurde als neuer Tab in der Projektdetailseite eingebunden. Es gibt API-Funktionen und einen Hook zum Laden, Filtern, Erstellen, Aktualisieren und Löschen von Backlog-Items. Die UI enthält eine Backlog-Liste, Statusfilter und ein Formular mit Feature-Zuordnung. Backlog-Items nutzen keine Markdown-Dateien; Beschreibung und Metadaten werden über die bestehende API in SQLite gespeichert. Der Statusfilter lädt die API-Liste passend zum gewählten Status neu.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/api/backlog.ts` | neu | API-Funktionen für Backlog-Items |
| `apps/web/src/hooks/useBacklog.ts` | neu | Backlog-Daten und Statusfilter |
| `apps/web/src/components/backlog/BacklogList.tsx` | neu | Backlog-Liste mit Statusfilter |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | neu | Formular für Backlog-Items |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Backlog-Tab eingebunden |

## Selbsttest-Protokoll - Schritt 28: Frontend Backlog

### 1. TypeScript-Build
Kommando: `npm run build -w apps/web`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`.

### 2. Migration
Für Schritt 28 nicht nötig.

### 3. Schema-Verifikation
Für Schritt 28 nicht nötig.

### 4. API-/Frontend-Smoke-Tests
Kommando: Backlog-Smoke über API mit Projekt, Feature und Backlog-Item  
Antwort: Backlog-Item wurde mit `status: "open"` angelegt; `GET /api/projects/:id/backlog?status=open` lieferte Länge `1`.

### 5. Dateisystem-Check
Für Schritt 28 nicht nötig, weil Backlog-Items keine Dateien anlegen.

### 6. Lint
Kommando: `npm run lint -w apps/web`  
Ergebnis: Fehlerfrei.

### 7. Abweichungen vom Plan
Keine fachlichen Abweichungen.

### Gesamtstatus
Alle Pflicht-Checks sind grün. Schritt 28 ist abgeschlossen.

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Schritt 29: Integration in bestehende Views.
