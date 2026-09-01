# Log: Kategorie-Cleanup und Rollout

**Datum:** 19.07.26  
**Uhrzeit:** 19:31:32  
**Schritt:** 12 — Kategorie-Cleanup, Dokumentation und Rollout abschließen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Vor dem destruktiven Cleanup wurde mit `scripts/ms80-backup.mjs` ein gekoppeltes Backup von Datenbank und Uploadverzeichnis erzeugt. Das gültige Backup `backups/ms80-2026-07-19T17-09-17-317Z` wurde anhand beider SHA-256-Prüfsummen, aller Tabellenzahlen und sämtlicher Uploaddateien erfolgreich in einer isolierten lokalen Testdatenbank sowie einem temporären Uploadverzeichnis rückgespielt. Anschließend wurden Kategorie-Schema, Relation, Repository, Service, Routes, Shared Types, Web-API, Hooks und Query-Key entfernt. Die Migration `20260719171342_needy_karen_page` prüft vor dem ersten `DROP TABLE` jede Kategorie und jede Kategorie-Relation gegen den fachlich passenden DMS-Tag und bricht bei Nullverlustverletzungen per `SIGNAL` ab; sie wurde regulär angewandt. Das neue Benutzer- und Betriebshandbuch dokumentiert Sammlungen, Tags, Uploadentscheidung, Duplikat-Check, Importer/MCP, geschützte Downloads, Rollout, Monitoring und die nicht transaktionale MySQL-Rollback-Grenze. Die Testentwurfsleitplanken wurden für echte MySQL-Integration, Browser/E2E und den seriellen Gesamttest angewendet; Testdatenbanken, temporäre Dateiverzeichnisse und vorhandene Worker-Isolation bleiben die Sicherheitsgrenze.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `scripts/ms80-backup.mjs` | neu | Gekoppeltes DB-/Upload-Backup mit lokaler Rückspielprüfung |
| `apps/api/src/db/schema.ts` | geändert | Kategorie-Tabellen aus dem aktiven Schema entfernt |
| `apps/api/src/db/migrations/20260719171342_needy_karen_page/` | neu | Wiederanlaufsicherer, nullverlustgeschützter Kategorie-Cleanup |
| `apps/api/src/repositories/attachment-category.repository.ts` | gelöscht | Veraltete Kategorie-Persistenz entfernt |
| `apps/api/src/services/attachment-category.service.ts` | gelöscht | Veraltete Kategorie-Logik entfernt |
| `apps/api/src/routes/dms.ts` | geändert | Kategorie-API und Kategorie-Zuordnungsroutes entfernt |
| `apps/api/src/services/document.service.ts` | geändert | Kategorie-Anreicherung und Kategorie-Filter entfernt |
| `packages/shared-types/src/index.ts` | geändert | `AttachmentCategory` und Attachment-Kategoriefeld entfernt |
| `apps/web/src/api/documents.ts` | geändert | Kategorie-API und Filterparameter entfernt |
| `apps/web/src/hooks/useDocuments.ts` | geändert | Kategorie-Queries und Mutationen entfernt |
| `apps/web/src/queries/queryKeys.ts` | geändert | Verwaisten Kategorie-Query-Key entfernt |
| `tests/fixtures/api/db.ts` | geändert | Entfernte Tabellen aus dem Truncate-Regime genommen |
| `tests/integration/api/dms.test.ts` | geändert | Kategorie-API-Abwesenheit und kategoriefreies DTO geprüft |
| `tests/integration/api/dms-category-tag-migration.test.ts` | geändert | Historische Migration gegen synthetische Legacy-Tabellen isoliert |
| `tests/integration/api/dms-category-cleanup-migration.test.ts` | neu | Nullverlust-Gate und Wiederanlauf des Cleanup-Schritts entworfen |
| `tests/unit/web/hooks/useDocuments.test.tsx` | geändert | Kategorie-Hook-Tests nach Featureentfernung bereinigt |
| `tests/unit/windows-importer/importer.test.ts` | geändert | Veraltetes Kategorie-Ausgabefeld entfernt |
| `docs/dms-ms-80-benutzer-und-betriebshandbuch.md` | neu | Nutzer-, Betriebs-, Monitoring- und Rolloutdokumentation |
| `docs/dms-ms-80-kategorie-tag-migration.md` | geändert | Backup- und Cleanup-Nachweis ergänzt |
| `docs/dms-ms-80-bestandsaufnahme.md` | geändert | Früheres Backup-Gate als aufgelöst dokumentiert |
| `docs/dms-ms-80-importvertrag.md` | geändert | Finalen Import- und Downloadvertrag dokumentiert |

## Probleme und Abweichungen

Zwei fehlgeschlagene, nicht rückspielbare Zwischen-Backups wurden nach expliziter Pfadprüfung innerhalb von `backups/` endgültig entfernt; nur das vollständig verifizierte Backup bleibt erhalten. Der serielle API-Gesamttest lief 504 Sekunden: 82 von 87 Testdateien sind grün, fünf Dateien enthalten zusammen 14 rote Testfälle. Die roten Gruppen sind sechs alte Owner-Uploads ohne verpflichtende `libraryVisibility`, eine veraltete `404`-Erwartung für eine nun bereits am Auth-Guard mit `401` geschützte statische URL, zwei Cleanup-Fixtures und zwei historische Kategorie-Migrationsfixtures ohne verpflichtende Tag-Zeitstempel, ein Schema-Migrationstest mit einem inzwischen von einem FK benötigten Index, der bekannte bibliotheksunsichtbare Detailzugriff sowie ein neuer Vertragsbefund: `category` wird beim direkten HTTP-Upload derzeit ignoriert und der Upload mit `201` angelegt. Windows-Importer ist mit 9/9 grün. MCP meldet 74 grüne Tests und einen Skip; die Integrationssuite scheitert weiterhin im alten Test-DB-Setup, bevor der Client initialisiert wird. Web-Build, API-Build/Migration, MCP-Build und Importer-Build sind grün. Der In-App-Browser war nicht verfügbar. Gemäß Nutzerfreigabe wurden aus roten Tests keine Fixes in dieser Sitzung abgeleitet.

## Offene Punkte / Folgeaufgaben

- Die 14 roten API-Testfälle in einer eigenen Testsitzung nachführen; insbesondere den still ignorierten `category`-Queryparameter serverseitig ablehnen.
- MCP-Integrationstest-Setup und Web-Unit-Aufruf separat korrigieren, ohne Assertions abzuschwächen.
- Browser/E2E mit dem vorgesehenen In-App-Browser ausführen und Rollen-, Filter-, Upload- und Downloadwege fachlich abnehmen.
- Monitoring-Grenzwerte an die reale Betriebsplattform anbinden und die 60-Minuten-/24-Stunden-Auswertung protokollieren.
- TASK-506, die übrigen teilweise abgenommenen Tasks und MS-80 aktiv lassen; erst nach fachlicher Abnahme auf `Wartend` setzen beziehungsweise den Meilenstein schließen.
