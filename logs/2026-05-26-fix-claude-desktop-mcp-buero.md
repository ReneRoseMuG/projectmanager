# Log: Claude Desktop MCP Büro

**Datum:** 26.05.26  
**Schritt:** Fix — Claude Desktop MCP Büro  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Claude Desktop wurde auf diesem Rechner dauerhaft für den Projekt-Manager-MCP-Server konfiguriert. Der MCP-Server wurde zuerst erfolgreich gebaut, damit `apps/mcp-server/dist/stdio.js` vorhanden und aktuell ist. Anschließend wurde das vorhandene Setup-Skript `setup-mcp.bat` ausgeführt; es hat die Claude-Konfiguration unter `%APPDATA%\Claude\claude_desktop_config.json` angelegt und den MCP-Server `projekt-manager` eingetragen. Danach wurde die erzeugte Konfiguration ohne Ausgabe des API-Keys geprüft. Zusätzlich wurde der gleiche `stdio`-Startweg wie in Claude mit einem MCP-Client verifiziert; dabei wurden 37 Tools gelistet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `%APPDATA%\Claude\claude_desktop_config.json` | neu, lokal | Dauerhafte Claude-Desktop-MCP-Konfiguration für `projekt-manager` |
| `apps/mcp-server/dist/*` | generiert | Aktualisierter Build des MCP-Servers |
| `logs/2026-05-26-fix-claude-desktop-mcp-buero.md` | neu | Schritt-Log zur Claude-Desktop-Einrichtung im Büro |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

Keine. Claude Desktop lief während der Einrichtung bereits; die neue Konfiguration wird deshalb erst nach einem vollständigen Neustart von Claude Desktop aktiv.

## Offene Punkte / Folgeaufgaben

Claude Desktop vollständig beenden und neu öffnen. Danach muss der Projekt-Manager-MCP-Server in Claude als `projekt-manager` verfügbar sein. Die Projekt-Manager-API muss laufen, wenn Claude tatsächlich Daten lesen oder schreiben soll.
