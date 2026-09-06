# Projekt Manager MCP Server

Der MCP-Server stellt eine nicht-destruktive v1-Toolschicht für Claude Desktop, ChatGPT-Developer-Mode und andere MCP-Clients bereit. Er greift nicht direkt auf die Datenbank zu, sondern nutzt die bestehende Projekt-Manager-API mit `x-api-key`.

## Umgebungsvariablen

Eine Vorlage liegt in `.env.example`; für den gemeinsamen Projektstart liegt zusätzlich im Repo-Root `.env.local.example`.

- `PROJECT_MANAGER_API_BASE_URL`: API-Basis, Standard `http://localhost:3001/api`
- `PROJECT_MANAGER_API_KEY`: API-Key der Projekt-Manager-API, Pflicht
- `MCP_HTTP_HOST`: HTTP-Host, Standard `127.0.0.1`
- `MCP_HTTP_PORT`: HTTP-Port, Standard `3010`
- `MCP_HTTP_PATH`: MCP-Pfad, Standard `/mcp`
- `MCP_HTTP_AUTH_MODE`: `bearer` oder `none`, Standard `bearer`
- `MCP_HTTP_BEARER_TOKEN`: Bearer-Token für den HTTP-Transport, Pflicht im `bearer`-Modus

## Start

```bash
npm run build -w apps/mcp-server
npm run start:stdio -w apps/mcp-server
npm run start:http -w apps/mcp-server
```

`start:stdio` ist für lokale Desktop-Clients wie Claude Desktop gedacht und bleibt von ChatGPT-HTTP-Einstellungen unabhängig. `start:http` stellt einen Streamable-HTTP-Endpunkt für remote MCP-Clients bereit.

Im Standardmodus müssen HTTP-Clients `Authorization: Bearer <MCP_HTTP_BEARER_TOKEN>` senden. Für lokale ChatGPT-Tests kann `MCP_HTTP_AUTH_MODE=none` gesetzt werden; das ist nur mit einem privaten lokalen Tunnel gedacht, weil der MCP-Endpunkt dann über die Tunnel-URL ohne zusätzlichen MCP-Bearer-Header erreichbar ist.

## Automatischer Start mit Projekt Manager

`npm run dev` und `Projekt Manager starten.bat` nutzen denselben Startplan:

- ohne `.env.local`: nur API und Web wie bisher
- mit `PROJECT_MANAGER_MCP_AUTOSTART=true`: zusätzlich MCP-HTTP
- mit `PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART=true` und `MCP_TUNNEL_COMMAND`: zusätzlich der stabile HTTPS-Tunnel

Für ChatGPT wird pro Rechner eine stabile URL empfohlen, zum Beispiel je ein Connector „Projekt Manager Home“ und „Projekt Manager Büro“. Die URL wird in `.env.local` als `MCP_PUBLIC_URL=https://.../mcp` dokumentiert; der passende Tunnel-Befehl steht in `MCP_TUNNEL_COMMAND`.

Claude Desktop kann weiterhin `start:stdio` beziehungsweise `dist/stdio.js` verwenden. Wichtig ist nur, dass Claude und der automatisch gestartete MCP-HTTP-Server denselben `PROJECT_MANAGER_API_KEY` verwenden, wenn die API mit `API_KEY` geschützt gestartet wird.

## Windows-Autostart

`scripts/deploy.ps1` legt zwei Verknüpfungen an. Die Desktop-Verknüpfung startet nur das Tray-Symbol; die Verknüpfung im Autostart-Ordner startet es mit `-AutoStart` und fährt zusätzlich die Dienste hoch:

```
Autostart-Verknüpfung → toolbar.ps1 -AutoStart → autostart.ps1 → Start.ps1 -NoBrowser
```

`autostart.ps1` läuft in einem eigenen Hintergrundprozess, damit das Tray-Symbol sofort erscheint. Es überspringt den Start, wenn die API bereits antwortet, und unternimmt einen zweiten Versuch nach 20 Sekunden — das fängt den Fall ab, dass beim Anmelden Netzwerk oder VPN noch nicht stehen. Protokoll: `%LOCALAPPDATA%\Projekt Manager\runtime-logs\autostart.log`.

`Start.ps1` startet API (3001), Web (5173) und MCP-HTTP (3010) und wartet auf alle drei; der MCP wird über den lauschenden Port geprüft, weil sein Endpunkt nur POST beantwortet. Mit `-NoBrowser` unterbleibt das Öffnen der Oberfläche.

## Anbindung an die Claude-Oberflächen

Kein Client sucht den Server von selbst — jede Oberfläche liest ihre eigene Konfigurationsdatei:

| Oberfläche | Konfiguration | Transport | Reichweite |
|---|---|---|---|
| Claude Code | `~/.claude.json`, oberste Ebene `mcpServers` | HTTP auf `127.0.0.1:3010/mcp` | alle Projekte und Verzeichnisse |
| Claude Desktop (Chats) | `claude_desktop_config.json` (klassisch und Store-Paket) | stdio aus dem Deployment-Verzeichnis | alle Chats |
| claude.ai im Browser | Connector am Konto | HTTPS-Tunnel nötig | derzeit nicht eingerichtet |

Einrichten:

```powershell
claude mcp add --scope user --transport http projekt-manager http://127.0.0.1:3010/mcp
.\setup-mcp.ps1
```

`setup-mcp.ps1` schreibt in beide Desktop-Konfigurationen, legt vorher eine `.bak`-Sicherungskopie an und trägt den Pfad im **Deployment**-Verzeichnis ein, nicht im Repository — sonst brechen laufende Chats, sobald hier neu gebaut wird. Geschrieben wird über `scripts/write-claude-mcp-config.mjs`, weil `ConvertTo-Json` in Windows PowerShell 5.1 einelementige Arrays zu Skalaren macht und tiefe Verschachtelungen kappt.

Konfigurationen werden beim Sessionstart gelesen: Claude Desktop braucht danach einen Neustart, Claude Code eine neue Session.
