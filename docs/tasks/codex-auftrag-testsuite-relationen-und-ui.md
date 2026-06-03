# Codex-Aufgabe: Test Suite — Relationen, UI-Konsistenz und Persönliche Planung

## Aufgabenbeschreibung

Aufbau einer systematischen Test Suite, die alle fachlichen Kernobjekte (Projekte, Meilensteine, Features, Use Cases, Tasks, Tickets, BacklogItems, WikiPages) samt ihrer Relationen zu Aufgaben, Tickets, Notizen, Kommentaren, Sub-Aufgaben und Sub-Tickets abdeckt. Zusätzlich werden Frontend-UI-Konsistenz (Panels, Buttons, Filter) und Browser-Flows — insbesondere für die persönliche Planung (DayPlan) — getestet.

Grundlage ist die Top-Down-Analyse vom 03.06.2026 (Analyse-Ergebnis liegt in dieser Datei).

## Scope

**Backend (API-Integration):**
- Alle Owner-Join-Kombinationen: Note, Comment, Attachment, Tag, Event pro Träger-Entität
- Ticket-Relationen: blocks / related / duplicate
- Feature-Feature-Relationen
- DayPlan ↔ Task Link/Unlink-Sequenz
- Berechtigungsfälle (Reader-Negativfall) für schreibende Endpunkte

**Frontend (Unit/Component):**
- `RelationPanel`, `CommentThread`, `NoteList` — einheitliches Design über alle Träger
- `EmptyState` in Domain-Views — Variante und Buttons gemäß §8.22
- `ListBoardView`-Adapter: Add-Button (`variant="secondary"` + Text, kein className-Override), Link-Button, Icon-Größen
- `ListBoardView` leerer Zustand: EmptyState statt kollabierter Spalten bei `items.length === 0`
- Filter-Chips und Buttons in allen ListBoardView-Adaptern
- `DayPlanPage` Tabs und Panels

**Browser/E2E:**
- Milestone-Detail-Flow (Tabs + Relation-Panels)
- DayPlan: Task erstellen, verlinken, als erledigt markieren, Note anlegen
- Ticket-SubTicket-Create-Flow
- Feature ↔ Ticket-Verknüpfung
- Note-CRUD in verschiedenen Kontexten (Project, Task, DayPlan)

---

## Top-Down-Analyse (Stand 03.06.2026)

### Ebene 1 — Fachliche Kernobjekte

| Objekt | API-Route | Detail-Page | Repository |
|---|---|---|---|
| Project | `/projects`, `/projects/:id` | `ProjectDetailPage` | `project.repository.ts` |
| Milestone | `/milestones/:id` | `MilestoneDetailPage` | `milestone.repository.ts` |
| Feature | `/features`, `/features/:id` | `FeatureDetailPage` | `feature.repository.ts` |
| Use Case | `/features/:id` (Tab) | `UseCaseDetailPage` | `use-case.repository.ts` |
| Task | `/tasks`, Detail via Modal | `TaskDetailPage` | `task.repository.ts` |
| Ticket | `/tickets`, `/tickets/:id` | `TicketDetailPage` | `ticket.repository.ts` |
| BacklogItem | Projekt-Tab | `BacklogItemDetailPage` | `backlog-item.repository.ts` |
| WikiPage | `/wiki`, `/wiki/:id` | `WikiPage` | `wiki-page.repository.ts` |

### Ebene 2 — Relationen zwischen Kernobjekten

**Projektmanagement-Relationen (Join-Tabellen):**
- `projectTasks`, `milestoneTasks`, `featureTasks`, `useCaseTasks`
- `milestones.projectId` (1:N)
- `tasks.parentId` (SubTask, Selbstreferenz)

**Ticket-Relationen:**
- `projectTickets`, `milestoneTickets`, `taskTickets`, `featureTickets`, `useCaseTickets`
- `tickets.parentId` (SubTicket, Selbstreferenz)
- `ticketRelations` (blocks / related / duplicate, M:N)

**Feature/UseCase-Relationen:**
- `projectFeatures`, `milestoneFeatures`
- `useCases.featureId` (1:N)
- `featureRelations` (M:N)

### Ebene 3 — Querschnitts-Support-Objekte

| Support-Objekt | Träger (Owner) | Join-Tabellen |
|---|---|---|
| Note | Project, Milestone, Task, Ticket | 4 Join-Tabellen |
| Comment | Project, Milestone, Task, Feature, UseCase, BacklogItem, WikiPage, Ticket | 8 Join-Tabellen |
| Attachment | Project, Milestone, Task, Feature, Ticket | 5 Join-Tabellen |
| Tag | Project, Milestone, Task, Ticket | 4 Join-Tabellen |
| Event (Kalender) | Project, Milestone, Task | 3 Join-Tabellen |

### Ebene 4 — Persönliche Planung (DayPlan)

