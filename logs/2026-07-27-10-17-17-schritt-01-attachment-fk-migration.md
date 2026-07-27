# Log: Attachment-FK-Migration

**Datum:** 27.07.26  
**Uhrzeit:** 10:17:17  
**Schritt:** 1 — Datenbereinigung und Wiederherstellung der Attachment-Fremdschlüssel  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für alle sechs Attachment-Junction-Tabellen wurde eine neue versionierte Custom-Migration erzeugt. Die Migration entfernt ausschließlich Verknüpfungen zu nicht mehr vorhandenen Attachments oder Ownern und ergänzt anschließend pro Tabelle beide Fremdschlüssel mit `ON DELETE CASCADE`. Alle Prüfungen erfolgen über `information_schema`, sodass ein abgebrochener Lauf sicher wiederholt werden kann. Vor dem zentralen Lauf wurden die 62 betroffenen Junction-Zeilen unter `tests/.runtime` gesichert. Der zentrale Migrationslauf war erfolgreich; anschließend wurden null Orphans und zwölf aktive Kaskaden-Fremdschlüssel bestätigt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/migrations/20260727080900_restore_attachment_junction_fks/migration.sql` | neu | Wiederanlaufsichere Bereinigung und FK-Wiederherstellung |
| `apps/api/src/db/migrations/20260727080900_restore_attachment_junction_fks/snapshot.json` | neu | Vom Drizzle-Generator erzeugter Schema-Snapshot |

## Probleme und Abweichungen

Der erste Generatorlauf stoppte wegen eines bereits vorhandenen Konflikts zwischen historischen MS-79-/MS-80-Migrationen an `attachment_categories`. Die Custom-Migration wurde daraufhin mit der dafür vorgesehenen Option `--ignore-conflicts` erzeugt; die historischen Migrationen blieben unverändert. `schema.ts` musste nicht geändert werden, weil es die zwölf korrekten Fremdschlüssel bereits als Soll-Zustand enthält.

## Offene Punkte / Folgeaufgaben

Ein repository-weites Audit auf weitere fehlende Fremdschlüssel außerhalb der Attachment-Junctions bleibt eine separate Folgeaufgabe.
