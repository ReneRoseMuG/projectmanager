# Log: Legacy-Spalten Cleanup

**Datum:** 19.05.26  
**Schritt:** 9 — Cleanup Drop Legacy Columns  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Legacy-Owner-Spalten aus `comments` und `attachments` wurden aus dem aktiven Drizzle-Schema, den Shared Types, Services, Seed-Daten und Test-Fixtures entfernt. Comments und Attachments liefern im Zielzustand ausschließlich `owners: [...]`; die Routen verwenden `entityType` und `entityId` nur noch zur Adressierung, nicht als Persistenzmodell in der Basistabelle. Die Migration `0016_funny_blizzard.sql` baut bestehende Owner-Daten in die Junction-Tabellen zurück, erstellt `comments` und `attachments` ohne Legacy-Spalten neu und setzt die Kommentar-Orphan-Trigger wieder auf. Die lokale Dev-Datenbank wurde migriert und anschließend auf entfernte Spalten sowie verwaiste Comments und Attachments geprüft. Sichtbare UI-Änderungen waren nicht notwendig; die daraus folgende UI-Nacharbeit wurde als eigene Aufgabe dokumentiert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Legacy-Spalten aus `comments` und `attachments` entfernt |
| `apps/api/src/db/migrations/0016_funny_blizzard.sql` | neu | SQLite-sichere Migration für Backfill und Tabellen-Rebuild |
| `apps/api/src/db/migrations/meta/0016_snapshot.json` | neu | Drizzle-Snapshot für Migration 0016 |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migration 0016 registriert |
| `apps/api/src/services/comments.service.ts` | geändert | Comment-DTO und Inserts auf Owner-Junction-Modell umgestellt |
| `apps/api/src/services/attachments.service.ts` | geändert | Attachment-DTO und Inserts auf Owner-Junction-Modell umgestellt |
| `apps/api/src/services/seed-data.service.ts` | geändert | Seed-Daten und externe Referenzprüfung auf Junction-Tabellen umgestellt |
| `packages/shared-types/src/index.ts` | geändert | Legacy-Felder aus `Comment` und `Attachment` entfernt |
| `apps/api/src/app.integration.test.ts` | geändert | Assertions auf `owners` aktualisiert |
| `apps/api/tests/integration/*.test.ts` | geändert | Fixtures und Assertions an bereinigte Tabellen angepasst |
| `apps/web/src/components/**/*.test.tsx` | geändert | UI-Test-Fixtures an ownerbasierte DTOs angepasst |
| `docs/tasks/11-ui-nacharbeit-owner-dto-cleanup.md` | neu | Nachfolgeaufgabe für UI-Prüfung und DTO-Nacharbeit |
| `agents.md` | geändert | Architekturregeln gegen neue direkte Owner-Spalten geschärft |

## Probleme und Abweichungen

Die erste Migration lief nicht durch, weil der API-Build zunächst noch gegen veraltete Shared Types und anschließend gegen bestehende Kommentar-Trigger prüfte. Das wurde innerhalb des Plans gelöst: Shared Types wurden gebaut, ein veralteter Integrationstest wurde angepasst und die Migration droppt/rebuildet die Kommentar-Trigger jetzt kontrolliert um den Tabellen-Rebuild herum. Frühere Testläufe zeigten veraltete Assertions und Fixtures; diese wurden auf das neue Owner-DTO-Modell umgestellt.

## Offene Punkte / Folgeaufgaben

Die sichtbare UI benötigt keinen Sofortumbau, sollte aber im Folgeauftrag `docs/tasks/11-ui-nacharbeit-owner-dto-cleanup.md` gezielt auf alte DTO-Annahmen, Labels und Owner-Erweiterbarkeit geprüft werden. Historische Migrationen und ältere Logs enthalten weiterhin alte Spaltennamen als Projektgeschichte; der aktive Schema-, Runtime- und Testpfad ist bereinigt.
