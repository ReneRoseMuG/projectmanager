# Log: Datenmodell und Migration

**Datum:** 28.05.26  
**Uhrzeit:** 14:45:31  
**Schritt:** 1 — Datenmodell, Migration und Dump-Vertrag  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Das Wiki-Datenmodell wurde um Attachments, Aufgaben, Tickets und bidirektionale Wiki-Relationen erweitert. `content_path` wurde aus Features, Use Cases und Wiki-Seiten im Drizzle-Schema entfernt; DB-`content` bleibt erhalten. Die neue Migration `0034_ms_26_wiki_refactor.sql` wurde manuell angelegt, weil der vorhandene Drizzle-Generate-Befehl in diesem Repo weiterhin am CLI-Optionsformat scheitert. Der bestehende Migration-Runner konnte die Migration erfolgreich ausführen und der API-Build lief dabei grün durch. Dump-Registry, Test-`truncateAll` und Dump-Testdaten berücksichtigen die neuen Wiki-Linktabellen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Wiki-Linktabellen ergänzt und `contentPath` entfernt |
| `apps/api/src/db/migrations/0034_ms_26_wiki_refactor.sql` | neu | Neue Tabellen und Drop von `content_path` |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migration 0034 registriert |
| `apps/api/src/services/dump.service.ts` | geändert | Neue Tabellen und Dump-Format 14 ergänzt |
| `tests/fixtures/api/db.ts` | geändert | Truncate-Reihenfolge um neue Wiki-Tabellen ergänzt |
| `tests/integration/api/dumps-local.test.ts` | geändert | Dump-Roundtrip-Testdaten auf DB-Content und neue Tabellen angepasst |
| `packages/shared-types/src/index.ts` | geändert | Wiki-Owner und Wiki-Relation-Summaries ergänzt |

## Probleme und Abweichungen

`npm run db:generate -w apps/api` schlägt wegen `Unrecognized options for command 'generate:sqlite': --config` fehl. Deshalb wurde die Migration entsprechend dem bestehenden manuellen Migrationszustand des Repos angelegt. `npm run db:migrate -w apps/api` war erfolgreich.

## Offene Punkte / Folgeaufgaben

Drizzle-Generate-Konfiguration separat reparieren, damit künftige Migrationen wieder automatisch erzeugt werden können.
