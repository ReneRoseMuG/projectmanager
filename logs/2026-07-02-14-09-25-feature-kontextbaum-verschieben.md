# Log: Kontextbaum Verschieben

**Datum:** 02.07.26  
**Uhrzeit:** 14:09:25  
**Schritt:** Feature — Kontextbaum Verschieben  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Verschieben-Funktion wurde über einen neuen Projekt-Kontextbaum umgesetzt. Der Baum startet bei einem Projekt und enthält Meilensteine, Aufgaben, Tickets und Notizen; Aufgaben und Tickets können verschachtelte Ziele enthalten. Für Aufgaben, Tickets und Notizen wurden API-Endpunkte zum Verschieben ergänzt und im Frontend über Card- und Listenmenüs angebunden. Der Tree-Dialog lädt den Kontext passend zum aktuellen Owner und erlaubt nur fachlich gültige Ziele. Notizen werden per Relation umgehängt, Aufgaben und Tickets aktualisieren zusätzlich ihre Parent-/Owner-Zuordnung mit Versionsprüfung.

Testleitplanken wurden angewendet: Betroffen sind API-/Service-Integration, Web-Komponenten und TanStack-Query-Hooks; beobachtbares Verhalten ist das Öffnen des Zielbaums aus bestehenden Menüs und das Persistieren des neuen Parents. Es wurden keine Schemaänderungen vorgenommen, daher war keine Migration erforderlich.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Move- und Kontextbaum-Typen ergänzt |
| `apps/api/src/services/project-context-tree.service.ts` | neu | Projekt-Kontextbaum und Owner-zu-Projekt-Auflösung |
| `apps/api/src/routes/projects.ts` | geändert | Kontextbaum-Endpunkte ergänzt |
| `apps/api/src/routes/tasks.ts` | geändert | Aufgaben-Verschieben-Endpunkt ergänzt |
| `apps/api/src/routes/tickets.ts` | geändert | Ticket-Verschieben-Endpunkt ergänzt |
| `apps/api/src/routes/notes.ts` | geändert | Notiz-Verschieben-Endpunkt ergänzt |
| `apps/api/src/services/tasks.service.ts` | geändert | Aufgaben-Verschieben mit Owner-/Parent-Regeln |
| `apps/api/src/services/tickets.service.ts` | geändert | Ticket-Verschieben mit Owner-/Parent-Regeln |
| `apps/api/src/services/notes.service.ts` | geändert | Notiz-Relationen von Quelle auf Ziel verschoben |
| `apps/api/src/repositories/task.repository.ts` | geändert | `parentId` in Update-Daten aufgenommen |
| `apps/api/src/repositories/ticket.repository.ts` | geändert | `parentId` in Update-Daten aufgenommen |
| `apps/web/src/api/project-context-tree.ts` | neu | Web-API für Kontextbaum |
| `apps/web/src/hooks/useProjectContextTree.ts` | neu | Query-Hook für Kontextbaum |
| `apps/web/src/components/ui/ProjectContextTreeDialog.tsx` | neu | Tree-Auswahldialog für Verschieben |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Menüaktion „Verschieben“ ergänzt |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | Move-Handler in Card/List View weitergereicht |
| `apps/web/src/components/tasks/OwnerTaskBoard.tsx` | geändert | Aufgaben-Verschieben aus Owner-Boards angebunden |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Subtask- und Notiz-Verschieben angebunden |
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Menüaktion „Verschieben“ ergänzt |
| `apps/web/src/components/tickets/TicketListBoardView.tsx` | geändert | Move-Handler in Card/List View weitergereicht |
| `apps/web/src/components/tickets/OwnerTicketBoard.tsx` | geändert | Ticket-Verschieben aus Owner-Boards angebunden |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Subticket- und Notiz-Verschieben angebunden |
| `apps/web/src/components/notes/NoteCard.tsx` | geändert | Menüaktion „Verschieben“ ergänzt |
| `apps/web/src/components/notes/NoteListViewItem.tsx` | geändert | Menüaktion „Verschieben“ ergänzt |
| `apps/web/src/components/notes/NoteList.tsx` | geändert | Notiz-Move-Dialog in ownergebundenen Listen angebunden |
| `apps/web/src/hooks/useTasks.ts` | geändert | Move-Mutation und Invalidierung ergänzt |
| `apps/web/src/hooks/useTaskDetail.ts` | geändert | Subtask-Move-Mutation ergänzt |
| `apps/web/src/hooks/useTickets.ts` | geändert | Move-Mutation und Invalidierung ergänzt |
| `apps/web/src/hooks/useTicketDetail.ts` | geändert | Subticket-Move-Mutation ergänzt |
| `apps/web/src/hooks/useNotes.ts` | geändert | Notiz-Move-Mutation und Invalidierung ergänzt |
| `apps/web/src/queries/queryKeys.ts` | geändert | Kontextbaum-Query-Key ergänzt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Projekt-Notizen an Verschieben angebunden |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Meilenstein-Notizen an Verschieben angebunden |

## Probleme und Abweichungen

Der API-Gesamttestlauf `npm run test -w apps/api` wurde nach 122 Sekunden durch Timeout und anschließendem `EPIPE` in der Vitest-Ausgabe abgebrochen; ein fachlicher Assertion-Fehler wurde dadurch nicht belastbar sichtbar. Der Web-Gesamttestlauf `npm run test -w apps/web` schlug mit 39 Fehlern in 22 Testdateien fehl. Ein unmittelbar durch diese Änderung verursachter `NoteList`-Provider-Fehler wurde korrigiert; der gezielte Test `npm run test -w apps/web -- ../../tests/unit/web/components/notes/NoteList.test.tsx` ist danach grün. Die übrigen Web-Fehler betreffen vor allem bestehende Board-Selector-/Layout-Erwartungen und einen bestehenden Mock-Fehler bei `useDayPlanEvents`.

Erfolgreich verifiziert wurden `npm run build -w packages/shared-types`, `npm run build -w apps/api` und `npm run build -w apps/web`. Der Web-Build meldet nur die bestehende Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Die vollständige Testsuite sollte in einem separaten Folgeauftrag bereinigt oder mit stabileren Zieltests für die neue Move-Funktion ergänzt werden. Insbesondere fehlen noch dedizierte Integrationstests für die neuen Verschieben-Endpunkte und UI-Tests für die Tree-Auswahl aus Card- und Listenmenüs.
