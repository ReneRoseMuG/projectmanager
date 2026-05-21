# Log: Board-Toolbar & Statusspalten

**Datum:** 21.05.26  
**Schritt:** 2 — Board-Toolbar & Statusspalten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Statusspalten in `ListBoardView` haben nun einen kompakteren, optisch abgesetzten Header mit getöntem Hintergrund, Trenner und eigenem Content-Padding darunter. Das Section-Padding wurde in Listen- und Board-Modus auf 0 gesetzt, der Inhalt liegt jetzt in einem gepolsterten Wrapper. `BacklogListBoardView` und `UseCaseListBoardView` reichen `onCreate` zusätzlich als `onAddToColumn` weiter, sodass die Spalten-Plus-Buttons auch dort erscheinen. `FilterChips` wurde auf `h-10` angehoben, damit Chips, ViewToggle und Add-Button dieselbe Höhe haben.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Statusspalten-Header und Content-Wrapping angepasst |
| `apps/web/src/components/backlog/BacklogListBoardView.tsx` | geändert | Spalten-Plus über `onAddToColumn` aktiviert |
| `apps/web/src/components/usecases/UseCaseListBoardView.tsx` | geändert | Spalten-Plus über `onAddToColumn` aktiviert |
| `apps/web/src/components/ui/FilterChips.tsx` | geändert | FilterChip-Höhe auf Toolbar-Höhe gebracht |

## Probleme und Abweichungen

Das geplante pauschale `overflow-hidden` an Statusspalten wurde bewusst nicht gesetzt, damit ActionMenu-Dropdowns nicht an Spaltenrändern abgeschnitten werden.

## Offene Punkte / Folgeaufgaben

Keine.
