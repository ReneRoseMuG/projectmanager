# Log: E2E-Worker-DB-Rechte

**Datum:** 31.08.26  
**Uhrzeit:** 10:43:39  
**Schritt:** Fix — E2E-Worker-DB-Rechte  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die E2E-Worker-Datenbanken verwenden jetzt das Präfix `taskmanager_test_e2e_w<N>`. Das passt zu den lokal vorhandenen MySQL-Rechten des Testusers, der bereits `ALL PRIVILEGES` auf `taskmanager_test_%.*` besitzt. Der globale E2E-Teardown räumt sowohl das neue Präfix als auch alte `taskmanager_e2e_w<N>`-Reste auf, damit abgebrochene frühere Läufe nicht liegen bleiben. Der Fix betrifft ausschließlich die Test-Infrastruktur und ändert keine Produktdaten, keine App-Berechtigungen und keine Migration.

Für die Testbewertung wurden `planungsleitplanken`, `test-entwurfsleitplanken` und Graphify angewendet. Die betroffene Testebene ist Browser/E2E-Setup sowie der Integrationstest für den Worker-DB-Lifecycle; bewiesen wird eine echte MySQL-DB-Erzeugung mit realer Migration, Seed und Cleanup.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/fixtures/e2e/worker-db.ts` | geändert | Worker-DB-Präfix auf erlaubten Testbereich umgestellt |
| `tests/browser/global-teardown.ts` | geändert | Safety-Sweep für neues und altes E2E-Worker-Präfix ergänzt |
| `logs/2026-08-31-10-43-39-fix-e2e-worker-db-rechte.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Der gezielte Test `npm test -w apps/api -- --run tests/integration/api/worker-db-lifecycle.test.ts --fileParallelism=false` ist mit 1 Datei und 2 Tests grün.

## Offene Punkte / Folgeaufgaben

Die vollständigen Browser/E2E-Tests müssen nach den weiteren bekannten Testdrift-Fixes erneut laufen.
