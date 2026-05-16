# Log: Integration in bestehende Views

**Datum:** 16.05.26  
**Schritt:** 29 - Integration in bestehende Views  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die bestehenden Ansichten wurden um die neue Dokumentations- und Wiki-Ebene erweitert. Die Sidebar enthält jetzt Navigationseinträge für Features und Wiki. Die Projektdetailseite hat einen Features-Tab, in dem Projekt-Feature-Verknüpfungen per vollständiger PUT-Ersatzsemantik gespeichert werden. Das Task-Detail enthält einen neuen Tab "Features & UCs" mit Feature- und Use-Case-Auswahl. Die dafür nötigen Link-API-Funktionen und Hooks wurden ergänzt; Komponenten verwenden keine direkten `fetch`-Aufrufe.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/api/doc-links.ts` | neu | API-Funktionen für Projekt-/Task-Verknüpfungen |
| `apps/web/src/hooks/useDocLinks.ts` | neu | Hooks für Projekt-Feature- und Task-Doc-Links |
| `apps/web/src/components/features/FeaturePicker.tsx` | neu | Feature-Auswahl |
| `apps/web/src/components/usecases/UseCasePicker.tsx` | neu | Use-Case-Auswahl |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Links für Features und Wiki ergänzt |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Features-Tab und Backlog-Tab integriert |
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Tab "Features & UCs" ergänzt |

## Selbsttest-Protokoll - Schritt 29: Integration in bestehende Views

### 1. TypeScript-Build
Kommando: `npm run build -w apps/web`  
Ergebnis: Fehlerfrei unter Node `v20.20.2`.

### 2. Migration
Für Schritt 29 nicht nötig.

### 3. Schema-Verifikation
Für Schritt 29 nicht nötig.

### 4. API-/Frontend-Smoke-Tests
Kommando: `Invoke-WebRequest http://localhost:5173/features`  
Antwort: HTTP `200`.

Kommando: Link-Smoke über API mit Projekt, Task und Feature  
Antwort: `PUT /api/projects/:id/features` lieferte eine verknüpfte Feature-Entität; `PUT /api/tasks/:id/features` lieferte ebenfalls eine verknüpfte Feature-Entität.

### 5. Dateisystem-Check
Kommando: `Get-ChildItem apps/api/content/features, apps/api/content/usecases, apps/api/content/wiki -Recurse -Force`  
Ergebnis: Nach Cleanup blieben nur die `.gitkeep`-Dateien.

### 6. Lint
Kommando: `npm run lint -w apps/web`  
Ergebnis: Fehlerfrei.

### 7. Abweichungen vom Plan
Keine fachlichen Abweichungen.

### Gesamtstatus
Alle Pflicht-Checks sind grün. Schritt 29 ist abgeschlossen.

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Schritt 30: Integrationstests.
