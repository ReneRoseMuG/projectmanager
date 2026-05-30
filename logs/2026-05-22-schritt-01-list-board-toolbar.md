# Log: List-/Board-Toolbar

**Datum:** 22.05.26  
**Schritt:** 1 — List-/Board-Toolbar  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die gemeinsame List-/Board-Basiskomponente wurde so angepasst, dass die Toolbar aus drei klaren Spalten besteht: Suche links, Status-Filter mittig und Aktionen rechts. Das Suchfeld begrenzt Eingaben auf 15 Zeichen. Der Verknüpfen-Button wird in Relation-Boards nur noch als Icon angezeigt, der Plus-Button erscheint transparent mit farbigem Rahmen, und die View-Toggles markieren die aktive Ansicht über einen stärkeren Rand statt über eine Hintergrundfläche. Zusätzlich wurden Status-Gruppen-Header vereinheitlicht: Counter stehen direkt neben dem Label, Add-Buttons sind kleiner, statusfarben hinterlegt und haben einen weißen Rand.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Toolbar-Grid, Add-/View-Toggle-Darstellung, Status-Gruppen-Header und gleiche Item-Höhen ergänzt |
| `apps/web/src/components/ui/SearchInput.tsx` | geändert | Suchfeld auf 15 Zeichen begrenzt |
| `apps/web/src/components/ui/ViewToggle.tsx` | geändert | View-Toggles ohne Hintergrundfläche und mit aktivem Randzustand umgesetzt |
| `apps/web/src/components/ui/OwnerRelationBoard.tsx` | geändert | Verknüpfen-Aktion auf Icon-Button reduziert |
| `apps/web/src/components/ui/ActionMenu.tsx` | geändert | Drei-Punkt-Menü schmaler und randnäher dargestellt |
| `apps/web/src/components/ui/ItemCard.tsx` | geändert | Kartenfüllhöhe für einheitliche Item-Höhen vorbereitet |
| `apps/web/src/components/ui/ItemRow.tsx` | geändert | Zeilenfüllhöhe und Footer-Slot vorbereitet |
| `apps/web/src/components/ui/PlanningItemCard.tsx` | geändert | Footer- und Untertitel-Slots an Card/Row weitergereicht |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Erwartung an die neue ActionMenu-Darstellung angepasst |

## Probleme und Abweichungen

Der nachgelagerte Web-Testlauf `npm run test -w apps/web` meldet einen roten Test in `tests/unit/web/components/projects/ProjectForm.test.tsx`. Der Test erwartet noch die alte aktive ViewToggle-Klasse `bg-steel-700`, obwohl die beauftragte Änderung die aktive Ansicht über einen stärkeren Rand darstellt. Während des offiziellen Testlaufs wurden gemäß Repo-Regel keine Test-Fixes vorgenommen.

## Offene Punkte / Folgeaufgaben

Der betroffene Web-Test muss in einem Folgeauftrag auf die neue ViewToggle-Darstellung angepasst werden.
