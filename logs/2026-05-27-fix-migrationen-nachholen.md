# Log: Migrationen nachholen

**Datum:** 27.05.26  
**Schritt:** Fix — Migrationen nachholen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der lokale Migrationslauf wurde erneut über den regulären Befehl `npm run db:migrate -w apps/api` ausgeführt. Der Befehl hat die API erfolgreich kompiliert, die Migrationsdateien nach `dist` kopiert und den vorhandenen Legacy-Migrationsrunner ohne Fehler beendet. Die Nachprüfung der lokalen SQLite-Datenbank `apps/api/data/taskmanager.sqlite` ergab 32 angewendete Migrationen, zuletzt den Journal-Zeitstempel `1779926400000` für `0031_day_plans`. Die zuvor durch einen fehlgeschlagenen `drizzle-kit up`-Versuch ausgelöste Teilkonvertierung der Migrationen 0000-0027 wurde wieder in das bestehende `.sql`-Format zurückgeführt, damit der projektinterne Migrator weiter lauffähig bleibt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/data/taskmanager.sqlite` | geändert | Lokale Dev-Datenbank auf den aktuellen Migrationsstand gebracht |
| `apps/api/dist/db/migrations/` | aktualisiert | Generierte Kopie der Source-Migrationen für den `dist`-Runner |
| `logs/2026-05-27-fix-migrationen-nachholen.md` | neu | Schritt-Log für diesen Migrationslauf |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

`npm run db:generate -w apps/api` ist weiterhin blockiert, weil das Package-Skript die alte Drizzle-Kit-Syntax `generate:sqlite --config=...` verwendet. Der direkte neue CLI-Aufruf `npx drizzle-kit generate --config=drizzle.config.ts` ist ebenfalls blockiert, weil Drizzle-Kit das vorhandene Migrationsformat als veraltet erkennt und wegen fehlender Snapshot-Dateien ab `0028_dashboard_builder` kein `drizzle-kit up` durchführen kann. Die produktiven Source-Migrationsdateien wurden deshalb nicht auf das neue Drizzle-Ordnerformat migriert.

## Offene Punkte / Folgeaufgaben

Die Drizzle-Metadaten ab `0028_dashboard_builder` müssen separat bereinigt oder rekonstruiert werden, bevor neue Migrationen wieder regulär per Drizzle-Kit generiert werden können. Außerdem sollte das `db:generate`-Skript an die aktuelle Drizzle-Kit-CLI angepasst werden, sobald die Metadatenstrategie feststeht.
