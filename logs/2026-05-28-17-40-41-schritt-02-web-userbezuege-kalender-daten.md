# Log: Web Userbezüge, Kalender und Datenzeilen

**Datum:** 28.05.26  
**Uhrzeit:** 17:40:41  
**Schritt:** 2 — Web-Formulare, Karten/List-Items und Kalender-Task-Modal  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Web-Formulare für Project, Milestone, Feature, Use Case, Backlog Item, Task, Ticket und Event verwenden nun ein echtes User-Dropdown mit User-ID als Wert. Beim Erstellen wird der aktuell angemeldete User vorbelegt; bestehende Objekte zeigen den verknüpften User aus der Relation. Tickets führen „Zuständig“ und „Meldende Person“ über eigene User-Bezüge. Kalender-Tasks öffnen aus Wochen- und Monatsansicht nun das bestehende Task-Formular als Modal statt in die Detailnavigation zu springen. Task- und Ticket-Karten sowie Listenzeilen zeigen Fälligkeitsinformationen mit Label und ergänzen bei geschlossenen Elementen das sichtbare Abschlussdatum.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/users/UserSelectField.tsx` | neu | Wiederverwendbares User-Dropdown für verantwortliche Personen |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Verantwortlich-Dropdown mit Create-Default ergänzt |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Verantwortlich-Dropdown mit Create-Default ergänzt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Verantwortlich-Dropdown mit Create-Default ergänzt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Verantwortlich-Dropdown und Payload ergänzt |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Verantwortlich-Dropdown und Payload ergänzt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Verantwortlich-Dropdown und Fälligkeitsdatum in Statusbereich integriert |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | User-Dropdowns für Zuständig und Meldende Person integriert |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Verantwortlich-Dropdown und Payload ergänzt |
| `apps/web/src/components/calendar/CalendarDashboardProvider.tsx` | geändert | Task-Modal für Kalender-Task-Klicks angebunden |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | Kalender-Task-Klicks auf Modal statt Navigation umgestellt |
| `apps/web/src/hooks/useCalendarTasks.ts` | geändert | Tag-Aktualisierung für Kalender-Task-Modal ergänzt |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Fällig-/Geschlossen-Datumszeilen ergänzt |
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Fällig-/Geschlossen-Datumszeilen und User-Relation genutzt |
| `apps/web/src/components/calendar/WeekCalendar.tsx` | geändert | Verantwortliche Namen aus User-Relationen im Kalenderkontext |
| `apps/web/src/components/calendar/WeekEventTile.tsx` | geändert | Verantwortliche Namen aus User-Relationen angezeigt |

## Probleme und Abweichungen

Keine. Der gezielte Web-Build `npm run build -w apps/web` lief erfolgreich; Vite meldete nur die bereits typische Chunk-Größenwarnung.

## Offene Punkte / Folgeaufgaben

Die im Gesamtplan vorgesehenen Browser-/E2E-Prüfungen für Kalender-Modal, Formular-Defaults und Datumsdarstellung folgen im Testschritt.
