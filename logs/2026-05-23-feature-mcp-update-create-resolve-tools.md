# Log: MCP Update Create Resolve Tools

**Datum:** 23.05.26  
**Schritt:** Feature — MCP Update-, Create- und Resolve-Tools  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die unvollständigen MCP-Update-Tools wurden durch vollständige `update_project`, `update_milestone`, `update_task`, `update_ticket`, `update_feature` und `update_use_case` ersetzt. Die neuen Update-Tools lesen vor dem PATCH die aktuelle Version und senden `expectedVersion` mit. Zusätzlich wurden `create_project`, `create_milestone` und `resolve_reference` ergänzt. Die zunächst geplanten Delete-Tools wurden nach Nutzerkorrektur wieder entfernt; Löschen bleibt ausdrücklich eine User-Funktion und wird nicht über MCP angeboten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/tools.ts` | geändert | Vollständige Update-/Create-Tools und `resolve_reference`; keine Delete-Tools |
| `apps/mcp-server/src/server.ts` | geändert | `resolve_reference` als read-only Tool eingeordnet |
| `apps/mcp-server/src/tools.test.ts` | geändert | Unit-Tests für Toolliste, Updates, Creates und Referenzauflösung |
| `apps/mcp-server/src/tools.integration.test.ts` | geändert | MCP-Integrationstest auf neue Toolmatrix angepasst |

## Probleme und Abweichungen

Abweichung vom ursprünglichen Plan: Delete-Tools wurden auf ausdrücklichen Nutzerwunsch entfernt. Beim Build wurde `resolution` im Ticket-Update enger typisiert, damit nur zulässige Ticket-Resolution-Werte angenommen werden.

## Offene Punkte / Folgeaufgaben

Keine.
