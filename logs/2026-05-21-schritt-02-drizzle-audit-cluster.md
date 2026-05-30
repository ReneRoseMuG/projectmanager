# Log: Drizzle Audit Cluster

**Datum:** 21.05.26  
**Schritt:** 2 — Drizzle Audit Cluster  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`drizzle-orm` wurde auf 0.45.2 aktualisiert und beseitigt damit den produktiven High-Fund zu unsicher escaped SQL identifiers. `drizzle-kit` wurde auf 0.31.10 aktualisiert, damit das zugehörige Drizzle-Tooling ebenfalls auf der aktuellen Linie liegt. Nach dem ORM-Upgrade wurde die gemeinsame DB-Typisierung um `DbSession` ergänzt, weil Drizzle-Transaktionen ab der neuen Version nicht mehr das `$client`-Feld des konkreten DB-Clients tragen. Die betroffenen Repositories und privaten Service-Helfer für Attachments, Kataloge und Kommentare wurden auf diesen transaktionsfähigen Typ umgestellt. Der API-Build wurde anschließend erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/package.json` | geändert | `drizzle-orm` und `drizzle-kit` aktualisiert |
| `apps/api/src/db/client.ts` | geändert | `DbSession` als transaktionsfähiger DB-Typ ergänzt |
| `apps/api/src/repositories/attachment.repository.ts` | geändert | Repository-Parameter auf `DbSession` verallgemeinert |
| `apps/api/src/repositories/catalog.repository.ts` | geändert | Repository-Parameter auf `DbSession` verallgemeinert |
| `apps/api/src/repositories/comment.repository.ts` | geändert | Repository-Parameter auf `DbSession` verallgemeinert |
| `apps/api/src/services/attachments.service.ts` | geändert | Transaktionsaufrufe ohne unsicheren Cast typisiert |
| `apps/api/src/services/catalogs.service.ts` | geändert | Katalog-Fallbacks transaktionsfähig typisiert |
| `apps/api/src/services/comments.service.ts` | geändert | Transaktionsaufrufe ohne unsicheren Cast typisiert |
| `package-lock.json` | geändert | Lockfile nach Drizzle-Upgrade neu aufgelöst |
| `logs/2026-05-21-schritt-02-drizzle-audit-cluster.md` | neu | Schritt-Log für den Drizzle-Audit-Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Der produktive `drizzle-orm`-High-Fund ist behoben. `npm audit` meldet weiterhin einen moderaten `drizzle-kit`-Dev-Tooling-Fund über `@esbuild-kit/esm-loader`; dieser wird trotz aktueller `drizzle-kit`-Version weiter gemeldet und bleibt für den späteren Dev-Tooling-Schritt offen.

## Offene Punkte / Folgeaufgaben

Offen sind tldraw/nanoid sowie Vite/Vitest/esbuild/Drizzle-Kit als moderate Audit-Cluster.
