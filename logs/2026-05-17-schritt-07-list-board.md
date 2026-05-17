# Log: ListBoard

**Datum:** 17.05.26  
**Schritt:** 7 — ListBoardView-Infrastruktur  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die zentrale ListBoard-Infrastruktur wurde mit `ItemCard`, `ItemRow`, `CardGrid` und `ListBoardView` aufgebaut. `ItemCard` unterstützt Accent-Bar, Hover-Lift, Click/Doppelklick zum Öffnen sowie icon-only Aktionen für Bearbeiten und Löschen. `ItemRow` bildet die gemeinsame Listenbasis mit linkem Accent-Border, Titel, Beschreibung, Slots für Pills, Meta und Aktionen sowie Doppelklick zum Öffnen. `KanbanColumn` nutzt jetzt `ItemCard` für Task-Karten und bietet einen Plus-Button pro Spalte, der den jeweiligen Status an `onAddItem(status)` übergibt. `KanbanBoard`, `ProjectDetailPage` und `TaskForm` wurden minimal angebunden, damit neue Aufgaben aus einer Spalte mit passendem Startstatus geöffnet werden. Für `ListBoardView`, `ItemCard` und `ItemRow` wurde die geforderte Vitest/RTL-Test-Suite mit 13 Fällen ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ItemCard.tsx` | neu | Gemeinsame Kartenbasis mit Accent-Bar und icon-only Actions |
| `apps/web/src/components/ui/ItemRow.tsx` | neu | Gemeinsame Zeilenbasis für Listenansichten |
| `apps/web/src/components/ui/CardGrid.tsx` | neu | Responsives Grid für statuslose Board-Ansichten |
| `apps/web/src/components/ui/ListBoardView.tsx` | neu | Organism mit Search, Filter-Slot, ViewToggle, Plus-Button und Board/List-Rendering |
| `apps/web/src/components/ui/__tests__/ListBoardView.test.tsx` | neu | Test-Suite für ListBoardView, ItemCard und ItemRow |
| `apps/web/src/components/tasks/KanbanColumn.tsx` | geändert | Task-Karten auf `ItemCard` umgestellt und Spalten-Plus ergänzt |
| `apps/web/src/components/tasks/KanbanBoard.tsx` | geändert | Optionalen `onAddItem(status)` Callback an Spalten weitergereicht |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Optionalen `initialStatus` für neue Aufgaben ergänzt |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Spalten-Plus öffnet Task-Formular mit passendem Startstatus |
| `logs/2026-05-17-schritt-07-list-board.md` | neu | Schritt-Log für Schritt 7 |
| `logs/README.md` | geändert | Log-Index um Schritt 7 ergänzt |

## Probleme und Abweichungen

`ListBoardView` rendert Statusspalten generisch über `statusKey` und `statusColumns`, statt das task-spezifische `KanbanBoard` direkt zu verwenden. Dadurch bleibt die Komponente für beliebige Domain-Items typisierbar; der Board-Modus ohne `statusKey` fällt wie gefordert auf `CardGrid` zurück. Der Web-Build meldet weiterhin die bestehende Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Keine.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `npm run typecheck -w apps/web` | ✅ Erfolgreich |
| `npx vitest run apps/web/src/components/ui/__tests__/ListBoardView.test.tsx` | ✅ 13/13 Tests bestanden |
| `npm run build -w apps/web` | ✅ Erfolgreich, mit bestehender Vite-Warnung zu großen Chunks |
