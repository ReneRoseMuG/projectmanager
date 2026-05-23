# Log: Status-Spalten-Plus

**Datum:** 23.05.26  
**Schritt:** Fix — Status-Spalten-Plus  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Plus-Button in Status-Spalten wurde in der zentralen Board-Komponente vergrößert. Die Buttonfläche wächst von `h-7 w-7` auf `h-8 w-8`, damit die Aktion im Spaltenkopf etwas mehr Präsenz hat. Das Plus-Icon selbst wurde von `13` auf `20` Pixel vergrößert und mit stärkerem Strich gerendert. Die Änderung betrifft alle Boards, die den zentralen Status-Spalten-Button aus `ListBoardView` verwenden. API, Rollen, Berechtigungen, Datenmodell, Migrationen und Query-State wurden nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Spalten-Plusbutton und Plus-Icon vergrößert |
| `logs/2026-05-23-fix-status-spalten-plus.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Keine. Der Web-Build war erfolgreich; Vite meldete nur die bestehende Chunkgrößen-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
