# Codex-Aufgabe: Repository-Migration Project, Task und Ticket

## Aufgabenbeschreibung
Migriere die Kernservices für Projektmanagement und Tickets auf den Repository-Layer. Ziel ist, dass Projects, Tasks und Tickets ihre Standard-CRUD-Operationen über Repositories ausführen und alle Update-Routen strikt `expectedVersion` verlangen.

Junction-Operationen für bestehende Fachbeziehungen dürfen vorerst im Service bleiben, solange sie keine Standard-CRUD-Operationen ersetzen.

## Scope
Betroffen sind:
- `apps/api/src/repositories/project.repository.ts`
- `apps/api/src/repositories/task.repository.ts`
- `apps/api/src/repositories/ticket.repository.ts`
- `apps/api/src/services/projects.service.ts`
- `apps/api/src/services/tasks.service.ts`
- `apps/api/src/services/tickets.service.ts`
- `apps/api/src/routes/projects.ts`
- `apps/api/src/routes/tasks.ts`
- `apps/api/src/routes/subtasks.ts`
- `apps/api/src/routes/tickets.ts`
- `packages/shared-types/src/index.ts`
- Web-API-Clients und Hooks für Projects, Tasks und Tickets
- Integration-Tests für Projects, Tasks, Subtasks und Tickets
- relevante E2E-Tests

Abhängigkeiten:
- Aufgabe 02 abgeschlossen.
- Aufgabe 05 abgeschlossen.
- Aufgabe 03 abgeschlossen, falls Ticket- oder Task-Comment-Funktionen betroffen sind.
- Aufgabe 04 abgeschlossen, falls Ticket-Attachment-Funktionen betroffen sind.

Nicht im Scope:
- Feature, UseCase, Wiki und Backlog.
- Tags, Notes, Events, Seed Data und Dumps.
- Neue UI-Konfliktauflösung jenseits sauberer Fehleranzeige.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lies zunächst den Architektur-Leitfaden vollständig:
`docs/architecture-leitfaden.md`

Lese dann alle betroffenen Dateien und erstelle eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| Project-Service | Direkte Drizzle-CRUD-Zugriffe | CRUD über `projectRepository` |
| Task-Service | Direkte Drizzle-CRUD-Zugriffe und Junction-Operationen | Standard-CRUD über `taskRepository`, Junction bleibt im Service |
| Ticket-Service | Direkte Drizzle-CRUD-Zugriffe und Relation/Junction-Operationen | Standard-CRUD über `ticketRepository`, Junction bleibt im Service |
| Routes | Updates ohne `expectedVersion` | Updates mit verpflichtender `expectedVersion` |
| Shared Types | Responses ohne `version`, Updates ohne Version | Responses mit `version`, Updates mit `expectedVersion` |
| Tests | Keine Version-Konfliktfälle | CRUD und 409-Konflikte abgedeckt |

Dokumentiere außerdem:
- Welche Drizzle-Zugriffe bewusst bleiben dürfen, weil sie Junction-Operationen betreffen.
- Welche Drizzle-Zugriffe vollständig in Repositories wandern.
- Welche Frontend-Mutationen `expectedVersion` mitsenden müssen.

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Schema & Migration

Keine neue Schemaänderung, sofern Aufgabe 02 vollständig ist.

Wenn für Project, Task oder Ticket `version` fehlt, abbrechen und Aufgabe 02 nachziehen.

---

## Schritt 3: Repository

- Implementiere oder erweitere:
  - `project.repository.ts`
  - `task.repository.ts`
  - `ticket.repository.ts`
- Jedes Repository unterstützt Standard-CRUD gemäß Leitfaden.
- Domain-spezifische Abfragen werden aus Services in Repositories verschoben, wenn sie direkt Entity-Tabellen lesen und keine Junction-Schreiboperationen sind.
- `update` prüft `expectedVersion`, inkrementiert `version` und setzt `updatedAt`.
- `create` setzt `version = 1`.

---

## Schritt 4: Service

- Ersetze Standard-CRUD-Drizzle-Zugriffe durch Repository-Aufrufe.
- Business-Regeln bleiben im Service:
  - Task-Subtask-Regeln
  - Ticket-Status- und `resolvedAt`-Logik
  - Delete-Blockaden bei verknüpften Objekten, sofern fachlich gewollt
- Junction-Operationen für Owner-Beziehungen bleiben vorerst im Service:
  - `project_tasks`
  - `feature_tasks`
  - `use_case_tasks`
  - `project_tickets`
  - `task_tickets`
  - `feature_tickets`
  - `use_case_tickets`
- Services übersetzen `VersionConflictError` in 409.

---

## Schritt 5: Route

- Update-Routen verlangen strikt `expectedVersion`.
- Fehlende `expectedVersion` liefert 400.
- Veraltete `expectedVersion` liefert 409.
- Response-DTOs enthalten `version`.
- Bestehende URLs bleiben erhalten.
- Web-API-Clients und Hooks senden `expectedVersion` bei Updates mit.

---

## Schritt 6: Tests (verpflichtend, vor Abnahme vollständig)

### 6a — Integration-Tests

Aktualisiere:
- `apps/api/tests/integration/projects.test.ts`
- `apps/api/tests/integration/tasks.test.ts`
- `apps/api/tests/integration/subtasks.test.ts`
- `apps/api/tests/integration/tickets.test.ts`
- `apps/api/tests/integration/delete-cascade.test.ts`, falls Delete-Regeln betroffen sind

Pflichtfälle je Entity:
- Create liefert `version = 1`.
- Update mit korrekter Version liefert 200 und inkrementiert `version`.
- Update ohne `expectedVersion` liefert 400.
- Update mit veralteter Version liefert 409.
- Zwei Updates mit derselben Ausgangsversion: zweites Update liefert 409.
- Delete-Verhalten bleibt fachlich unverändert.

### 6b — E2E-Tests

Aktualisiere relevante E2E-Flows:
- Project bearbeiten.
- Task bearbeiten und Status ändern.
- Ticket bearbeiten und Status ändern.
- UI verarbeitet 409 mindestens ohne Absturz und mit vorhandener Fehlerbehandlung.

---

## Abnahmekriterien

Die Aufgabe gilt als abgeschlossen wenn alle folgenden Punkte erfüllt sind:

- [ ] Project-, Task- und Ticket-Repositories existieren
- [ ] Standard-CRUD läuft über Repositories
- [ ] Business-Logik bleibt in Services
- [ ] Zulässige Junction-Operationen sind dokumentiert
- [ ] Project-, Task- und Ticket-Responses enthalten `version`
- [ ] Alle betroffenen Update-Routen verlangen `expectedVersion`
- [ ] Veraltete Versionen liefern 409
- [ ] Integration-Tests für Versionierung und CRUD sind grün
- [ ] Relevante E2E-Tests sind grün oder Blocker sind dokumentiert

---

## Referenz

- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Base Repository: `apps/api/src/repositories/base.repository.ts`
- Services: `apps/api/src/services/projects.service.ts`, `apps/api/src/services/tasks.service.ts`, `apps/api/src/services/tickets.service.ts`
- Routes: `apps/api/src/routes/projects.ts`, `apps/api/src/routes/tasks.ts`, `apps/api/src/routes/tickets.ts`
- Shared Types: `packages/shared-types/src/index.ts`
- Integration-Tests: `apps/api/tests/integration/`
- E2E-Tests: `apps/web/e2e/`
