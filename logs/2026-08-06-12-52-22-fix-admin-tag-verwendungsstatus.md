# Log: Admin-Tag-Verwendungsstatus

**Datum:** 06.08.26  
**Uhrzeit:** 12:52:22  
**Schritt:** Fix  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Tag-Nutzungszahlen enthalten nun zusätzlich die Anzahl zugeordneter Dokumente. Der Tag-Service zählt dafür die bestehenden Einträge aus `attachment_tags` über den vorhandenen Index und liefert den Wert als `usageCounts.documents`. Die Admin-Tag-Liste berücksichtigt Dokumente sowohl im Verwendungstext als auch bei der Entscheidung zwischen „aktiv“ und „verwaist“. Der geteilte Typvertrag und eine MCP-Testfixture wurden konsistent nachgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Dokumentzähler zum Tag-Nutzungstyp ergänzt |
| `apps/api/src/services/tags.service.ts` | geändert | Dokument-Tag-Zuordnungen in `listTags` gezählt |
| `apps/web/src/components/tags/TagManager.tsx` | geändert | Dokumente in Nutzungstext und Aktivstatus berücksichtigt |
| `tests/integration/api/tags.test.ts` | geändert | Reale DMS-Dokumentzuordnung und verwaistes Gegenbeispiel geprüft |
| `tests/unit/web/components/tags/TagManager.test.tsx` | geändert | Aktiven und verwaisten DMS-Status im DOM geprüft |
| `apps/mcp-server/src/tools.test.ts` | geändert | Testfixture an erweiterten Shared Type angepasst |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.

## Testleitplanken

Der Skill `test-entwurfsleitplanken` wurde angewendet. Die API-Integrationsebene verwendet eine isolierte MySQL-Testdatenbank, die echte Fastify-App, das echte Attachment-Repository und den echten Dokument-Service ohne Mocks. Als positiver Fall wird ein DMS-Tag einem realen Dokument zugeordnet; ein zweiter DMS-Tag bleibt als Gegenbeispiel ungenutzt. Die UI-Unit-Ebene rendert die echte `TagManager`-Komponente in jsdom und mockt ausschließlich den Server-State-Collaborator `useTags` mit fachlich möglichen Nutzungszahlen.

## Ausgeführte Prüfungen

- `npm run build -w packages/shared-types` — grün
- `npm run test -w apps/api -- ../../tests/integration/api/tags.test.ts` — 1 Testdatei, 29 Tests, grün
- `npm run test -w apps/web -- ../../tests/unit/web/components/tags/TagManager.test.tsx` — 1 Testdatei, 2 Tests, grün
- `npm run test -w apps/mcp-server -- src/tools.test.ts -t "lists all available tags"` — 1 ausgewählter Test, grün
- `npm run typecheck -w apps/api` — grün
- `npm run typecheck -w apps/web` — grün
- `npm run typecheck -w apps/mcp-server` — grün
- `npx eslint apps/api/src/services/tags.service.ts apps/web/src/components/tags/TagManager.tsx` — grün
