# Log: MCP Server

**Datum:** 23.05.26  
**Schritt:** Feature — MCP Server  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Es wurde ein neues Workspace-Paket `apps/mcp-server` angelegt. Der MCP-Server nutzt die bestehende Projekt-Manager-API über `x-api-key` und greift nicht direkt auf Datenbank oder API-Services zu. Der Tool-Satz deckt lesende Kontexttools, nicht-destruktive Create-Tools für Aufgaben, Tickets, Kommentare und Notizen sowie versionsgeschützte Beschreibungs-Updates für Projekte, Meilensteine, Aufgaben und Tickets ab. Zusätzlich wurden Feature- und Use-Case-Workflows ergänzt, inklusive Feature-Erstellung, Content-Updates, Feature-Verknüpfung und Use-Case-bezogenen Aufgaben/Tickets. Für Claude Desktop gibt es einen stdio-Entrypoint, für remote Clients einen Streamable-HTTP-Entrypoint.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/` | neu | MCP-Workspace mit API-Client, Tool-Registry, stdio-/HTTP-Entrypoints und Tests |
| `package.json` | geändert | Workspace und Root-Build um MCP-Server erweitert |
| `package-lock.json` | geändert | MCP-SDK- und Zod-Abhängigkeiten aufgenommen |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

`npm install` meldet eine moderate bekannte Vulnerability im Dependency-Tree. Der Build läuft dennoch durch. Vite meldet im Root-Build weiterhin eine Chunk-Größenwarnung für das Web-Bundle; das ist keine neue MCP-Funktionseinschränkung.

## Offene Punkte / Folgeaufgaben

Eine spätere feinere Maschinenrolle für MCP-API-Keys kann separat geplant werden. Aktuell nutzt der MCP-Server den vorhandenen API-Key-Mechanismus der API.
