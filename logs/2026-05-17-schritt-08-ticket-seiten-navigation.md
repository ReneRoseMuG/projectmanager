# Log: Ticket-Seiten & Navigation

**Datum:** 17.05.26  
**Schritt:** 8 — Frontend: Seiten & Navigation  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die neue Seite `/tickets` wurde angelegt und im Router registriert. Sie zeigt Tickets projektübergreifend oder gefiltert nach Projekt und nutzt die Ticket-Listen-/Board-Komponenten sowie Ticket-Detail und Ticket-Form. Die Sidebar enthält jetzt den Navigationseintrag „Tickets" zwischen Projekte und Features. `ProjectDetailPage` wurde um einen Ticket-Tab erweitert, der `ProjectTicketPanel` rendert. Die Projekt-Tab-Zähler berücksichtigen nun Tickets.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/TicketsPage.tsx` | neu | Projektübergreifende Ticket-Seite mit Projektfilter |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Ticket-Tab und Ticket-Zähler ergänzt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Navigationseintrag „Tickets" ergänzt |
| `apps/web/src/App.tsx` | geändert | Route `/tickets` registriert |
| `apps/web/src/components/tickets/TicketListBoardView.tsx` | geändert | Filter-Slot für die Ticket-Seite ergänzt |

## Probleme und Abweichungen

Auf der projektübergreifenden Ticket-Seite wird beim Erstellen ohne aktiven Projektfilter das erste vorhandene Projekt als Ziel verwendet. Gibt es kein Projekt, wird die Erstellung mit Fehlermeldung abgebrochen.

## Offene Punkte / Folgeaufgaben

Die globale Suche muss Tickets noch laden und anzeigen.
