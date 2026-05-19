# Codex-Aufgabe: Schema Users, Version und Audit-Felder

## Aufgabenbeschreibung
Führe die schemaweiten Basisfelder aus dem Architektur-Leitfaden ein. Ziel ist ein einheitliches Datenmodell mit zentraler `users`-Tabelle, `version` für Optimistic Locking sowie `created_by`, `updated_by`, `created_at` und `updated_at` auf allen Fach- und Support-Objekt-Tabellen.

Diese Aufgabe bereitet die spätere Repository- und API-Versionierung vor, stellt aber noch nicht alle Services auf Repositories um.

## Scope
Betroffen sind:
- `apps/api/src/db/schema.ts`
- `apps/api/src/db/migrations/`
- `apps/api/src/db/migrations/meta/`
- `apps/api/src/db/migrate.ts`, nur falls Migrationen technisch angepasst werden müssen
- Tests, die Schema- oder Migrationserwartungen prüfen

Entity-Tabellen im Scope:
- Fachobjekte: `projects`, `tasks`, `features`, `use_cases`, `tickets`, `wiki_pages`, `backlog_items`
- Support-Objekte: `comments`, `attachments`, `notes`, `tags`

Nicht im Scope:
- Junction-Tabellen erhalten keine Audit- oder Version-Felder.
- `users` erhält kein `created_by` oder `updated_by`.
- Comment- und Attachment-Junction-Umbauten erfolgen in separaten Aufgaben.
- Service-Repository-Migration erfolgt in separaten Aufgaben.

Abhängigkeiten:
- Aufgabe 01 abgeschlossen oder deren Bestandsaufnahme liegt vor.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lies zunächst den Architektur-Leitfaden vollständig:
`docs/architecture-leitfaden.md`

Lese dann alle betroffenen Dateien und erstelle eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| `apps/api/src/db/schema.ts` | Fehlende `users`-Tabelle und fehlende Pflichtfelder je Entity-Tabelle erfassen | `users` und alle Pflichtfelder gemäß Leitfaden vorhanden |
| `apps/api/src/db/migrations/` | Aktuelle letzte Migration und Snapshot erfassen | Neue Migration mit verlustfreier Erweiterung |
| `apps/api/tests/integration/*.test.ts` | Tests mit direkten Schema-Annahmen erfassen | Tests erwarten neue Felder nur dort, wo Responses sie bereits liefern |

Dokumentiere außerdem:
- Welche Tabellen bereits `created_at` und `updated_at` haben.
- Welche Tabellen fehlende Timestamps haben.
- Welche Tabellen `version`, `created_by` und `updated_by` benötigen.
- Welche bestehenden Daten beim Migrieren Defaultwerte erhalten.

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Schema & Migration

- Lege `users` in `schema.ts` an:
  - `id`
  - `name`
  - `email`
  - `version`
  - `createdAt`
  - `updatedAt`
- Ergänze auf allen Fach- und Support-Objekt-Tabellen:
  - `version integer not null default 1`
  - `created_by integer null references users(id) on delete set null`
  - `updated_by integer null references users(id) on delete set null`
  - fehlendes `created_at`
  - fehlendes `updated_at`
- Erzeuge eine neue Drizzle-Migration mit `npm run db:generate -w apps/api`.
- Prüfe die generierte Migration auf SQLite-Kompatibilität und Datenverlustfreiheit.
- Führe `npm run db:migrate -w apps/api` aus.

Veraltete Comment- oder Attachment-Owner-Spalten werden in dieser Aufgabe nicht entfernt.

---

## Schritt 3: Repository

Keine Repository-Implementierung in dieser Aufgabe.

Dokumentiere nur, welche neuen Felder später durch Repositories gepflegt werden:
- `version` wird bei Updates inkrementiert.
- `created_by` und `updated_by` werden über optionalen `userId` gesetzt.
- `updated_at` wird bei Updates aktualisiert.

---

## Schritt 4: Service

Services werden in dieser Aufgabe nur angepasst, wenn bestehende Inserts oder Tests wegen neuer NOT-NULL-Spalten brechen.

Regeln:
- Keine vollständige Repository-Migration.
- Keine fachlichen Refactorings.
- Keine manuelle Version-Konfliktlogik in Services.

---

## Schritt 5: Route

Keine Route-Kontraktänderung in dieser Aufgabe.

`expectedVersion` wird erst in den Repository- und Service-Aufgaben eingeführt.

---

## Schritt 6: Tests (verpflichtend, vor Abnahme vollständig)

Führe seriell aus:
- `npm run db:migrate -w apps/api`
- `npm run test -w apps/api`

Ergänze oder aktualisiere Integration-Tests nur, wenn die neue Schema-Basis sonst ungetestet bleibt. Mindestens zu prüfen:
- `users`-Tabelle existiert.
- Jede Fach- und Support-Objekt-Tabelle hat `version`.
- Jede Fach- und Support-Objekt-Tabelle hat `created_by` und `updated_by`.
- `comments`, `attachments` und `tags` haben nach der Migration vollständige Timestamps.
- Junction-Tabellen haben keine Audit- oder Version-Felder.

---

## Abnahmekriterien

Die Aufgabe gilt als abgeschlossen wenn alle folgenden Punkte erfüllt sind:

- [ ] `users`-Tabelle existiert im Drizzle-Schema
- [ ] Neue Migration und Migration-Meta-Dateien wurden erzeugt
- [ ] Migration läuft erfolgreich lokal durch
- [ ] Alle Fach- und Support-Objekt-Tabellen haben `version`
- [ ] Alle Fach- und Support-Objekt-Tabellen haben `created_by` und `updated_by`
- [ ] Alle Fach- und Support-Objekt-Tabellen haben `created_at` und `updated_at`
- [ ] `users` hat kein `created_by` oder `updated_by`
- [ ] Junction-Tabellen haben keine Audit- oder Version-Felder
- [ ] Bestehende Daten erhalten verlustfreie Defaults
- [ ] API-Tests laufen grün oder dokumentierte Blocker liegen vor

---

## Referenz

- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Schema: `apps/api/src/db/schema.ts`
- Migrations: `apps/api/src/db/migrations/`
- Migration-Kommando: `npm run db:generate -w apps/api`
- Migration-Lauf: `npm run db:migrate -w apps/api`
- Integration-Tests: `apps/api/tests/integration/`
