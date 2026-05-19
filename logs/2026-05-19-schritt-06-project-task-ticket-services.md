# Log: Project-, Task- und Ticket-Services

**Datum:** 19.05.26  
**Schritt:** 6 — Project-, Task- und Ticket-Services  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Für Projekte, Tasks und Tickets wurden Entity-Repositories unter `apps/api/src/repositories/` angelegt. Create, Update und Delete der drei Kernobjekte laufen nun über diese Repositories; Updates verlangen `expectedVersion`, inkrementieren `version` und nutzen die gemeinsame Versionsprüfung aus `base.repository.ts`. Die Update-Routen für Projects, Tasks, Task-Board-Positionen, Tickets und Ticket-Positionen wurden auf den strikten API-Vertrag verschärft. Die Response-DTOs für Tasks und Tickets enthalten nun ebenfalls `version`. Web-Aufrufe, die vorhandene Detailobjekte bearbeiten, senden die jeweilige Objektversion mit; reine Test-Fixtures wurden um neue Pflichtfelder ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/repositories/project.repository.ts` | neu | Repository für Project-Create und versionierte Project-Updates |
| `apps/api/src/repositories/task.repository.ts` | neu | Repository für Task-CRUD und versionierte Task-Updates |
| `apps/api/src/repositories/ticket.repository.ts` | neu | Repository für Ticket-CRUD und versionierte Ticket-Updates |
| `apps/api/src/services/projects.service.ts` | geändert | Project-Create und Project-Update auf Repository umgestellt |
| `apps/api/src/services/tasks.service.ts` | geändert | Task-Create, Task-Update und Task-Delete auf Repository umgestellt |
| `apps/api/src/services/tickets.service.ts` | geändert | Ticket-Create, Ticket-Update, Ticket-Position und Ticket-Delete auf Repository umgestellt |
| `apps/api/src/routes/projects.ts` | geändert | `expectedVersion` für Project-PATCH verpflichtend gemacht |
| `apps/api/src/routes/tasks.ts` | geändert | `expectedVersion` für Task-PATCH und Task-Board-PATCH verpflichtend gemacht |
| `apps/api/src/routes/tickets.ts` | geändert | `expectedVersion` für Ticket-PATCH und Ticket-Position-PATCH verpflichtend gemacht |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Project-Updates senden `expectedVersion` |
| `apps/web/src/pages/TaskDetailPage.tsx` | geändert | Task-Updates senden `expectedVersion` |
| `apps/web/src/components/tasks/SubtaskList.tsx` | geändert | Subtask-Statuswechsel senden `expectedVersion` |
| `apps/web/src/pages/TicketDetailPage.tsx` | geändert | Ticket-Updates senden `expectedVersion` |
| `apps/web/src/components/tickets/TicketDetail.tsx` | geändert | Ticket-Detail-Updates senden `expectedVersion` |
| `apps/web/src/components/test/ownerFormTestUtils.tsx` | geändert | Test-Fixtures um neue DTO-Pflichtfelder ergänzt |
| `apps/web/src/components/ui/__tests__/factories.ts` | geändert | Test-Fixtures um `version` ergänzt |
| `apps/web/src/components/ui/__tests__/CommentThread.integration.test.tsx` | geändert | Comment-Fixtures an `owners`, `updatedAt` und `version` angepasst |
| `apps/web/src/components/ui/__tests__/CommentThread.test.tsx` | geändert | Comment-Fixtures an `owners`, `updatedAt` und `version` angepasst |
| `apps/web/src/hooks/__tests__/queryMutations.integration.test.tsx` | geändert | Task-Fixture um `version` ergänzt |
| `packages/shared-types/src/index.ts` | geändert | `Project`, `Task`, `Ticket` und Update-Typen versioniert |
| `logs/2026-05-19-schritt-06-project-task-ticket-services.md` | neu | Schritt-Log für Aufgabe 06 |
| `logs/README.md` | geändert | Log-Index um Aufgabe 06 ergänzt |

## Probleme und Abweichungen

`npm run build -w packages/shared-types`, `npm run build -w apps/api` und `npm run build -w apps/web` wurden erfolgreich ausgeführt. Beim Web-Build mussten reine Fixture-Daten an den neuen DTO-Vertrag angepasst werden, damit der Produktionsbuild wieder typisiert durchläuft.

`npm run test -w apps/api -- tests/integration/projects.test.ts tests/integration/tasks.test.ts tests/integration/subtasks.test.ts tests/integration/tickets.test.ts` wurde ausgeführt. Ergebnis: 62 Tests grün, 10 Tests rot. Alle roten Tests senden noch den alten PATCH-Vertrag ohne `expectedVersion`; dadurch antworten die betroffenen Routen mit 400 statt der bisherigen erwarteten 200/404. Gemäß Auftrag wurden daraus keine Test- oder Produktionscode-Fixes abgeleitet.

## Offene Punkte / Folgeaufgaben

Die Integrationstests für Projects, Tasks, Subtasks und Tickets müssen in einem separaten Folgeauftrag auf den neuen API-Vertrag angepasst und um 409-Konfliktfälle erweitert werden. Die Board-/Position-Update-Flows benötigen dabei jeweils die aktuelle Objektversion im Payload.
