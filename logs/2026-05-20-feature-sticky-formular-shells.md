# Log: Sticky Formular-Shells

**Datum:** 20.05.26  
**Schritt:** Feature — Sticky Formular-Shells  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die App-Shell wurde so umgestellt, dass der Content-Bereich in `<main>` scrollt, während Sidebar und TopBar im Viewport bleiben. `FormModal` und `DetailModal` trennen in der Page-Variante Header, TabBar, Inhalt und Footer, sodass der Header aus dem Bild scrollt, die TabBar oben klebt und der Footer unten sichtbar bleibt. In der Modal-Variante bleibt das begrenzte Scrollmodell erhalten; TabBars liegen dort nur außerhalb des Inhalts-Scrollcontainers. Die tabbed Formulare für Projekte, Aufgaben, Features, Meilensteine und Use Cases wurden auf das neue `tabBar`-Prop migriert. Zusätzlich füllt `ListBoardView` den verfügbaren sichtbaren Raum besser aus, damit leere Board-/Listen-Tabs nicht nur als kleine Fläche oben erscheinen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/App.tsx` | geändert | App-Content als interner Scrollcontainer |
| `apps/web/src/components/ui/FormModal.tsx` | geändert | `tabBar`-Prop, sticky Page-TabBar und sticky Page-Footer |
| `apps/web/src/components/ui/DetailModal.tsx` | geändert | Page-Variante auf sticky TabBar/Footer umgestellt |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Board-/Listeninhalt füllt sichtbaren Arbeitsbereich |
| `apps/web/src/components/ui/CardGrid.tsx` | geändert | Kartenraster streckt sich im ListBoardView-Inhaltsbereich |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | TabBar in `tabBar`-Prop verschoben |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | TabBar in `tabBar`-Prop verschoben |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | TabBar in `tabBar`-Prop verschoben |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | TabBar in `tabBar`-Prop verschoben |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | TabBar in `tabBar`-Prop verschoben |
| `apps/web/src/components/ui/__tests__/FormModal.test.tsx` | neu | Strukturtests für Page- und Modal-Variante |
| `apps/web/src/components/ui/__tests__/DetailModal.test.tsx` | neu | Strukturtests für Detail-Shell-Varianten |
| `apps/web/e2e/project.spec.ts` | geändert | Browser-Test für Sticky TabBar/Footer ergänzt |

## Probleme und Abweichungen

Die Aufgabendatei nannte nur Projekt-, Aufgaben- und Feature-Formulare. Zusätzlich wurden Meilenstein- und Use-Case-Formulare migriert, weil sie dieselbe direkte TabBar-Struktur unter `FormModal` hatten und sonst vom einheitlichen Verhalten abgewichen wären. Beim E2E-Lauf zeigte sich außerdem, dass horizontale Kanban-Boards nach der App-Scrollcontainer-Umstellung im Test vor Button-Interaktionen in den sichtbaren Bereich gescrollt werden müssen; der betroffene Freshness-Test wurde entsprechend stabilisiert.

## Offene Punkte / Folgeaufgaben

Keine.
