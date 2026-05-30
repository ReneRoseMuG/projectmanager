# Log: Claude Config UTF-8 BOM

**Datum:** 26.05.26  
**Schritt:** Fix — Claude Config UTF-8 BOM  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der von Claude gemeldete JSON-Parsefehler wurde auf ein UTF-8-BOM-Zeichen am Anfang der `claude_desktop_config.json` zurückgeführt. Ursache war die PowerShell-Ausgabe mit `Out-File -Encoding UTF8`, die auf diesem Rechner eine BOM schreibt. Das Setup-Skript wurde so geändert, dass JSON-Dateien künftig per `.NET` als UTF-8 ohne BOM geschrieben werden. Danach wurde `setup-mcp.bat` erneut ausgeführt und beide Claude-Konfigurationsdateien wurden erfolgreich ohne BOM neu geschrieben. Beide Dateien sind gültiges JSON und enthalten den `projekt-manager`-MCP-Eintrag.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `setup-mcp.ps1` | geändert | Schreibt Claude-JSON-Konfigurationen UTF-8 ohne BOM |
| `%APPDATA%\Claude\claude_desktop_config.json` | geändert, lokal | BOM-frei neu geschrieben und `projekt-manager` geprüft |
| `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json` | geändert, lokal | BOM-frei neu geschrieben und `projekt-manager` geprüft |
| `logs/2026-05-26-fix-claude-config-utf8-bom.md` | neu | Schritt-Log zur Claude-JSON-Reparatur |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

Keine. Claude lief während der Reparatur nicht, daher konnte die Konfiguration ohne konkurrierendes Zurückschreiben geändert werden.

## Offene Punkte / Folgeaufgaben

Claude Desktop erneut starten und prüfen, ob der `projekt-manager`-MCP jetzt sichtbar ist.
