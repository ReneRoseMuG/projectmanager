# Log: MS-67 AP01 — Baseline & Messung

**Datum:** 10.06.26  
**Uhrzeit:** 07:51:57  
**Schritt:** AP01 — Baseline & Messung (MS-67 Test Optimierung und Refactoring)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Reine Analyse- und Messaufgabe als Grundlage für AP02–AP12. Die bestehende
Testinfrastruktur wurde gegen eine lokale MySQL geprüft und die Kollisionspunkte
des E2E-Modells aus dem Code abgeleitet.

**Umgebungsfakten (gemessen):**
- MySQL **8.0.45** über `.env.test` (`127.0.0.1:3306`, user `root`) erreichbar.
- `max_connections = 151`.
- `createTestDb()` (`tests/fixtures/api/db.ts`) öffnet pro Test einen Pool mit
  `connectionLimit: 5`. Bei `fileParallelism: true` + `pool: "forks"` können viele
  parallele Forks die 151 Verbindungen erschöpfen → bestätigt das AP10-Risiko.

**Konkretes, beobachtbares Problem (gemessen):**
- Es liegen rund **180 verwaiste `taskmanager_test_*`-Datenbanken** in der MySQL,
  die nicht gedroppt wurden (inkl. `taskmanager_test_appint_*` und `taskmanager_test_catdiag`).
  Ursache: `close()` droppt die Test-DB nur, wenn der Test sauber durchläuft; bei
  Timeout/Crash/abgebrochenem Lauf bleibt die DB liegen. Folgen: Verbindungs- und
  Speicherdruck, langsamer werdende `SHOW DATABASES`/Migrationsläufe.
- Die geteilte E2E-DB `taskmanager_e2e` existiert als Single-Shared-Instanz.

**Kollisionspunkte des aktuellen E2E-Modells (Code-Analyse):**
Alle Playwright-Worker (`workers: CI ? 4 : 2`, `apps/web/playwright.config.ts`) teilen
sich genau eine DB, einen API-Server (Port 3101), eine Web-Instanz (5174) und eine
Admin-Session (`tests/browser/global-setup.ts`). Geteilter globaler Zustand, der
parallel kollidiert:
- App-Settings (`settings.spec.ts`) — globale Singletons.
- Dashboards/Dashboard-Defaults (`dashboard.spec.ts`, `start-page.spec.ts`).
- Katalog-Defaults (`catalog-defaults.spec.ts`).
- Projektübergreifende Listen (`/tickets`, `/projects`) — Tests sehen Fremd-Daten anderer Worker.
- Geteilte Admin-Session/Notifications (`realtime.spec.ts`, `auth.spec.ts`, push-Subscriptions).
- Geteilte Uploads/Content/Previews unter `tests/.runtime/e2e` (ein Verzeichnis für alle Worker).

**Laufzeit-Baseline (Wall-Clock):** Die vollständige Vorher/Nachher-Messung des
Playwright-Laufs (workers=1 vs. 2/4) wird in **AP12** durchgeführt, wenn die
Per-Worker-Isolation steht und beide Modi vergleichbar lauffähig sind. Eine
Messung *vor* dem Umbau ist nur eingeschränkt aussagekräftig, weil der aktuelle
Mehr-Worker-Lauf wegen der oben genannten Kollisionen flaky ist und die Laufzeit
durch Retries verfälscht.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-06-10-07-51-57-ms67-ap01-baseline-messung.md` | neu | Dieser Schritt-Log |
| `logs/README.md` | geändert | Index-Eintrag AP01 |

Kein Produktionscode geändert.

## Probleme und Abweichungen

- Verwaiste Test-DBs (~180) wurden gefunden, aber **bewusst nicht gelöscht** (kein
  spekulativer Eingriff). Ein zuverlässiger Cleanup-Mechanismus ist Teil von
  AP03 (Lifecycle) und AP10 (Connection-/Cleanup-Absicherung).
- Wall-Clock-E2E-Baseline auf AP12 verschoben (begründet oben).

## Offene Punkte / Folgeaufgaben

- AP02: Architekturentscheidung Server-pro-Worker (Design-Gate).
- AP10: Pool-Größe vs. Worker-Anzahl gegen `max_connections=151` absichern.
- AP03/AP12: Cleanup-Helfer für verwaiste `taskmanager_*_test`/`_e2e_w*`-DBs.
