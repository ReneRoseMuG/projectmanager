# Log: Env Examples

**Datum:** 23.05.26  
**Schritt:** Fix — Env Examples  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die API-Example-Datei wurde um die aktuell gelesene Variable `AUTH_BYPASS_ADMIN` ergänzt. Für den MCP-Server wurde eine eigene `.env.example` mit API-Basis, API-Key und HTTP-Transport-Variablen angelegt. Die MCP-Dokumentation und das MCP-README verweisen jetzt auf diese Vorlage. Es wurden keine Laufzeit-Secrets in versionierte Dateien geschrieben.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/.env.example` | geändert | `AUTH_BYPASS_ADMIN=false` ergänzt |
| `apps/mcp-server/.env.example` | neu | MCP-Server-Umgebungsvariablen als Vorlage angelegt |
| `apps/mcp-server/README.md` | geändert | Hinweis auf `.env.example` ergänzt |
| `docs/MCP-Tools.md` | geändert | Hinweis auf MCP-Env-Vorlage ergänzt |
| `logs/2026-05-23-fix-env-examples.md` | neu | Schritt-Log für die Example-Aktualisierung |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
