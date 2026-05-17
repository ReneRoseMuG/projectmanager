# Log: Restabweichungen Designauftrag

**Datum:** 17.05.26  
**Schritt:** Fix — Restabweichungen Designauftrag  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die nicht-testbezogenen Restabweichungen aus der Abschlussprüfung wurden behoben. Projekte speichern jetzt Start- und Fälligkeitsdatum durchgängig über Shared Types, Datenbankschema, Migration, API und Frontend-Formulare. Use Cases können ihre Feature-Zuordnung nun über `featureId` im Input ändern; Backend-Schema, Service und Formular-Submit unterstützen diesen Wechsel. Zusätzlich wurde eine echte Aufgabenrelation für Use Cases ergänzt: Das Backend stellt Reverse-Routen für Aufgaben je Use Case bereit, das Frontend lädt verfügbare und verknüpfte Aufgaben über einen Hook und zeigt sie im Use-Case-Formular als `RelationPanel`. Die roten/geskippten Playwright-Flows wurden wie beauftragt nicht weiter bearbeitet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Projekt-Zeitraumfelder und `UseCaseInput.featureId` ergänzt |
| `apps/api/src/db/schema.ts` | geändert | `projects.startDate` und `projects.dueDate` ergänzt |
| `apps/api/src/db/migrations/0005_orange_korg.sql` | neu | Migration für Projekt-Zeitraumfelder |
| `apps/api/src/db/migrations/meta/0005_snapshot.json` | neu | Drizzle-Snapshot für Migration 0005 |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migrationsjournal um 0005 ergänzt |
| `apps/api/src/routes/projects.ts` | geändert | Projekt-Zeitraumfelder in Request-Schema ergänzt |
| `apps/api/src/services/projects.service.ts` | geändert | Projekt-Zeiträume lesen, erstellen und aktualisieren |
| `apps/api/src/routes/use-cases.ts` | geändert | `featureId` im Use-Case-Body erlaubt |
| `apps/api/src/services/use-cases.service.ts` | geändert | Use-Case-Feature-Wechsel unterstützt |
| `apps/api/src/routes/tasks.ts` | geändert | `GET /api/tasks` für Relation-Auswahl ergänzt |
| `apps/api/src/services/tasks.service.ts` | geändert | Alle Top-Level-Aufgaben listbar gemacht |
| `apps/api/src/routes/doc-links.ts` | geändert | `GET/PUT /api/use-cases/:id/tasks` ergänzt |
| `apps/api/src/services/doc-links.service.ts` | geändert | Aufgabenrelationen für Use Cases lesen und speichern |
| `apps/web/src/api/tasks.ts` | geändert | `getTasks` ergänzt |
| `apps/web/src/api/doc-links.ts` | geändert | Use-Case-Aufgabenrelationen ergänzt |
| `apps/web/src/hooks/useDocLinks.ts` | geändert | `useUseCaseTaskLinks` ergänzt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Start/Fällig speichern und laden |
| `apps/web/src/components/projects/ProjectInlineForm.tsx` | geändert | Start/Fällig speichern und laden |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Feature-Wechsel und Aufgaben-RelationPanel ergänzt |
| `logs/2026-05-17-fix-restabweichungen-designauftrag.md` | neu | Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index um diesen Fix ergänzt |

## Probleme und Abweichungen

Keine fachlichen Restabweichungen außerhalb der bewusst ausgesparten Playwright-/E2E-Themen bekannt. Der Produktionsbuild meldet weiterhin nur die bestehende Vite-Warnung zu einem großen JS-Chunk.

## Offene Punkte / Folgeaufgaben

Die roten beziehungsweise geskippten Playwright-E2E-Flows bleiben wie vom Nutzer angewiesen für die spätere Klärung offen.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `npm run db:generate -w apps/api` | ✅ Erfolgreich, Migration 0005 erzeugt |
| `npm run db:migrate -w apps/api` | ✅ Erfolgreich |
| `npm run build -w packages/shared-types` | ✅ Erfolgreich |
| `npm run build -w apps/api` | ✅ Erfolgreich |
| `npm run typecheck -w apps/web` | ✅ Erfolgreich |
| `npm run build` | ✅ Erfolgreich, mit Vite-Chunkgrößen-Warnung |
