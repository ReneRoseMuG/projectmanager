# Log: ItemCard Höhenangleichung

**Datum:** 26.05.26  
**Schritt:** 64 — ItemCard Höhenangleichung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`ItemCard` wurde auf eine flexible Vollhöhen-Struktur umgestellt, damit Header und Footer stabil bleiben und der Body den verfügbaren Raum einnimmt. `ListBoardView` gleicht Kartenhöhen im statuslosen Grid/List-Pfad weiterhin zentral aus, setzt dabei aber `height` statt `minHeight`. Für Kanban-Boards erfolgt die Höhenangleichung jetzt spaltenweise direkt am DOM, sodass Karten nur innerhalb derselben Statusspalte gleich hoch werden. Collapsed-Spalten werden bei der Messung übersprungen. Die bestehenden Layout-Tests wurden auf die neue Struktur und die spaltenweise Equalisierung erweitert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ItemCard.tsx` | geändert | Kartenstruktur auf `flex flex-col h-full` umgestellt |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Höhenangleichung auf `height` und Kanban-spaltenweise Messung angepasst |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Tests für Flex-Struktur und spaltenweise Equalisierung ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
