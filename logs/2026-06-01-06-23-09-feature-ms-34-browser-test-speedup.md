# Log: MS-34 Browser-Test-Speedup

**Datum:** 01.06.26  
**Uhrzeit:** 06:23:09  
**Schritt:** Feature — MS-34 Browser-Test-Speedup  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Arbeitsauftrag aus `MS-34` wurde über den Projekt-Manager-MCP geladen und gemäß freigegebenem Plan umgesetzt. Die Playwright-Konfiguration nutzt jetzt einen gespeicherten Admin-Storage-State, begrenzte Worker-Parallelität, dynamische E2E-Ports, einen dynamischen E2E-DB-Namen und ein optionales `PLAYWRIGHT_REUSE_SERVER` für lokale Folgeläufe. Das globale Setup erzeugt die isolierte E2E-Datenbank, führt einmalig den echten Browser-Login aus und speichert die Session unter `tests/.runtime/e2e/.auth/admin.json`. Auth-Sonderfälle laufen in `auth.spec.ts` seriell und der Test ohne Session verwendet einen frischen Browser-Kontext ohne gespeicherten State. Für häufige Dashboard-Konstellationen wurde eine Playwright-Fixture angelegt, die Setup und Cleanup kapselt und unabhängige Task-/Ticket-Erzeugung parallelisiert.

Die Testentwurfsleitplanken wurden angewendet. Betroffene Testebene ist Browser/E2E mit echter App, echter API, echter isolierter Testdatenbank, echtem Browser und ohne Mocks. Beweisen soll die Änderung, dass gespeicherter Auth-State, Worker-Parallelität und gekapselte Fixtures die echten Browserflüsse beschleunigen, ohne Auth-Sonderfälle oder Testdaten-Isolation zu verfälschen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/playwright.config.ts` | geändert | Storage-State, Worker, Env-Ports, DB-Name und Server-Reuse ergänzt |
| `tests/browser/global-setup.ts` | geändert | E2E-DB dynamisiert und Admin-Storage-State erzeugt |
| `tests/browser/global-teardown.ts` | geändert | Dynamischen E2E-DB-Namen beim Cleanup verwendet |
| `tests/browser/web/domain-test-utils.ts` | geändert | `authenticatedGoto` auf reine Navigation reduziert |
| `tests/browser/web/auth.spec.ts` | geändert | Auth-Spec seriell und Ohne-Session-Test mit frischem Kontext |
| `tests/browser/web/dashboard.spec.ts` | geändert | Dashboard-Setups über gekapselte Fixtures genutzt |
| `tests/browser/web/fixtures.ts` | neu | Browser-Test-Fixtures für häufige Projekt-/Meilenstein-Konstellationen |
| `logs/2026-06-01-06-23-09-feature-ms-34-browser-test-speedup.md` | neu | Schritt-Log zur Umsetzung |
| `logs/README.md` | geändert | Log-Index um den neuen Eintrag ergänzt |

## Probleme und Abweichungen

`npm run typecheck -w apps/web` lief erfolgreich. Der gezielte Browser-Testlauf `npm run e2e -w apps/web -- auth.spec.ts` wurde blockiert, bevor Tests ausgeführt wurden: Der API-Webserver startet nicht, weil `UPLOAD_DIR` auf `C:\Users\schro\Meine Ablage\Software Projekte\Projekt Manager\uploads` zeigt und die Runtime-Safety im Testmodus nur `os.tmpdir()` oder `tests/.runtime` zulässt. Gemäß Repo-Regeln wurde nach diesem Testfehler keine eigenständige Folgekorrektur vorgenommen.

Für CI-Sharding wurde die Playwright-Konfiguration über dynamische DB- und Port-Werte vorbereitet. Eine konkrete CI-Matrix konnte nicht angelegt werden, weil im Repository kein `.github/workflows`-Verzeichnis vorhanden ist.

## Offene Punkte / Folgeaufgaben

Der E2E-Serverstart-Blocker muss separat geklärt werden, damit die Browser-Tests tatsächlich laufen können. Danach sollten mindestens `auth.spec.ts`, eine datenreiche Dashboard-/Projekt-Spec und anschließend der vollständige E2E-Lauf erneut ausgeführt werden. Falls eine CI-Konfiguration ergänzt wird, kann darauf aufbauend das eigentliche Playwright-Sharding mit getrennten DB-Namen und Ports eingetragen werden.
