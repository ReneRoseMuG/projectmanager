# Log: MCP-MySQL-Testisolation

**Datum:** 19.07.26  
**Uhrzeit:** 20:43:21  
**Schritt:** 15 — MCP-Integration auf temporäre MySQL-Testinfrastruktur umstellen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die MCP-Vitest-Konfiguration lädt die isolierten `TEST_DB_*`-Werte nun wie die API aus `.env.test` und setzt die notwendigen sicheren Testumgebungswerte. Der Integrationstest wartet `createTestDb()` korrekt ab, verwendet die aktuelle MySQL-Fixture statt veralteter SQLite-Felder und schließt nur tatsächlich initialisierte Clients, Server, App und Testdatenbank. Der Scope-Kommentar benennt die echte Testebene und Isolation wieder korrekt. Die Testentwurfsleitplanken wurden auf Integrationsebene ohne API-, DB- oder MCP-Transport-Mocks angewendet; Dateien liegen ausschließlich in temporären Verzeichnissen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/vitest.config.ts` | geändert | `.env.test`, MySQL-Zugang und realistische Timeouts ergänzt |
| `apps/mcp-server/src/tools.integration.test.ts` | geändert | Aktuelle asynchrone MySQL-Fixture und robuster Cleanup |
| `apps/mcp-server/package.json` | geändert | `dotenv` als Test-Konfigurationsabhängigkeit ergänzt |
| `package-lock.json` | geändert | Workspace-Abhängigkeit nachgeführt |

## Probleme und Abweichungen

Die frühere Setup-Blockade ist aufgelöst: Der echte MCP-Toollauf startet und erreicht die fachlichen Assertions. Dabei wurde ein zuvor verdeckter Folgefehler sichtbar. `delete_task` wird für eine weiterhin direkt mit dem Projekt verknüpfte Aufgabe aufgerufen und erhält vertragsgemäß `409 CONFLICT` statt des erwarteten Lösch-Erfolgs. Der Lauf endet daher mit 74 grünen und einem roten Test, ohne Skip. Gemäß Testregel wurde dieser neu rote Vertragsfall nicht im selben Testlauf nachkorrigiert.

## Offene Punkte / Folgeaufgaben

- Den MCP-Delete-Test in einem separaten Folgeauftrag mit einem fachlich löschbaren Ausgangszustand aufbauen oder die erwartete Konfliktsemantik getrennt prüfen.
- Anschließend den vollständigen MCP-Lauf erneut ausführen; Ziel bleibt 75/75 grün.
