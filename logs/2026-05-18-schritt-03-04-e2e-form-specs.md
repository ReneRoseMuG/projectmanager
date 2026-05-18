# Log: E2E-Form-Specs

**Datum:** 18.05.26  
**Schritt:** 3/4 — E2E `feature-form.spec.ts` und `project-form.spec.ts`  
**Status:** 🔴 Blockiert

## Was wurde umgesetzt

Die E2E-Schritte 3 und 4 wurden nicht umgesetzt, weil Schritt 0 als Voraussetzung weiterhin blockiert ist. Der Playwright-WebServer kann die API nicht starten, da `npm run dev:e2e -w apps/api` beim Migrationsstart `tsx src/db/migrate.ts` mit `Error: spawn UNKNOWN` scheitert. Neue Playwright-Specs für FeatureForm und ProjectForm wären unter dieser Voraussetzung nicht ausführbar und würden keine belastbare Abnahme liefern. Die bestehenden Unit- und Integrationstest-Schritte wurden unabhängig davon fortgesetzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-05-18-schritt-03-04-e2e-form-specs.md` | neu | Blocker-Log für die übersprungenen E2E-Schritte |
| `logs/README.md` | geändert | Log-Index um Schritt 3/4 ergänzt |

## Probleme und Abweichungen

Die geforderten Dateien `apps/web/e2e/feature-form.spec.ts` und `apps/web/e2e/project-form.spec.ts` wurden nicht angelegt, weil die Playwright-Startvoraussetzung nicht erfüllt ist.

## Offene Punkte / Folgeaufgaben

Nach Behebung des `tsx`/`esbuild`-Startfehlers müssen die beiden E2E-Specs gemäß Nacharbeitsauftrag ergänzt und ausgeführt werden.
