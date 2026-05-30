# Log: Tests und Abnahme

**Datum:** 28.05.26  
**Uhrzeit:** 14:59:23  
**Schritt:** 4 — Tests, Fixtures und Abnahme  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Testleitplanken wurden angewendet: API-Integration nutzt echte Fastify-App und isolierte SQLite-Testdatenbanken, Web-Tests laufen in jsdom, Browser/E2E über Playwright. Test-Fixtures wurden auf DB-`content` ohne `contentPath` umgestellt. Neue API-Abdeckung prüft Wiki-Relationen, Wiki-Task-Links, Wiki-Ticket-Links, Cascade-Verhalten und Wiki-Attachment-Uploads/-Löschung. Web-Tests und Fixtures wurden auf die neue WikiPage-Struktur mit Counts und `relatedPages` angepasst.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/integration/api/wiki.test.ts` | geändert | Wiki-Relationen, Task-/Ticket-Links und Cascade ergänzt |
| `tests/integration/api/attachments.test.ts` | geändert | WikiPage als Attachment-Owner ergänzt |
| `tests/integration/api/features.test.ts` | geändert | `contentPath`-Fallbacks entfernt |
| `tests/integration/api/use-cases.test.ts` | geändert | `contentPath`-Fallbacks entfernt |
| `tests/integration/api/dumps-local.test.ts` | geändert | Dump-Testdaten an neues Schema angepasst |
| `tests/unit/api/services/content.service.test.ts` | geändert | ContentService-Test auf verbliebene Pfadkonfiguration reduziert |
| `tests/fixtures/api/factories.ts` | geändert | Test-DTOs ohne `contentPath`, Wiki-Counts ergänzt |
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | Wiki-Fixtures ergänzt |
| `tests/fixtures/web/components/ui/factories.ts` | geändert | Feature-/Use-Case-Fixtures ohne `contentPath` |
| `tests/unit/web/components/wiki/WikiPageForm.test.tsx` | geändert | Neue Props und Submit-Signatur angepasst |
| `tests/unit/web/components/wiki/WikiPageDetail.test.tsx` | geändert | Neue WikiPage-Struktur und Router-Kontext ergänzt |
| `tests/unit/web/pages/WikiPage.test.tsx` | geändert | `useProjects`/Relation-Sync-Mocks ergänzt |
| `tests/integration/web/hooks/queryMutations.integration.test.tsx` | geändert | Fixture ohne `contentPath` |
| `tests/unit/web/components/features/FeatureDetail.test.tsx` | geändert | Fixture ohne `contentPath` |
| `tests/unit/web/pages/FeatureDetailPage.test.tsx` | geändert | Fixture ohne `contentPath` |
| `tests/unit/web/pages/UseCaseDetailPage.test.tsx` | geändert | Fixture ohne `contentPath` |

## Probleme und Abweichungen

`npm run test -w apps/api` ist fehlgeschlagen: 38 Testdateien, 34 grün, 4 rot; 426 Tests, 391 grün, 35 rot. Fehlergruppen: Auth 5x `401` statt erwarteter Login-/API-Key-Erfolge, Day-Plans 1x `200` statt erwarteter `400`, Dumps 26x Seed-Fehler `table day_plans has no column named notes`, Notifications 3x `401` beim Event-Setup. Diese Fehler liegen außerhalb der MS-26-Wiki-Änderungsfläche und wurden gemäß Repo-Regel nicht eigenständig repariert.

`npm run test -w apps/web` war erfolgreich: 89 Testdateien, 546 Tests grün. `npm run e2e -w apps/web` war blockiert: Der erste Lauf lief in den Tool-Timeout, hinterließ einen Playwright-Webserver auf Port 3101, der bereinigt wurde; der anschließende saubere Lauf lief erneut in den Timeout. Port 3101 ist danach wieder frei.

## Offene Punkte / Folgeaufgaben

API-Bestandsfehler separat analysieren. Playwright/E2E-Timeout separat untersuchen, idealerweise mit Runner-Logs oder angepasster Timeout-/Webserver-Konfiguration.
