# Log: List-/Board-Testabdeckung

**Datum:** 22.05.26  
**Schritt:** 6 — List-/Board-Testabdeckung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Testabdeckung für die vereinheitlichten List-/Board-Views wurde ergänzt. Die gemeinsame `ListBoardView` sichert nun die dreispaltige Toolbar, die Suchfeldbegrenzung auf 15 Zeichen, den transparenten ViewToggle mit aktivem Rand, den transparenten Plus-Button, Statusgruppen-Counter neben dem Label, kleinere Status-Add-Buttons und die Equal-Height-Messung ab. Für alle relevanten List-/Board-Views und Relation-Panels wurden Suchtests ergänzt, die ausschließlich Treffer über Titel beziehungsweise Namen zulassen und Beschreibung, Tags, Parent-Kontext, Content oder weitere Metadaten als Trefferquelle ausschließen. Für `TicketListBoardView` wurde eine eigene Unit-Testdatei ergänzt, inklusive Statusfiltern, Board/List-Darstellung und Suche. Zwei Panel-Suchfunktionen wurden fachlich korrigiert, damit `ProjectFeaturePanel` und `FeatureProjectPanel` der Titel-/Name-only-Regel entsprechen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | Suche auf Feature-Titel begrenzt |
| `apps/web/src/components/features/FeatureProjectPanel.tsx` | geändert | Suche auf Projektname begrenzt |
| `tests/fixtures/web/components/ui/factories.ts` | geändert | Ticket-Fixture ergänzt |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Toolbar-, SearchInput-, ViewToggle-, Statusbutton- und Equal-Height-Tests ergänzt |
| `tests/unit/web/components/ui/OwnerRelationBoard.test.tsx` | geändert | Icon-only Verknüpfen-Button abgesichert |
| `tests/unit/web/components/ui/ProjectListBoardView.test.tsx` | geändert | Suche nur nach Projektname abgesichert |
| `tests/unit/web/components/ui/FeatureListBoardView.test.tsx` | geändert | Suche nur nach Feature-Titel abgesichert |
| `tests/unit/web/components/ui/MilestoneListBoardView.test.tsx` | geändert | Toolbar und Suche nur nach Meilenstein-Name abgesichert |
| `tests/unit/web/components/ui/TaskListBoardView.test.tsx` | geändert | Suche nur nach Aufgaben-Titel abgesichert |
| `tests/unit/web/components/ui/BacklogListBoardView.test.tsx` | geändert | Suche nur nach Backlog-Titel abgesichert |
| `tests/unit/web/components/ui/UseCaseListBoardView.test.tsx` | geändert | Suche nur nach Use-Case-Titel abgesichert |
| `tests/unit/web/components/ui/ProjectFeaturePanel.test.tsx` | geändert | Suche nur nach Feature-Titel im Projekt-Feature-Panel abgesichert |
| `tests/unit/web/components/ui/FeatureProjectPanel.test.tsx` | geändert | Suche nur nach Projektname im Feature-Projekt-Panel abgesichert |
| `tests/unit/web/components/ui/TicketListBoardView.test.tsx` | neu | Ticket-View-Tests für Layout, Statusfilter, Board/List und Suche ergänzt |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | Alte ViewToggle-Klassenerwartung auf neuen aktiven Randzustand aktualisiert |

## Probleme und Abweichungen

Keine. Mocks wurden nur für `useCatalogs` genutzt, damit die View-Tests keine TanStack-Query- oder API-Infrastruktur benötigen. Für die Equal-Height-Prüfung wurde ausschließlich `getBoundingClientRect` gestubbt, weil JSDOM keine echten Layout-Höhen berechnet.

## Offene Punkte / Folgeaufgaben

Keine.
