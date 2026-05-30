# Log: Log-Richtlinien Zeitstempel

**Datum:** 28.05.26  
**Uhrzeit:** 09:57:29  
**Schritt:** Fix  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Schritt-Log-Richtlinie in `agents.md` wurde so angepasst, dass jeder Log-Eintrag künftig in eine neue Datei geschrieben wird. Der Dateiname enthält jetzt Datum und Uhrzeit bis zur Sekunde, damit mehrere Logs am selben Tag eindeutig bleiben. Bestehende einzelne Log-Dateien dürfen nicht mehr nachträglich ergänzt, korrigiert oder überschrieben werden. Nachträge, Korrekturen und Anschlussberichte müssen stattdessen jeweils eine eigene neue Log-Datei erhalten. Als einzige reguläre Ausnahme bleibt `logs/README.md` als chronologischer Index aktualisierbar.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `agents.md` | geändert | Log-Regeln um Zeitstempel und Unveränderlichkeit einzelner Log-Dateien ergänzt |
| `logs/2026-05-28-09-57-29-fix-log-richtlinien-zeitstempel.md` | neu | Schritt-Log für diese Richtlinienänderung |
| `logs/README.md` | geändert | Neuer Log-Eintrag wird im Index ergänzt |

## Probleme und Abweichungen

Der Arbeitsbaum enthielt vor Beginn bereits viele unrelated Änderungen. Diese wurden nicht bearbeitet. Die Änderung betrifft bewusst nur die Log-Richtlinie und den Log-Index.

## Offene Punkte / Folgeaufgaben

Keine.
