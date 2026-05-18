# Log: Runtime-Datenbanken

**Datum:** 18.05.26  
**Schritt:** Fix — Runtime-Datenbanken  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Runtime-Trennung wurde geschärft: Dev und lokaler Produktionsstart verwenden die geschützte App-Datenbank unter `apps/api/data/taskmanager.sqlite`, während API-Tests ihre SQLite-Dateien unter `apps/api/.test-runtime/vitest` anlegen. Die Startdatei startet die Anwendung nun im lokalen Produktionsmodus über Build, nicht-destruktive Migration und Vite-Preview. Der API-Dev-Start führt vor dem Watch-Server ebenfalls eine Migration aus, damit eine vorhandene oder frisch angelegte App-Datenbank ein gültiges Schema hat. Die Testhelfer erzeugen file-basierte Testdatenbanken in der Test-Runtime; der Guard gegen Zugriffe aus Testmodus auf `apps/api/data` bleibt aktiv. Das Migrationskommando wurde gegen eine Test-Runtime-DB geprüft; die geschützte App-Datenbank wurde durch die Verifikation nicht migriert oder geleert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `Projekt Manager starten.bat` | geändert | Lokaler Produktionsstart mit geschützter DB, Build, Migration und Preview |
| `apps/api/package.json` | geändert | Dev-Start migriert die geschützte App-DB vor dem Watch-Server |
| `apps/api/src/runtime-safety.ts` | geändert | Geschützte und Test-Runtime-Pfade explizit exportiert |
| `apps/api/tests/helpers/db.ts` | geändert | Testdatenbanken werden unter `.test-runtime/vitest` angelegt |
| `apps/api/src/app.integration.test.ts` | geändert | Integrationstest nutzt explizite Test-Runtime statt OS-Temp-DB |
| `apps/api/tests/integration/dumps-drive.test.ts` | geändert | Dump-Drive-Test nutzt explizite Test-Runtime für seine DB |
| `apps/api/vitest.config.ts` | geändert | Vitest bereitet die Test-Runtime vor jedem Lauf vor |
| `apps/api/tests/setup/prepare-test-runtime.ts` | neu | Löscht ausschließlich die Vitest-Test-Runtime und legt DB-Ordner an |

## Probleme und Abweichungen

Keine. Die lokale geschützte Datenbank ist weiterhin unangetastet; sie wird erst beim nächsten Start über die Startdatei oder über `npm run db:migrate` schema-seitig initialisiert bzw. aktualisiert.

## Offene Punkte / Folgeaufgaben

Kein voller Browser-Testlauf wurde für diesen Fix ausgeführt. Die geprüften Kommandos waren `npm run typecheck -w apps/api`, `npm run test -w apps/api`, `npm run build` und `npm run db:migrate -w apps/api` mit Test-Runtime-Umgebung.
