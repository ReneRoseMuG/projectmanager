# Log: Katalog-Geschlossen-Status

**Datum:** 23.05.26  
**Schritt:** Fix — Katalog-Geschlossen-Status  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Statusauswertung für Aufgaben- und Ticket-Dashboarddaten wurde auf die Katalogspalte `isClosed` umgestellt. Projekt- und Meilenstein-Zähler werten damit beliebige geschlossene WorkStatus-Einträge als erledigt, unabhängig von Schlüssel oder Label. Die Dashboardlisten für aktuelle Aufgaben und Tickets filtern geschlossene Katalogstatus heraus. Zusätzlich wurden UI-Stellen bereinigt, die Überfälligkeit, Ticket-Lösung oder Subtask-Fortschritt bisher an feste Statusschlüssel gebunden hatten.

Bei den Tests wurden die Testentwurfsleitplanken angewendet. Testebenen: API-Integration mit echter isolierter SQLite-Testdatenbank und Web-Unit-Test für die lokale Counter-Ableitung. Abgedeckt wird insbesondere der Fall eines frei benannten geschlossenen Katalogstatus, damit die bisherige Testlücke nicht wieder entsteht.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/catalogs.service.ts` | geändert | Helper für geschlossene Katalogschlüssel ergänzt |
| `apps/api/src/services/projects.service.ts` | geändert | Projekt-Aufgabenzähler nutzt `isClosed` |
| `apps/api/src/services/milestones.service.ts` | geändert | Meilenstein-Aufgabenzähler nutzt `isClosed` |
| `apps/api/src/services/tasks.service.ts` | geändert | Aktuelle und überfällige Aufgaben filtern über `isClosed` |
| `apps/api/src/services/tickets.service.ts` | geändert | Aktuelle Tickets filtern über `isClosed`; geschlossene Erstellung setzt `resolvedAt` |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Überfälligkeit nutzt Katalogstatus |
| `apps/web/src/components/tasks/SubtaskList.tsx` | geändert | Subtask-Fortschritt und Toggle nutzen Katalogstatus |
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Ticket-Überfälligkeit nutzt Katalogstatus |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Lösungsfeld und Payload nutzen Katalogstatus |
| `apps/web/src/utils/projectTaskStats.ts` | geändert | Lokale Task-Counter nutzen Katalogstatus |
| `tests/integration/api/dashboard-widgets.test.ts` | geändert | Testlücke für aktuelle Aufgaben/Tickets mit freiem geschlossenem Status geschlossen |
| `tests/integration/api/milestones.test.ts` | geändert | Meilenstein-Zähler mit freiem geschlossenem Status abgesichert |
| `tests/integration/api/projects.test.ts` | geändert | Projekt-Zähler mit freiem geschlossenem Status abgesichert |
| `tests/unit/web/utils/projectTaskStats.test.ts` | geändert | Web-Counter mit `isClosed` abgesichert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
