# Log: Kommentarstränge Rollout

**Datum:** 17.05.26  
**Schritt:** 14 — Kommentarstränge für alle Domain-Objekte  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Kommentarstruktur wurde polymorph erweitert, sodass Kommentare neben Tasks nun auch an Features, Projekte, Use Cases, Backlog-Items und Wiki-Seiten gebunden werden können. Die bestehende Task-Kompatibilität bleibt erhalten: Task-Kommentare setzen weiterhin `taskId`, zusätzlich aber auch `entityType="task"` und `entityId`. Im Backend wurden entity-spezifische GET-, POST- und DELETE-Routen ergänzt. Im Frontend wurden generische Entity-Comment-API-Funktionen und der Hook `useEntityComments` eingeführt. `CommentThread` ist jetzt in Projekt-, Feature-, Use-Case-, Backlog-Item- und Wiki-Detailkontexten verdrahtet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | `CommentEntityType` und polymorphe Comment-Felder ergänzt |
| `apps/api/src/db/schema.ts` | geändert | `comments` um `entityType`/`entityId` erweitert, `taskId` optional gemacht |
| `apps/api/src/db/migrations/0004_even_skin.sql` | neu | Migration für polymorphe Kommentare |
| `apps/api/src/db/migrations/meta/0004_snapshot.json` | neu | Drizzle-Snapshot für Migration 0004 |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migrationsjournal um 0004 ergänzt |
| `apps/api/src/services/comments.service.ts` | geändert | Entity-Kommentar-Listing, -Erstellung und -Löschung ergänzt |
| `apps/api/src/routes/comments.ts` | geändert | Kommentar-Routen für Feature, Projekt, Use Case, Backlog und Wiki ergänzt |
| `apps/web/src/api/comments.ts` | geändert | Generische Entity-Comment-API ergänzt |
| `apps/web/src/hooks/useEntityComments.ts` | neu | Hook für polymorphe Kommentare |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Projekt-Kommentare mit `CommentThread` verdrahtet |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Feature-Kommentare mit `CommentThread` verdrahtet |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Use-Case-Kommentare mit `CommentThread` verdrahtet |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Backlog-Item-Kommentare mit `CommentThread` verdrahtet |
| `apps/web/src/components/wiki/WikiPageDetail.tsx` | geändert | Wiki-Kommentare mit `CommentThread` verdrahtet |
| `apps/web/src/components/ui/__tests__/CommentThread.integration.test.tsx` | neu | Integrationstest für Hook/API/UI-Zusammenspiel |
| `apps/web/src/components/ui/__tests__/CommentThread.test.tsx` | geändert | Comment-Fixtures an polymorphe Felder angepasst |
| `logs/2026-05-17-schritt-14-comments-rollout.md` | neu | Schritt-Log für Schritt 14 |
| `logs/README.md` | geändert | Log-Index um Schritt 14 ergänzt |

## Probleme und Abweichungen

Die Integrationstests nutzen Vitest-Mocks der API-Schicht statt MSW, weil MSW im Projekt nicht installiert ist und keine weitere Testinfrastruktur für Web-Integrationstests existiert. Die geforderten Integrationsfälle Laden, Erstellen, Löschen und API-Fehler werden trotzdem abgedeckt. E2E-Flows bleiben wie vereinbart für die spätere Klärung offen.

## Offene Punkte / Folgeaufgaben

Wenn ein echtes MSW-Setup gewünscht ist, sollte das als eigener Testinfrastruktur-Schritt ergänzt werden. Die roten Playwright-Flows werden nach Abschluss des Gesamtauftrags separat geklärt.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `npm run db:generate -w apps/api` | ✅ Erfolgreich, Migration 0004 erzeugt |
| `npm run db:migrate -w apps/api` | ✅ Erfolgreich |
| `npm run build -w packages/shared-types` | ✅ Erfolgreich |
| `npm run build -w apps/api` | ✅ Erfolgreich |
| `npm run typecheck -w apps/web` | ✅ Erfolgreich |
| `npx vitest run src/components/ui/__tests__/CommentThread.integration.test.tsx` | ✅ 4 Tests erfolgreich |
