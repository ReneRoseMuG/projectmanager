# Log: Admin-Testdaten

**Datum:** 17.05.26  
**Schritt:** Feature — Admin-Testdaten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Es wurde ein Admin-Bereich für visuelle Testdaten umgesetzt. Seed-Runs werden als eigene Datensätze gespeichert und alle erzeugten Domänenobjekte, Relationen, Kommentare, Content-Dateien und Upload-Dateien werden über `seed_run_id` bzw. ein Seed-Run-Ledger eindeutig markiert. Der Seed-Service erzeugt Projekte, Aufgaben, Unteraufgaben, Tags, Features, Use Cases, Backlog-Einträge, Wiki-Seiten, Notizen, Kommentare, Termine und Attachments in verschiedenen Status- und Prioritätskombinationen. Seed-Runs können über Preview und Bestätigung isoliert gelöscht werden; externe Referenzen auf Seed-Daten blockieren die Löschung, damit echte Daten nicht ungewollt beeinflusst werden. Die Admin-UI unter Einstellungen zeigt vorhandene Seed-Runs, Kennzahlen, Erzeugung und Löschung an.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Seed-Run-Tabellen und `seed_run_id`-Spalten ergänzt |
| `apps/api/src/db/migrations/0007_careful_vin_gonzales.sql` | neu | Migration für Seed-Run-Schema |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Drizzle-Migrationsjournal aktualisiert |
| `apps/api/src/db/migrations/meta/0007_snapshot.json` | neu | Drizzle-Snapshot für Migration 0007 |
| `apps/api/src/services/seed-data.service.ts` | neu | Erzeugen, Preview und isoliertes Löschen von Seed-Runs |
| `apps/api/src/routes/admin-seed-runs.ts` | neu | Admin-Endpunkte für Seed-Runs |
| `apps/api/src/app.ts` | geändert | Seed-Run-Route registriert |
| `apps/api/src/services/dump.service.ts` | geändert | Seed-Run-Tabellen in Dump/Restore aufgenommen |
| `apps/api/src/services/doc-links.service.ts` | geändert | Mapper für neue Seed-Spalte kompatibel gemacht |
| `apps/api/src/services/notes.service.ts` | geändert | Mapper für Teilselektionen kompatibel gemacht |
| `apps/api/src/services/tags.service.ts` | geändert | Mapper für Teilselektionen kompatibel gemacht |
| `apps/api/src/services/tasks.service.ts` | geändert | Task-Mapper für Teilselektionen kompatibel gemacht |
| `packages/shared-types/src/index.ts` | geändert | Seed-Run-DTOs ergänzt |
| `apps/web/src/api/seed-runs.ts` | neu | Frontend-API für Seed-Runs |
| `apps/web/src/hooks/useSeedRuns.ts` | neu | Datenhook für Seed-Runs |
| `apps/web/src/pages/SettingsSeedDataPage.tsx` | neu | Admin-Oberfläche für Testdaten |
| `apps/web/src/App.tsx` | geändert | Route für Testdaten-Seite ergänzt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Navigationseintrag für Testdaten ergänzt |
| `apps/api/tests/helpers/app.ts` | geändert | Test-App registriert neue Route |
| `apps/api/tests/helpers/db.ts` | geändert | Testdaten-Truncate um Seed-Tabellen erweitert |
| `apps/api/tests/integration/seed-data.test.ts` | neu | Integrationstest für Erzeugen und isoliertes Löschen |

## Probleme und Abweichungen

Drizzle hat an die neu erzeugte Migration einen reinen Kommentarblock als eigenes Statement angehängt. Der erste Migrationslauf scheiterte deshalb, bevor die Migration erfolgreich abgeschlossen war. Der Kommentarblock wurde aus der noch nicht erfolgreich angewendeten neuen Migration entfernt; danach lief `npm run db:migrate -w apps/api` erfolgreich durch. Der Build meldet weiterhin nur den bereits bekannten Vite-Hinweis auf große Chunks.

## Offene Punkte / Folgeaufgaben

Keine.
