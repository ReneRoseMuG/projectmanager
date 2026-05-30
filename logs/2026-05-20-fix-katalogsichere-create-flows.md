# Log: Katalogsichere Create-Flows

**Datum:** 20.05.26  
**Schritt:** Fix — Katalogsichere Create-Flows  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Create-Flows wurden so angepasst, dass sie keine alten Status- oder Prioritäts-Keys wie `todo`, `open`, `medium` oder `new` mehr blind an die API senden, wenn diese Einträge in gekürzten Katalogen nicht mehr vorhanden sind. Dafür werden Formular-Defaults und Board-Create-Aktionen nun gegen die tatsächlich geladenen Katalogeinträge aufgelöst. Die API setzt neue Aufgaben serverseitig auf `active`, wenn kein gültiger Status mitgegeben wird, weil dieser Status im aktuellen gekürzten Work-Status-Katalog verfügbar ist. Zusätzlich wurden Integration- und E2E-Tests mit realer Temp-DB ergänzt, die Kataloge gezielt kürzen und anschließend alle relevanten Create-Flows über echte API- beziehungsweise UI-Pfade ausführen. Bestehende Formular-Tests wurden auf die neue Default-Auflösung angepasst.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/tasks.service.ts` | geändert | Serverseitiger Task-Create-Default auf `active` umgestellt. |
| `apps/api/src/app.integration.test.ts` | geändert | Realer Integrationstest für gekürzte Kataloge und Create-Flows für Project, Milestone, Feature, Use Case, Task, Ticket und Backlog ergänzt. |
| `apps/web/src/utils/catalogs.ts` | geändert | Helper zur Auflösung tatsächlich vorhandener Katalog-Keys ergänzt. |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Status-, Task-, Ticket- und Prioritäts-Defaults katalogsicher aufgelöst. |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Status- und abhängige Create-Drafts katalogsicher aufgelöst. |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Status- und abhängige Create-Drafts katalogsicher aufgelöst. |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Milestone-Status katalogsicher aufgelöst. |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Task-, Subtask- und Ticket-Create-Werte katalogsicher aufgelöst. |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Ticket-Status und Priorität katalogsicher normalisiert und gespeichert. |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Backlog-Status katalogsicher normalisiert und gespeichert. |
| `apps/web/src/components/tasks/OwnerTaskBoard.tsx` | geändert | Board-Create-Status aus echten Work-Status-Katalogen abgeleitet. |
| `apps/web/src/components/tickets/OwnerTicketBoard.tsx` | geändert | Board-Create-Status aus echten Work-Status-Katalogen abgeleitet. |
| `apps/web/src/pages/TaskDetailPage.tsx` | geändert | Nicht-leere Statuswerte werden nicht mehr auf Legacy-Defaults zurückgebogen. |
| `apps/web/src/pages/TicketDetailPage.tsx` | geändert | Nicht-leere Statuswerte werden nicht mehr auf Legacy-Defaults zurückgebogen. |
| `apps/web/e2e/domain-test-utils.ts` | geändert | E2E-Fixtures senden keine impliziten Legacy-Defaults mehr für Status und Priorität. |
| `apps/web/e2e/catalog-defaults.spec.ts` | neu | Browser-Test für echte Create-Flows bei gekürzten Katalogen ergänzt. |
| `apps/web/e2e/freshness.spec.ts` | geändert | Erwartung an neuen Task-Default `active` angepasst. |
| `apps/web/e2e/task.spec.ts` | geändert | Erwartung an neuen Task-Default `active` angepasst. |
| `apps/web/src/components/test/ownerFormTestUtils.tsx` | geändert | Testkataloge um den real genutzten Work-Status `active` ergänzt. |

## Probleme und Abweichungen

Keine Blocker für die Create-Flows. Die Tests arbeiten mit echten temporären Datenbanken und echten HTTP/UI-Pfaden; Katalogdaten aus der DB werden in den neuen Integration- und E2E-Fällen nicht gemockt. Im Arbeitsbaum liegen weiterhin ältere, davon unabhängige Layout- und Admin-Reset-Änderungen, die in diesem Schritt nicht zurückgenommen oder umgebaut wurden.

## Offene Punkte / Folgeaufgaben

Für die hier beauftragten Create-Flows keine. Außerhalb dieses Create-Scopes sollte ein eigener Audit prüfen, ob bestehende Status-Wechsel wie Subtask-Toggles noch alte Status-Keys voraussetzen.

## Ausgeführte Prüfungen

- `npm run test -w apps/web -- TaskForm TicketForm BacklogItemForm ProjectForm FeatureForm UseCaseForm MilestoneForm` — grün, 7 Testdateien / 73 Tests.
- `npm run test -w apps/api -- app.integration.test.ts` — grün, 1 Testdatei / 3 Tests.
- `npm run e2e -w apps/web -- e2e/catalog-defaults.spec.ts` — grün, 1 Test.
- `npm run test -w apps/web` — grün, 50 Testdateien / 286 Tests.
- `npm run test -w apps/api` — grün, 28 Testdateien / 312 Tests.
- `npm run e2e -w apps/web` — grün, 47 Tests.
- `npm run build -w apps/web` — grün; Vite meldet nur die bereits übliche Chunk-Size-Warnung.
