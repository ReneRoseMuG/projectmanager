# Log: Board-Icon-Nachjustierung

**Datum:** 23.05.26  
**Schritt:** Fix — Board-Icon-Nachjustierung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Status-Spalten-Add-Button bleibt in seiner Buttonfläche unverändert bei `h-9 w-9`. Das bisherige `CirclePlus` wurde für diesen Button durch ein deutlich größeres `Plus` ersetzt, weil das innere Plus im Kreis-Icon trotz größerem SVG optisch klein blieb. Das Drei-Punkt-Menü wurde auf eine feste Buttonbreite von `36px` gesetzt, passend zur `h-9`-Höhe und dem `26px`-Icon. Dadurch ist der Abstand links und rechts näher am vertikalen Abstand um das Symbol. API, Rollen, Berechtigungen, Datenmodell, Migrationen und Query-State wurden nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Spalten-Add-Icon von `CirclePlus` auf größeres `Plus` umgestellt |
| `apps/web/src/components/ui/ActionMenu.tsx` | geändert | Drei-Punkt-Menü auf engere feste Buttonbreite gesetzt |
| `logs/2026-05-23-fix-board-icon-nachjustierung.md` | neu | Schritt-Log für die Nachjustierung |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Keine. Der Web-Build war erfolgreich; Vite meldete nur die bestehende Chunkgrößen-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
