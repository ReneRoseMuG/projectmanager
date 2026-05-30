# Log: Start-Abhängigkeiten

**Datum:** 26.05.26  
**Schritt:** Fix — Start-Abhängigkeiten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Startabbruch wurde eng am Startskript untersucht. Der Build brach im Workspace `apps/mcp-server` ab, weil installierte Abhängigkeiten in `node_modules` fehlten, obwohl sie in `package-lock.json` bereits vorhanden waren. Mit `npm install` wurde die lokale Installation wieder mit dem Lockfile synchronisiert; dabei entstanden keine nachverfolgten Dateiänderungen. Anschließend liefen Build und Datenbankmigration erfolgreich durch. Ein kurzer Produktions-Smoke-Test startete API und Web auf den erwarteten Ports `3001` und `5173`; die dafür gestarteten Prozesse wurden danach wieder beendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-05-26-fix-start-abhaengigkeiten.md` | neu | Schritt-Log zum behobenen Startabbruch |
| `logs/README.md` | geändert | Log-Index um den neuen Eintrag ergänzt |

## Probleme und Abweichungen

Keine produktiven Codeänderungen waren nötig. Der Smoke-Test beendete die gestarteten Prozesse erfolgreich; ein nachgelagerter temporärer Log-Cleanup meldete einen Pfadfehler, hatte aber keine Auswirkung auf den App-Start.

## Offene Punkte / Folgeaufgaben

`npm install` meldete eine moderate Audit-Warnung. Diese wurde nicht bearbeitet, weil sie nicht Ursache des Startabbruchs war.
