# Log: TASK-61 Wiki-Projektbezug

**Datum:** 25.05.26  
**Schritt:** Feature — TASK-61 Wiki-Projektbezug auf `Project.wikiPageId` umstellen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Datenmodell wurde von `WikiPage.projectId` auf `Project.wikiPageId` umgestellt. Wiki-Seiten speichern keinen Projektbezug mehr; stattdessen verweist ein Projekt optional auf seine Wiki-Startseite. Die Migration übernimmt bestehende alte Wiki-Projekt-Zuordnungen root-first in `projects.wiki_page_id` und baut `wiki_pages` anschließend ohne `project_id` neu auf. Die Wiki-API weist Legacy-Requests mit `projectId` jetzt explizit mit `400` ab, während die Project-API `wikiPageId` lesen, setzen und lösen kann. Shared Types, API-Tests, Dump-Fixtures und Web-Testfixtures wurden an den neuen öffentlichen Vertrag angepasst.

Testleitplanken: angewendet wurden die Testentwurfsregeln aus `agents.md`, da der lokale Repo-Skill `skills/projekt-manager-test-entwurfsleitplanken` nicht vorhanden ist. Testebene ist API-Integration mit echter Temp-SQLite-DB und isolierten Test-Runtime-Verzeichnissen plus Web-Typecheck. Bewiesen werden Setzen/Lösen/Ablehnen von `wikiPageId`, `ON DELETE SET NULL` beim Löschen der WikiPage, Legacy-`projectId`-Ablehnung in Wiki-Requests und Dump-Roundtrip-Konsistenz.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | `projects.wiki_page_id` ergänzt, `wiki_pages.project_id` entfernt |
| `apps/api/src/db/migrations/0029_project_wiki_page_id.sql` | neu | Datenmigration und Schemaumbau für TASK-61 |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migration `0029_project_wiki_page_id` registriert |
| `apps/api/src/services/wiki.service.ts` | geändert | Projektbezug und Wiki-Owner-Journal-Kontext entfernt |
| `apps/api/src/services/projects.service.ts` | geändert | `wikiPageId` im Project-DTO, Update und Journal ergänzt |
| `apps/api/src/routes/wiki.ts` | geändert | Legacy-`projectId` in Wiki-Requests wird mit `400` abgewiesen |
| `apps/api/src/routes/projects.ts` | geändert | `wikiPageId` im Project-PATCH-Schema ergänzt |
| `apps/api/src/repositories/wiki-page.repository.ts` | geändert | `projectId` aus WikiPage-Update-Daten entfernt |
| `packages/shared-types/src/index.ts` | geändert | `Project.wikiPageId` ergänzt, `WikiPage.projectId` entfernt |
| `tests/integration/api/projects.test.ts` | geändert | Tests für Setzen/Lösen/404/Cascade von `wikiPageId` ergänzt |
| `tests/integration/api/wiki.test.ts` | geändert | Legacy-`projectId`-Ablehnung und Response-Vertrag abgesichert |
| `tests/integration/api/delete-cascade.test.ts` | geändert | Cascade-Erwartung auf neues Project-Wiki-Modell umgestellt |
| `tests/integration/api/dumps-local.test.ts` | geändert | Dump-Fixture auf `projects.wiki_page_id` umgestellt |
| `tests/fixtures/api/factories.ts` | geändert | API-Testfixtures an neue Project-/WikiPage-DTOs angepasst |
| `tests/fixtures/web/components/**` und betroffene Web-Unit-Tests | geändert | Web-Testfixtures typkompatibel um `wikiPageId: null` ergänzt |

## Probleme und Abweichungen

`npm run db:generate -w apps/api` ist mit der installierten Drizzle-Kit-Version blockiert, weil das Script noch `generate:sqlite --config` nutzt. Der aktuelle Befehl `npx drizzle-kit generate --config=drizzle.config.ts` ist ebenfalls blockiert, weil für die bereits vorhandene Migration `0028_dashboard_builder` kein Snapshot existiert. Daher wurde die Migration manuell im bestehenden SQL-/Journal-Format angelegt.

Ein Versuch mit `drizzle-kit up` hat das Migrationsverzeichnis kurzfristig in ein neues Ordnerformat konvertiert und dann mit „No snapshot was found“ abgebrochen. Diese Werkzeug-Nebenwirkung wurde zurückgeführt, indem die flachen `0000`-bis-`0027`-SQL-Dateien aus den erzeugten `migration.sql`-Dateien wiederhergestellt und die erzeugten Ordner entfernt wurden. Der endgültige Status enthält nur die neue `0029`-Migration und den `_journal.json`-Eintrag.

Der erste vollständige API-Testlauf lief nach 120 Sekunden in ein Timeout. Der zweite vollständige API-Testlauf zeigte erwartbare TASK-61-Test-/Fixture-Reste, die anschließend gezielt angepasst wurden.

## Offene Punkte / Folgeaufgaben

- Die Drizzle-Generate-Infrastruktur bleibt unabhängig von TASK-61 reparaturbedürftig: `0028_dashboard_builder` hat keinen Snapshot und das npm-Script verwendet eine veraltete Drizzle-Kit-CLI-Syntax.
- Keine fachlichen Folgeaufgaben für TASK-61 offen.
