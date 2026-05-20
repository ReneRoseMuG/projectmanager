# Log: Savetowork-Kommando

**Datum:** 20.05.26  
**Schritt:** Fix — Savetowork-Kommando  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

In `agents.md` wurde das neue Kurzkommando `savetowork` ergänzt. Die Regel beschreibt, dass alle offenen Änderungen auf dem aktuellen Branch gesichert werden, der Arbeitsbranch in `work` gemerged wird und `work` anschließend gepusht wird. Zusätzlich wurde ein eigener Sicherheitsablauf ergänzt, damit vor dem Löschen des Arbeitsbranches geprüft wird, ob die Änderungen wirklich in `work` liegen. Die Löschung des lokalen und remote Arbeitsbranches ist ausdrücklich bestätigungspflichtig.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `agents.md` | geändert | Kurzkommando `savetowork` und Sicherheitsablauf ergänzt |
| `logs/2026-05-20-fix-savetowork-kommando.md` | neu | Schritt-Log für die Änderung |
| `logs/README.md` | geändert | Log-Index um den neuen Eintrag ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Kein Testlauf ausgeführt, da nur die Arbeitsanweisung geändert wurde.
