# Log: Ticket-Komponenten

**Datum:** 17.05.26  
**Schritt:** 7 — Frontend: Komponenten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Ticket-Labels und Tones wurden zentral in `domainLabels.ts` ergänzt. Unter `components/tickets/` wurden TicketCard, TicketForm, TicketDetail, TicketRelationPanel, TicketListBoardView und ProjectTicketPanel angelegt. Die Komponenten nutzen die vorhandenen UI-Bausteine wie `ItemCard`, `ItemRow`, `ListBoardView`, `FormModal`, `Section`, `FormField`, `RadioList`, `TagPicker`, `CommentThread`, `NoteList` und Attachment-Komponenten. Ticket-Details zeigen schreibgeschützte Kernfelder und öffnen für Änderungen das Ticket-Formular. Projekt-Tickets können als Board oder Liste angezeigt, erstellt, geöffnet und gelöscht werden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/utils/domainLabels.ts` | geändert | Labels und Tones für Ticket-Status, Typ, Schweregrad, Lösung und Relation |
| `apps/web/src/components/tickets/TicketCard.tsx` | neu | Karten- und Zeilenansicht für Tickets |
| `apps/web/src/components/tickets/TicketForm.tsx` | neu | Formularmodal für Ticket-Erstellung und Bearbeitung |
| `apps/web/src/components/tickets/TicketDetail.tsx` | neu | Detailmodal mit Details, Sub-Tickets, Relationen, Kommentaren, Notizen und Dateien |
| `apps/web/src/components/tickets/TicketRelationPanel.tsx` | neu | Panel für Ticket-Relationen |
| `apps/web/src/components/tickets/TicketListBoardView.tsx` | neu | Ticket-spezifischer Adapter auf `ListBoardView` |
| `apps/web/src/components/tickets/ProjectTicketPanel.tsx` | neu | Ticket-Panel für Projektdetails |

## Probleme und Abweichungen

Die Detailansicht bearbeitet Tickets über `TicketForm`, statt alle Felder inline im Detailformular zu duplizieren. Für Sub-Ticket-Erstellung werden Tags nach dem Anlegen separat gesetzt, weil die Create-API Tags bewusst über den bestehenden Tag-Endpunkt verwaltet.

## Offene Punkte / Folgeaufgaben

Tickets müssen noch in Seiten, Routing, Sidebar, ProjectDetailPage und globale Suche eingebunden werden.
