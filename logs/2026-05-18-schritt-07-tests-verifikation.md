# Log: Tests und Verifikation

**Datum:** 18.05.26  
**Schritt:** 7 — Tests, Typecheck, Lint, Build  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Für die Foundation-Komponenten wurden Unit-Tests ergänzt. Für UseCaseForm, TaskModal, FeatureForm und ProjectForm wurden Create- und Edit-Modi inklusive Pending-State und Submit-Payloads getestet. Die API-Integrationstests für Owner-Task- und Owner-Ticket-Isolation wurden erweitert. Typecheck, Lint, Build, Web-Unit-Tests und API-Tests laufen erfolgreich. `npm rebuild better-sqlite3` war nötig, weil die vorherige Installation native SQLite-Bindings nicht gebaut hatte.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/__tests__/OwnerRelationBoard.test.tsx` | neu | Foundation-Unit-Tests |
| `apps/web/src/components/__tests__/OwnerForms.test.tsx` | neu | Formular-Unit-Tests |
| `apps/api/tests/integration/owner-task-relations.test.ts` | geändert | Owner-Task-Isolation ergänzt |
| `apps/api/tests/integration/tickets.test.ts` | geändert | Owner-Ticket-Isolation und Negativfälle ergänzt |
| `apps/web/e2e/owner-tasks.spec.ts` | geändert | Owner-Aufgaben-E2E-Helper auf Bearbeiten-Modal angepasst |
| `apps/web/e2e/tickets.spec.ts` | geändert | Owner-Ticket-E2E-Helper auf Bearbeiten-Modal angepasst |

## Probleme und Abweichungen

Playwright konnte nicht ausgeführt werden, weil der E2E-API-Webserver beim Start von `tsx` an `tsx`/`esbuild` scheitert: `spawn UNKNOWN` beim Aufruf von `node_modules/tsx/node_modules/@esbuild/win32-x64/esbuild.exe`. Ein gezieltes `npm rebuild esbuild` schlug mit demselben Fehler fehl. `npm run e2e -w apps/web -- --list` war erfolgreich, der Browserlauf selbst wurde dadurch blockiert.

## Offene Punkte / Folgeaufgaben

Lokale `tsx`/`esbuild`-Installation reparieren oder neu installieren und danach die Playwright-Specs `owner-tasks.spec.ts`, `tickets.spec.ts`, `feature.spec.ts`, `project.spec.ts` und `task.spec.ts` ausführen.
