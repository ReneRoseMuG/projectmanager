# Log: MS-23 Schema und API

**Datum:** 28.05.26  
**Schritt:** 1 — Schema, Migration, Dumps und API-Basis  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

`day_plans.notes` wurde aus dem Drizzle-Schema und den Shared Types entfernt. Die neuen Tabellen `day_plan_notes` und `day_plan_comments` wurden ergänzt, inklusive eindeutiger Verknüpfungsindizes. Die API bietet jetzt DayPlan-eigene Notiz- und Kommentar-Endpunkte mit Prüfung, dass der angefragte persönliche Plan zum aktuellen User gehört. Zusätzlich wurden Dump-Registry, Test-Truncation, Journal-Zugriff, Dashboard-Taskdaten und Kommentare auf `dayPlan` erweitert.

Die Migration `0033_day_plan_notes_comments.sql` übernimmt bestehende nicht-leere Tagesnotizen als echte Notizen, verknüpft sie über `day_plan_notes` und baut `day_plans` ohne `notes` neu auf. Die lokale Dev-DB wurde wegen eines bestehenden Migrations-Runner-Blockers direkt mit dieser Migration aktualisiert; `foreign_key_check` war danach sauber.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | `day_plans.notes` entfernt, DayPlan-Notes/-Comments ergänzt, Dashboard-Kontext erweitert |
| `apps/api/src/db/migrations/0033_day_plan_notes_comments.sql` | neu | Datenübernahme und Schemaumbau für persönliche Planung |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migration 0033 registriert |
| `apps/api/src/routes/notes.ts` | geändert | DayPlan-Notiz-Endpunkte ergänzt |
| `apps/api/src/routes/comments.ts` | geändert | DayPlan-Kommentar-Endpunkte ergänzt |
| `apps/api/src/routes/day-plans.ts` | geändert | `notes` aus PATCH-Schema entfernt |
| `apps/api/src/routes/journal.ts` | geändert | DayPlan-Journalzugriff auf aktuellen User begrenzt |
| `apps/api/src/routes/tasks.ts` | geändert | Dashboard-Taskdaten für DayPlan-Owner abgesichert |
| `apps/api/src/services/*.ts` | geändert | DayPlan-Notes/-Comments, Journal-Labels, Dashboard-Templates, Dumps und Taskdaten erweitert |
| `packages/shared-types/src/index.ts` | geändert | DayPlan- und noteList-Typen ergänzt, DayPlan-Notes entfernt |
| `packages/shared-types/dist/*` | geändert | Shared-Type-Build aktualisiert |
| `tests/fixtures/api/db.ts` | geändert | Neue Tabellen in `truncateAll` aufgenommen |

## Probleme und Abweichungen

`npm run db:generate -w apps/api` ist wegen veralteter Drizzle-CLI-Syntax im vorhandenen Script fehlgeschlagen. Die aktuelle CLI akzeptiert `generate`, verlangt aber ein Meta-Upgrade; `drizzle-kit up` scheitert im bestehenden Repo-Zustand mit „No snapshot was found“. `npm run db:migrate -w apps/api` scheitert unabhängig von MS-23, weil das vorhandene Migrations-Journal auf fehlende Altmigrationen wie `0000_special_shaman.sql` verweist. Die neue Migration wurde deshalb separat auf die lokale Dev-DB angewendet und validiert.

## Offene Punkte / Folgeaufgaben

Der Migrations-Runner muss separat repariert werden, damit `db:generate` und `db:migrate` wieder ohne manuelle Ausweichroute laufen.
