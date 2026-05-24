# Log: Copy Reference im Menü

**Datum:** 23.05.26  
**Schritt:** Feature — Copy Reference im Menü  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Kopierfunktion für Objekt-Referenzen wurde aus dem separaten Icon der Cards und Listview-Items in das jeweilige Item-Menü verschoben. `ActionMenu` kann nun optional eine `objectReference` erhalten und rendert dafür den Menüpunkt „ID kopieren“. `ItemCard`, `ItemRow` und `PlanningItemCard` geben Referenzen an das Menü weiter, statt ein eigenes Copy-Icon neben dem Menü zu zeigen. Die betroffenen Projekt-, Feature-, Use-Case-, Task-, Ticket- und Meilenstein-Item-Komponenten wurden an die zentrale Menülogik angeschlossen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ActionMenu.tsx` | geändert | Optionaler Menüpunkt zum Kopieren von Objekt-Referenzen ergänzt |
| `apps/web/src/components/ui/ItemCard.tsx` | geändert | Separates Copy-Icon entfernt und Referenz ins Menü verschoben |
| `apps/web/src/components/ui/ItemRow.tsx` | geändert | Separates Copy-Icon entfernt und Referenz-Menüunterstützung ergänzt |
| `apps/web/src/components/ui/PlanningItemCard.tsx` | geändert | Objekt-Referenzen an Card- und Row-Menüs weitergereicht |
| `apps/web/src/components/features/FeatureCard.tsx` | geändert | Feature-Card und Feature-Row an Referenz-Menü angebunden |
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | Feature-Zeilen im Projektpanel an Referenz-Menü angebunden |
| `apps/web/src/components/features/FeatureProjectPanel.tsx` | geändert | Projekt-Cards und Projekt-Zeilen im Featurepanel an Referenz-Menü angebunden |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Task-Card und Task-Row an Referenz-Menü angebunden |
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Ticket-Card und Ticket-Row an Referenz-Menü angebunden |
| `apps/web/src/components/usecases/UseCaseCard.tsx` | geändert | Use-Case-Card und Use-Case-Row an Referenz-Menü angebunden |
| `tests/unit/web/components/ui/ActionMenu.test.tsx` | geändert | Unit-Test für Kopieren aus dem Menü ergänzt |
| `logs/2026-05-23-feature-copy-reference-im-menue.md` | neu | Schritt-Log für die UI-Änderung |
| `logs/README.md` | geändert | Log-Index um den neuen Eintrag ergänzt |

## Probleme und Abweichungen

Der erste gezielte Testlauf schlug fehl, weil eine bestehende `ActionMenu`-Test-Erwartung noch `h-8 w-8` erwartete, während die Komponente bereits `h-9 w-[36px]` verwendet. Die Test-Erwartung wurde an den vorhandenen Komponentenstand angepasst. Keine Produktionscode-Abweichung.

## Offene Punkte / Folgeaufgaben

Keine.

## Testleitplanken

Der Testentwurfs-Skill wurde angewendet. Testebene: Web-Unit-Test mit JSDOM. Beobachtbares Verhalten: Nach Öffnen des Menüs und Klick auf „ID kopieren“ wird die Objekt-Referenz per `navigator.clipboard.writeText` geschrieben und das Menü geschlossen. Echte Daten sind nicht erforderlich; Clipboard wurde als externer Browser-Seiteneffekt im Unit-Test gemockt.
