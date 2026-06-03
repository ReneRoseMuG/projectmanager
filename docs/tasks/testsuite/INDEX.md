# Test Suite — Index

Systematische Test Suite für alle Objekte, Relationen, UI-Konsistenz und Browser-Flows.

Grundlage: Top-Down-Analyse vom 03.06.2026.  
Design-Referenz: `docs/design-leitfaden.md`.  
Architektur-Referenz: `agents.md §11`, `agents.md §14`.

## Abschnitte

| # | Datei | Bereich | Status |
|---|---|---|---|
| 1 | [01-api-relationale-vollstaendigkeit.md](01-api-relationale-vollstaendigkeit.md) | API-Integration: fehlende Join-Kombinationen | 🔲 Offen |
| 2 | [02-api-berechtigungsfaelle.md](02-api-berechtigungsfaelle.md) | API-Integration: Reader-Negativfälle | 🔲 Offen |
| 3 | [03-api-loeschkaskaden.md](03-api-loeschkaskaden.md) | API-Integration: delete-cascade ergänzen | 🔲 Offen |
| 4 | [04-ui-listboardview-konsistenz.md](04-ui-listboardview-konsistenz.md) | UI: ListBoardView Add-Button, Icons, EmptyState | 🔲 Offen |
| 5 | [05-ui-panel-konsistenz.md](05-ui-panel-konsistenz.md) | UI: RelationPanel, CommentThread, NoteList, Section-Panels | 🔲 Offen |
| 6 | [06-e2e-milestone-ticket-flows.md](06-e2e-milestone-ticket-flows.md) | Browser/E2E: Milestone-Detail, SubTicket, Feature↔Ticket | 🔲 Offen |
| 7 | [07-e2e-persoenliche-planung.md](07-e2e-persoenliche-planung.md) | Browser/E2E: DayPlan vollständiger Flow | 🔲 Offen |
| 8 | [08-e2e-note-crud-kontexte.md](08-e2e-note-crud-kontexte.md) | Browser/E2E: Note-CRUD aus Project, Task, DayPlan | 🔲 Offen |

## Abnahme gesamt

- [ ] Alle 8 Abschnitte ausgearbeitet und reviewed
- [ ] `npm run test -w apps/api` vollständig grün
- [ ] `npm run test -w apps/web` vollständig grün
- [ ] `npm run e2e -w apps/web` vollständig grün
