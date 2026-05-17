# Log: Ticket-Routes

**Datum:** 17.05.26  
**Schritt:** 4 — Backend: Tickets Routes  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Route-Datei `tickets.ts` wurde neu angelegt und in `app.ts` unter `/api` registriert. Enthalten sind Endpunkte für projektübergreifende Listen, projektbezogene Listen, Erstellen, Details, Aktualisieren, Positionieren und Löschen von Tickets. Außerdem wurden Sub-Ticket- und Relation-Endpunkte ergänzt. Alle neuen Endpunkte besitzen Fastify-Schemas für Params und Bodies und nutzen die bestehende Fehlerbehandlung.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/tickets.ts` | neu | Fastify-Routes für Tickets, Sub-Tickets, Relationen und Ticket-Querschnittsdaten |
| `apps/api/src/app.ts` | geändert | Ticket-Routes registriert |

## Probleme und Abweichungen

Die Tags-, Notes-, Comments- und Attachment-Routen wurden direkt vollständig umgesetzt statt mit einem 501-Placeholder zu starten, weil die Shared-Infrastruktur im nächsten Schritt ohnehin Voraussetzung für kompilierten Service-Code ist.

## Offene Punkte / Folgeaufgaben

Keine.
