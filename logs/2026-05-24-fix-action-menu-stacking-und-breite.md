# Log: ActionMenu Stacking und Breite

**Datum:** 24.05.26  
**Schritt:** Fix — ActionMenu Stacking und Breite  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das gemeinsame `ActionMenu` wurde so angepasst, dass das geöffnete Menü oberhalb benachbarter Karten bleibt. Dafür erhält der Menü-Wrapper einen höheren Stacking-Kontext, und fokussierte oder gehoverte Cards/Rows werden temporär nach vorn gelegt. Zusätzlich ist das Dropdown breiter und Menüeinträge verhindern Textumbruch, damit Einträge wie „Neuer Meilenstein“ einzeilig lesbar bleiben. Der Icon-Bereich wurde stabilisiert, damit längere Texte die Darstellung nicht zusammendrücken. Die Testentwurfsleitplanken wurden angewendet: Testebene ist Unit/jsdom, geprüft wird ein real gerendertes `ActionMenu` mit Nutzerklick auf den Trigger und beobachtbaren Klassen für Breite und Umbruchvermeidung; es werden keine DB-, API- oder Dateisystemdaten verwendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ActionMenu.tsx` | geändert | Dropdown mit höherem z-index, breiterer Mindestbreite und einzeiligen Menüeinträgen |
| `apps/web/src/components/ui/ItemCard.tsx` | geändert | Karten bei Hover/Fokus im Stacking nach vorne gelegt |
| `apps/web/src/components/ui/ItemRow.tsx` | geändert | Listenzeilen bei Hover/Fokus im Stacking nach vorne gelegt |
| `tests/unit/web/components/ui/ActionMenu.test.tsx` | geändert | Unit-Test für ausreichende Dropdown-Breite und ausbleibenden Textumbruch ergänzt |
| `logs/2026-05-24-fix-action-menu-stacking-und-breite.md` | neu | Schritt-Log für den UI-Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Ein breiterer fokussierter UI-Testlauf mit `ActionMenu`, `ListBoardView`, `ProjectListBoardView` und `MilestoneListBoardView` zeigt weiterhin bestehende, nicht durch diesen Fix verursachte Erwartungsabweichungen in `tests/unit/web/components/ui/ListBoardView.test.tsx` zu alten CSS-Klassen. Der gezielte `ActionMenu`-Test und der Web-Typecheck sind grün.

## Offene Punkte / Folgeaufgaben

Die vorhandenen `ListBoardView`-Klassenerwartungen sollten in einem separaten Folgeauftrag an den aktuellen Designstand angepasst werden.
