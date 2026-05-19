# Ergebnis: Bestandsaufnahme Architektur-Delta

**Datum:** 19.05.26  
**Status:** Abgeschlossen

## Ist/Soll-Übersicht

| Bereich | Ist-Zustand | Soll-Zustand |
|---|---|---|
| Schema | `users` fehlt. Fach- und Support-Objekte haben keine `version`, `created_by`, `updated_by`; `comments`, `attachments` und `tags` haben unvollständige Timestamps. | `users` existiert. Alle Fach- und Support-Objekte haben `version`, `created_by`, `updated_by`, `created_at`, `updated_at`. |
| Comments | `comments` nutzt `task_id`, `entity_type`, `entity_id`; Services enthalten `ensureEntityExists()` und manuelle Cascade-Funktionen. | Comments werden über Parent-spezifische Junction-Tabellen verknüpft und liefern `owners: [...]`. |
| Attachments | `attachments` nutzt nullable `project_id`, `task_id`, `feature_id`, `ticket_id` plus CHECK-Constraint. | Attachments werden über Parent-spezifische Junction-Tabellen verknüpft und liefern `owners: [...]`. |
| Repositories | `apps/api/src/repositories/` existiert nicht. | Repository-Layer mit `base.repository.ts` und Entity-Repositories existiert. |
| Services | Direkte Drizzle-Zugriffe in 16 Service-Dateien. | Standard-CRUD läuft über Repositories; Junction-, Admin- und Infrastruktur-Ausnahmen sind dokumentiert. |
| Routes | Update-Routen verlangen kein `expectedVersion`; Support-Routen nutzen teils generische Owner-Logik. | Update-Routen verlangen strikt `expectedVersion`; Parent-Kontext ist explizit. |
| Shared Types | DTOs enthalten alte Owner-Felder und keine Versionierung für die meisten Entities. | Entity-DTOs enthalten `version`; Update-Inputs enthalten `expectedVersion`; Comments und Attachments enthalten `owners: [...]`. |
| Tests | Integration- und E2E-Tests prüfen überwiegend das aktuelle Modell. | Tests decken Migration, n:m, Cascade, Datei-Cleanup und Optimistic Locking ab. |

## Direkt betroffene Services

Direkte Drizzle-Zugriffe wurden in folgenden Dateien gefunden:

- `apps/api/src/services/attachments.service.ts`
- `apps/api/src/services/attachment-preview.service.ts`
- `apps/api/src/services/backlog.service.ts`
- `apps/api/src/services/comments.service.ts`
- `apps/api/src/services/doc-links.service.ts`
- `apps/api/src/services/events.service.ts`
- `apps/api/src/services/features.service.ts`
- `apps/api/src/services/notes.service.ts`
- `apps/api/src/services/projects.service.ts`
- `apps/api/src/services/seed-data.service.ts`
- `apps/api/src/services/tags.service.ts`
- `apps/api/src/services/tasks.service.ts`
- `apps/api/src/services/tickets.service.ts`
- `apps/api/src/services/use-cases.service.ts`
- `apps/api/src/services/wiki-import.service.ts`
- `apps/api/src/services/wiki.service.ts`

## Zielbeziehungen

| Parent | Child / Zielobjekt | Beziehung | Zielstruktur |
|---|---|---:|---|
| Project | Feature | n:m | `project_features` |
| Project | Task | n:m | `project_tasks` |
| Feature | Task | n:m | `feature_tasks` |
| UseCase | Task | n:m | `use_case_tasks` |
| Project | Ticket | n:m | `project_tickets` |
| Task | Ticket | n:m | `task_tickets` |
| Feature | Ticket | n:m | `feature_tickets` |
| UseCase | Ticket | n:m | `use_case_tickets` |
| Feature | UseCase | 1:n | `use_cases.feature_id` |
| Task | Subtask | 1:n | `tasks.parent_id` |
| Ticket | SubTicket | 1:n | `tickets.parent_id` |
| WikiPage | WikiPage | 1:n | `wiki_pages.parent_id` |
| Project | BacklogItem | 1:n | `backlog_items.project_id` |
| Feature | BacklogItem | optional 1:n | `backlog_items.feature_id` |
| UseCase | BacklogItem | optional 1:n | `backlog_items.use_case_id` |
| Project | WikiPage | optional 1:n | `wiki_pages.project_id` |

## Support-Zielbeziehungen

| Parent-Objekte | Support-Objekt | Zielstruktur |
|---|---|---|
| Project, Task, Feature, UseCase, BacklogItem, WikiPage, Ticket | Comment | `project_comments`, `task_comments`, `feature_comments`, `use_case_comments`, `backlog_item_comments`, `wiki_page_comments`, `ticket_comments` |
| Project, Task, Feature, Ticket | Attachment | `project_attachments`, `task_attachments`, `feature_attachments`, `ticket_attachments` |
| Project, Task, Ticket | Note | `project_notes`, `task_notes`, `ticket_notes` |
| Project, Task, Ticket | Tag | `project_tags`, `task_tags`, `ticket_tags` |

## Verbotene Muster im Ist-Zustand

- Polymorphe Comment-Felder: `comments.entity_type`, `comments.entity_id`.
- Zusätzlicher Legacy-Owner: `comments.task_id`.
- Nullable Attachment-Owner-Felder: `attachments.project_id`, `attachments.task_id`, `attachments.feature_id`, `attachments.ticket_id`.
- Attachment-CHECK-Constraint `attachments_exactly_one_owner`.
- Manuelle Comment-Cascade-Funktionen als FK-Ersatz.
- Fehlender Repository-Layer für Standard-CRUD.

## Folgeaufgaben und Abhängigkeiten

1. `02-schema-users-version-audit.md` schafft die Schema-Basis.
2. `03-comment-junction-modell.md` migriert Comments auf n:m.
3. `04-attachment-junction-modell.md` migriert Attachments auf n:m.
4. `05-repository-foundation-api-contracts.md` legt Repository- und Versionierungsgrundlagen.
5. `06-project-task-ticket-services.md` migriert Kernservices.
6. `07-documentation-backlog-services.md` migriert Dokumentations- und Backlog-Services.
7. `08-support-und-infrastruktur-services.md` migriert Support- und Infrastrukturservices.
8. `09-cleanup-drop-legacy-columns.md` entfernt alte Owner-Spalten nach Verifikation.
9. `10-test-und-abnahme-gate.md` führt den abschließenden seriellen Test- und Abnahmelauf aus.

## Tests

Für diese Analyseaufgabe wurden keine automatisierten Tests ausgeführt. Die Prüfung bestand aus gezielter statischer Suche in Schema, Services, Routes, Shared Types und Teststruktur.
