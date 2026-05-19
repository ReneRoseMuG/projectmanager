# Log: Meilensteine als Projekt-Subdomäne

**Datum:** 19.05.26  
**Schritt:** Feature — Meilensteine als Projekt-Subdomäne  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Meilensteine wurden als projektgebundene, versionierte Entität in der Projektmanagement-Domäne ergänzt. Das Datenmodell enthält die neue Tabelle `milestones` sowie Owner-Join-Tabellen für Aufgaben, Tickets, Features, Tags, Notizen, Kommentare, Dateien und Events; die Migration wurde generiert und lokal erfolgreich ausgeführt. Backend-Repository, Service und Routen für Milestone-CRUD sowie die bestehenden Cross-Owner-Services wurden um `milestone` erweitert. Im Frontend wurden API-Funktionen, TanStack-Query-Keys, Invalidierung, Hooks, globale Suche, Projektformular-Tab und eine eigene Meilenstein-Detailseite mit Subtabs umgesetzt. Zusätzlich wurden API-Integrationstests, Dump-/Truncation-Erweiterungen und ein Playwright-Browser-Test für den Milestone-Workflow ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Milestone-DTOs und Owner-Typen ergänzt |
| `apps/api/src/db/schema.ts` | geändert | Milestones und Milestone-Join-Tabellen ergänzt |
| `apps/api/src/db/migrations/0020_fuzzy_deathbird.sql` | neu | Migration für Milestone-Tabellen und Comment-Orphan-Trigger |
| `apps/api/src/db/migrations/meta/0020_snapshot.json` | neu | Drizzle-Snapshot zur Migration |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migration im Journal registriert |
| `apps/api/src/repositories/milestone.repository.ts` | neu | CRUD und Version-Checks für Meilensteine |
| `apps/api/src/services/milestones.service.ts` | neu | Milestone-Businesslogik, Counts und Löschbereinigung |
| `apps/api/src/routes/milestones.ts` | neu | Milestone-CRUD und Projektliste |
| `apps/api/src/app.ts` | geändert | Milestone-Routen registriert |
| `apps/api/src/services/tags.service.ts` | geändert | Milestone-Tags ergänzt |
| `apps/api/src/routes/tags.ts` | geändert | Milestone-Tag-Endpunkt ergänzt |
| `apps/api/src/services/notes.service.ts` | geändert | Milestone-Notes ergänzt |
| `apps/api/src/routes/notes.ts` | geändert | Milestone-Notes-Endpunkte ergänzt |
| `apps/api/src/services/comments.service.ts` | geändert | Milestone-Kommentare ergänzt |
| `apps/api/src/routes/comments.ts` | geändert | Kommentar-Routen für Meilensteine registriert |
| `apps/api/src/services/attachments.service.ts` | geändert | Milestone-Dateien ergänzt |
| `apps/api/src/routes/attachments.ts` | geändert | Milestone-Datei-Endpunkte ergänzt |
| `apps/api/src/services/events.service.ts` | geändert | Milestone-Event-Owner ergänzt |
| `apps/api/src/routes/events.ts` | geändert | Event-Owner-Schema um `milestone` erweitert |
| `apps/api/src/services/tasks.service.ts` | geändert | Milestone-Aufgaben-Owner ergänzt |
| `apps/api/src/routes/tasks.ts` | geändert | Milestone-Aufgaben-Endpunkte ergänzt |
| `apps/api/src/services/tickets.service.ts` | geändert | Milestone-Ticket-Owner ergänzt |
| `apps/api/src/routes/tickets.ts` | geändert | Milestone-Ticket-Endpunkte ergänzt |
| `apps/api/src/services/doc-links.service.ts` | geändert | Milestone-Feature-Relationen ergänzt |
| `apps/api/src/routes/doc-links.ts` | geändert | Milestone-Feature-Endpunkte ergänzt |
| `apps/api/src/services/projects.service.ts` | geändert | Milestone-Supportobjekte vor Projektlöschung bereinigt |
| `apps/api/src/services/dump.service.ts` | geändert | Dump-Registry um Milestone-Tabellen ergänzt |
| `apps/api/tests/helpers/app.ts` | geändert | Milestone-Routen im Test-App-Setup registriert |
| `apps/api/tests/helpers/db.ts` | geändert | Truncation um Milestone-Tabellen ergänzt |
| `apps/api/tests/helpers/factories.ts` | geändert | Milestone-Testfactory und Owner-Typen ergänzt |
| `apps/api/tests/integration/dumps-drive.test.ts` | geändert | Roundtrip-Seed um Milestone-Daten ergänzt |
| `apps/api/tests/integration/milestones.test.ts` | neu | Integrationstests für CRUD, Relationen, Löschregeln |
| `apps/web/src/api/milestones.ts` | neu | Web-API-Funktionen für Meilensteine |
| `apps/web/src/api/tasks.ts` | geändert | Milestone als Task-Owner ergänzt |
| `apps/web/src/api/tickets.ts` | geändert | Milestone als Ticket-Owner ergänzt |
| `apps/web/src/api/notes.ts` | geändert | Milestone-Notes ergänzt |
| `apps/web/src/api/attachments.ts` | geändert | Milestone-Dateien ergänzt |
| `apps/web/src/api/comments.ts` | geändert | Kommentarpfad für Milestones ergänzt |
| `apps/web/src/api/doc-links.ts` | geändert | Milestone-Feature-Relationen ergänzt |
| `apps/web/src/hooks/useMilestones.ts` | neu | TanStack-Hook für Milestone-Liste, Detail und Mutationen |
| `apps/web/src/hooks/useTasks.ts` | geändert | Milestone-Task-Owner invalidiert |
| `apps/web/src/hooks/useTickets.ts` | geändert | Milestone-Ticket-Owner ergänzt |
| `apps/web/src/hooks/useNotes.ts` | geändert | Milestone-Notes im generischen Hook ergänzt |
| `apps/web/src/hooks/useAttachments.ts` | geändert | Milestone-Dateien im generischen Hook ergänzt |
| `apps/web/src/hooks/useDocLinks.ts` | geändert | Milestone-Feature-Link-Hook ergänzt |
| `apps/web/src/hooks/useGlobalSearchData.ts` | geändert | Meilensteine in Suchdaten geladen |
| `apps/web/src/queries/queryKeys.ts` | geändert | Milestone-Query-Keys und Owner-Typen ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | Milestone-Scopes und betroffene Invalidierungen ergänzt |
| `apps/web/src/utils/domainLabels.ts` | geändert | Milestone-Statuslabels und Tones ergänzt |
| `apps/web/src/components/milestones/MilestoneCard.tsx` | neu | Milestone-Karte und Listenzeile |
| `apps/web/src/components/milestones/MilestoneListBoardView.tsx` | neu | Milestone-Liste/Board für Projekt-Tab |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | neu | Meilensteinformular mit Stammdaten und Subtabs |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Tab „Meilensteine“ ergänzt |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Milestones als Event-Owner auswählbar |
| `apps/web/src/components/search/GlobalSearch.tsx` | geändert | Meilensteine in globale Suche aufgenommen |
| `apps/web/src/pages/MilestoneDetailPage.tsx` | neu | Route/Page für `/milestones/new` und `/milestones/:id` |
| `apps/web/src/pages/CalendarPage.tsx` | geändert | Milestones an EventForm übergeben |
| `apps/web/src/pages/TaskDetailPage.tsx` | geändert | Milestone als Task-Create-Owner erlaubt |
| `apps/web/src/pages/TicketDetailPage.tsx` | geändert | Milestone als Ticket-Create-Owner erlaubt |
| `apps/web/src/App.tsx` | geändert | Milestone-Routen registriert |
| `apps/web/e2e/domain-test-utils.ts` | geändert | Milestone-Fixtures und Owner-Typen ergänzt |
| `apps/web/e2e/milestone.spec.ts` | neu | Browser-Test für Projekt-Tab und Milestone-SubViews |

