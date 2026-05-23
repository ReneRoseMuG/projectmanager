# Log: Board-Controls-Kontrast

**Datum:** 23.05.26  
**Schritt:** Fix — Board-Controls-Kontrast  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Status-Spalten-Add-Button verwendet jetzt `CirclePlus` statt eines nackten Pluszeichens. Die Buttonfläche wurde auf `h-9 w-9` vergrößert und das Icon auf `26` Pixel gesetzt, damit die Aktion im Spaltenkopf deutlich erkennbarer ist. Das Drei-Punkt-Menü verwendet weiterhin das vertraute `MoreVertical`, aber mit größerem Icon und einem enger umschließenden, nicht quadratischen Button. Der Listen-/Board-ViewToggle hat nun einen klar dunklen aktiven Zustand mit weißem Icon sowie einen kontrastierenden hellen Container. API, Rollen, Berechtigungen, Datenmodell, Migrationen und Query-State wurden nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Status-Spalten-Add auf größeres `CirclePlus` umgestellt |
| `apps/web/src/components/ui/ActionMenu.tsx` | geändert | Drei-Punkt-Menü größer und enger gerahmt |
| `apps/web/src/components/ui/ViewToggle.tsx` | geändert | Aktiven Toggle-Zustand kontrastreicher gestaltet |
| `logs/2026-05-23-fix-board-controls-kontrast.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Keine. Der Web-Build war erfolgreich; Vite meldete nur die bestehende Chunkgrößen-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
