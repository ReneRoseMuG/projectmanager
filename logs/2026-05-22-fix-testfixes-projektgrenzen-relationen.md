# Log: Testfixes Projektgrenzen-Relationen

**Datum:** 22.05.26  
**Schritt:** Fix — Testfixes Projektgrenzen-Relationen  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die ohne Produktionscode lösbaren Testfehler aus dem Projektgrenzen-Auftrag wurden testseitig bereinigt. API-Integrationstests erzeugen für Feature- und Use-Case-Owner nun den erforderlichen Projektkontext, bevor bestehende Projektaufgaben verknüpft werden. Der Owner-Task-Isolationstest wurde auf zwei Feature-Owner desselben Projekts umgestellt, weil zwei unterschiedliche Projekt-Owner nach der neuen Regel keine Aufgabe mehr projektübergreifend teilen dürfen. Der FeatureForm-Unit-Test wurde an den aktuellen Use-Case-Draft-Dialog ohne alten Slug-Input angepasst. Die Ticket-E2E-Tests verwenden für Reporter und Zuständig jetzt Select-Felder und prüfen keine nicht mehr sichtbaren Ticket-Detailfelder. Der blockierende Vite-Prozess auf Port `5174` wurde geprüft und beendet; nach den Playwright-Läufen war der Port wieder frei.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/integration/api/doc-links.test.ts` | geändert | Feature-/Use-Case-Task-Link-Setups mit Projektkontext ergänzt |
| `tests/integration/api/delete-cascade.test.ts` | geändert | Cascade-Setups für Feature-/Use-Case-Task-Links mit Projektkontext ergänzt |
| `tests/integration/api/owner-task-relations.test.ts` | geändert | Mehrfach-Owner-Tests auf projektkompatible Feature-Owner umgestellt |
| `tests/unit/web/components/features/FeatureForm.test.tsx` | geändert | Veralteten Slug-Input im Use-Case-Draft-Test entfernt |
| `tests/browser/web/tickets.spec.ts` | geändert | Ticket-E2E-Selectors an User-Selects und sichtbare Felder angepasst |
| `logs/2026-05-22-fix-testfixes-projektgrenzen-relationen.md` | neu | Schritt-Log für diesen Testfix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der vollständige API-Testlauf bleibt mit zwei Fehlern rot, die nicht ohne Produktionscode oder fachliche Klärung gelöst wurden: `tests/integration/api/app.integration.test.ts` findet beim Wiki-Import den erwarteten `alphaUseCase` nicht, und `tests/unit/api/services/content.service.test.ts` erwartet einen alten Dateinamen mit Slug-Anteil. Ein erster gezielter Playwright-Aufruf mit Workspace-relativem Pfad fand keine Tests; der Nachlauf mit `tickets.spec.ts` war erfolgreich. Die übrigen testseitig lösbaren Fehler wurden bereinigt.

## Offene Punkte / Folgeaufgaben

Die zwei verbleibenden API-Fehler müssen als eigener Folgeauftrag mit Produktionscode- oder Fachentscheidung behandelt werden. Ausgeführt wurden `npm exec -w apps/api -- vitest run ../../tests/integration/api/doc-links.test.ts ../../tests/integration/api/delete-cascade.test.ts ../../tests/integration/api/owner-task-relations.test.ts` mit 79/79 grün, `npm exec -w apps/web -- vitest run ../../tests/unit/web/components/features/FeatureForm.test.tsx` mit 16/16 grün, `npm run test -w apps/api` mit 347/349 grün, `npm run test -w apps/web` mit 349/349 grün, `npm exec -w apps/web -- playwright test tickets.spec.ts` mit 7/7 grün und `npm run e2e -w apps/web` mit 53/53 grün.
