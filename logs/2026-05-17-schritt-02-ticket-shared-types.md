# Log: Ticket-Shared-Types

**Datum:** 17.05.26  
**Schritt:** 2 — Shared Types  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die gemeinsamen TypeScript-Typen wurden um Tickets erweitert. Ergänzt wurden zentrale Ticket-Konstanten und Typen für Typ, Status, Schweregrad, Lösung und Relation. Außerdem wurden `Ticket`, `TicketDetail`, `TicketInput`, `TicketUpdate`, `TicketPositionInput` und `TicketRelationInput` exportiert. Der bestehende `CommentEntityType` enthält jetzt `ticket`, und `Attachment` enthält `ticketId`. Das Shared-Types-Paket wurde anschließend erfolgreich gebaut.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Ticket-Typen und erweiterte Entity-/Attachment-Typen ergänzt |
| `packages/shared-types/src/index.js` | geändert | Build-Artefakt aus `npm run build` |
| `packages/shared-types/src/index.js.map` | geändert | Build-Artefakt aus `npm run build` |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Backend-Service, Routen und Querschnitts-Endpunkte müssen die neuen Typen nun verwenden.
