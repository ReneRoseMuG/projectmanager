# Log: Task Views

**Datum:** 16.05.26  
**Schritt:** 11 — TaskList + KanbanBoard + ViewToggle  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Projektdetailseite kann Aufgaben als Liste oder Kanban-Board anzeigen. Der View-Mode wird per `localStorage` gespeichert. Kanban-Spalten verwenden `@dnd-kit` und schreiben Status und Position über die API zurück. Aufgaben zeigen Status, Priorität, Fälligkeit, Subtask-Anzahl und Tags.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/TaskList.tsx` | neu | Listenansicht |
| `apps/web/src/components/tasks/TaskCard.tsx` | neu | Aufgabenkarte |
| `apps/web/src/components/tasks/KanbanBoard.tsx` | neu | Kanban-Board |
| `apps/web/src/components/tasks/KanbanColumn.tsx` | neu | Kanban-Spalte |
| `apps/web/src/components/ui/ViewToggle.tsx` | neu | Listen-/Kanban-Umschalter |
| `apps/web/src/hooks/useViewMode.ts` | neu | Persistierter View-Mode |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
