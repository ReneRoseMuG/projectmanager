# Log: MCP Tests und Tool-Doku

**Datum:** 23.05.26  
**Schritt:** Fix / Feature — MCP Tests und Tool-Doku  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die MCP-Test-Suite wurde um einen Integrationstest ergänzt, der jedes aktuell registrierte MCP-Tool einmal über den MCP-Transport ausführt. Der Test arbeitet gegen eine echte Fastify-App mit isolierter Temp-SQLite-Datenbank und erzeugt reale Projekte, Meilensteine, Aufgaben, Tickets, Features und Use Cases. Die MCP-Testkonfiguration nutzt das API-Test-Runtime-Setup seriell, damit keine produktiven Datenpfade berührt werden. Zusätzlich wurde die Katalogabfrage des MCP-Tools an die tatsächliche API-Antwortform angepasst. Unter `docs/MCP-Tools.md` wurde eine kompakte Übersicht aller verfügbaren MCP-Tools, ihrer Eingaben und ihrer fachlichen Rollen angelegt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/tools.integration.test.ts` | neu | Integrationstest für alle registrierten MCP-Tools mit echten App-Daten |
| `apps/mcp-server/vitest.config.ts` | geändert | API-Test-Runtime-Setup und serielle Dateiausführung für MCP-Tests ergänzt |
| `apps/mcp-server/src/tools.ts` | geändert | `list_catalogs` an die reale Katalog-API-Antwort angepasst |
| `docs/MCP-Tools.md` | neu | Übersicht über Betrieb, Authentifizierung und alle verfügbaren MCP-Tools |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Der erste MCP-Testlauf zeigte eine falsche Testannahme zum Anzeigenamen des Standardadmins. Die Erwartung wurde an die reale Fixture-Ausgabe `Admin, Test` angepasst. Die MCP-, API- und Web-Unit-Tests sind grün. Der nachgelagerte Playwright-E2E-Lauf ist jedoch mit einem bestehenden Web-Test fehlgeschlagen: `tests/browser/web/freshness.spec.ts` erwartet beim lokalen Öffnen einer fehlenden Datei den Hinweis `Die Datei wurde im Upload-Verzeichnis nicht gefunden.`, der nicht sichtbar wurde. Dieser Fehler liegt außerhalb der MCP-Testergänzung und wurde gemäß Testregel nicht repariert.

## Offene Punkte / Folgeaufgaben

Den fehlgeschlagenen Playwright-Test `tests/browser/web/freshness.spec.ts` in einem separaten Folgeauftrag analysieren und entscheiden, ob die Testannahme oder der Produktionscode angepasst werden muss.
