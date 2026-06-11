# Log: Persönliche Planung datumsübergreifend + kollabierbare Listengruppen

**Datum:** 11.06.26  
**Uhrzeit:** 07:42:31  
**Schritt:** Feature — Datumsfilter der Persönlichen Planung entfernen, Statusgruppen kollabierbar  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Persönliche Planung war fest an den heutigen Tagesplan gebunden: Aufgaben und Termine hingen an genau einem Tagesplan (User + Datum), beim Tageswechsel waren sie aus dem Blick. Auf Wunsch des Nutzers wurde der „Datumsfilter" entfernt, ohne das Datenmodell zu ändern:

- **Aufgaben** werden jetzt über eine datumsübergreifende Lese-Sicht geladen (alle Tagesplan-Aufgaben des Users, dedupliziert, inkl. abgeschlossener). Anlegen bleibt heute-gebunden.
- **Termine** speisen den vorhandenen Wochen-/Monatskalender aus allen Tagesplan-Terminen des Users statt nur denen von heute.
- **„Aufgabe lösen"** wurde datumsunabhängig gemacht (entfernt die Verknüpfung aus allen Tagesplänen des Users).
- **Statusgruppen im Listenmodus** von `ListBoardView` sind jetzt kollabierbar mit pro Board persistentem Zustand (localStorage). Damit lässt sich u. a. die „Geschlossen"-Gruppe einklappen. Die Funktion gilt repo-weit in allen Listen (bewusste Entscheidung des Nutzers).

Ansatz bewusst ohne Schemaänderung/Migration: nur Lese-Aggregation + datumsunabhängiges Lösen; Schreiben (Anlegen, Status, Fälligkeit) bleibt unverändert. Permissions der neuen Routen über `config.auth`-Override fest auf `dayPlans` gepinnt (Pfad enthält `/tasks`, sonst würde die Auto-Zuordnung `tasks` greifen).

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/repositories/day-plan.repository.ts` | geändert | `listTasksForUser`, `listEventIdsForUser`, `listDayPlanIdsForUserTask` |
| `apps/api/src/services/day-plan.service.ts` | geändert | `listDayPlanTasksForUser`, `listDayPlanEventsForUser`, `unlinkDayPlanTaskForUser` |
| `apps/api/src/routes/day-plans.ts` | geändert | `GET /day-plans/tasks`, `GET /day-plans/events`, `DELETE /day-plans/tasks/:taskId` (auth-Override `dayPlans`) |
| `apps/web/src/api/day-plans.ts` | geändert | `listDayPlanTasks`, `listDayPlanEvents`, `unlinkDayPlanTaskAnyDate` |
| `apps/web/src/queries/queryKeys.ts` | geändert | `dayPlans.tasks()`, `dayPlans.events()` (unter `dayPlans.root`) |
| `apps/web/src/hooks/useDayPlan.ts` | geändert | neue Hooks `useDayPlanTasks`, `useDayPlanEvents` |
| `apps/web/src/pages/DayPlanPage.tsx` | geändert | Aufgaben-Tab + Zähler aus datumsübergreifender Liste, datumsunabhängiges Lösen, `boardId` |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | Kalender (Tab + Compact) nutzt datumsübergreifende Termine; `isDayPlanEvent` entfernt |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | persistente, kollabierbare Statusgruppen im Listenmodus |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | `boardId`-Durchreichung |
| `tests/integration/api/day-plan-cross-date.test.ts` | neu | Integration: Aggregation, Dedup, User-Isolation, datumsunabhängiges Lösen, Auth/Permission |
| `tests/unit/web/hooks/useDayPlan.test.tsx` | neu | Hook-Datenfluss + Invalidierung mit Gegenbeispiel |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | 3 neue Tests: Einklappen, Persistenz, boardId-Isolation |
| `tests/unit/web/pages/DayPlanPage.test.tsx` | geändert | Mock um `useDayPlanTasks` ergänzt, Zähler-Quelle geprüft |
| `tests/browser/web/day-plan.spec.ts` | geändert | Lösen-URL aktualisiert (datumsunabhängig) + E2E für Gruppen-Einklappen/Persistenz |

## Tests und Prüfungen

Angewandte Leitplanken: `planungsleitplanken` (Plan-Gate) und `test-entwurfsleitplanken` (Test-Gate).

- **Typecheck:** `apps/api` ✅, `apps/web` ✅.
- **Lint:** `apps/api` ✅. `apps/web` hat 13 Fehler — alle in unveränderten Form-Dateien (FeatureForm, MilestoneForm, ProjectForm, TaskForm, UseCaseForm, TagManager, CommentBodyModal); keine in geänderten Dateien.
- **API-Integration (MySQL-Test-DB):** neue `day-plan-cross-date.test.ts` 4/4 ✅; bestehende `day-plans.test.ts` + `day-plan-task-flow.test.ts` 15/15 ✅ (keine Regression bei datumsgebundenen Flows).
- **Web-Unit:** Gesamtlauf 700 Tests, 670 grün. Die **6 neuen** Tests (1 DayPlanPage, 3 ListBoardView, 2 Hook) sind grün. Die 30 roten Tests sind **vorbestehend** (auf sauberem Stand identisch nachgewiesen via Stash-Baseline) und liegen in nicht berührten Bereichen (Formulare, ListBoard-Styling-Assertions, Panels).

## Probleme und Abweichungen

- **Berechtigungs-Mapping:** Der globale Auth-Guard leitet die Permission aus dem Pfad ab; `/day-plans/tasks` enthält `/tasks` und würde sonst auf die `tasks`-Permission abgebildet. Deshalb auf den neuen Routen expliziter `config.auth`-Override auf `dayPlans` (read/delete).
- **Reader können keine Tagesplan-Aufgaben/Termine anlegen** (`tasks:write`/`dayPlans:write` fehlen) — für Fremddaten-Fixtures wird in den Integrationstests ein zweiter schreibberechtigter User genutzt.

## Offene Punkte / Folgeaufgaben

- **E2E (Playwright):** Testfälle ergänzt (Lösen-URL aktualisiert, neuer Einklapp-/Persistenz-Flow), aber in dieser Session **nicht ausgeführt** — der vollständige E2E-Stack (separate E2E-DB + dev:e2e-Server + Browser) wurde nicht hochgefahren. Die fachlichen Effekte sind auf Unit- und Integrationsebene grün abgesichert. Ausführung von `npm run e2e -w apps/web` als Folgeschritt empfohlen.
- **Vorbestehende rote Web-Unit-Tests und Web-Lint-Fehler** in Formular-Dateien bleiben unangetastet (außerhalb des Auftragsscopes, §4.3).
