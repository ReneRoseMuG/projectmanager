# Log: API-Testdrift und DB-SSL

**Datum:** 04.06.26  
**Uhrzeit:** 17:46:07  
**Schritt:** Fix — API-Testdrift und DB-SSL  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Test- und E2E-Konfiguration setzt `DB_SSL` jetzt explizit auf `false`, damit lokale Testläufe nicht versehentlich die produktive SSL-Datenbankkonfiguration erben. Veraltete API-Testdrift wurde ohne Produktionscodeänderung bereinigt: der nicht mehr existierende `resolveBackupWorkDir`-Testblock wurde entfernt, die doppelte Attachment-Sync-Routenregistrierung im Test wurde entfernt und Kommentar-Assertions erwarten nun die vom Service normalisierte HTML-Form. Die eigentliche Produktlogik, API-Routen, Services, Repositories, Shared Types, Datenmodell und Migrationen wurden nicht geändert.

Testleitplanken: Betroffene Ebenen waren API-Unit, API-Integration und die Browser/E2E-Startkonfiguration. Geprüft wurde das beobachtbare Verhalten „Plaintext-Kommentare werden als HTML-Antworten geliefert“, „Attachment-Sync-Routen sind in der Test-App erreichbar“ und „die App-Integration läuft ohne geerbten SSL-Handshaking-Fehler“. Echte Daten liefen weiter über isolierte Test-DBs, `tests/.runtime` und Temp-Verzeichnisse; keine Produktions-Upload- oder Produktions-DB-Pfade wurden verwendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/vitest.config.ts` | geändert | `DB_SSL=false` für API-Testläufe gesetzt |
| `apps/web/playwright.config.ts` | geändert | `DB_SSL=false` für den Playwright-API-WebServer gesetzt |
| `tests/unit/api/config.test.ts` | geändert | Obsolete Backup-Helper-Tests entfernt und Scope-Kommentar angepasst |
| `tests/integration/api/attachment-sync.test.ts` | geändert | Doppelte Routenregistrierung entfernt |
| `tests/integration/api/auth.test.ts` | geändert | Kommentar-Erwartung auf HTML normalisiert |
| `tests/integration/api/dashboard-widgets.test.ts` | geändert | Kommentar-Erwartungen auf HTML normalisiert |
| `tests/integration/api/milestones.test.ts` | geändert | Kommentar-Erwartung auf HTML normalisiert |
| `tests/integration/api/tickets.test.ts` | geändert | Kommentar-Erwartungen auf HTML normalisiert |
| `logs/2026-06-04-17-46-07-fix-api-testdrift-und-db-ssl.md` | neu | Schritt-Log zum Fixblock |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der gezielte API-Testlauf für die bearbeiteten Dateien lief mit 96 grünen und 1 roten Test. Der verbleibende rote Test war der nicht als sichere Testdrift eingestufte Overdue-Dashboard-Fall. Der ehemalige SSL-Blocker `tests/integration/api/app.integration.test.ts` wurde separat geprüft und ist mit 3 grünen Tests bestanden. Der vollständige API-Testlauf lief anschließend ohne SSL-Blockade und ohne übersprungene Tests, endete aber mit 520 grünen und 4 roten Tests. Rot bleiben drei Catalog-Delete-Fälle mit `404` statt erwartetem `204` sowie ein Overdue-Dashboard-Fall, in dem zusätzlich „In Arbeit“ als überfällige Aufgabe erscheint.

## Offene Punkte / Folgeaufgaben

Die verbleibenden vier API-Fehler sollten nicht blind als Testdrift grüngebogen werden. Nächster sinnvoller Schritt ist eine kleine Analyse der Catalog-Delete-Tests und der Overdue-Statuslogik, um zu entscheiden, ob Fixture, Testannahme oder Produktverhalten korrigiert werden muss.
