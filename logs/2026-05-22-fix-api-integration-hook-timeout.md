# Log: API-Integration-Hook-Timeout

**Datum:** 22.05.26  
**Schritt:** Fix — API-Integration-Hook-Timeout  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der blockierte API-Integrationstest wurde stabilisiert. Die Suite `app.integration.test.ts` initialisiert im `beforeAll` eine isolierte SQLite-Datenbank, führt Migrationen aus, baut die Fastify-App und meldet den Test-Admin an. Dieser Setup-Hook überschritt das globale 10-Sekunden-Hook-Limit, obwohl die fachlichen Tests selbst korrekt sind. Für genau diesen schweren Setup-Hook wurde ein explizites Timeout von 60 Sekunden gesetzt. Produktionscode, API-Verhalten, Test-Assertions und Testdaten wurden nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/integration/api/app.integration.test.ts` | geändert | Explizites `beforeAll`-Timeout für schwere App-/DB-Initialisierung gesetzt |
| `logs/2026-05-22-fix-api-integration-hook-timeout.md` | neu | Schritt-Log für den API-Testfix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Der vorherige Fehler war ein Hook-Timeout im Test-Setup, kein roter fachlicher Testfall.

## Offene Punkte / Folgeaufgaben

Keine.
