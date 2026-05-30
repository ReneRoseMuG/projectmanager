# Log: Wiki Support Tabs

**Datum:** 28.05.26  
**Uhrzeit:** 17:49:16  
**Schritt:** Fix / Feature — Wiki-Seiten mit Kommentaren, Notizen und Dateien im Edit-Modal  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Das Wiki-Edit-Modal zeigt beim Bearbeiten einer bestehenden Wiki-Seite jetzt Tabs für Details, Kommentare, Notizen und Dateien. Kommentare und Dateien verwenden die vorhandenen Wiki-Hooks und Komponenten; für Notizen wurde der fehlende Wiki-Owner nach dem bestehenden Notiz-Owner-Muster ergänzt. Dafür gibt es eine neue Join-Tabelle `wiki_page_notes`, neue API-Endpunkte unter `/api/wiki/:id/notes`, Web-API/Hooks, Query-Keys und zentrale Invalidation. Beim Löschen einer Wiki-Seite werden zugeordnete Wiki-Notizen vollständig entfernt, damit keine verwaisten Notizen stehen bleiben. Der Testentwurfs-Skill wurde angewendet: API-Integration nutzt echte Test-DBs, Web-Unit nutzt jsdom und gemockte direkte Hooks, Auth prüft echte Rollen/Sessions.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | `wiki_page_notes` als Join-Tabelle ergänzt |
| `apps/api/src/db/migrations/0036_wiki_page_notes.sql` | neu | Migration für Wiki-Notiz-Verknüpfungen |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migration `0036_wiki_page_notes` registriert |
| `apps/api/src/routes/notes.ts` | geändert | GET/POST für `/wiki/:id/notes` ergänzt |
| `apps/api/src/services/notes.service.ts` | geändert | Wiki-Owner für Listen, Erstellen, Journal-Kontext und Lösch-Cleanup ergänzt |
| `apps/api/src/services/wiki.service.ts` | geändert | Wiki-Notizen vor Wiki-Seiten-Löschung entfernt |
| `apps/api/src/services/dump.service.ts` | geändert | Dump-Format und Tabelle `wikiPageNotes` ergänzt |
| `tests/fixtures/api/db.ts` | geändert | Test-Truncate kennt `wiki_page_notes` |
| `apps/web/src/api/notes.ts` | geändert | Wiki-Notiz-API-Funktionen ergänzt |
| `apps/web/src/hooks/useNotes.ts` | geändert | `wikiPage` als NoteOwner ergänzt |
| `apps/web/src/queries/queryKeys.ts` | geändert | `wikiPage` als NoteOwnerType ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | Wiki-Notizen invalidieren Wiki-Detail und Wiki-Root |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Edit-Modal mit Tabs für Kommentare, Notizen und Dateien erweitert |
| `tests/integration/api/notes.test.ts` | geändert | Wiki-Notiz-Create/List und Wiki-Lösch-Cleanup abgesichert |
| `tests/integration/api/auth.test.ts` | geändert | Berechtigungstest für Wiki-Notizen ergänzt |
| `tests/integration/web/queries/invalidation.integration.test.ts` | geändert | Invalidation für Wiki-Notizen ergänzt |
| `tests/unit/web/components/wiki/WikiPageForm.test.tsx` | geändert | Support-Tabs im Edit-Modus abgesichert |

## Probleme und Abweichungen

`npm run db:generate` ist am bestehenden Script `drizzle-kit generate:sqlite --config=drizzle.config.ts` gescheitert, weil die installierte Drizzle-Kit-Version diese Option für `generate:sqlite` nicht akzeptiert. Der direkte neue Befehl `npx drizzle-kit generate --config=drizzle.config.ts --name=wiki_page_notes` scheiterte anschließend am bestehenden veralteten Migrationsordner-Format und verlangte `drizzle-kit up`; diese Formatumstellung wurde nicht vorgenommen, weil sie außerhalb dieses Fixes liegt. Die Migration wurde deshalb im bestehenden Legacy-Migrationsformat angelegt; `npm run db:migrate` lief erfolgreich.

Der kombinierte API-Lauf `npm run test -w apps/api -- tests/integration/api/notes.test.ts tests/integration/api/auth.test.ts` hatte fünf bestehende Fehler in älteren Auth-Flow-Tests mit `401` statt `200/403`; der neue Wiki-Notiz-Auth-Test war grün. Der Dump-Contract-Lauf ist blockiert, weil die vorhandene Seed-Routine noch in `day_plans.notes` schreibt, obwohl die aktuelle DB diese Spalte nicht mehr hat. `git diff --check` meldete nur bestehende CRLF-Warnungen.

## Offene Punkte / Folgeaufgaben

- Drizzle-Generate-Script oder Migrationsordner-Format separat bereinigen.
- Bestehende Auth-Flow-Fehler in `tests/integration/api/auth.test.ts` separat untersuchen.
- Dump-Testdaten in `tests/integration/api/dumps-local.test.ts` an das aktuelle `day_plans`-Schema anpassen.
