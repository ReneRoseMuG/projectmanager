# Log: Dokumentation- und Backlog-Services

**Datum:** 19.05.26  
**Schritt:** 7 — Dokumentation- und Backlog-Services  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Für Features, Use Cases, Wiki-Seiten und Backlog-Items wurden Entity-Repositories angelegt. Die Standard-CRUD-Pfade der vier Services laufen nun über diese Repositories; Content-Dateien, Slug-Regeln, Wiki-Hierarchie, Backlog-Statusübergänge und Relation-/Import-Orchestrierung bleiben in den Services. Die Update-Routen verlangen strikt `expectedVersion` und die DTOs enthalten `version`. Bei Feature-, Use-Case- und Wiki-Updates wird die Version vor Dateisystem-Operationen geprüft, damit ein Versionskonflikt keine Content-Dateien verändert. Die betroffenen Web-Save-Pfade senden die aktuelle Objektversion mit.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/repositories/feature.repository.ts` | neu | Repository für Feature-CRUD und versionierte Updates |
| `apps/api/src/repositories/use-case.repository.ts` | neu | Repository für Use-Case-CRUD und versionierte Updates |
| `apps/api/src/repositories/wiki-page.repository.ts` | neu | Repository für Wiki-Page-CRUD und versionierte Updates |
| `apps/api/src/repositories/backlog-item.repository.ts` | neu | Repository für Backlog-Item-CRUD und versionierte Updates |
| `apps/api/src/services/features.service.ts` | geändert | Standard-CRUD auf Repository umgestellt, Version vor Content-Operationen geprüft |
| `apps/api/src/services/use-cases.service.ts` | geändert | Standard-CRUD auf Repository umgestellt, Version vor Content-Operationen geprüft |
| `apps/api/src/services/wiki.service.ts` | geändert | Standard-CRUD auf Repository umgestellt, Version vor Content-Operationen geprüft |
| `apps/api/src/services/backlog.service.ts` | geändert | Standard-CRUD auf Repository umgestellt |
| `apps/api/src/services/doc-links.service.ts` | geändert | Feature-DTOs um `version` ergänzt |
| `apps/api/src/routes/features.ts` | geändert | `expectedVersion` für Feature-PATCH verpflichtend gemacht |
| `apps/api/src/routes/use-cases.ts` | geändert | `expectedVersion` für Use-Case-PATCH verpflichtend gemacht |
| `apps/api/src/routes/wiki.ts` | geändert | `expectedVersion` für Wiki-PATCH verpflichtend gemacht |
| `apps/api/src/routes/backlog.ts` | geändert | `expectedVersion` für Backlog-PATCH verpflichtend gemacht |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Feature-Updates senden `expectedVersion` |
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Feature-Detail-Saves senden `expectedVersion` |
| `apps/web/src/pages/UseCaseDetailPage.tsx` | geändert | Use-Case-Updates senden `expectedVersion` |
| `apps/web/src/pages/WikiPage.tsx` | geändert | Wiki-Updates senden `expectedVersion` |
| `apps/web/src/components/wiki/WikiPageDetail.tsx` | geändert | Wiki-Content-Saves senden `expectedVersion` |
| `apps/web/src/pages/BacklogItemDetailPage.tsx` | geändert | Backlog-Updates senden `expectedVersion` |
| `apps/web/src/components/test/ownerFormTestUtils.tsx` | geändert | Feature-/Use-Case-Fixtures um `version` ergänzt |
| `apps/web/src/components/ui/__tests__/factories.ts` | geändert | Feature-, Use-Case- und Backlog-Fixtures um `version` ergänzt |
| `apps/web/src/hooks/__tests__/queryMutations.integration.test.tsx` | geändert | Feature-Fixture um `version` ergänzt |
| `packages/shared-types/src/index.ts` | geändert | Feature-, UseCase-, WikiPage- und BacklogItem-DTOs und Update-Typen versioniert |
| `logs/2026-05-19-schritt-07-documentation-backlog-services.md` | neu | Schritt-Log für Aufgabe 07 |
| `logs/README.md` | geändert | Log-Index um Aufgabe 07 ergänzt |

## Probleme und Abweichungen

`npm run build -w packages/shared-types`, `npm run build -w apps/api` und `npm run build -w apps/web` wurden erfolgreich ausgeführt. Der Web-Build meldet weiterhin nur die bestehende Bundle-Size-Warnung.

`npm run test -w apps/api -- tests/integration/features.test.ts tests/integration/use-cases.test.ts tests/integration/wiki.test.ts tests/integration/backlog.test.ts tests/integration/doc-links.test.ts tests/integration/wiki-import.test.ts` wurde ausgeführt. Ergebnis: 49 Tests grün, 10 Tests rot. Die roten Tests senden noch den alten PATCH-Vertrag ohne `expectedVersion`; dadurch antworten die betroffenen Routen mit 400 statt der bisherigen erwarteten 200. Gemäß Auftrag wurden daraus keine Test-Fixes abgeleitet.

Einige direkte Drizzle-Zugriffe bleiben bewusst als fachliche Ausnahme in Services bestehen: Existenzprüfungen auf Parent-Objekte, Use-Case-Zählungen für Feature-DTOs sowie Relation-, Link- und Import-Orchestrierung in `doc-links.service.ts` und `wiki-import.service.ts`.

## Offene Punkte / Folgeaufgaben

Die Integrationstests für Features, Use Cases, Wiki und Backlog müssen in einem separaten Folgeauftrag auf den neuen API-Vertrag angepasst und um 409-Konfliktfälle erweitert werden. Die verbleibenden direkten Drizzle-Zugriffe sollten im Abschluss-Gate nochmals gegen die dokumentierten Junction-, Parent-Existenz- und Infrastruktur-Ausnahmen geprüft werden.
