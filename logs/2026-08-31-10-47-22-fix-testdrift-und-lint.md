# Log: Testdrift und Lint

**Datum:** 31.08.26  
**Uhrzeit:** 10:47:22  
**Schritt:** Fix — Testdrift und Lint  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Web-Unit-Test zur Dokument-Kachelgröße wurde an den aktuellen UI-Vertrag angepasst: die Größensteuerung verwendet die Labels `S`, `M` und `L`, daher klickt der Test jetzt `Kachelgröße L`. Der MCP-Matrix-Test führt nun auch die vorhandenen Tools für Backlog-Items und Projekt-Tagebuch aus, statt sie nur in der Toolliste zu erwarten. Außerdem wurden die vier Lint-Findings bereinigt: ein ungenutzter Drizzle-Import, ein reiner Typimport, ein ungenutzter Schema-Import und ein verwaister `useConfirm`-Import in der Feature-Form.

Für die Testbewertung wurden `planungsleitplanken` und `test-entwurfsleitplanken` angewendet. Die betroffenen Testebenen sind Unit (Web), Integration (MCP gegen echte Fastify-App und echte MySQL-Testdatenbank) sowie statische Prüfung per ESLint.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/unit/web/pages/DocumentsPage.grid.test.tsx` | geändert | Erwartetes Kachelgrößen-Label an UI-Vertrag angepasst |
| `apps/mcp-server/src/tools.integration.test.ts` | geändert | Backlog- und Tagebuch-Tools in die echte MCP-Coverage aufgenommen |
| `apps/api/src/services/attachments.service.ts` | geändert | Ungenutzten `sql`-Import entfernt |
| `apps/api/src/services/calendar-journal.service.ts` | geändert | Reinen Typimport als `import type` markiert |
| `apps/api/src/services/project-context.service.ts` | geändert | Ungenutzten `projects`-Import entfernt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Verwaisten `useConfirm`-Import und Aufruf entfernt |
| `logs/2026-08-31-10-47-22-fix-testdrift-und-lint.md` | neu | Schritt-Log für Testdrift- und Lint-Fixes |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Gezielt grün verifiziert wurden `npm test -w apps/web -- --run ../../tests/unit/web/pages/DocumentsPage.grid.test.tsx`, `npm test -w apps/mcp-server -- --run src/tools.integration.test.ts --fileParallelism=false` und `npm run lint`.

## Offene Punkte / Folgeaufgaben

Die DMS-Bulk-Testgruppe ist noch offen und wird separat geprüft, weil dort ein fachlicher Vertrag zu globalen Sammlungen, Tags und ZIP-Download betroffen sein kann.
