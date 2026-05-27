# Log: Migrationen ausführen

**Datum:** 27.05.26  
**Schritt:** Fix — Migrationen ausführen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die ausstehenden Migrationen `0030_ms_14_notifications` und `0031_day_plans` wurden auf die lokale SQLite-Datenbank `apps/api/data/taskmanager.sqlite` angewendet. Der reguläre Befehl `npm run db:migrate -w apps/api` wurde zuerst verwendet, brach aber vor dem Migrationsschritt im TypeScript-Build ab. Anschließend wurden die aktuellen Migrationsdateien mit dem bestehenden Script nach `dist` kopiert und der vorhandene Migrationsrunner `node dist/db/migrate.js` aus `apps/api` ausgeführt. Die Nachprüfung ergab 32 erwartete und 32 angewendete Migrationen ohne fehlende oder zusätzliche Journal-Einträge. Zusätzlich wurden `events.reminder_minutes` sowie die neuen Tabellen und Indizes für Benachrichtigungen, Push-Abos und Tagespläne in der Datenbank bestätigt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/data/taskmanager.sqlite` | geändert | Lokale Dev-Datenbank auf Migration `0031_day_plans` gebracht |
| `apps/api/dist/db/migrations/` | aktualisiert | Aktuelle Migrationsdateien für den bestehenden `dist`-Runner kopiert |
| `logs/2026-05-27-fix-migrationen-ausführen.md` | neu | Schritt-Log für die lokale Migrationsausführung |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der reguläre Migrationsbefehl ist weiterhin durch bestehende TypeScript-Fehler blockiert, unter anderem fehlende Shared-Type-Exports für `DayPlan` und Push-Typen, nicht erweiterte Owner-/Permission-Typen für `dayPlan` und `notifications` sowie fehlende Modulauflösung für `node-cron`, `nodemailer` und `web-push`. Der direkte `tsx`-Fallback war ebenfalls blockiert, weil `esbuild` unter der aktuellen Node-Laufzeit mit `spawn UNKNOWN` abbrach. Die Migrationen selbst wurden deshalb über den vorhandenen `dist`-Migrationsrunner ausgeführt.

## Offene Punkte / Folgeaufgaben

Der reguläre Befehl `npm run db:migrate -w apps/api` sollte nach Behebung der bestehenden TypeScript- und Dependency-Fehler wieder ohne Fallback ausführbar sein.
