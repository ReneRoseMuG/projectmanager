# Log: MCP HTTP Hardening

**Datum:** 23.05.26  
**Schritt:** Fix — MCP HTTP Hardening  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der HTTP-Transport des MCP-Servers wurde gegen ungeschützte Remote-Nutzung abgesichert. `start:http` verlangt jetzt `MCP_HTTP_BEARER_TOKEN` und akzeptiert nur Requests mit passendem `Authorization: Bearer ...` Header, bevor der MCP-Transport überhaupt erreicht wird. Der HTTP-Handler gibt für nicht autorisierte und interne Fehler JSON-RPC-förmige Fehlerantworten zurück und schließt Transport sowie MCP-Server kontrolliert. Zusätzlich wurde der Root-Testlauf erweitert, sodass MCP-Tests zusammen mit den API-Tests laufen. Die README des MCP-Servers dokumentiert den neuen Token.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/http.ts` | geändert | Bearer-Auth, Fehlerantworten und Transport-Cleanup ergänzt |
| `apps/mcp-server/src/http-auth.ts` | neu | HTTP-Auth- und JSON-RPC-Fehlerhelfer |
| `apps/mcp-server/src/http-auth.test.ts` | neu | Tests für Bearer-Auth und Fehlerantworten |
| `apps/mcp-server/src/config.ts` | geändert | `MCP_HTTP_BEARER_TOKEN` als HTTP-Pflichtkonfiguration ergänzt |
| `apps/mcp-server/README.md` | geändert | HTTP-Token dokumentiert |
| `package.json` | geändert | Root-Testlauf um MCP-Tests erweitert |

## Probleme und Abweichungen

`npm audit --audit-level=moderate` meldet weiterhin eine moderate `qs`-Advisory im Dependency-Tree. Vite meldet im Root-Build weiterhin die bekannte Chunk-Größenwarnung. Beide Punkte blockieren den MCP-HTTP-Hardening-Fix nicht.

## Offene Punkte / Folgeaufgaben

Eine spätere echte Benutzer-/Rollenbindung für MCP-Clients kann separat geplant werden. Der aktuelle Fix schützt den MCP-HTTP-Endpunkt mit einem eigenen Bearer-Token und nutzt danach weiterhin den bestehenden API-Key-Zugang zur Projekt-Manager-API.
