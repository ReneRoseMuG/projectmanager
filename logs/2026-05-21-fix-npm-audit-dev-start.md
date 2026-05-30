# Log: npm audit dev start

**Datum:** 21.05.26  
**Schritt:** Fix — npm audit dev start  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die durch `npm audit fix --force` angehobenen inkompatiblen Major-Versionen wurden auf die vorherigen Projektlinien zurückgestellt. Im API-Paket wurden `drizzle-orm`, `drizzle-kit`, `fastify` und `vitest` wieder auf die kompatiblen Major-Versionen gesetzt und der versehentlich eingetragene `vite`-Runtime-Dependency entfernt. Im Web-Paket wurden `@tldraw/tldraw`, `vite` und `vitest` zurückgestellt und versehentlich eingetragene Backend-Pakete entfernt. Zusätzlich wurde `fastify` im Root als Dev-Dependency auf der Fastify-4-Linie ergänzt, damit npm 11 die Fastify-Plugin-Typen wieder gegen eine auflösbare Fastify-Modulinstanz hoisten kann. Danach wurden Lockfile und `node_modules` neu aufgelöst.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/package.json` | geändert | Inkompatible Audit-Major-Upgrades zurückgestellt |
| `apps/web/package.json` | geändert | Inkompatible Web-Dependency-Upgrades und falsche Backend-Dependencies entfernt |
| `package.json` | geändert | Root-DevDependency `fastify` zur stabilen Workspace-Typauflösung ergänzt |
| `package-lock.json` | geändert | Lockfile nach Dependency-Korrektur neu aufgelöst |
| `logs/2026-05-21-fix-npm-audit-dev-start.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

`npm install` und `npm dedupe` melden weiterhin 19 Audit-Funde. Diese wurden bewusst nicht per `npm audit fix --force` behoben, weil der vorherige Force-Lauf inkompatible Major-Upgrades ausgelöst und `npm run dev` gebrochen hat. `npm dedupe` meldete außerdem eine temporäre Cleanup-Warnung für eine gesperrte esbuild-Datei unter `apps/web/node_modules`; die anschließenden Builds und der Dev-Start waren trotzdem erfolgreich.

## Offene Punkte / Folgeaufgaben

Die verbleibenden Audit-Funde sollten separat bewertet werden. Sinnvoll ist ein eigener Auftrag, der prüft, welche Updates ohne Breaking Changes möglich sind und welche Major-Upgrades echte Codeanpassungen benötigen.
