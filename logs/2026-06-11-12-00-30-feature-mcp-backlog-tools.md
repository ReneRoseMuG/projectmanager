# Log: MCP-Tools für Backlog Items

**Datum:** 11.06.26  
**Uhrzeit:** 12:00:30  
**Schritt:** Feature — MCP `create_backlog_item` und `update_backlog_item`  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der MCP-Server konnte Backlog Items bisher weder anlegen noch ändern, obwohl die REST-Endpunkte (`POST /projects/:id/backlog`, `PATCH /backlog/:id`, `GET /backlog/:id`), der `backlog`-Permission-Eintrag und die Shared Types bereits existieren. Ergänzt wurden zwei additive Tool-Wrapper nach dem etablierten Muster von `add_ticket_to_parent` / `update_ticket`:

- `create_backlog_item` — projekt-skopiert (`projectId` im Schema, kein `parentType`-Mechanismus, da Backlog Items direkt am Projekt hängen). Optionale Felder `description`, `status`, `importKey`, `featureId`, `useCaseId`, `sortOrder`, `responsibleUserId`. Beschreibung wird via `withHtmlDescription` in Rich-Text-HTML gewandelt.
- `update_backlog_item` — nutzt den vorhandenen `updateVersioned`-Helfer (GET für aktuelle `version`, dann PATCH mit `expectedVersion`), Versionsschutz analog zu `update_ticket`.

Bewusst nicht ergänzt (kein Auftrag): `list_backlog`, `get_backlog`, `delete_backlog`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/mcp-server/src/tools.ts` | geändert | Typ-Importe (`BacklogItem`, `BacklogItemInput`, `BacklogItemUpdate`), zwei Zod-Schemas, zwei `defineTool`-Einträge |
| `apps/mcp-server/src/tools.test.ts` | geändert | Tool-Namensliste erweitert; Unit-Tests für Create-Pfad/HTML-Body und Update mit `expectedVersion` |

## Prüfungen

- `npm run test -w apps/mcp-server`: Unit-Tests grün (59 passed, 1 skipped, inkl. der zwei neuen Tests). Der Integrationstest `tools.integration.test.ts` schlug rein infrastrukturell fehl (`ER_ACCESS_DENIED_ERROR` — keine lokale MySQL-Test-DB; root ohne Passwort). Kein Bezug zur Änderung.
- `npx tsc --noEmit -p apps/mcp-server/tsconfig.json`: Exit 0 (alle `satisfies`-Typen gültig).

## Probleme und Abweichungen

Integrationstest-Suite lokal nicht lauffähig mangels MySQL-Test-DB-Zugang. Als Infrastruktur-Blocker dokumentiert, nicht als Testfehler gewertet (agents.md §12).

## Offene Punkte / Folgeaufgaben

- MCP-Client/-Host muss neu geladen werden, damit die beiden neuen Tools sichtbar werden.
- TKT-123 (versehentlich als Ticket statt Backlog Item angelegt) bleibt unverändert; Löschung nur auf ausdrückliche Anweisung.
