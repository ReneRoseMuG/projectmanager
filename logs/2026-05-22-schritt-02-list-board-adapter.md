# Log: List-/Board-Adapter

**Datum:** 22.05.26  
**Schritt:** 2 — List-/Board-Adapter  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Hauptansichten für Projekte, Tickets und Features verwenden nun ebenfalls die gemeinsame List-/Board-Toolbar statt eigener Aktionsbuttons. Die bisherigen Textbuttons wie „Neues Projekt“ oder „Neues Ticket“ wurden entfernt; die Erstellung läuft über den einheitlichen Plus-Button der Basiskomponente. Die Ticketansicht wurde um Statusfilter ergänzt, damit sie sich wie die übrigen Status-dominierten Listen verhält. Die Suchlogik in List- und Board-Ansichten wurde auf Titel beziehungsweise Namen eingeschränkt, damit das Suchfeld nicht mehr in Beschreibungstexten oder Metadaten sucht.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Eigenen Neu-Button entfernt und Statusänderung an die Listenansicht angebunden |
| `apps/web/src/pages/TicketsPage.tsx` | geändert | Eigenen Neu-Button entfernt, Statusfilter und Inline-Änderungen angebunden |
| `apps/web/src/pages/FeaturesPage.tsx` | geändert | Eigenen Neu-Button entfernt und Statusänderung an die Listenansicht angebunden |
| `apps/web/src/components/projects/ProjectListBoardView.tsx` | geändert | Suche auf Projektnamen begrenzt und Statusänderung vorbereitet |
| `apps/web/src/components/tickets/TicketListBoardView.tsx` | geändert | Statusfilter, Statusspalten und title-only Suche ergänzt |
| `apps/web/src/components/features/FeatureListBoardView.tsx` | geändert | Suche auf Feature-Titel begrenzt und Row-Variante eingebunden |
| `apps/web/src/components/milestones/MilestoneListBoardView.tsx` | geändert | Suche auf Meilenstein-Titel begrenzt und Inline-Props vorbereitet |
| `apps/web/src/components/usecases/UseCaseListBoardView.tsx` | geändert | Suche auf Use-Case-Titel begrenzt |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | Suche auf Aufgaben-Titel begrenzt und Inline-Props vorbereitet |
| `apps/web/src/components/backlog/BacklogListBoardView.tsx` | geändert | Suche auf Backlog-Titel begrenzt |
| `tests/unit/web/components/ui/FeatureListBoardView.test.tsx` | geändert | Test an die Row-Darstellung im List View angepasst |

## Probleme und Abweichungen

Der nachgelagerte E2E-Lauf `npm run e2e -w apps/web` meldet drei rote Owner-Aufgaben-Link-Flows in `tests/browser/web/owner-tasks.spec.ts`. In allen Fällen wird die Aufgabe laut UI-Toast verknüpft, ist nach dem erneuten Öffnen des jeweiligen Owners aber nicht sichtbar. Während des offiziellen Testlaufs wurden gemäß Repo-Regel keine Produktcode- oder Test-Fixes vorgenommen.

## Offene Punkte / Folgeaufgaben

In einem Folgeauftrag muss geprüft werden, ob die roten E2E-Flows durch eine Testannahme, Query-Invalidierung oder die neue sichtbare Owner-/Relation-Logik verursacht werden.
