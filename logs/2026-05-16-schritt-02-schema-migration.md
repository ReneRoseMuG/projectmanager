# Log: Schema & Migration

**Datum:** 16.05.26  
**Schritt:** 2 — DB-Schema + Drizzle-Migration  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Das Drizzle-Schema für Projekte, Aufgaben, Kommentare, Tags, Notizen, Attachments und Termine wurde angelegt. Eine initiale Drizzle-Migration wurde mit `drizzle-kit generate:sqlite` erzeugt. Der DB-Client aktiviert SQLite-Foreign-Keys und nutzt `DATABASE_PATH` aus der API-Konfiguration. Der Migrationsrunner ist vorhanden, konnte lokal aber nicht erfolgreich ausgeführt werden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | neu | Vollständiges Drizzle-Schema |
| `apps/api/src/db/client.ts` | neu | Drizzle- und SQLite-Client |
| `apps/api/src/db/migrate.ts` | neu | Migrationsrunner |
| `apps/api/src/db/migrations/0000_special_shaman.sql` | neu | Initiale Migration |
| `apps/api/drizzle.config.ts` | neu | Drizzle-Kit-Konfiguration |

## Probleme und Abweichungen

`npm run db:migrate` ist blockiert, weil `better-sqlite3@^9` für Node 24.12.0 kein Native-Binding installiert hat. Der vorherige native Build scheiterte zusätzlich daran, dass `node-gyp` keine lauffähige Python-Installation findet.

## Offene Punkte / Folgeaufgaben

Migration unter Node 20 oder mit funktionierender Python-/Build-Toolchain erneut ausführen.
