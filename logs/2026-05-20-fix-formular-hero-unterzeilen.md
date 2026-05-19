# Log: Formular-Hero-Unterzeilen

**Datum:** 20.05.26  
**Schritt:** Fix — Formular-Hero-Unterzeilen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die zusätzlichen Unterzeilen in den Hero-Bereichen der Create- und Edit-Formulare wurden entfernt. Der gemeinsame `FormModal` rendert keine `subtitle`-Zeile mehr und nimmt diese Prop nicht mehr entgegen. Alle bisherigen Formular-Aufrufer wurden entsprechend bereinigt, damit keine erklärenden Sätze wie „Stammdaten, Status und Beziehungen festlegen.“ mehr gesetzt werden. Die separat aufgebauten Hero-Header im Wiki-Formular und im Notiz-Editor wurden ebenfalls angepasst. Nur sichtbarer UI-Text wurde entfernt; Formularlogik, Validierung, Tabs, Meta-Pills und Speichern-/Abbrechen-Aktionen bleiben unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/FormModal.tsx` | geändert | Subtitle-Prop und Rendering der Hero-Unterzeile entfernt |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Formular-Subtitle und verwaisten Datumsimport entfernt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Formular-Subtitle und verwaisten Datumsimport entfernt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Formular-Subtitle entfernt |
| `apps/web/src/components/features/FeatureProjectPanel.tsx` | geändert | Formular-Subtitle im Projekt-Hinzufügen-Dialog entfernt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Formular-Subtitle und nicht mehr benötigte Prop entfernt |
| `apps/web/src/pages/UseCaseDetailPage.tsx` | geändert | Nur für die entfernte Unterzeile genutzte Feature-Titel-Berechnung entfernt |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Formular-Subtitle entfernt |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Formular-Subtitle entfernt |
| `apps/web/src/components/tasks/TaskModal.tsx` | geändert | Formular-Subtitle entfernt |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Formular-Subtitle entfernt |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Direkt gerenderte Hero-Unterzeile entfernt |
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | Direkt gerenderte Hero-Metazeile und verwaiste Hilfslogik entfernt |
| `logs/2026-05-20-fix-formular-hero-unterzeilen.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
