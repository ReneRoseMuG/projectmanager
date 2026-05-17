# Log: Ticket-Service

**Datum:** 17.05.26  
**Schritt:** 3 — Backend: Tickets Service  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der neue Service `tickets.service.ts` wurde angelegt. Er stellt Listen-, Detail-, Create-, Update-, Positionierungs- und Delete-Funktionen für Tickets bereit und orientiert sich am bestehenden Task-Service. Sub-Tickets übernehmen das Projekt des Eltern-Tickets und werden über `parentId` verwaltet. Ticket-Relationen können ausgehend und eingehend gelesen, angelegt und gelöscht werden; Self-Relationen und Duplikate werden abgefangen. `resolvedAt` wird automatisch gesetzt, wenn ein Ticket per Update oder Positionsänderung in `resolved` oder `closed` wechselt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/tickets.service.ts` | neu | Business-Logik für Tickets, Sub-Tickets und Ticket-Relationen |

## Probleme und Abweichungen

Die Relationseinträge erhalten weiterhin eine berechnete numerische ID, da die Relationstabelle keine eigene ID-Spalte besitzt. Zusätzlich wird beim Löschen einer Relation auch die Gegenrichtung akzeptiert, damit eingehende Relationen aus der Detailansicht entfernt werden können.

## Offene Punkte / Folgeaufgaben

Keine.
