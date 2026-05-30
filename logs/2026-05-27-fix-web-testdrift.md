# Log: Web-Testdrift

**Datum:** 27.05.26  
**Schritt:** Fix — Web-Testdrift  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die fehlschlagenden Web-Unit- und Web-Integrationstests wurden an das aktuell beobachtbare Verhalten angepasst. Die Sidebar-Tests erwarten nun den bestehenden Such-Placeholder `Alles durchsuchen`, damit der Test die aktuelle globale Suche prüft statt eines veralteten Navigationssuchtexts. Der Query-Invalidationstest berücksichtigt, dass `invalidateWikiImportData` inzwischen auch Event-Queries invalidiert. Produktionscode, API-Logik und E2E-Flows wurden nicht verändert.

Testleitplanken: Der Testentwurfs-Skill wurde angewendet. Betroffene Testebenen sind Web-Unit mit jsdom und Web-Integration für TanStack-Query-Invalidierung. Es wurden keine neuen Mocks, DB-Zugriffe oder Dateisystemzugriffe eingeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/unit/web/components/layout/Sidebar.test.tsx` | geändert | Sidebar-Placeholder-Erwartungen auf die aktuelle globale Suche angepasst |
| `tests/integration/web/queries/invalidation.integration.test.ts` | geändert | Erwartete Wiki-Import-Invalidierung um `eventsList` ergänzt |
| `logs/2026-05-27-fix-web-testdrift.md` | neu | Schritt-Log für den Testfix |
| `logs/README.md` | geändert | Log-Index um den neuen Testfix ergänzt |

## Probleme und Abweichungen

Keine im umgesetzten Testfix. Die übrigen Fehler aus API-Tests, Lint und E2E wurden nicht bearbeitet, weil sie im Audit nicht als reine Testdrifts eingeordnet waren.

## Offene Punkte / Folgeaufgaben

- API-Testfehler zu Auth/API-Key, Dump-Standardadmin und Notifications bleiben offen.
- Lint-Fehler in Web und API bleiben offen.
- E2E-Timeouts aus dem vorherigen Testlauf bleiben offen.

## Testnachweis

- `npm run test -w apps/web` — ✅ 88 Testdateien, 533 Tests bestanden.
- `npm run build` — ✅ Build bestanden; Vite meldet nur eine Chunk-Größenwarnung.
