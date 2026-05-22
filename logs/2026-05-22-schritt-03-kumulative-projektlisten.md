# Log: Kumulative Projektlisten

**Datum:** 22.05.26  
**Schritt:** 3 — Kumulative Projektlisten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Aufgaben und Tickets werden in Projektlisten nun kumulativ angezeigt, wenn sie direkt am Projekt hängen oder über einen Meilenstein desselben Projekts fachlich zum Projekt gehören. Direkte Projektzuordnungen bleiben vorrangig, damit ein Objekt nicht doppelt erscheint, wenn es zusätzlich über einen Meilenstein erreichbar ist. Für sichtbar geerbte Einträge wird ein `visibleParent`-Kontext geliefert, der in Cards und List Items kenntlich macht, ob der sichtbare Parent das Projekt oder ein Meilenstein ist. Link-Kandidaten berücksichtigen diese kumulative Sicht ebenfalls, damit bereits sichtbar zugeordnete Einträge nicht erneut angeboten werden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | `VisibleParentContext` und optionale Parent-Informationen für Aufgaben und Tickets ergänzt |
| `apps/api/src/services/tasks.service.ts` | geändert | Kumulative Projektabfrage und sichtbaren Parent für Aufgaben umgesetzt |
| `apps/api/src/services/tickets.service.ts` | geändert | Kumulative Projektabfrage und sichtbaren Parent für Tickets umgesetzt |
| `apps/web/src/components/ui/ParentBadge.tsx` | neu | Sichtbaren Parent als Badge für Cards und Rows dargestellt |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Parent-Badge in Aufgaben-Card und Aufgaben-Row integriert |
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Parent-Badge in Ticket-Card und Ticket-Row integriert |
| `tests/integration/api/tasks.test.ts` | geändert | Kumulative Projekt-Aufgabenliste mit direktem und Meilenstein-Parent getestet |
| `tests/integration/api/tickets.test.ts` | geändert | Kumulative Projekt-Ticketliste mit direktem und Meilenstein-Parent getestet |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine fachlichen offenen Punkte in diesem Schritt. Der nachgelagerte volle Testlauf enthält rote Tests, die im Abschlussbericht benannt sind.
