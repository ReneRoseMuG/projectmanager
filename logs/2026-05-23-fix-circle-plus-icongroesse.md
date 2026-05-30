# Log: Circle-Plus-Icongröße

**Datum:** 23.05.26  
**Schritt:** Fix — Circle-Plus-Icongröße  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Symbol im Status-Spalten-Add-Button wurde nochmals vergrößert. Die Buttonfläche bleibt unverändert bei `h-9 w-9`, damit das Layout im Spaltenkopf stabil bleibt. Nur das `CirclePlus`-Icon wurde von `26` auf `32` Pixel angehoben und der Strich etwas stärker gesetzt. Die Änderung betrifft ausschließlich die zentrale Board-Komponente. API, Rollen, Berechtigungen, Datenmodell, Migrationen und Query-State wurden nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | `CirclePlus`-Icon im Status-Spaltenbutton vergrößert |
| `logs/2026-05-23-fix-circle-plus-icongroesse.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Keine. Der Web-Build war erfolgreich; Vite meldete nur die bestehende Chunkgrößen-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