| Objekt | Relation | Typ |
|---|---|---|
| DayPlan | Täglich, user-gebunden | Eigene Tabelle |
| DayPlan → Task | `dayPlanTasks` (Link + Unlink) | Join |
| DayPlan → Note | `useNotes({ type: "day-plan", id })` | Owner-Modell |
| DayPlan → Comment | `useEntityComments` | Owner-Modell |
| DayPlan → Kalender | `DayPlanCalendarWidget` | Read-only |
| DayPlan → Journal | `JournalPanel` | Read-only |

Besonderheit: Tasks können ohne Projekt-Zuordnung erstellt oder aus bestehenden Tasks verlinkt werden. Die Verknüpfung ist bidirektional — eine Task bleibt in ihrem Ursprungs-Kontext sichtbar.

### Ebene 5 — Ist-Stand Testabdeckung

**API-Integrationstests vorhanden:**
`projects`, `milestones`, `features`, `use-cases`, `tasks`, `subtasks`, `tickets`, `notes`, `comments`, `attachments`, `tags`, `events`, `day-plans`, `wiki`, `backlog`, `journal`, `owner-task-relations`, `delete-cascade`, `milestone-cascade`, `dashboard`, `realtime`

**Fehlende API-Integrationstests:**
- Ticket-Relationen (`ticketRelations`: blocks/related/duplicate) — keine eigene Testdatei
- Ticket ↔ Owner-Verknüpfungen (alle 5 Join-Tabellen isoliert getestet)
- Task ↔ Owner-Verknüpfungen (Feature, UseCase — vollständige Matrix)
- Feature ↔ Feature-Relationen (`featureRelations`)
- DayPlan ↔ Task-Link/Unlink (Sequenz: link → verify → unlink → verify)
- Reader-Negativfall für alle schreibenden Ticket-/Task-/Note-Endpunkte

**Browser/E2E-Tests vorhanden:**
`project`, `task`, `task-dnd`, `tickets`, `feature`, `owner-tasks`, `calendar`, `journal`, `notes-modal-flow`, `navigation-return`, `ticket-detail-tabs`, `create-child-elements`, `feature-parent-select`

**Fehlende Browser-Tests:**
- Milestone-Detail vollständiger Tab-Flow
- DayPlan: Task erstellen + verlinken + erledigen + Note anlegen
- Ticket-SubTicket-Create-Flow
- Feature ↔ Ticket-Verknüpfung im Browser
- Note-CRUD aus verschiedenen Kontexten (Project, Task, DayPlan)

---

## Implementierungsreihenfolge

### Phase 1 — API-Integration: fehlende Relationstest-Dateien

1. `tests/integration/api/ticket-relations.test.ts`
   - Relation vom Typ `blocks` anlegen, lesen, löschen
   - Typ `related` und `duplicate` analog
   - Keine Self-Relation erlaubt (400)
   - Auth-Guard: Reader darf keine Relation anlegen

2. `tests/integration/api/ticket-owner-relations.test.ts`
   - Für jeden Owner-Typ: Ticket an Project/Milestone/Task/Feature/UseCase verknüpfen
   - Verknüpfung lesen (Ticket erscheint in Owner-Liste)
   - Verknüpfung trennen → Ticket nicht mehr in Owner-Liste, Ticket selbst erhalten
   - Delete-Cascade: Owner löschen → Join-Eintrag weg, Ticket bleibt

3. `tests/integration/api/feature-relations.test.ts`
   - Feature-Feature-Relation anlegen, lesen, löschen
   - Keine Self-Relation (400)

4. `tests/integration/api/day-plan-task-flow.test.ts`
   - DayPlan anlegen → Task erstellen → Task verlinken → Task in DayPlan sichtbar
   - Task aus DayPlan unlinken → nicht mehr in DayPlan, Task selbst erhalten
   - Fremde Task (anderes User-Datum) erscheint nicht

5. `tests/integration/api/delete-cascade.test.ts` erweitern
   - Ticket-Relation: Owner löschen → Join weg
   - Feature-Relation: Feature löschen → Relation weg
   - DayPlan löschen → dayPlanTask-Join weg

### Phase 2 — API-Integration: Berechtigungsfälle ergänzen

Bestehende Testdateien um Reader-Negativfall erweitern (jeweils ein `it`-Block pro Datei):
- `tickets.test.ts`: Reader kann kein Ticket anlegen/ändern/löschen
- `notes.test.ts`: Reader kann keine Note anlegen
- `comments.test.ts`: Reader kann keinen Kommentar anlegen
- `tags.test.ts`: Reader kann Tags nicht setzen

### Phase 3 — Unit/Component: UI-Konsistenz

6. `tests/unit/web/components/ui/RelationPanel.consistency.test.tsx`
   - RelationPanel rendert identisches Button-Layout für alle Träger (Task, Ticket, Feature)
   - EmptyState korrekt wenn keine Relationen

