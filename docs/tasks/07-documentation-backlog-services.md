# Codex-Aufgabe: Repository-Migration Dokumentation und Backlog

## Aufgabenbeschreibung
Migriere die Services der Dokumentationsdomäne und des Backlogs auf den Repository-Layer. Ziel ist, dass Features, Use Cases, Wiki Pages und Backlog Items ihre Standard-CRUD-Operationen über Repositories ausführen und alle Update-Routen strikt `expectedVersion` verlangen.

Fachliche Relation- und Content-Logik bleibt in Services.

## Scope
Betroffen sind:
- `apps/api/src/repositories/feature.repository.ts`
- `apps/api/src/repositories/use-case.repository.ts`
- `apps/api/src/repositories/wiki-page.repository.ts`
- `apps/api/src/repositories/backlog-item.repository.ts`
- `apps/api/src/services/features.service.ts`
- `apps/api/src/services/use-cases.service.ts`
- `apps/api/src/services/wiki.service.ts`
- `apps/api/src/services/backlog.service.ts`
- `apps/api/src/services/doc-links.service.ts`
- `apps/api/src/services/wiki-import.service.ts`
- `apps/api/src/routes/features.ts`
- `apps/api/src/routes/use-cases.ts`
- `apps/api/src/routes/wiki.ts`
- `apps/api/src/routes/backlog.ts`
- `packages/shared-types/src/index.ts`
- Web-API-Clients und Hooks für Features, Use Cases, Wiki und Backlog
- Integration-Tests und relevante E2E-Tests

Abhängigkeiten:
- Aufgabe 02 abgeschlossen.
- Aufgabe 05 abgeschlossen.
- Aufgabe 03 abgeschlossen, wenn Comment-Cascade-Entfernung für diese Domänen Teil der Umsetzung ist.
- Aufgabe 06 abgeschlossen, wenn gemeinsame Project/Task/Ticket-Repositories wiederverwendet werden.

Nicht im Scope:
- Project-, Task- und Ticket-CRUD, sofern Aufgabe 06 erledigt ist.
- Tags, Notes, Attachments und Events.
- Neue fachliche Beziehungen.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lies zunächst den Architektur-Leitfaden vollständig:
`docs/architecture-leitfaden.md`

Lese dann alle betroffenen Dateien und erstelle eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| Feature-Service | Direkte Drizzle-Zugriffe | Standard-CRUD über `featureRepository` |
| UseCase-Service | Direkte Drizzle-Zugriffe | Standard-CRUD über `useCaseRepository` |
| Wiki-Service | Direkte Drizzle-Zugriffe | Standard-CRUD über `wikiPageRepository` |
| Backlog-Service | Direkte Drizzle-Zugriffe | Standard-CRUD über `backlogItemRepository` |
| Doc-Link-Service | Relation-Queries direkt im Service | Fachliche Junction-Operationen bleiben dokumentiert im Service |
| Wiki-Import | Legt mehrere Entities an | Nutzt Repositories für Entity-CRUD, behält Import-Orchestrierung |
| Routes | Updates ohne `expectedVersion` | Updates mit verpflichtender `expectedVersion` |

Dokumentiere außerdem:
- Welche Drizzle-Zugriffe als Junction-Operationen bleiben dürfen.
- Welche Content-Dateisystem-Operationen unverändert bleiben.
- Welche Importflüsse mehrere Repositories koordinieren müssen.

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Schema & Migration

Keine neue Schemaänderung, sofern Aufgabe 02 vollständig ist.

Wenn für Feature, UseCase, WikiPage oder BacklogItem `version` fehlt, abbrechen und Aufgabe 02 nachziehen.

---

## Schritt 3: Repository

- Implementiere oder erweitere:
  - `feature.repository.ts`
  - `use-case.repository.ts`
  - `wiki-page.repository.ts`
  - `backlog-item.repository.ts`
- Jedes Repository unterstützt Standard-CRUD gemäß Leitfaden.
- Domain-spezifische Abfragen wandern ins passende Repository, wenn sie Entity-Tabellen lesen.
- Relationstabellen-Operationen dürfen im Service bleiben:
  - `project_features`
  - `feature_relations`
  - `project_tasks`, `feature_tasks`, `use_case_tasks`, soweit durch Doc-Links betroffen
  - `project_tickets`, `feature_tickets`, `use_case_tickets`, soweit durch Doc-Links betroffen

---

## Schritt 4: Service

- Ersetze Standard-CRUD-Drizzle-Zugriffe durch Repository-Aufrufe.
- Business- und Orchestrierungslogik bleibt in Services:
  - Slug-Konfliktprüfung
  - Content-Datei-Erstellung und Cleanup
  - Wiki-Hierarchie-Regeln
  - Backlog-Zuordnung zu Project, Feature und UseCase
  - Wiki-Import-Orchestrierung
- Entferne manuelle Comment-Cascade-Aufrufe, sofern Aufgabe 03 die Junction-Basis bereitstellt.
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
- `apps/api/tests/integration/features.test.ts`
- `apps/api/tests/integration/use-cases.test.ts`
- `apps/api/tests/integration/wiki.test.ts`
- `apps/api/tests/integration/backlog.test.ts`
- `apps/api/tests/integration/doc-links.test.ts`
- `apps/api/tests/integration/wiki-import.test.ts`
- `apps/api/tests/integration/delete-cascade.test.ts`, falls Delete-Regeln betroffen sind

Pflichtfälle je updatefähiger Entity:
- Create liefert `version = 1`.
- Update mit korrekter Version liefert 200 und inkrementiert `version`.
- Update ohne `expectedVersion` liefert 400.
- Update mit veralteter Version liefert 409.
- Bestehende Relation- und Content-Flows bleiben grün.

### 6b — E2E-Tests

Aktualisiere relevante E2E-Flows:
- Feature bearbeiten.
- Use Case bearbeiten.
- Wiki Page bearbeiten.
- Backlog Item bearbeiten.
- Import- oder Relation-UI bleibt funktionsfähig, soweit vorhanden.

---

## Abnahmekriterien

Die Aufgabe gilt als abgeschlossen wenn alle folgenden Punkte erfüllt sind:

- [ ] Feature-, UseCase-, WikiPage- und BacklogItem-Repositories existieren
- [ ] Standard-CRUD läuft über Repositories
- [ ] Content- und Import-Orchestrierung bleibt in Services
- [ ] Zulässige Junction-Operationen sind dokumentiert
- [ ] Responses enthalten `version`
- [ ] Alle betroffenen Update-Routen verlangen `expectedVersion`
- [ ] Veraltete Versionen liefern 409
- [ ] Manuelle Comment-Cascade-Aufrufe sind entfernt, sofern Aufgabe 03 abgeschlossen ist
- [ ] Integration-Tests sind grün
- [ ] Relevante E2E-Tests sind grün oder Blocker sind dokumentiert

---

## Referenz

- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Base Repository: `apps/api/src/repositories/base.repository.ts`
- Services: `apps/api/src/services/features.service.ts`, `apps/api/src/services/use-cases.service.ts`, `apps/api/src/services/wiki.service.ts`, `apps/api/src/services/backlog.service.ts`
- Routes: `apps/api/src/routes/features.ts`, `apps/api/src/routes/use-cases.ts`, `apps/api/src/routes/wiki.ts`, `apps/api/src/routes/backlog.ts`
- Shared Types: `packages/shared-types/src/index.ts`
- Integration-Tests: `apps/api/tests/integration/`
- E2E-Tests: `apps/web/e2e/`
