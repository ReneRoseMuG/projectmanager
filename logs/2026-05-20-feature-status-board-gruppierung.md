# Log: Status-Board-Gruppierung

**Datum:** 20.05.26  
**Schritt:** Feature — Status-Board-Gruppierung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die gemeinsame `ListBoardView` kennt nun einen expliziten `statusCatalogKind`, damit Boards und Listen eindeutig zwischen Arbeitsstatus und Feature-Status unterscheiden können. Statusspalten werden zentral aus dem jeweiligen Katalog abgeleitet oder aus bereits übergebenen Spalten sortiert übernommen. Die Board-Ansicht sortiert Karten in Statusspalten ein und hängt Items mit unbekanntem oder fehlendem Status in zusätzliche Gruppen am Ende, damit keine Daten aus der Darstellung verschwinden. Die Listenansicht gruppiert Items nach Status, sortiert die Gruppen über `sortOrder` und zeigt jede Gruppe in einem dezenten Status-Container. Die betroffenen Domänenadapter übergeben jetzt explizit `workStatus` oder `featureStatus`; Backlog und Use Cases sind damit ebenfalls statusfähig in Board und Liste.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Status-Katalog-Zuordnung, Statusgruppen, sortierte Boardspalten und Listencontainer ergänzt |
| `apps/web/src/components/projects/ProjectListBoardView.tsx` | geändert | Projektliste auf `workStatus` umgestellt |
| `apps/web/src/components/milestones/MilestoneListBoardView.tsx` | geändert | Meilensteinliste auf `workStatus` umgestellt |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | Aufgabenliste mit `workStatus` und sortierten Statusspalten verbunden |
| `apps/web/src/components/tickets/TicketListBoardView.tsx` | geändert | Ticketliste auf `workStatus` umgestellt |
| `apps/web/src/components/backlog/BacklogListBoardView.tsx` | geändert | Backlogliste auf Statusgruppierung und `workStatus` umgestellt |
| `apps/web/src/components/features/FeatureListBoardView.tsx` | geändert | Featureliste auf `featureStatus` umgestellt |
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | Projekt-Feature-Panel auf `featureStatus` umgestellt |
| `apps/web/src/components/features/FeatureProjectPanel.tsx` | geändert | Feature-Projekt-Panel auf `workStatus` umgestellt |
| `apps/web/src/components/usecases/UseCaseListBoardView.tsx` | geändert | Use-Case-Liste auf `featureStatus` umgestellt |
| `apps/web/src/components/ui/__tests__/ListBoardView.test.tsx` | geändert | Test für sortierte Statusgruppen in der Listenansicht ergänzt |

## Probleme und Abweichungen

Keine. Der vollständige Testlauf aus Abschnitt 12 wurde noch nicht ausgeführt; geprüft wurden der Web-Typecheck und der eng betroffene Basistest.

## Offene Punkte / Folgeaufgaben

Vollständiger Testlauf und `docs/`-Prüfung stehen gemäß Abschluss-Workflow noch zur Rückfrage aus.
