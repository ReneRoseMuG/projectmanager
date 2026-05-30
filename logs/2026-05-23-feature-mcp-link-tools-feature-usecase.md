# Log: MCP Link Tools Feature Use Case

**Datum:** 23.05.26  
**Schritt:** Feature — MCP Link-Tools Feature und Use Case  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die bestehenden MCP-Tools `link_task_to_parent` und `link_ticket_to_parent` wurden um `feature` und `useCase` als erlaubte Parent-Typen erweitert. Der Pfadaufbau nutzt für Use Cases den vorhandenen API-Pfad `use-cases/:id` und für Features `features/:id`. Die Tools bleiben reine Link-Funktionen für bestehende Aufgaben und Tickets; Delete- oder Unlink-Funktionen wurden nicht ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/tools.ts` | geändert | Link-Parent-Schema und Pfadaufbau auf Feature/Use Case erweitert |
| `apps/mcp-server/src/tools.test.ts` | geändert | Unit-Test prüft alle vier Parent-Typen und negative Parent-Typen |
| `apps/mcp-server/src/tools.integration.test.ts` | geändert | Integrationstest verknüpft Task und Ticket zusätzlich mit Feature und Use Case |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
