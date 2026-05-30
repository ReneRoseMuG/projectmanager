# Log: API Drizzle Startscript

**Datum:** 21.05.26  
**Schritt:** Fix — API Drizzle Startscript  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der API-Buildfehler im Startscript wurde behoben. Die Drizzle-Initialisierung verwendet jetzt die aktuelle Objektform mit `client` und `schema`, sodass der lokale Better-SQLite-Client wieder korrekt typisiert ist. Zusätzlich wurde der gemeinsame DB-Typ so eingegrenzt, dass vorhandene Service- und Repository-Aufrufe sowohl mit der echten Drizzle-Instanz als auch mit Transaktionen kompatibel bleiben. Dieselbe Drizzle-Signatur wurde in der API-Test-Fixture aktualisiert, damit Tests nicht an der alten Initialisierung scheitern. Fachliche Service-Logik wurde nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/client.ts` | geändert | Drizzle-Initialisierung und gemeinsamer DB-Typ korrigiert |
| `tests/fixtures/api/db.ts` | geändert | Drizzle-Initialisierung in API-Test-Fixture aktualisiert |
| `logs/2026-05-21-fix-api-drizzle-startscript.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Der API-Build `npm run build -w apps/api` und der vollständige Root-Build `npm run build` wurden nach dem Fix erfolgreich ausgeführt. Vite meldet weiterhin nur bestehende Warnungen zu Deprecations und Chunk-Größe.

## Offene Punkte / Folgeaufgaben

Ein vollständiger Testlauf wurde noch nicht ausgeführt.
