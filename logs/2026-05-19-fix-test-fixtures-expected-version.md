# Log: Test-Fixtures Expected Version

**Datum:** 19.05.26  
**Schritt:** Fix — Test-Fixtures Expected Version  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die test- und fixture-lokalisierten Fehler aus dem API-Testlauf wurden behoben. Die API-Test-Fixtures typisieren jetzt die `version`-Felder für versionierte Entitäten, und die betroffenen PATCH- und Board-Move-Tests senden den neuen Pflichtwert `expectedVersion`. Zusätzlich leert der Test-DB-Helper nun auch die neuen Comment- und Attachment-Junction-Tabellen, damit Tests nicht durch alte Join-Datensätze verunreinigt werden. Produktionscode und Dump-Registry wurden bewusst nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/tests/helpers/factories.ts` | geändert | `version` in Test-DTOs ergänzt |
| `apps/api/tests/helpers/db.ts` | geändert | neue Junction-Tabellen in `truncateAll` aufgenommen |
| `apps/api/src/app.integration.test.ts` | geändert | Update-Payloads um `expectedVersion` ergänzt |
| `apps/api/tests/integration/projects.test.ts` | geändert | Project-PATCH-Tests aktualisiert |
| `apps/api/tests/integration/tasks.test.ts` | geändert | Task-PATCH- und Board-Tests aktualisiert |
| `apps/api/tests/integration/owner-task-relations.test.ts` | geändert | Owner-Board-PATCH-Tests aktualisiert |
| `apps/api/tests/integration/subtasks.test.ts` | geändert | Subtask-PATCH-Test aktualisiert |
| `apps/api/tests/integration/tickets.test.ts` | geändert | Ticket-PATCH- und Position-Tests aktualisiert |
| `apps/api/tests/integration/features.test.ts` | geändert | Feature-PATCH-Tests aktualisiert |
| `apps/api/tests/integration/use-cases.test.ts` | geändert | Use-Case-PATCH-Tests aktualisiert |
| `apps/api/tests/integration/wiki.test.ts` | geändert | Wiki-PATCH-Tests aktualisiert |
| `apps/api/tests/integration/backlog.test.ts` | geändert | Backlog-PATCH-Tests aktualisiert |
| `apps/api/tests/integration/notes.test.ts` | geändert | Note-PATCH-Test aktualisiert |
| `apps/api/tests/integration/tags.test.ts` | geändert | Tag-PATCH-Test aktualisiert |
| `logs/2026-05-19-fix-test-fixtures-expected-version.md` | neu | Schritt-Log für den Test-Fixture-Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der API-Testlauf ist weiterhin nicht vollständig grün, aber nur noch wegen des nicht testlokalen Dump-Registry-Tests. Dieser Punkt betrifft App-Infrastruktur und wurde gemäß Auftrag nicht geändert.

## Offene Punkte / Folgeaufgaben

Die Dump-Registry muss in einem separaten Produktionscode-Fix um `users`, die Comment-Junction-Tabellen und die Attachment-Junction-Tabellen erweitert werden.
