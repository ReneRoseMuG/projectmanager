# Log: Audit Coverage entfernt

**Datum:** 20.05.26  
**Schritt:** Fix — Audit Coverage entfernt  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der unnötige Coverage-Teil wurde aus der API-Testkonfiguration entfernt. Dazu wurde der Script `test:coverage` aus `apps/api/package.json` gelöscht und die nicht mehr benötigte Dev-Dependency `@vitest/coverage-v8` entfernt. Anschließend wurde das Lockfile mit `npm install --package-lock-only` aktualisiert, sodass die Coverage-Pakete auch dort nicht mehr referenziert werden. Eine Suche nach `coverage` in den Package-Dateien liefert keine Treffer mehr. Danach wurden die vollständigen Testkommandos seriell ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/package.json` | geändert | Coverage-Script und Coverage-Dependency entfernt |
| `package-lock.json` | geändert | Nicht mehr benötigte Coverage-Pakete entfernt |
| `logs/2026-05-20-fix-audit-coverage.md` | neu | Schritt-Log für die Änderung |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Die Coverage-Entfernung selbst ist umgesetzt. Die anschließenden Tests sind jedoch nicht vollständig grün: `npm run test -w apps/api` ist mit 27 Testdateien und 304 Tests grün. `npm run test -w apps/web` ist mit 236 bestandenen und 38 fehlgeschlagenen Tests rot; das wiederkehrende Muster ist ein fehlender `QueryClientProvider` in bestehenden Web-Tests. `npm run e2e -w apps/web` ist mit 28 bestandenen und 14 fehlgeschlagenen Browser-Tests rot; die Fehler betreffen vor allem Create-/Return-Navigationen sowie strikte Locator-Treffer in Board-Ansichten. Während `npm install --package-lock-only` wurden außerdem 19 bekannte npm-Vulnerabilities gemeldet; diese wurden nicht verändert, weil sie nicht Teil des Auftrags waren.

## Offene Punkte / Folgeaufgaben

Die roten Web-Unit-Tests benötigen voraussichtlich Test-Wrapper-Updates für TanStack Query. Die roten E2E-Tests sollten separat gegen die aktuelle Detailseiten-Navigation geprüft werden, weil mehrere Assertions noch eine kanonische Detailroute nach Create erwarten, während die App auf die Return-Route zurücknavigiert. Zusätzlich können die gemeldeten npm-Vulnerabilities in einem eigenen Security-Auftrag bewertet werden.