7. `tests/unit/web/components/ui/CommentThread.consistency.test.tsx`
   - Bereits vorhanden: erweitern um Träger-übergreifenden Design-Check

8. `tests/unit/web/pages/DayPlanPage.tabs.test.tsx`
   - Alle 6 Tabs rendern korrekt
   - Task-Tab zeigt TaskListBoardView
   - Notes-Tab zeigt NoteList
   - Comments-Tab zeigt CommentThread

### Phase 4 — Browser/E2E

9. `tests/browser/web/milestone-detail.spec.ts`
   - Milestone öffnen → alle Tabs sichtbar
   - Task hinzufügen → erscheint in Tasks-Tab
   - Feature verknüpfen → erscheint in Features-Tab

10. `tests/browser/web/day-plan.spec.ts`
    - DayPlan-Seite aufrufen
    - Neue Task erstellen → erscheint im Tasks-Tab
    - Bestehende Task verlinken → erscheint im Tasks-Tab
    - Task als erledigt markieren → Status wechselt
    - Note anlegen → erscheint im Notes-Tab

11. `tests/browser/web/ticket-subticket.spec.ts`
    - Ticket öffnen → SubTicket erstellen → erscheint im SubTicket-Panel
    - SubTicket löschen → verschwindet

12. `tests/browser/web/note-crud-contexts.spec.ts`
    - Note in Project anlegen → sichtbar
    - Note in Task anlegen → sichtbar
    - Note in DayPlan anlegen → sichtbar
    - Note bearbeiten und löschen (je Kontext)

---

## Regeln und Einschränkungen

- Keine Mocks in Integrationstests (echte SQLite Temp-DB)
- Keine Mocks in Browser/E2E-Tests (echte API-Instanz)
- Testisolation: ausschließlich `tests/.runtime` oder In-Memory-DB
- Nie `apps/api/data/`, `apps/api/uploads/`, `apps/api/backups/` in Tests
- Reader-Negativfälle sind Pflicht für alle schreibenden Endpunkte
- Update-Tests versionierter Objekte müssen `expectedVersion` aus vorherigem GET senden
- Neue Tabellen in `tests/fixtures/api/db.ts` → `truncateAll` ergänzen

## Randfälle und Fehlerpfade

- Ticket-Relation mit sich selbst → 400 BAD_REQUEST
- Feature-Relation mit sich selbst → 400 BAD_REQUEST
- DayPlan-Task-Link mit fremdem User → 403 oder leere Liste
- Note/Comment an nicht existierendem Owner → 404
- Attachment-Upload überschreitet 25 MB → 400
- SubTicket an Owner verknüpfen → sollte nicht erlaubt sein (nur Parent-Ticket)

## Testhinweise

**Framework:** Vitest + Supertest (Integration), Vitest + Testing Library (Unit), Playwright (Browser)

**Pflicht-Kommentar-Format** in jeder neuen Testdatei:
```ts
/**
 * Test Scope:
 * Test-Ebene: Integration | Unit | Browser/E2E
 * Realitätsgrad: echte Fastify-App + SQLite Temp-DB
 * Mock-Entscheidung: keine Mocks
 * Isolation: In-Memory-DB / tests/.runtime
 * Abgedeckte Regeln: ...
 * Fehlerfälle: ...
 * Ziel: ...
 */
```

**Abnahmekriterium:** Alle aufgeführten Tests müssen vor Abnahme grün sein.
`test.skip`, `it.skip` und leere Testkörper sind ohne dokumentierten Blocker unzulässig.

## Abnahmekriterien

- [ ] Phase 1: 5 neue API-Integrationstestdateien für fehlende Relationen — alle grün
- [ ] Phase 2: Reader-Negativfälle in 4 bestehenden Testdateien ergänzt — alle grün
- [ ] Phase 3: UI-Konsistenz-Tests für RelationPanel und DayPlanPage — alle grün
- [ ] Phase 4: 4 neue Browser-Test-Dateien — alle grün
- [ ] `npm run test -w apps/api` vollständig grün (keine neuen Brüche)
- [ ] `npm run test -w apps/web` vollständig grün
- [ ] `npm run e2e -w apps/web` vollständig grün

## Referenz

- Schema: `apps/api/src/db/schema.ts`
- Repositories: `apps/api/src/repositories/`
- Services: `apps/api/src/services/`
- Routes: `apps/api/src/routes/`
- Fixtures: `tests/fixtures/api/db.ts`
- Bestehende Integrationstests: `tests/integration/api/`
- Bestehende Browser-Tests: `tests/browser/web/`
- Bestehende Unit-Tests: `tests/unit/web/`
- agents.md §11 (Teststrategie)
- Test-Entwurfsleitplanken: `.claude/skills/test-entwurfsleitplanken/`
