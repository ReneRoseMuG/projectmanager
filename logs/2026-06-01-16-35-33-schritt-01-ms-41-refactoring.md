# Log: MS-41 Refactoring Kommentare, Notizen und Create-Relationen

**Datum:** 01.06.26  
**Uhrzeit:** 16:35:33  
**Schritt:** 1 — MS-41 Refactoring ohne Journaldichte  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

MS-41 wurde ohne Änderungen an Journaldichte, Journal-Filterung oder No-Effect-Journal-Einträgen umgesetzt. Kommentar-Richtext wird beim Bearbeiten wieder in den Editor synchronisiert, und Dashboard-Kommentarvorschauen zeigen keine rohen HTML-Tags mehr. Der Notizeditor hält nach erfolgreichem Speichern die zurückgelieferte Version lokal nach, damit Autosave und manuelles Speichern nicht mit veralteter `expectedVersion` kollidieren. Task-Create und Milestone-Create nutzen für Tickets beziehungsweise Aufgaben/Tickets die bestehenden List-/Board-Views mit lokalen Drafts und Verknüpfen-Aktionen. Die Link-Kandidaten-Endpunkte unterstützen zusätzlich einen Kontextmodus für unsaved Create-Flows, ohne bestehende Owner-Modi zu entfernen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Editor-Synchronisierung für HTML- und Legacy-Markdown-Werte stabilisiert |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | Kommentarvorschauen werden als Plaintext aus Richtext gerendert |
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | Lokale Version und zuletzt gespeicherter Inhalt nach Save aktualisiert |
| `apps/web/src/components/ui/PendingNoteList.tsx` | geändert | Pending-Notizen speichern Titel und Richtext-Inhalt als Draft |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Ticket-Create-Tab auf lokale Ticket-List-/Board-View mit Draft- und Link-Aktion umgestellt |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Aufgaben- und Ticket-Create-Tabs auf lokale List-/Board-Views mit Draft- und Link-Aktion umgestellt |
| `apps/web/src/pages/MilestoneDetailPage.tsx` | geändert | Vorgemerkte Aufgaben und Tickets nach Milestone-Save seriell erstellt oder verknüpft |
| `apps/web/src/components/tasks/TaskLinkDialog.tsx` | geändert | Optionaler Kontext-Owner für Create-Flows ergänzt |
| `apps/web/src/components/tickets/TicketLinkDialog.tsx` | geändert | Optionaler Kontext-Owner für Create-Flows ergänzt |
| `apps/web/src/api/tasks.ts` | geändert | Task-Link-Kandidaten-Client um Kontextparameter erweitert |
| `apps/web/src/api/tickets.ts` | geändert | Ticket-Link-Kandidaten-Client um Kontextparameter erweitert |
| `apps/web/src/utils/draftRelations.ts` | neu | Lokale Task-/Ticket-Drafts in Board-Items gemappt |
| `apps/api/src/routes/tasks.ts` | geändert | Link-Candidates-Query um optionalen Kontextmodus erweitert |
| `apps/api/src/routes/tickets.ts` | geändert | Link-Candidates-Query um optionalen Kontextmodus erweitert |
| `apps/api/src/services/tasks.service.ts` | geändert | Kontextkompatible Task-Kandidaten ohne Owner-Ausschluss ermittelt |
| `apps/api/src/services/tickets.service.ts` | geändert | Kontextkompatible Ticket-Kandidaten ohne Owner-Ausschluss ermittelt |

## Probleme und Abweichungen

Keine fachliche Abweichung vom Plan. Die vorbestehenden Änderungen in Wiki-Dateien gehörten nicht zum MS-41-Scope und wurden nicht für diese Umsetzung bearbeitet.

## Offene Punkte / Folgeaufgaben

Die API- und Browser-Abschlussläufe sind durch lokale MySQL-Anmeldedaten blockiert und werden im separaten Testlog dokumentiert.
