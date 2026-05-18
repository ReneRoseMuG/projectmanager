# Log: Startdatei Pfaderkennung

**Datum:** 18.05.26  
**Schritt:** Fix — Startdatei Pfaderkennung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Batch-Datei zum Starten der App erkennt nun automatisch den passenden Projektordner. Zuerst wird der Ordner geprüft, in dem die Batch-Datei selbst liegt. Danach werden der Büro-Pfad `C:\Users\r.rose\repos\Projekt Manager` und der Zuhause-Pfad `C:\Users\schro\source\repos\Projekt Manager` geprüft. Gefunden wird ein gültiger Projektordner über eine vorhandene `package.json`. Wird kein bekannter Pfad gefunden, bricht die Datei mit einer verständlichen Meldung ab.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `Projekt Manager starten.bat` | geändert | Automatische Pfaderkennung für Büro, Zuhause und Ablageort der Batch-Datei |
| `logs/2026-05-18-fix-startdatei-pfaderkennung.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Die Batch-Datei wurde nicht vollständig ausgeführt, weil sie absichtlich alle laufenden `node.exe`-Prozesse beendet. Die Pfadlogik wurde durch Sichtprüfung der Datei verifiziert.

## Offene Punkte / Folgeaufgaben

Keine.
