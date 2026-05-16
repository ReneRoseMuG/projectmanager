# Log: EmptyState

**Datum:** 16.05.26  
**Schritt:** 10 — EmptyState  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Ein wiederverwendbarer EmptyState mit Varianten `default`, `tinted` und `first-run` wurde angelegt. Die wichtigsten leeren Listen und Tabs nutzen nun denselben EmptyState statt individueller Ad-hoc-Karten. Projekt-, Feature-, Aufgaben-, Kanban-, Backlog-, Notiz-, Datei-, Wiki-, Subtask- und Kommentar-Leerzustände wurden umgestellt. Actions und Tones sind je Kontext gesetzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/EmptyState.tsx` | neu | Zentrales Empty-State-Pattern |
| `apps/web/src/components/projects/ProjectList.tsx` | geändert | First-Run EmptyState |
| `apps/web/src/components/features/FeatureList.tsx` | geändert | Feature EmptyState |
| `apps/web/src/components/tasks/*` | geändert | Aufgaben-, Kanban-, Subtask- und Kommentar-Leerzustände |
| `apps/web/src/components/backlog/BacklogList.tsx` | geändert | Backlog EmptyState |
| `apps/web/src/components/notes/NoteList.tsx` | geändert | Notiz EmptyState |
| `apps/web/src/components/attachments/AttachmentList.tsx` | geändert | Datei EmptyState |
| `apps/web/src/components/wiki/WikiTree.tsx` | geändert | Wiki EmptyState |
| `apps/web/src/pages/WikiPage.tsx` | geändert | EmptyState bei nicht ausgewählter Wiki-Seite |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Weitere seltene Inline-Hinweise können bei Folgearbeiten ebenfalls auf EmptyState umgestellt werden.
