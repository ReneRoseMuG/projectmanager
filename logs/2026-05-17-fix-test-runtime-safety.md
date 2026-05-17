# Log: Test Runtime Safety

**Datum:** 17.05.26  
**Schritt:** Fix — Test-DB und Test-Dateisystem erzwingen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Für Test-Runtimes wurde ein zentraler Safety Guard ergänzt, der Datenbank- und Dateisystemziele gegen die normalen App-Pfade absichert. Sobald `NODE_ENV=test`, `VITEST=true` oder `TASKMANAGER_TEST_MODE=1` aktiv ist, dürfen DB-Ziele nur noch `:memory:`, `os.tmpdir()` oder `apps/api/.test-runtime` verwenden. Dateisystemziele für Uploads, Content und Backups dürfen im Testmodus ebenfalls nur noch Temp- oder `.test-runtime`-Verzeichnisse verwenden. Playwright startet API und Web jetzt über isolierte E2E-Skripte auf `3101/5174`, ohne vorhandene normale Dev-Server wiederzuverwenden. Die bereits verunreinigte aktive SQLite-Datei wurde vorher gesichert und von eindeutig markierten `E2E`-Datensätzen bereinigt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/runtime-safety.ts` | neu | Zentraler Guard für Test-DB- und Test-Dateisystempfade |
| `apps/api/src/runtime-safety.test.ts` | neu | Guard-Testfälle für erlaubte und blockierte Testpfade |
| `apps/api/src/config.ts` | geändert | `CONTENT_DIR` ergänzt und relative Pfade stabil zum API-Root aufgelöst |
| `apps/api/src/db/client.ts` | geändert | DB-Pfad wird vor dem Öffnen im Testmodus geprüft |
| `apps/api/src/app.ts` | geändert | API-Start prüft alle Runtime-Ziele im Testmodus gemeinsam |
| `apps/api/src/services/content.service.ts` | geändert | Content-Lese-/Schreibzugriffe prüfen Test-Dateisystempfade |
| `apps/api/src/services/attachments.service.ts` | geändert | Upload-Schreib-/Löschzugriffe prüfen Test-Dateisystempfade |
| `apps/api/src/services/dump.service.ts` | geändert | Dump-/Restore-FS- und DB-Ziele werden im Testmodus geprüft |
| `apps/api/src/plugins/static.ts` | geändert | Upload-Static-Root wird im Testmodus geprüft |
| `apps/api/tests/helpers/db.ts` | geändert | File-Testdatenbanken werden gegen den Guard geprüft |
| `apps/api/scripts/prepare-e2e-runtime.mjs` | neu | Bereitet isolierte E2E-Laufzeitverzeichnisse vor und verweigert Nicht-Testmodus |
| `apps/api/package.json` | geändert | `dev:e2e` und `predev:e2e` ergänzt |
| `apps/web/package.json` | geändert | isoliertes `dev:e2e` für Vite auf Port 5174 ergänzt |
| `apps/web/playwright.config.ts` | geändert | E2E nutzt isolierte Ports, DB, Uploads, Content und Backups |
| `apps/web/e2e/*.spec.ts` | geändert | API-Basis-URL auf Playwright-Testumgebung umgestellt |
| `.gitignore` | geändert | `.test-runtime` ausgeschlossen |
| `apps/api/.env.example` | geändert | `CONTENT_DIR` ergänzt |
| `agents.md` | geändert | Leitplanke für DB-/FS-Isolation in Tests ergänzt |

## Probleme und Abweichungen

Der erste neue Guard-Test war einmal rot, weil Vitest selbst `VITEST=true` setzt und die Testannahme das nicht berücksichtigt hatte; die Assertion wurde auf explizite Env-Objekte korrigiert. Es wurde kein vollständiger Browser-E2E-Lauf ausgeführt, weil die Task-E2E-Flows bereits als rot bekannt sind und separat geklärt werden sollen. Die E2E-Runtime wurde aber vorbereitet und migriert; dabei wurde ausschließlich `apps/api/.test-runtime/e2e` verwendet.

## Offene Punkte / Folgeaufgaben

Die bekannten roten Task-Browsertests bleiben ein separater Folgepunkt. Für die Runtime-Sicherheit ist der aktuelle Stand abgeschlossen: Testläufe mit DB- oder Dateisystembezug können im Testmodus nicht mehr still gegen `apps/api/data/`, `apps/api/uploads/`, `apps/api/content/` oder `apps/api/backups/` laufen.
