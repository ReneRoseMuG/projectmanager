# Log: DMS-Dokumente 500 — Diagnose Schema-Drift (MS-75)

**Datum:** 04.07.26  
**Uhrzeit:** 07:21:07  
**Schritt:** Diagnose — Fehler „Dokumente konnten nicht geladen werden" (MS-75 DMS)  
**Status:** 🔎 Ursache identifiziert, Fix vorgeschlagen — noch nichts geändert, Freigabe ausstehend

## Symptom

Die Dokumente-Seite (`/documents`) zeigt beim Laden einen roten Fehler:

> Dokumente konnten nicht geladen werden: Request failed with status code 500 Internal Server Error: GET http://localhost:3001/api/documents

Der API-Server selbst ist erreichbar (Server Status „erreichbar · 4 ms"), nur der Datenabruf schlägt fehl.

## Befund (Ursache)

**Schema-Drift zwischen Code und der gemeinsamen Aiven-DB: Die DMS-Migration `20260703085813_parched_unus` ist nur halb angewendet.**

Ablauf des Fehlers:
- Die Seite ruft zuerst `GET /api/documents` → `listDocumentLibrary` → `database.select().from(attachments)`. Drizzle selektiert dabei **alle** gemappten Spalten, inklusive der neuen `display_name` und `description`.
- Fehlen diese Spalten (und/oder die neuen DMS-Tabellen bzw. `tags.is_system`) in der DB, antwortet MySQL mit einem Fehler → die API gibt **500** zurück. Das passiert bereits bei 0 Datensätzen, weil die Spalten schon im SELECT stehen.

Belege:
- Die Migration wurde lokal (noch **nicht committed**) von `CREATE TABLE` auf `CREATE TABLE IF NOT EXISTS` umgebaut (und `UNIQUE INDEX` → `PRIMARY KEY` an den Link-Tabellen). Das ist das typische Zeichen dafür, dass die Migration schon einmal mittendrin abgebrochen ist und erneut laufen sollte.
- **MySQL-DDL ist nicht transaktional:** Bricht die Migration in der Mitte ab, bleiben die bereits erzeugten Tabellen bestehen, aber Drizzle verbucht die Migration als „nicht angewendet". Die restlichen Statements (u. a. `ALTER TABLE attachments ADD display_name/description`, `ALTER TABLE tags ADD is_system`, alle Fremdschlüssel) fehlen dann.

**Tragweite:** Nicht nur die Dokumente-Seite. `attachmentRepository.findById` führt ebenfalls `database.select().from(attachments)` aus — jeder Pfad, der einen Anhang komplett lädt (Aufgaben, Tickets, Features …), trifft dieselbe fehlende Spalte, sobald ein Anhang geladen wird.

## Untersuchte Stellen

- `apps/api/src/routes/dms.ts` — Route `GET /documents` (sauber, keine Fehlerquelle im Handler)
- `apps/api/src/services/document.service.ts` — `listDocumentLibrary` / `mapDocument` / `loadCategories|Tags|Folders`
- `apps/api/src/repositories/attachment.repository.ts` — `findById` selektiert `SELECT *` inkl. neuer Spalten
- `apps/api/src/db/schema.ts` (uncommitteter Diff), `.../migrations/20260703085813_parched_unus/migration.sql`
- `apps/api/src/db/migrate.ts` (Drizzle-Migrator, Ledger-Tabelle `__drizzle_migrations_taskmanager`), `client.ts`, `config.ts`

## Diagnose-Blocker

Zur exakten Bestimmung der fehlenden Objekte wurde ein **rein lesendes** Diagnoseskript vorbereitet (`information_schema` + `COUNT`, keine DDL, keine Änderung). Der **Harness-Wächter (Auto-Mode-Classifier) blockiert den direkten Zugriff auf die zentrale Aiven-Produktiv-DB** — auch nach mündlichem OK im Chat, da nur eine dauerhafte Berechtigungsregel in den Settings als Freigabe erkannt wird. Zugriff wurde bewusst **nicht** umgangen.

Alternative Ist-Zustands-Quellen (an Nutzer übergeben): API-Server-Log auslesen, Skript selbst ausführen, oder Bash-Permission-Regel setzen.

## Vorgeschlagener Fix (noch nicht umgesetzt)

Da die Ursache klar ist, ist eine Prod-Inspektion nicht zwingend nötig. Vorschlag: Die Migration so **robust/idempotent** machen, dass sie aus **jedem** Teilzustand sauber durchläuft (fehlende Spalten/Tabellen/FKs ergänzen, Vorhandenes überspringen), das Migrations-Ledger geradeziehen, danach die Migration **einmal** einspielen. Der Schreibzugriff auf die Prod-DB bleibt eine bewusste Nutzer-Aktion.

## Offene Punkte / nächster Schritt

- **Freigabe ausstehend:** Nutzer muss „Go" für den Fix geben (Regel: keine Code-Änderung ohne Genehmigung). Danach Umbau der Migration + ein Migrations-Lauf.
- **Kein Code geändert.** Die uncommitteten Working-Tree-Änderungen (`schema.ts`, `migration.sql`, `snapshot.json`) sind **vorbestehend**, nicht aus dieser Session.
- **Architektur-Leitfaden:** Ergänzung des DMS-Datenmodells bewusst **zurückgestellt**, bis das Schema final steht (aktuell instabiler Zwischenstand).
