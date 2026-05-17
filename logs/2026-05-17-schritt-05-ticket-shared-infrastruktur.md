# Log: Ticket-Shared-Infrastruktur

**Datum:** 17.05.26  
**Schritt:** 5 — Backend: Shared Infrastruktur für Tickets  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Tags, Notes, Attachments und Comments wurden um Ticket-Unterstützung erweitert. Der Tags-Service kennt jetzt Ticket-Tags inklusive Mapping-Funktionen und Setzen per `setTicketTags`. Der Notes-Service kann Ticket-Notizen listen, anlegen und über die Ticket-Verknüpfung löschen. Der Attachments-Service kann Anhänge für Tickets listen und hochladen. Der Comments-Service validiert `ticket` als generischen Entity-Type und die Ticket-Routes stellen die entsprechenden Endpunkte bereit.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/tags.service.ts` | geändert | Ticket-Tags lesen, mappen und setzen |
| `apps/api/src/services/notes.service.ts` | geändert | Ticket-Notizen lesen, anlegen und entfernen |
| `apps/api/src/services/attachments.service.ts` | geändert | Ticket-Anhänge lesen und hochladen |
| `apps/api/src/services/comments.service.ts` | geändert | `ticket` als generischen Kommentar-Entity-Type validieren |
| `apps/api/src/routes/tickets.ts` | geändert | Ticket-Endpunkte für Tags, Notes, Comments und Attachments |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Frontend-API, Query-Hooks und UI müssen die neuen Backend-Endpunkte noch verwenden.
