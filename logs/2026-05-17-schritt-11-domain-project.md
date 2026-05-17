# Log: Domain Project

**Datum:** 17.05.26  
**Schritt:** 11 — Domain: Projekt  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Projekt-Domäne wurde auf die gemeinsame Design-System-Struktur migriert. `ProjectCard` verwendet jetzt `ItemCard` beziehungsweise `ItemRow`, zeigt die Projektfarbe als Accent-Bar, Status-Pill, Tags, ProgressBar und eine Avatar-Reihe. Die Projekte-Übersicht nutzt `ProjectListBoardView` auf Basis von `ListBoardView` mit Kanban-Spalten nach Projektstatus; der separate Button und die separate Suche außerhalb der ListBoardView wurden entfernt. `ProjectForm` wurde auf `FormModal`, `Section`, `FormField`, `Input`, `RichTextEditor`, `ColorPicker`, `SegmentedControl`, `DatePicker`, `TagPicker` und `FeatureRelationPanel` umgestellt und übergibt Tags sowie Feature-Vorauswahl im Speichervorgang. Die Projekt-Detailseite enthält nun die geforderte Tab-Struktur mit inline bearbeitbaren Stammdaten und vorbereitetem Kommentare-Tab.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectCard.tsx` | geändert | Projektkarte auf `ItemCard`/`ItemRow` mit Accent-Bar und ProgressBar umgestellt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Formular auf `FormModal`, RTF und Feature-Vorauswahl umgestellt |
| `apps/web/src/components/projects/ProjectInlineForm.tsx` | neu | Inline-Stammdatenformular für die Projekt-Detailseite |
| `apps/web/src/components/projects/ProjectListBoardView.tsx` | neu | Projekt-Adapter für `ListBoardView` mit Status-Kanban |
| `apps/web/src/components/projects/ProjectList.tsx` | gelöscht | Durch `ProjectListBoardView` ersetzt |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Übersicht auf `ProjectListBoardView` und Feature-Payload umgestellt |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Stammdaten-, Features-, Aufgaben-, Kommentare-, Dateien- und Notizen-Tabs ergänzt |
| `apps/web/e2e/project.spec.ts` | neu | Projekt-CRUD-E2E-Suite als geskipptes Gerüst |
| `logs/2026-05-17-schritt-11-domain-project.md` | neu | Schritt-Log für Schritt 11 |
| `logs/README.md` | geändert | Log-Index um Schritt 11 ergänzt |

## Probleme und Abweichungen

Start- und Fälligkeitsdatum werden im Formular angezeigt, aber nicht persistiert, weil der aktuelle Projekt-API-Vertrag und das Datenbankschema keine Projekt-Zeitraumfelder enthalten. Der Kommentare-Tab ist strukturell vorbereitet; die echte `CommentThread`-Verdrahtung folgt im dafür vorgesehenen Schritt 14. Die Projekt-E2E-Fälle sind bewusst `skip`, weil rote E2E-Flows laut Nutzer nach Abschluss des Gesamtauftrags geklärt werden.

## Offene Punkte / Folgeaufgaben

Projekt-E2E-Flows nach Abschluss des Gesamtauftrags aktivieren und stabilisieren. Falls Projekt-Zeiträume fachlich gespeichert werden sollen, braucht das eine separate Schema-/Migrationserweiterung.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `npm run typecheck -w apps/web` | ✅ Erfolgreich |
