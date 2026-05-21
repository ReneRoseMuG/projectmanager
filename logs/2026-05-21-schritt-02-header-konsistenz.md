# Log: Header-Konsistenz

**Datum:** 21.05.26  
**Schritt:** 2 — Seiten-Header vereinheitlichen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Top-Level-Header für Projekte, Tickets, Features, Kalender, Wiki und Präferenzen wurden an das einheitliche Muster angeglichen. Projekte, Tickets und Features haben ihren primären Erstellen-Button im Header; die zugehörigen globalen Toolbar-Add-Buttons werden dort über `showToolbarAdd={false}` ausgeblendet. Verschachtelte Boards behalten den Toolbar-Add-Button mit sichtbarem Label. Wiki zeigt die Seitenanzahl, Kalender und Listenuntertitel nutzen `text-slate-500`, und der Präferenzen-Header hat kein Sonder-Icon mehr.

## Geänderte / angelegte Dateien

| Datei                                                       | Art      | Kurzbeschreibung                                             |
| ----------------------------------------------------------- | -------- | ------------------------------------------------------------ |
| `apps/web/src/pages/ProjectsPage.tsx`                       | geändert | Header-Button und Untertitelton ergänzt                      |
| `apps/web/src/pages/TicketsPage.tsx`                        | geändert | Header-Button und Untertitelton ergänzt                      |
| `apps/web/src/pages/FeaturesPage.tsx`                       | geändert | Header-Muster, Anzahl und Button ergänzt                     |
| `apps/web/src/pages/CalendarPage.tsx`                       | geändert | Untertitelton vereinheitlicht                                |
| `apps/web/src/pages/WikiPage.tsx`                           | geändert | dynamische Seitenanzahl ergänzt                              |
| `apps/web/src/pages/SettingsPreferencesPage.tsx`            | geändert | Icon entfernt und H1 auf `font-semibold` gesetzt             |
| `apps/web/src/components/ui/ListBoardView.tsx`              | geändert | explizites `showToolbarAdd` und sichtbares Add-Label ergänzt |
| `apps/web/src/components/projects/ProjectListBoardView.tsx` | geändert | Toolbar-Add-Konfiguration weitergereicht                     |
| `apps/web/src/components/tickets/TicketListBoardView.tsx`   | geändert | Toolbar-Add-Konfiguration weitergereicht                     |
| `apps/web/src/components/features/FeatureListBoardView.tsx` | geändert | Toolbar-Add-Konfiguration weitergereicht                     |

## Probleme und Abweichungen

Die Header-Aufgabe selbst ist umgesetzt. Die Gesamt-E2E-Abnahme bleibt wegen der unveränderten Kalender-Specs blockiert; die Header- und Listen-Flows in Projekt-, Ticket- und Feature-Specs waren im Browser-Lauf grün.

## Offene Punkte / Folgeaufgaben

Kalender-E2E separat stabilisieren, bevor die übergreifende Playwright-Abnahme als vollständig grün gelten kann.
