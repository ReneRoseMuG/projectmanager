# Log: ChatGPT MCP HTTP Auth

**Datum:** 24.05.26  
**Schritt:** 1 — Projekt-Manager-MCP lokal in ChatGPT testen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der MCP-HTTP-Server wurde um einen expliziten Auth-Modus erweitert. Standard bleibt `bearer`, sodass der HTTP-Endpunkt nur mit `MCP_HTTP_BEARER_TOKEN` startet. Für lokale ChatGPT-Developer-Mode-Tests kann bewusst `MCP_HTTP_AUTH_MODE=none` gesetzt werden; der Server protokolliert dann eine Warnung. Die HTTP-Serverlogik wurde in ein testbares Modul ausgelagert, während `start:stdio` für Claude unverändert bleibt. Zusätzlich wurden Unit- und Integrationstests für Konfiguration, Bearer-Schutz, No-Auth-Testmodus und Streamable-HTTP-Toollisting ergänzt.

Der Testentwurfs-Skill wurde angewendet. Betroffen sind Unit-Tests für Konfiguration und Integrationstests über echten Node-HTTP-Server und echten Streamable-HTTP-MCP-Client. Bewiesen wird, dass Bearer-Auth schützt, der explizite lokale No-Auth-Modus funktioniert und falsche Pfade JSON-RPC-kompatible Fehler liefern.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/config.ts` | geändert | HTTP-Auth-Modus `bearer`/`none` ergänzt |
| `apps/mcp-server/src/http.ts` | geändert | HTTP-Start auf testbaren Server ausgelagert und Warnung für No-Auth ergänzt |
| `apps/mcp-server/src/http-server.ts` | neu | Streamable-HTTP-Handler und Serverfabrik |
| `apps/mcp-server/src/config.test.ts` | neu | Unit-Tests für MCP-HTTP-Konfiguration |
| `apps/mcp-server/src/http-server.integration.test.ts` | neu | Integrationstests für Streamable HTTP mit/ohne Bearer |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Manuelle ChatGPT-Abnahme mit echter stabiler HTTPS-Tunnel-URL steht außerhalb der automatisierten Repo-Tests.
