# Log: Playwright-Startblocker

**Datum:** 18.05.26  
**Schritt:** 0 — Playwright-Startblocker beheben  
**Status:** 🔴 Blockiert

## Was wurde umgesetzt

Der Playwright-Startblocker wurde gemäß Nacharbeitsauftrag geprüft. Zuerst wurden `npm rebuild esbuild --workspace=apps/web` und `npm rebuild esbuild --workspace=apps/api` seriell ausgeführt. Beide Kommandos scheiterten weiterhin an `node_modules/tsx/node_modules/@esbuild/win32-x64/esbuild.exe` mit `spawn UNKNOWN`. Danach wurde die lokale `tsx`-Installation im Web-Workspace gemäß Auftrag entfernt und neu installiert. Der anschließende API-Smoke-Test über `npm run dev:e2e -w apps/api` in isolierter E2E-Testumgebung scheiterte weiterhin beim Migrationsstart `tsx src/db/migrate.ts` mit `Error: spawn UNKNOWN`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `package-lock.json` | geändert | Ergebnis von `npm uninstall tsx --workspace=apps/web` und `npm install tsx --workspace=apps/web` |
| `apps/web/package.json` | geändert | `tsx` wurde gemäß Auftrag neu installiert |
| `logs/2026-05-18-schritt-00-playwright-startblocker.md` | neu | Blocker-Log für Schritt 0 |
| `logs/README.md` | geändert | Log-Index um Schritt 0 ergänzt |

## Probleme und Abweichungen

Der Blocker ist nicht behoben. Der Fehler bleibt `Error: spawn UNKNOWN` im verschachtelten `tsx`/`esbuild`-Pfad während `tsx src/db/migrate.ts`. Daher werden die von Schritt 0 abhängigen E2E-Ergänzungen für `feature-form.spec.ts` und `project-form.spec.ts` in diesem Lauf nicht umgesetzt.

## Offene Punkte / Folgeaufgaben

Der Windows-Startfehler der nativen `esbuild`-Binary unter `node_modules/tsx/node_modules/@esbuild/win32-x64/esbuild.exe` muss separat behoben werden, bevor neue Playwright-Specs sinnvoll erstellt und ausgeführt werden können.
