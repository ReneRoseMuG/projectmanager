# Log: Schema Users, Version und Audit-Felder

**Datum:** 19.05.26  
**Schritt:** 2 — Schema Users, Version und Audit-Felder  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die `users`-Tabelle wurde im Drizzle-Schema ergänzt. Alle Fach- und Support-Objekt-Tabellen aus dem Leitfaden wurden um `version`, `created_by` und `updated_by` erweitert. Fehlende Timestamps wurden ergänzt: `comments`, `attachments` und `tags` haben nun `updated_at`, `tags` zusätzlich `created_at`. Drizzle konnte nach Korrektur der fehlerhaften Snapshot-Kette wieder eine Migration erzeugen; die generierte SQL wurde SQLite-kompatibel angepasst, weil SQLite keine neuen Spalten mit `DEFAULT datetime('now')` per einfachem `ALTER TABLE` akzeptiert. Die Migration wurde auf einer frischen Test-Runtime-Datenbank und auf der lokalen Dev-DB erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | `users` und Pflichtfelder auf Fach-/Support-Objekten ergänzt |
| `apps/api/src/db/migrations/0013_lame_microbe.sql` | neu | Migration für `users`, Version, Audit-Felder und fehlende Timestamps |
| `apps/api/src/db/migrations/meta/0012_snapshot.json` | geändert | Fehlerhafte Snapshot-Vorgängerreferenz korrigiert |
| `apps/api/src/db/migrations/meta/0013_snapshot.json` | neu | Neuer Drizzle-Snapshot |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Neue Migration registriert |
| `apps/api/src/services/tickets.service.ts` | geändert | Ticket-Select um neue Schemafelder ergänzt, damit der API-Build kompiliert |
| `logs/2026-05-19-schritt-02-schema-users-version-audit.md` | neu | Schritt-Log für Aufgabe 02 |
| `logs/README.md` | geändert | Log-Index um Aufgabe 02 ergänzt |

## Probleme und Abweichungen

Der erste `drizzle-kit generate`-Lauf meldete eine Snapshot-Kollision, weil `0012_snapshot.json` auf den Null-Parent statt auf `0011` zeigte. Das wurde in den Meta-Daten korrigiert; versionierte SQL-Migrationen wurden dabei nicht umgeschrieben.

Der erste Migrationslauf stoppte an SQLite: `ALTER TABLE ... ADD updated_at text DEFAULT (datetime('now')) NOT NULL` ist nicht zulässig. Die Migration wurde deshalb für `attachments`, `comments` und `tags` auf Table-Rebuild umgestellt.

Der API-Testlauf `npm run test -w apps/api` ist nicht grün: 277 Tests grün, 1 Test rot. Roter Test: `tests/integration/dumps-drive.test.ts > Dump table contract > registriert alle Anwendungstabellen der aktuellen SQLite-Datenbank genau einmal`. Ursache: `users` existiert nun als Anwendungstabelle, ist aber noch nicht in der Dump-Tabellenregistry enthalten. Gemäß Nutzeranweisung wurde kein Fix aus dem Testlauf heraus umgesetzt.

## Offene Punkte / Folgeaufgaben

- `users` muss in einer passenden Folgeaufgabe in die Dump-Tabellenregistry aufgenommen werden.
- Die weiteren Architekturaufgaben werden trotz dokumentiertem Testblocker fortgeführt.
