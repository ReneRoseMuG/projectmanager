# Log: Browsertests

**Datum:** 18.05.26  
**Schritt:** Fix — Browsertests  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die wiederkehrende Playwright-Startblockade wurde behoben, indem der API-E2E-Server nicht mehr über `tsx watch`, sondern über den kompilierten Build mit `node dist/index.js` startet. Dafür werden die SQL-Migrationen nach dem Build in `dist/db/migrations` kopiert, bevor die E2E-Datenbank migriert wird. Zusätzlich wurde Chromium für die aktuelle Playwright-Version installiert und die Browser-Suite auf einen Worker serialisiert, damit die gemeinsame E2E-Testdatenbank nicht parallel beschrieben wird. Die betroffenen E2E-Specs wurden an die neuen Create/Edit-Formulare angepasst, weil Verwaltungsflächen nicht mehr auf Detailseiten-Tabs liegen. Veraltete Confirm- und Tab-Annahmen in Notizen, Dateien, Aufgaben und Use Cases wurden korrigiert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/package.json` | geändert | `dev:e2e` startet API kompiliert ohne `tsx watch` |
| `apps/api/scripts/copy-migrations-to-dist.mjs` | neu | Kopiert Migrationen nach `dist` für den kompilierten E2E-Start |
| `apps/web/playwright.config.ts` | geändert | Browser-Tests laufen mit `workers: 1` seriell |
| `apps/web/e2e/feature.spec.ts` | geändert | Feature-Formular-Flows auf Bearbeiten-Modal umgestellt |
| `apps/web/e2e/freshness.spec.ts` | geändert | Aktualitätsprüfungen an Formular-Tabs, direkte Deletes und neue Modal-Positionen angepasst |
| `apps/web/e2e/owner-tasks.spec.ts` | geändert | Owner-Aufgaben-Flows stabil gegen Projekt-Invalidierung und Dialog-Neuauflösung gemacht |
| `apps/web/e2e/project.spec.ts` | geändert | Projekt-CRUD und Relationstests auf ProjectForm-Tabs umgestellt |
| `apps/web/e2e/task.spec.ts` | geändert | Task-CRUD über ProjectForm und TaskModal geprüft |

## Probleme und Abweichungen

Keine. Die alte `tsx`/`esbuild spawn UNKNOWN`-Blockade ist weg; der danach sichtbare fehlende Playwright-Browser wurde mit `npx playwright install chromium` installiert. Die verbleibenden roten Browser-Tests waren veraltete E2E-Erwartungen an die alte Detailseiten-Struktur.

## Offene Punkte / Folgeaufgaben

Keine.
