# Log: MCP Link Tools

**Datum:** 23.05.26  
**Schritt:** Feature — MCP Link-Tools  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für den MCP Server wurden zwei neue Tools ergänzt: `link_task_to_parent` und `link_ticket_to_parent`. Beide verknüpfen bestehende Aufgaben oder Tickets mit einem Projekt oder Meilenstein, ohne neue Objekte anzulegen. Die Tools nutzen die vorhandenen Backend-Routen für Owner-Verknüpfungen und unterstützen ausschließlich `project` und `milestone` als Parent-Typen. Delete- oder Unlink-Tools wurden bewusst nicht ergänzt, da Löschen und Entfernen User-Funktionen bleiben.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/tools.ts` | geändert | Link-Schemas und Tools für bestehende Tasks/Tickets ergänzt |
| `apps/mcp-server/src/tools.test.ts` | geändert | Unit-Test für Toolliste und korrekte Link-Pfade |
| `apps/mcp-server/src/tools.integration.test.ts` | geändert | Integrationstest führt beide Link-Tools gegen echte Test-App aus |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
