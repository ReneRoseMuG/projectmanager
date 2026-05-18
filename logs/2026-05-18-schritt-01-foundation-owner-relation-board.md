# Log: Foundation Owner-Relation-Board

**Datum:** 18.05.26  
**Schritt:** 1 — Foundation: Komponenten, Typen, Dialog-Extraktion  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die gemeinsamen Draft-Typen für pending Aufgaben, Tickets, Use Cases, Subtasks, Kommentare und Notizen wurden ergänzt. Im Frontend wurde der lokale `DraftFile`-Typ angelegt. Außerdem wurden die Foundation-Komponenten für Owner-Relation-Boards sowie pending Relationen, Kommentare, Notizen und Dateien erstellt. Die Link-Dialoge für Aufgaben und Tickets wurden aus den bisherigen Owner-Boards in eigene Komponenten extrahiert und um `excludeIds` erweitert. Das API-Workspace besitzt nun ein `typecheck`-Script.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Draft-Typen ergänzt |
| `apps/web/src/types.ts` | geändert | `DraftFile` ergänzt |
| `apps/web/src/components/ui/OwnerRelationBoard.tsx` | neu | Generische Owner-Relation-Orchestrierung |
| `apps/web/src/components/ui/PendingRelationList.tsx` | neu | Pending-Liste für Relationen |
| `apps/web/src/components/ui/PendingCommentList.tsx` | neu | Pending-Liste für Kommentare |
| `apps/web/src/components/ui/PendingNoteList.tsx` | neu | Pending-Liste für Notizen |
| `apps/web/src/components/ui/PendingFileList.tsx` | neu | Pending-Liste für Dateien |
| `apps/web/src/components/tasks/TaskLinkDialog.tsx` | neu | Extrahierter Aufgaben-Link-Dialog |
| `apps/web/src/components/tickets/TicketLinkDialog.tsx` | neu | Extrahierter Ticket-Link-Dialog |
| `apps/api/package.json` | geändert | `typecheck`-Script ergänzt |

## Probleme und Abweichungen

Keine. Die anfänglich fehlenden Dependencies wurden nachinstalliert, `@taskmanager/shared-types` wurde gebaut und die Typechecks laufen inzwischen erfolgreich.

## Offene Punkte / Folgeaufgaben

Keine.
