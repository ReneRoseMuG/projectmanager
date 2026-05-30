# Log: Board/List Header Hintergrund

**Datum:** 21.05.26  
**Schritt:** Fix — Board/List Header Hintergrund  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Header von gruppierten Listenabschnitten und Kanban-Boardspalten nutzen jetzt dieselbe Hintergrundfarbe wie die TabBar. Dafür wurde in `ListBoardView` die halbtransparente Header-Fläche durch `bg-white` ersetzt und der Blur-Effekt entfernt. Die Status- und Spaltenhintergründe selbst bleiben unverändert, damit die Gruppentönung weiterhin erhalten bleibt. Die bestehende Unit-Test-Abdeckung wurde um diese visuelle Regel ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Gruppen- und Spaltenheader auf `bg-white` wie TabBar gesetzt |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Header-Hintergrundregel für Liste und Board abgesichert |
| `logs/2026-05-21-fix-board-list-header-bg.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
