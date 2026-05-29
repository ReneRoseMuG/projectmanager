# Log: MCP Bulk Tools

**Datum:** 29.05.26  
**Uhrzeit:** 08:36:24  
**Schritt:** Feature — MCP Bulk Tools  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Es wurden fünf neue MCP-Schreibtools ergänzt: `add_notes_to_parent`, `add_comments_to_parent`, `add_attachments_to_parent`, `add_task_list_to_parent` und `add_ticket_list_to_parent`. Die Tools laufen seriell gegen die bestehenden API-Routen und greifen nicht direkt auf Datenbank oder Dateisystem zu. Task- und Ticketlisten unterstützen pro Eintrag ein optionales Base64-Attachment, das nach erfolgreicher Objektanlage an das neu erstellte Objekt gehängt wird. Bulk-Ergebnisse enthalten `requested`, `createdCount`, `errorCount`, `created[]` und `errors[]`, damit Teilfehler sichtbar bleiben. Die MCP-Dokumentation wurde um Toolnamen, Parent-Typen und Ergebnisformat ergänzt.

Testleitplanken wurden angewendet. Testebenen: Unit und Integration. Unit-Tests nutzen Mock-Client-Doubles für Pfad-, Schema- und Fehlerlogik; Integrationstests nutzen echte MCP-Aufrufe gegen Fastify mit isolierter Temp-SQLite-Datenbank und Temp-Upload-Verzeichnis.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/tools.ts` | geändert | Bulk-Schemas, serielle Bulk-Ausführung und neue MCP-Tools ergänzt |
| `apps/mcp-server/src/tools.test.ts` | geändert | Unit-Tests für Bulk-Registrierung, Pfade, Attachments und ungültige Base64-Daten ergänzt |
| `apps/mcp-server/src/tools.integration.test.ts` | geändert | Integrationstest führt alle neuen Tools gegen echte App-Daten aus |
| `docs/MCP-Tools.md` | geändert | Bulk-Tools, Parent-Typen und Ergebnisformat dokumentiert |
| `logs/2026-05-29-08-36-24-feature-mcp-bulk-tools.md` | neu | Schritt-Log für diese Umsetzung |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