## Probleme und Abweichungen

Die Implementierung kompiliert und die API-Tests sind grün, aber der Abschlusslauf ist nicht vollständig grün. `npm run test -w apps/web` meldet 14 rote Tests: zwei Invalidierungs-Expectation-Tests erwarten noch nicht den neuen `eventsList`-Scope, und alle zwölf `ProjectForm`-Tests laufen ohne `QueryClientProvider`, obwohl das Formular durch `useMilestones` jetzt TanStack Query nutzt. `npm run e2e -w apps/web` meldet 1 roten Browser-Test in `e2e/milestone.spec.ts`; Ursache ist ein zu breiter Selector `getByRole("button", { name: "Kommentar" })`, der auch den Tab „Kommentare“ trifft. Diese Fehler sind nach aktueller Einordnung Test-Harness- bzw. Test-Selector-Fixes, nicht erkannte Produktionscodefehler. Gemäß Testlauf-Regel wurden sie nach dem fehlgeschlagenen Abschlusslauf nicht eigenständig repariert.

## Offene Punkte / Folgeaufgaben

- Web-Test-Harness für `ProjectForm.test.tsx` um `QueryClientProvider` oder einen passenden `useMilestones`-Mock erweitern.
- Invalidierungs-Erwartungen in `src/queries/__tests__/invalidation.integration.test.ts` an die neue Event-Invalidierung anpassen oder die Event-Invalidierung bewusst aus Projekt-/Task-Scope entfernen.
- E2E-Selector im Milestone-Test auf den exakten Kommentar-Submit-Button einschränken.
- Danach `npm run test -w apps/web` und `npm run e2e -w apps/web` erneut seriell ausführen.
