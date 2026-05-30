# Log: Claude Store MCP Konfig

**Datum:** 26.05.26  
**Schritt:** Fix — Claude Store MCP Konfig  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Ursache dafür, dass Claude Desktop den Projekt-Manager-MCP-Server nach dem Neustart nicht kannte, wurde eingegrenzt. Auf diesem Bürorechner läuft Claude als Microsoft-Store-App und verwendet zusätzlich zur klassischen `%APPDATA%\Claude`-Konfiguration einen Store-App-Pfad unter `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude`. Das Setup-Skript wurde so erweitert, dass es künftig beide Konfigurationspfade aktualisiert. Danach wurde `setup-mcp.bat` erneut ausgeführt; beide Claude-Konfigurationen enthalten nun den `projekt-manager`-MCP-Eintrag mit vorhandenem `stdio.js`-Pfad und gesetztem API-Key.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `setup-mcp.ps1` | geändert | Schreibt MCP-Konfiguration auch in Microsoft-Store-Claude-Pfade |
| `%APPDATA%\Claude\claude_desktop_config.json` | geändert, lokal | Klassische Claude-Konfiguration aktualisiert |
| `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json` | geändert, lokal | Store-App-Claude-Konfiguration um `projekt-manager` ergänzt |
| `logs/2026-05-26-fix-claude-store-mcp-konfig.md` | neu | Schritt-Log zur Store-App-Konfigurationskorrektur |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

Keine. Die ursprüngliche Einrichtung hatte nur die klassische Claude-Konfiguration geschrieben; das reichte für die hier installierte Microsoft-Store-Variante nicht aus.

## Offene Punkte / Folgeaufgaben

Claude Desktop muss nach dieser Änderung vollständig beendet und neu gestartet werden, damit die Store-App-Konfiguration neu geladen wird.
