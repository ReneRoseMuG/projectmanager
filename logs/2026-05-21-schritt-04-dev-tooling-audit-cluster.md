# Log: Dev-Tooling Audit Cluster

**Datum:** 21.05.26  
**Schritt:** 4 — Dev-Tooling Audit Cluster  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der verbleibende dev-only Audit-Cluster wurde über aktualisierte Tooling-Abhängigkeiten bereinigt. Vite, Vitest und das React-Vite-Plugin wurden auf aktuelle kompatible Versionen gehoben. Der alte `drizzle-kit`-Strang über `@esbuild-kit/esm-loader` wurde durch den offiziellen `drizzle-kit` Release Candidate ersetzt, weil der stabile Stand weiterhin den verwundbaren Loader mitbringt. Dazu wurde `drizzle-orm` passend auf denselben RC-Stand gebracht und die Drizzle-Config auf das neue `dialect`-Format umgestellt. Da Drizzles neuer Runtime-Migrator das vorhandene flache Migrationsformat nicht mehr direkt akzeptiert, wurde der lokale Startpfad um einen Legacy-Migrationsreader ergänzt, der die bestehenden SQL-Dateien und `_journal.json` unverändert weiterverwendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `package.json` | geändert | Root-Tooling-Abhängigkeiten bereinigt |
| `package-lock.json` | geändert | Dependency-Auflösung für audit-saubere Paketstände aktualisiert |
| `apps/api/package.json` | geändert | Drizzle ORM/Kit und Vitest-Versionen aktualisiert |
| `apps/web/package.json` | geändert | Vite, Vitest und React-Vite-Plugin aktualisiert |
| `apps/api/drizzle.config.ts` | geändert | Drizzle-Kit-Config von `driver` auf `dialect` umgestellt |
| `apps/api/src/db/client.ts` | geändert | Drizzle-Client-Initialisierung an neue RC-Signatur angepasst |
| `apps/api/src/db/migrate.ts` | geändert | Legacy-Migrationsreader für das bestehende flache Migrationsformat ergänzt |

## Probleme und Abweichungen

`drizzle-kit up` hat beim Testlauf zunächst versucht, alle bestehenden Migrationen in das neue Ordnerformat umzuschreiben. Diese Änderung wurde zurückgerollt, weil versionierte Migrationen laut Repo-Regeln nicht umgeschrieben werden sollen. Der endgültige Stand behält die vorhandenen SQL-Migrationsdateien unverändert und löst den Startfehler stattdessen im lokalen Migrationsreader.

## Offene Punkte / Folgeaufgaben

Keine.
