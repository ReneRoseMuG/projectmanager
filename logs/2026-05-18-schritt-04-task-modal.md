# Log: TaskModal

**Datum:** 18.05.26  
**Schritt:** 4 — TaskModal ersetzt TaskForm und TaskDetail  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das neue `TaskModal` bündelt Aufgabe anlegen und bearbeiten in einem Formular. Es enthält Tabs für Details, Subtasks, Tickets, Kommentare, Notizen und Dateien. Im Create-Modus werden Subtasks, Tickets, Kommentare, Notizen und Dateien pending gesammelt; im Edit-Modus werden die vorhandenen Detail-Hooks, OwnerTicketBoard, CommentThread, NoteList und Attachment-Komponenten genutzt. `OwnerTaskBoard` öffnet nun `TaskModal` und verarbeitet Pending-Daten nach der Task-Erstellung seriell. Die alten `TaskForm`- und `TaskDetail`-Dateien wurden nach der Import-Migration entfernt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/TaskModal.tsx` | neu | Einheitliches Task-Create/Edit-Modal |
| `apps/web/src/components/tasks/OwnerTaskBoard.tsx` | geändert | TaskModal integriert und Pending-Post-Create verarbeitet |
| `apps/web/src/components/tasks/TaskForm.tsx` | gelöscht | Durch TaskModal ersetzt |
| `apps/web/src/components/tasks/TaskDetail.tsx` | gelöscht | Durch TaskModal ersetzt |
| `apps/web/src/components/__tests__/OwnerForms.test.tsx` | neu | TaskModal-Create/Edit-Verhalten getestet |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Playwright-E2E konnte wegen eines lokalen `tsx`/`esbuild`-Startfehlers nicht ausgeführt werden.
