# Log: Board Card Width

**Datum:** 17.05.26  
**Schritt:** Fix — Board Card Width  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die gemeinsamen Board- und Kartenstrukturen wurden gegen horizontales Überlaufen abgesichert. `ListBoardView` setzt jetzt `min-w-0` auf Statusspalten und Karten-Wrapper sowie `max-w-full` auf die direkten Kartencontainer. `ItemCard` setzt zusätzlich `min-w-0 max-w-full`, damit Feature-, Projekt-, Task-, Backlog- und Use-Case-Karten innerhalb ihrer jeweiligen Grid-Fläche bleiben. `CardGrid` erhält ebenfalls `min-w-0`, damit statuslose Board-Layouts nicht über ihre verfügbare Breite hinausdrücken. Die bestehenden Board-Tests wurden erweitert und prüfen nun die Breiten-Schutzklassen, die den im Screenshot sichtbaren Fehler verhindert hätten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Statusspalten, Board-Grid und Karten-Wrapper mit Breiten-Schutz versehen |
| `apps/web/src/components/ui/ItemCard.tsx` | geändert | Gemeinsame Kartenbasis auf `min-w-0 max-w-full` begrenzt |
| `apps/web/src/components/ui/CardGrid.tsx` | geändert | Statusloses CardGrid mit `min-w-0` abgesichert |
| `apps/web/src/components/ui/__tests__/ListBoardView.test.tsx` | geändert | Breiten-Schutz für Board-Grid, Spalten und ItemCard ergänzt |
| `apps/web/src/components/ui/__tests__/FeatureListBoardView.test.tsx` | geändert | Feature-Board prüft Spalten- und Kartenbegrenzung |
| `apps/web/src/components/ui/__tests__/ProjectListBoardView.test.tsx` | geändert | Projekt-Board prüft Spalten- und Kartenbegrenzung |
| `apps/web/src/components/ui/__tests__/TaskListBoardView.test.tsx` | geändert | Task-Board prüft Spalten- und Kartenbegrenzung |
| `apps/web/src/components/ui/__tests__/BacklogListBoardView.test.tsx` | geändert | Backlog-Karten prüfen Kartenbegrenzung |
| `apps/web/src/components/ui/__tests__/UseCaseListBoardView.test.tsx` | geändert | Use-Case-Karten prüfen Kartenbegrenzung |
| `logs/2026-05-17-fix-board-card-width.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine. Die vorherige Testaussage war zu pauschal: Die betroffenen Tests nannten zwar Dimensionen, prüften aber keine echten Spaltenbegrenzungen und keine Browser-Geometrie. Nach dem Fix liefen die gezielten Web-Tests erfolgreich: 6 Testdateien, 40 Tests grün, 0 rot. `npm run typecheck -w apps/web` war ebenfalls erfolgreich. Zusätzlich wurde `/features` bei 1600px Browserbreite per DOM-Bounding-Box gemessen: 25 Karten in der Aktiv-Spalte, `overflowCount: 0`, `maxRightOverflow: 0`.

## Offene Punkte / Folgeaufgaben

Keine.
