# Log: Delete-Cascade-Cleanup

**Datum:** 17.05.26  
**Schritt:** Fix — Delete-Cascade-Cleanup  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die im Audit beschriebenen Löschlücken wurden in den bestehenden Service-Funktionen geschlossen. Polymorphe Kommentare werden vor dem Löschen der jeweiligen Elternentität explizit über `entityType` und `entityId` entfernt. Eigenständige Notes werden vor Project-, Task- und Ticket-Löschungen über ihre Join-Tabellen ermittelt und gelöscht, damit keine Note-Datensätze ohne Träger zurückbleiben. Attachment-Dateien und Preview-Dateien werden vor kaskadierenden Eltern-Deletes über zentrale Cleanup-Helfer entfernt. Zusätzlich löscht `setFeatureRelations` beim Ersetzen nun eingehende und ausgehende Relationen der betroffenen Feature.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/comments.service.ts` | geändert | Cleanup-Helfer für einzelne und mehrere polymorphe Kommentar-Träger ergänzt |
| `apps/api/src/services/notes.service.ts` | geändert | Cleanup-Helfer für Project-, Task- und Ticket-Notes ergänzt |
| `apps/api/src/services/attachments.service.ts` | geändert | Cleanup-Helfer für Attachment-Records, Upload-Dateien und Previews ergänzt |
| `apps/api/src/services/projects.service.ts` | geändert | Project-Delete räumt abhängige Comments, Notes und Attachments auf |
| `apps/api/src/services/tasks.service.ts` | geändert | Task-Delete räumt Task-Subtree-Comments, Notes und Attachments auf |
| `apps/api/src/services/tickets.service.ts` | geändert | Ticket-Delete räumt Ticket-Subtree-Comments, Notes und Attachments auf |
| `apps/api/src/services/features.service.ts` | geändert | Feature-Delete räumt Feature-/UseCase-Comments und Feature-Attachments auf |
| `apps/api/src/services/use-cases.service.ts` | geändert | UseCase-Delete räumt Kommentare auf |
| `apps/api/src/services/backlog.service.ts` | geändert | Backlog-Delete räumt Kommentare auf |
| `apps/api/src/services/wiki.service.ts` | geändert | WikiPage-Delete räumt Kommentare auf |
| `apps/api/src/services/doc-links.service.ts` | geändert | Feature-Relations-Reset löscht eingehende und ausgehende Relationen |
| `apps/api/src/routes/projects.ts` | geändert | Delete-Route wartet asynchronen Cleanup ab |
| `apps/api/src/routes/tasks.ts` | geändert | Delete-Route wartet asynchronen Cleanup ab |
| `apps/api/src/routes/tickets.ts` | geändert | Delete-Route wartet asynchronen Cleanup ab |
| `apps/api/src/routes/features.ts` | geändert | Delete-Route wartet asynchronen Cleanup ab |
| `logs/2026-05-17-fix-delete-cascade-cleanup.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine. Der API-Build wurde mit `npm run build -w apps/api` erfolgreich ausgeführt.

## Offene Punkte / Folgeaufgaben

Der volle Testlauf wurde gemäß Abschluss-Workflow noch nicht ausgeführt und steht nach Nutzerfreigabe aus.
