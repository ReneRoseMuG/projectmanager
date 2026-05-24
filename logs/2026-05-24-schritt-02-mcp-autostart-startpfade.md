# Log: MCP Autostart Startpfade

**Datum:** 24.05.26  
**Schritt:** 2 — MCP-Start in `npm run dev` und Startscript integrieren  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`npm run dev` und `Projekt Manager starten.bat` nutzen jetzt denselben Startplan aus dem MCP-Workspace. Ohne lokale `.env.local` starten weiterhin nur API und Web. Mit `PROJECT_MANAGER_MCP_AUTOSTART=true` startet zusätzlich der MCP-HTTP-Server; mit `PROJECT_MANAGER_MCP_TUNNEL_AUTOSTART=true` und `MCP_TUNNEL_COMMAND` startet zusätzlich der stabile HTTPS-Tunnel. Die lokale Beispielkonfiguration dokumentiert Homeoffice-/Büro-spezifische Werte wie API-Key, Tunnel-Befehl und ChatGPT-Connector-URL. Das Claude-Setup wurde so angepasst, dass es denselben lokalen API-Key aus Umgebung oder `.env.local` übernimmt, statt einen fest verdrahteten Wert zu verwenden.

Der Testentwurfs-Skill wurde angewendet. Betroffen sind Unit-Tests der Startplanlogik ohne Prozessstart. Bewiesen wird, dass der Standardstart unverändert bleibt, MCP/Tunnel nur explizit aktiviert werden, fehlende Schlüssel klar blockieren und ein dokumentierter Tunnel-Befehl inaktiv bleibt, solange Tunnel-Autostart ausgeschaltet ist.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/startup.ts` | neu | Gemeinsame Startplanlogik für Dev- und Produktionsstart |
| `apps/mcp-server/src/start-project-manager.ts` | neu | CLI zum Starten von API, Web, MCP und optional Tunnel |
| `apps/mcp-server/src/startup.test.ts` | neu | Unit-Tests für Autostart- und Tunnel-Planung |
| `package.json` | geändert | `npm run dev` nutzt den gemeinsamen Startplan |
| `Projekt Manager starten.bat` | geändert | Produktionsstart nutzt denselben Startplan und stoppt zusätzlich Port 3010 |
| `.env.local.example` | neu | Beispielkonfiguration für Homeoffice/Büro und ChatGPT-Tunnel |
| `setup-mcp.ps1` | geändert | Claude-Konfiguration liest API-Key aus Umgebung oder `.env.local` |
| `apps/mcp-server/README.md` | geändert | ChatGPT-/Claude-Betrieb und Autostart dokumentiert |
| `docs/MCP-Tools.md` | geändert | Auth-Modi und Autostart-Variablen dokumentiert |
| `apps/mcp-server/.env.example` | geändert | `MCP_HTTP_AUTH_MODE` ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Pro Rechner muss eine echte `.env.local` mit stabilem Tunnel-Befehl und passender `MCP_PUBLIC_URL` angelegt werden. ChatGPT- und Claude-Desktop-Abnahme bleiben manuelle Schritte, weil sie externe Clients betreffen.
