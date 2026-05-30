# MySQL-Migration Analyse

**Stand:** 29.05.26  
**Meilenstein:** MS-26 — Migration: SQLite → MySQL + Drive-Attachments

## Zielbild

Die API soll produktiv nicht mehr gegen eine lokale SQLite-Datei laufen, sondern gegen eine remote MySQL-Datenbank. Attachments bleiben Dateien, ihr Basisordner wird aber über `ATTACHMENT_BASE_PATH` auf einen synchronisierten Drive-Ordner gelegt. Die bestehenden REST-Verträge, Rollen-/Permission-Regeln und Frontend-Query-Verträge bleiben erhalten.

## Gefundene SQLite-Abhängigkeiten

- `apps/api/package.json` nutzt `better-sqlite3` und `@types/better-sqlite3`; Zielabhängigkeit ist `mysql2`.
- `apps/api/drizzle.config.ts` steht auf Dialekt `sqlite` und liest `DATABASE_PATH`; Ziel ist Dialekt `mysql` mit `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`.
- `apps/api/src/db/client.ts` erzeugt synchron einen `better-sqlite3`-Client und aktiviert `foreign_keys`; Ziel ist ein MySQL-Pool über `mysql2/promise`.
- `apps/api/src/db/migrate.ts` führt SQLite-SQL-Dateien über `sqlite.exec`, `pragma` und `foreign_key_check` aus; Ziel ist ein MySQL-Migrator für eine neue Baseline.
- `apps/api/src/db/schema.ts` enthält 75 `sqliteTable`-Definitionen. Relevante Typwechsel: `sqliteTable` → `mysqlTable`, `blob` → `longblob`, `real` → `double`, Boolean-Integer → MySQL-Boolean/Tinyint, `AnySQLiteColumn` → MySQL-Äquivalent bzw. typisierte Self-References.
- `apps/api/src/app.ts`, `apps/api/src/types.ts` und `apps/api/src/routes/dumps.ts` dekorieren und nutzen `app.sqlite`; Ziel ist kein direkter SQLite-Client in Fastify.
- `apps/api/src/services/dump.service.ts` ist stark SQLite-spezifisch: `Database.Database`, `prepare`, `pragma`, `backup`, manuelle Transaktionen und Tabellenexporte.
- Test-Fixtures und viele Integrationstests nutzen `better-sqlite3`, lokale `.sqlite`-Dateien, `pragma`, `prepare` und direkte SQL-Assertions.

## Riskante Code-Muster Für MySQL

- 46 Vorkommen von `.returning()` in Repositories/Services müssen MySQL-tauglich ersetzt werden, weil Insert-/Update-Rückgaben anders funktionieren.
- 44 Vorkommen von `.run().changes` müssen auf MySQL-Affected-Rows oder Repository-Helper umgestellt werden.
- 87 `database.transaction(...)`-Nutzungen müssen async-fähig werden, weil MySQL-Zugriffe Promise-basiert laufen.
- Dump/Restore darf nicht mehr auf `sqlite.backup()` oder `foreign_key_check` setzen. Für MySQL braucht es Tabellenexport, Import-Transaktionen und FK-Validierung über Counts und relationale Stichproben.
- Tests dürfen nach dem Wechsel keine produktive DB und keine lokale SQLite-Datei verwenden. Integrationstests müssen temporäre MySQL-Datenbanken erzeugen und am Ende löschen.

## Env-Konzept

Neue produktive DB-Variablen:

- `DB_HOST`
- `DB_PORT` mit Default `3306`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSL` als Boolean

Attachment-Variable:

- `ATTACHMENT_BASE_PATH` optional; wenn nicht gesetzt, Fallback auf bisheriges `UPLOAD_DIR`.

Übergangsvariable nur für das Datenmigrationsscript:

- `SQLITE_SOURCE_PATH` oder CLI-Argument; `DATABASE_PATH` bleibt nur noch Kompatibilitätsfallback für die alte Quelldatei.

## Umsetzungshinweise

- Die MySQL-Migration startet mit einer neuen Baseline und führt die bestehenden SQLite-Migrationen nicht auf MySQL aus.
- Die Datenmigration wird als einmaliges Script umgesetzt und bricht ab, wenn die Ziel-Datenbank nicht leer ist oder Row-Counts/FK-Checks nicht plausibel sind.
- `content_images.data` bleibt in der Datenbank und wird als `longblob` übertragen.
- Attachments werden nicht in MySQL gespeichert, sondern über den konfigurierten Drive-Pfad gelesen und geschrieben.
- MS-24 wurde vor Beginn in `work` gemerged; der Arbeitsbranch `ms-26-mysql-migration` basiert auf diesem Stand.
