# Log: List/Board Item Menü Create-Aktionen

**Datum:** 24.05.26  
**Schritt:** Feature — TASK-36 List/Board Item Menüs  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Das Drei-Punkt-Menü von Projekt- und Meilenstein-Karten/Zeilen wurde um optionale Create-Aktionen erweitert. `ItemCard` und `PlanningItemCard` reichen zusätzliche Menüeinträge zwischen Bearbeiten und Löschen durch, während Projekt- und Meilenstein-Cards die passenden Create-Callbacks in Menüeinträge mit Icons übersetzen. `ProjectsPage` und `MilestonesPage` verwalten den neuen Modal-State, nutzen bestehende TanStack-Query-Hooks für Create-Mutations und blenden die Aktionen anhand der jeweiligen `write`-Permission aus. Der Projekt-Parent im Meilenstein-Modal wird über eine neue optionale Sperr-Prop fest vorbelegt.

Für die Tests wurde der Testentwurfs-Skill angewendet. Abgedeckte Testebenen sind Unit-Tests für Menüeinträge, Callback-Owner, Permission-Gating und gesperrte Projektauswahl sowie Browser/E2E-Tests mit echten API-Daten für Projekt→Aufgabe und Meilenstein→Ticket. Die Tests nutzen keine produktiven Daten; Browserdaten laufen über die bestehende isolierte E2E-Testumgebung.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ItemCard.tsx` | geändert | Optionale `extraMenuItems` im ActionMenu ergänzt |
| `apps/web/src/components/ui/PlanningItemCard.tsx` | geändert | Extra-Menüeinträge für Card- und Row-Variante durchgereicht |
| `apps/web/src/components/projects/ProjectCard.tsx` | geändert | Projekt-Create-Aktionen für Meilenstein, Aufgabe und Ticket ergänzt |
| `apps/web/src/components/milestones/MilestoneCard.tsx` | geändert | Meilenstein-Create-Aktionen für Aufgabe und Ticket ergänzt |
| `apps/web/src/components/projects/ProjectListBoardView.tsx` | geändert | Create-Callbacks mit Projektkontext an Cards/Rows weitergereicht |
| `apps/web/src/components/milestones/MilestoneListBoardView.tsx` | geändert | Create-Callbacks mit Meilensteinkontext an Cards/Rows weitergereicht |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Modal-State, Permission-Gating und Create-Mutations ergänzt |
| `apps/web/src/pages/MilestonesPage.tsx` | geändert | Modal-State, Permission-Gating und Create-Mutations ergänzt |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Optionale Sperre für vorbelegte Projektauswahl ergänzt |
| `tests/unit/web/...` | geändert/neu | Unit-Tests für Menüaktionen, Parent-Sperre und Page-Verdrahtung ergänzt |
| `tests/browser/web/project.spec.ts` | geändert | E2E für Projektmenü-Aufgabenanlage und Abbrechen ergänzt |
| `tests/browser/web/milestone.spec.ts` | geändert | E2E für Meilensteinmenü-Ticketanlage ergänzt |

## Probleme und Abweichungen

`npm run test -w apps/web` ist nicht vollständig grün. Es schlagen 5 bestehende Tests außerhalb des TASK-36-Scopes fehl: `StatusPill.test.tsx`, `ProjectForm.test.tsx` und `ListBoardView.test.tsx` erwarten ältere CSS-Klassen. Gemäß Testregel wurden diese Fremdfailures nicht während dieses Auftrags gefixt.

`npm run typecheck -w apps/web` ist grün. Die gezielten TASK-36-Unit-Tests sind grün: 5 Dateien, 28 Tests. `npm run e2e -w apps/web` ist grün: 61 Tests.

## Offene Punkte / Folgeaufgaben

Die 5 bestehenden roten Web-Unit-Tests sollten in einem separaten Folgeauftrag an die aktuellen UI-Klassen angepasst oder als echte Regression bewertet werden.
