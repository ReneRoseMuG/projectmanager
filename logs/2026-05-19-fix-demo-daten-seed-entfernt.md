# Log: Demo-Daten-Seed entfernt

**Datum:** 19.05.26  
**Schritt:** Fix / Feature — Demo-Daten-Seed entfernen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Demo-Daten-Seed-Feature wurde aus dem aktiven Schema, dem Backend und der Frontend-UI entfernt. Die Tabellen `seed_runs` und `seed_run_items` sowie alle `seed_run_id`-Spalten wurden aus `schema.ts` entfernt und über eine neue Migration aus der lokalen Datenbankstruktur entfernt. Die Admin-Seed-Route, der Seed-Service, die Seed-Integrationstests sowie die zugehörigen Shared Types, Web-API-Funktionen, Hooks und die Testdaten-Seite wurden gelöscht. In Comments, Attachments und Events wurde die bisherige Weitergabe von `seedRunId` aus Join-Operationen entfernt. Die Dump-Registry wurde auf die neue Tabellenstruktur angepasst und die Dump-Formatversion auf `6` erhöht, weil sich der Dump-Tabellenvertrag strukturell ändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Seed-Tabellen und alle `seedRunId`-Spalten entfernt |
| `apps/api/src/db/migrations/0019_common_bloodscream.sql` | neu | Rebuild-Migration zum Entfernen der Seed-Spalten und Seed-Tabellen |
| `apps/api/src/db/migrations/meta/0019_snapshot.json` | neu | Drizzle-Snapshot des bereinigten Schemas |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Neue Migration registriert |
| `apps/api/src/app.ts` | geändert | Admin-Seed-Routenregistrierung entfernt |
| `apps/api/src/routes/admin-seed-runs.ts` | gelöscht | Seed-Admin-API entfernt |
| `apps/api/src/services/seed-data.service.ts` | gelöscht | Seed-Erzeugung und Seed-Löschung entfernt |
| `apps/api/src/services/attachments.service.ts` | geändert | Attachment-Joins ohne Seed-Tracking |
| `apps/api/src/services/comments.service.ts` | geändert | Comment-Joins ohne Seed-Tracking |
| `apps/api/src/services/events.service.ts` | geändert | Event-Owner-Joins ohne Seed-Tracking |
| `apps/api/src/services/tickets.service.ts` | geändert | Ticket-Select ohne Seed-Feld |
| `apps/api/src/services/dump.service.ts` | geändert | Seed-Tabellen aus Dump-Registry entfernt, Formatversion erhöht |
| `apps/api/tests/helpers/app.ts` | geändert | Test-App ohne Seed-Route |
| `apps/api/tests/helpers/db.ts` | geändert | Truncation ohne Seed-Tabellen |
| `apps/api/tests/integration/seed-data.test.ts` | gelöscht | Seed-Feature-Test entfernt |
| `packages/shared-types/src/index.ts` | geändert | Seed-Run-DTOs entfernt |
| `apps/web/src/App.tsx` | geändert | Testdaten-Route entfernt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Testdaten-Navigation entfernt |
| `apps/web/src/api/seed-runs.ts` | gelöscht | Seed-Run-API-Client entfernt |
| `apps/web/src/hooks/useSeedRuns.ts` | gelöscht | Seed-Run-Hook entfernt |
| `apps/web/src/pages/SettingsSeedDataPage.tsx` | gelöscht | Testdaten-Seite entfernt |
| `apps/web/src/queries/queryKeys.ts` | geändert | Seed-Query-Key entfernt |
| `apps/web/src/queries/invalidation.ts` | geändert | Seed-Invalidierung entfernt, Wiki-Import-Invalidierung umbenannt |
| `apps/web/src/hooks/useWikiImport.ts` | geändert | Wiki-Import nutzt seedfreie Invalidierung |
| `apps/web/src/queries/__tests__/invalidation.integration.test.ts` | geändert | Invalidierungsvertrag ohne Seed-Queries aktualisiert |

## Probleme und Abweichungen

Drizzle erzeugte zunächst eine SQLite-Migration mit einem reinen Kommentar-Statement und anschließend mit direkten `DROP COLUMN`-Statements. Beides war für diese Schemaänderung nicht lauffähig: Der Kommentar wurde vom Migrator als leeres Statement behandelt, und SQLite konnte `seed_run_id` wegen der alten Fremdschlüsseldefinitionen nicht direkt droppen. Die Migration wurde deshalb als explizite Rebuild-Migration umgesetzt: Trigger entfernen, Tabellen ohne `seed_run_id` neu anlegen, Daten ohne Seed-Spalte übernehmen, alte Tabellen ersetzen, Trigger wiederherstellen und danach die Seed-Tabellen löschen.

## Offene Punkte / Folgeaufgaben

Ein vollständiger Testlauf nach Abschnitt 12 wurde noch nicht ausgeführt. `docs/` wurde noch nicht auf Aktualität geprüft; die Änderung betrifft dort nur mögliche historische Verweise auf das entfernte Feature.
