# Log: MCP-Lokalkonfiguration

**Datum:** 25.05.26  
**Schritt:** Fix — MCP-Lokalkonfiguration für ChatGPT  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die lokale Datei `.env.local` wurde aus `.env.local.example` angelegt. Für `API_KEY` und `PROJECT_MANAGER_API_KEY` wurde ein gemeinsamer lokaler Schlüssel gesetzt, damit API und MCP dieselbe lokale Authentifizierung verwenden. Der lokale MCP-Autostart wurde aktiviert und die MCP-HTTP-Konfiguration bleibt auf `127.0.0.1:3010/mcp` mit `MCP_HTTP_AUTH_MODE=none`, passend zur ChatGPT-Developer-Mode-Konfiguration ohne zusätzliche Authentifizierung. Zusätzlich wurde ein portabler Cloudflare-Quick-Tunnel unter `.local-ai/cloudflared.exe` eingerichtet und gestartet. Der MCP-Endpunkt wurde über HTTPS mit `initialize`, `tools/list` und einem lesenden `list_projects`-Toolaufruf geprüft.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `.env.local` | neu | Lokale MCP- und API-Konfiguration aus Vorlage angelegt |
| `.local-ai/cloudflared.exe` | neu | Ignorierter portabler Tunnel-Client für lokalen ChatGPT-Test |
| `logs/2026-05-25-fix-mcp-lokalkonfiguration.md` | neu | Schritt-Log zur lokalen MCP-Konfiguration |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Eine sofort nutzbare HTTPS-URL liegt vor. Sie ist aber ein Cloudflare-Quick-Tunnel und deshalb nicht stabil über Neustarts hinweg. `cloudflared` und `ngrok` wurden nicht global im PATH gefunden; deshalb bleibt `PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART=false`. Für einen dauerhaften ChatGPT-Connector ist später ein benannter Tunnel mit stabiler Domain nötig.

## Offene Punkte / Folgeaufgaben

Für den aktuellen ChatGPT-Test die URL aus `.env.local` verwenden. Für einen dauerhaften ChatGPT-Connector später einen stabilen Tunnel einrichten oder vorhandene stabile Tunnel-URL bereitstellen. Danach `MCP_PUBLIC_URL` auf `https://<tunnel-host>/mcp` setzen, bei Bedarf `MCP_TUNNEL_COMMAND` korrigieren und `PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART=true` aktivieren.
