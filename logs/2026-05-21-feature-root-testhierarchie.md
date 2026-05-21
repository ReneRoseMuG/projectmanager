# Log: Root-Testhierarchie

**Datum:** 21.05.26  
**Schritt:** Feature — Zentrale Root-Testhierarchie  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Teststruktur wurde auf einen zentralen Root-Ordner `tests/` umgestellt. API-Unit-Tests, API-Integrationstests, Web-Unit-Tests, Web-Integrationstests, Browser-Tests, Fixtures und Setups wurden in die neue Typ-Hierarchie verschoben. Relative Imports wurden an die neuen Speicherorte angepasst, ohne die fachliche Testlogik zu ändern; eine alte API-Test-Typumwandlung wurde rein technisch über `unknown` stabilisiert. Die Testkonfigurationen für Vitest und Playwright zeigen nun auf `tests/`, und separate Root-Test-TSConfigs sichern API- und Web-Testtypisierung ab. Die Runtime-Safety nutzt nun `tests/.runtime` statt `apps/api/.test-runtime`. `agents.md` dokumentiert die neue Hierarchie und aktualisierte Testpfade.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/` | neu / geändert | Zentrale Testhierarchie mit `unit/`, `integration/`, `browser/`, `fixtures/`, `setup/` und `.runtime/` |
| `apps/api/vitest.config.ts` | geändert | API-Test-Discovery auf Root-Testordner umgestellt |
| `apps/web/vite.config.ts` | geändert | Web-Vitest-Discovery und Setup auf Root-Testordner umgestellt |
| `apps/web/playwright.config.ts` | geändert | Browser-Testverzeichnis und Runtime-Pfad auf Root-Testordner umgestellt |
| `tests/tsconfig.api.json` | neu | API-Test-Typecheck außerhalb der App-Struktur |
| `tests/tsconfig.web.json` | neu | Web-Test-Typecheck außerhalb der App-Struktur |
| `apps/api/src/runtime-safety.ts` | geändert | Erlaubter Test-Runtime-Pfad auf `tests/.runtime` geändert |
| `apps/api/scripts/prepare-e2e-runtime.mjs` | geändert | E2E-Runtime-Vorbereitung auf `tests/.runtime/e2e` geändert |
| `agents.md` | geändert | Projektstruktur, Testbefehle und Testpfade aktualisiert |
| `.gitignore` | geändert | `tests/.runtime/` ignoriert |

## Probleme und Abweichungen

`npm run test -w apps/web` ist nicht vollständig grün. Der Lauf findet die neuen Root-Testpfade korrekt, aber `tests/unit/web/components/ui/tldraw-node.test.tsx` scheitert in 5 von 287 Tests, weil der echte TLDraw-Asset-Ladezustand erscheint statt der erwarteten jsdom-Mock-Ansicht. Das ist kein Importpfad- oder Test-Discovery-Fehler der Umstrukturierung und wurde gemäß Regel nicht während des Testlaufs repariert. Der erste E2E-Versuch lief in das Command-Timeout; der zweite Lauf mit größerem Timeout war vollständig grün.

## Offene Punkte / Folgeaufgaben

- Die 5 fehlschlagenden `tldraw-node`-Web-Unit-Tests separat untersuchen.
- Bereits vor diesem Auftrag vorhandene Änderungen an `package.json`, `apps/api/package.json`, `apps/web/package.json` und `package-lock.json` bleiben unbewertet und wurden nicht zurückgesetzt.
