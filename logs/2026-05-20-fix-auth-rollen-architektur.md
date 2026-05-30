# Log: Auth-Rollen-Architektur

**Datum:** 20.05.26  
**Schritt:** Fix — Auth-Rollen-Architektur  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`agents.md` wurde um verbindliche Regeln für Authentifizierung, Rollen und Berechtigungen erweitert. Neue API-Routen gelten nun grundsätzlich als authentifizierungspflichtig, öffentliche Ausnahmen müssen ausdrücklich geplant werden. Die API wurde als verbindliche Sicherheitsgrenze festgelegt; Frontend-Gating wird nur als UX-Unterstützung beschrieben. Zusätzlich wurden `UNAUTHORIZED` und `FORBIDDEN` in das einheitliche Fehlerformat aufgenommen, Rollen-/Permission-Tests zur Pflicht gemacht und Auth & Rollen als Querschnittsinfrastruktur in die Domänenarchitektur eingetragen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `agents.md` | geändert | Verbindliche Auth-/Rollenregeln, Fehlercodes, Testpflichten und Domänencheckliste ergänzt |
| `logs/2026-05-20-fix-auth-rollen-architektur.md` | neu | Schritt-Log für die Architekturregel |
| `logs/README.md` | geändert | Log-Index um den neuen Eintrag ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Kein Testlauf ausgeführt, da nur die Arbeitsanweisung geändert wurde.
