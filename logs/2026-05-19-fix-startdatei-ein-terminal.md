# Log: Startdatei Ein Terminal

**Datum:** 19.05.26  
**Schritt:** Fix — Startdatei Ein Terminal  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Startdatei wurde so angepasst, dass API und Web nicht mehr in zwei zusätzlichen `cmd /k`-Fenstern gestartet werden. Stattdessen startet die Batch-Datei beide Prozesse über `concurrently` im vorhandenen Terminal und markiert die Logausgaben mit `API` und `WEB`. Der Browser wird weiterhin automatisch nach kurzer Verzögerung geöffnet, ohne dafür ein weiteres Terminalfenster zu erzeugen. Das vorhandene Build- und Migrationsverhalten bleibt unverändert. Dadurch reduziert sich der sichtbare Terminalbedarf beim normalen Start idealerweise auf ein Fenster.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `Projekt Manager starten.bat` | geändert | API und Web starten nun gemeinsam im bestehenden Terminal |
| `logs/2026-05-19-fix-startdatei-ein-terminal.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Ein manueller Startlauf steht noch aus, falls der neue Fensterablauf direkt verifiziert werden soll.
