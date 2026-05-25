# Log: MCP-Keys angleichen

**Datum:** 25.05.26  
**Schritt:** Fix — MCP-Keys angleichen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die lokalen MCP/API-Schlüssel wurden synchronisiert. `.env.local` verwendet nun für `API_KEY` und `PROJECT_MANAGER_API_KEY` dieselben Werte wie `apps/api/.env`, ohne den geheimen Wert im Log offenzulegen. Anschließend wurde `setup-mcp.bat` ausgeführt, damit `C:\Users\schro\AppData\Roaming\Claude\claude_desktop_config.json` den aktualisierten `PROJECT_MANAGER_API_KEY` erhält. Das Script hat vorher automatisch ein Backup der Claude-Konfiguration angelegt.

Nach weiterem Hinweis wurde die Claude-Konfiguration zusätzlich direkt geprüft und korrigiert. Der Projekt-Manager-Eintrag enthält nun sowohl `PROJECT_MANAGER_API_KEY` als auch `API_KEY` mit demselben aktuellen Geheimwert, damit beide möglichen Startpfade denselben Schlüssel verwenden. Vor dieser manuellen Korrektur wurde ein zusätzliches Backup der Claude-Konfiguration erstellt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `.env.local` | geändert | `API_KEY` und `PROJECT_MANAGER_API_KEY` an `apps/api/.env` angeglichen |
| `C:\Users\schro\AppData\Roaming\Claude\claude_desktop_config.json` | geändert | Claude-MCP-Konfiguration durch `setup-mcp.bat` aktualisiert |
| `C:\Users\schro\AppData\Roaming\Claude\claude_desktop_config.json.manual-key-fix.bak` | neu | Backup vor direkter Korrektur der Claude-MCP-Konfiguration |
| `logs/2026-05-25-fix-mcp-keys-angleichen.md` | neu | Schritt-Log für den lokalen MCP-Key-Fix |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Claude Desktop/Cowork muss neu gestartet werden, damit die aktualisierte MCP-Konfiguration geladen wird.
