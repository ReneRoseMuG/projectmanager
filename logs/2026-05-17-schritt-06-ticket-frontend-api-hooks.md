# Log: Ticket-Frontend-API & Hooks

**Datum:** 17.05.26  
**Schritt:** 6 — Frontend: API Layer, Query-Keys, Invalidierung & Hooks  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Web-API-Layer für Tickets wurde neu angelegt und nutzt den bestehenden `ky`-Client ohne führende Slashes. Query Keys, Owner-Typen und Invalidierungsfunktionen wurden um Tickets erweitert. `useAttachments` und `useNotes` akzeptieren jetzt Ticket-Owner. Zusätzlich wurden `useTickets` und `useTicketDetail` für Listen, Mutationen, Sub-Tickets, Tags und Relationen angelegt. Die bestehende generische Comments-API kennt nun den Entity-Pfad `tickets`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/api/tickets.ts` | neu | Ticket-API-Funktionen für Liste, Detail, CRUD, Sub-Tickets, Relationen, Tags, Notes und Attachments |
| `apps/web/src/api/comments.ts` | geändert | `ticket` als Entity-Pfad ergänzt |
| `apps/web/src/queries/queryKeys.ts` | geändert | Ticket-Query-Keys und Ticket-Owner-Typen ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | `invalidateTicketScope` und Seed-/Tag-Invalidierung erweitert |
| `apps/web/src/hooks/useAttachments.ts` | geändert | Ticket-Owner für Anhänge ergänzt |
| `apps/web/src/hooks/useNotes.ts` | geändert | Ticket-Owner für Notizen ergänzt |
| `apps/web/src/hooks/useTickets.ts` | neu | React-Query-Hook für Ticket-Listen und Ticket-Mutationen |
| `apps/web/src/hooks/useTicketDetail.ts` | neu | React-Query-Hook für Ticket-Details, Tags, Sub-Tickets und Relationen |

## Probleme und Abweichungen

`useTickets(projectId?)` lädt ohne Projekt-ID projektübergreifend alle Tickets, damit die kommende `/tickets`-Seite direkt den globalen Modus nutzen kann. Erstellen bleibt weiterhin nur mit gültiger Projekt-ID möglich.

## Offene Punkte / Folgeaufgaben

Ticket-Komponenten, Seiten, Navigation und globale Suche müssen noch angebunden werden.
