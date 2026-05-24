# Log: Codex MCP Registrierung

**Datum:** 23.05.26  
**Schritt:** Fix — Codex MCP Registrierung  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der vorhandene Projekt-Manager-MCP wurde anhand der bestehenden Logs und der MCP-README identifiziert. Die globale Codex-Konfiguration unter `C:\Users\schro\.codex\config.toml` wurde über `codex mcp add` um den stdio-Server `projekt-manager` ergänzt. Als Startkommando wird `node` mit dem bestehenden Entrypoint `apps/mcp-server/dist/stdio.js` verwendet. Die erforderlichen Umgebungsvariablen `PROJECT_MANAGER_API_BASE_URL` und `PROJECT_MANAGER_API_KEY` wurden aus der lokalen Umgebung beziehungsweise `apps/api/.env` gesetzt, ohne den Secret-Wert im Log zu wiederholen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `C:\Users\schro\.codex\config.toml` | lokal geändert | Globaler Codex-MCP-Eintrag `projekt-manager` ergänzt |
| `logs/2026-05-23-fix-codex-mcp-registrierung.md` | neu | Schritt-Log für die Codex-MCP-Registrierung |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Die Registrierung ist in `codex mcp list` und `codex mcp get projekt-manager` sichtbar. Die bereits laufende Codex-Session zeigt über `list_mcp_resources` aber weiterhin nur den zuvor geladenen Notion-MCP. Der neue MCP wird daher voraussichtlich erst nach einem Session-Neustart oder Reload als nutzbares Tool in dieser Chat-Session verfügbar.

## Offene Punkte / Folgeaufgaben

Nach Neustart oder Reload einer Codex-Session prüfen, ob der MCP als aktives Tool verfügbar ist und gegen eine laufende Projekt-Manager-API erreichbar ist.
