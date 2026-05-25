# Log: Read-only Board/List Widgets

**Datum:** 24.05.26  
**Schritt:** 3 — Board- und List-Widgets implementieren  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die generische `ListBoardView` unterstützt nun das Ausblenden der gesamten Toolbar. Die Aufgaben-, Ticket-, Meilenstein- und Projekt-Adapter haben einen optionalen Read-only-Modus erhalten, der Toolbar, Create-Aktionen, Statusänderungen, Due-Date-Änderungen und DnD deaktiviert. Die Dashboard-API-Zuordnung liefert Daten für Aufgaben-, Ticket-, Meilenstein- und Projekt-Board/List-Widgets. `DashboardWidgets.tsx` rendert die acht neuen Widgets über die bestehenden Adapter im festen Board- oder Listenmodus.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | `showToolbar`-Prop ergänzt |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | Read-only-Modus ergänzt |
| `apps/web/src/components/tickets/TicketListBoardView.tsx` | geändert | Read-only-Modus ergänzt |
| `apps/web/src/components/milestones/MilestoneListBoardView.tsx` | geändert | Read-only-Modus ergänzt |
| `apps/web/src/components/projects/ProjectListBoardView.tsx` | geändert | Read-only-Modus und fester Widget-Modus ergänzt |
| `apps/web/src/api/dashboard.ts` | geändert | Widget-Datenpfade für Board/List-Widgets ergänzt |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | Acht Read-only Board/List-Widgets ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Die Read-only-Wirkung wird in den geplanten Web- und Browser-Tests abgesichert.
