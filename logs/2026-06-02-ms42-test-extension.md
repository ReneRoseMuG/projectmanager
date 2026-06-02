# MS-42: Tags – Testsuite-Erweiterung

**Datum:** 2026-06-02
**Branch:** work

## Kontext

Nach Abschluss aller 4 Implementierungs-Tickets (TICK-59–62) wurde die Testabdeckung der Tags-API geprüft und gezielt erweitert.

## Ausgangslage

Bestehende Tests in `tests/integration/api/tags.test.ts`:
- Tag CRUD (POST, PATCH, DELETE, GET)
- Eindeutigkeit (409 bei Duplikat)
- Projektzuweisungen (PUT/replace/clear)
- Kaskaden-Delete für Projektzuweisungen
- `usageCounts` Grundtest (nur Projekte)
- Aufgaben-Zuweisung (set + replace)

Ergänzende Tests in anderen Dateien:
- `tickets.test.ts`: Ticket-Tags (set + replace + detail response)
- `delete-cascade.test.ts`: Kaskaden-Deletes für alle Entity-Typen

## Hinzugefügte Tests (10 neue Cases)

| Test | Begründung |
|---|---|
| `PUT /api/tasks/:id/tags` — leeres Array löscht alle | Nur set/replace war abgedeckt |
| `PUT /api/milestones/:id/tags` — Zuweisung | Route und Service vorhanden, kein Test |
| `PUT /api/milestones/:id/tags` — vollständige Ersetzung | |
| `PUT /api/milestones/:id/tags` — leeres Array löscht alle | |
| `PUT /api/tickets/:id/tags` — Zuweisung + Ersetzung (mit Detail-Check) | Ausführlicherer Test als in tickets.test.ts |
| `PUT /api/tickets/:id/tags` — leeres Array löscht alle | Fehlte vollständig |
| `GET /api/tags` usageCounts über alle 4 Entity-Typen | Bestehender Test prüfte nur Projekte — alle 4 SQL-Subqueries aus TICK-62 nun validiert |
| `PATCH /api/tags/:id` — 404 bei unbekannter ID | Fehlerpfad ungetestet |
| `DELETE /api/tags/:id` — 404 bei unbekannter ID | Fehlerpfad ungetestet |
| `PATCH /api/tags/:id` — 409 bei Versionskonflikt | Optimistic Locking ungetestet |

## Geänderte Datei

| Datei | Änderung |
|---|---|
| `tests/integration/api/tags.test.ts` | Import ergänzt (`createMilestone`, `createTicket`); Docstring aktualisiert; 10 neue Tests hinzugefügt |

## Hinweis zur Ausführung

Tests benötigen eine lokale MySQL-Instanz. Credentials müssen in `.env.test`
(nach `.env.test.example`) konfiguriert sein. Ausführung via:

```
npm run test -w apps/api
```
