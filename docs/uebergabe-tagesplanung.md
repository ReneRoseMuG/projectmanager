# Übergabe: Tagesplanung (day_plans)

**Datum:** 2026-05-28  
**Projekt:** PROJ-3 (Projekt Manager App)  
**Meilenstein:** MILE-20 — „Refactoring Kalender/Planungs Sichten"  
**Feature:** FEAT-42 — „Tagesplanung"  
**Aufgabe:** TASK-96 — „Tagesplanung-Ebene einführen (day_plans)"

---

## Was wurde entschieden

Die App war bisher strikt projektzentriert — Tasks und Events existierten immer im Kontext eines Projekts oder Meilensteins. Es wurde eine neue, eigenständige **Tagesplan-Ebene** eingeführt (Option B: eigener `day_plans`-Datensatz), weil der Tag als planbare Einheit eine eigene Identität im System benötigt.

Bewusst **verworfen** wurde:
- **Option A** (reine Aggregations-View): wäre nur lesend, kein echter Planungsraum
- **Option C** (System-Inbox-Projekt): konzeptuelle Krücke, Fremdkörper im Datenmodell

**Kernentscheidung:** Tasks und Events in der DB haben bereits kein direktes `projectId`-Feld — der Projektbezug entsteht nur über Join-Tabellen. Das Schema unterstützte „orphane" Objekte also schon, es fehlte nur der Zugang. `day_plans` gibt diesen Objekten einen eigenen Container.

---

## Was Codex implementiert hat

Die Implementierung ist **vollständig abgeschlossen und kompilierfehlerfrei** (TSC 0 errors, alle Integration-Tests grün).

### Backend

| Datei | Inhalt |
|---|---|
| `apps/api/src/db/schema.ts` | `dayPlans`, `dayPlanTasks`, `dayPlanEvents` Tabellen; `DAY_PLAN_STATUSES`; `"dayPlan"` in `JOURNAL_OBJECT_TYPES` |
| `apps/api/src/db/migrations/0031_day_plans.sql` | Migration für alle drei Tabellen inkl. Unique-Constraints und Date-Index |
| `apps/api/src/repositories/day-plan.repository.ts` | CRUD + Join-Operationen, Positions-Management, Versions-Schutz via `assertVersion` |
| `apps/api/src/services/day-plan.service.ts` | Business-Logik, Journal-Integration, semantische Datum-Validierung, Subtask-Schutz |
| `apps/api/src/routes/day-plans.ts` | 8 Endpunkte (GET/PATCH Tagesplan, POST/POST/DELETE Tasks, POST/POST/DELETE Events) |

Route ist in `app.ts` unter `/api` registriert.

### Shared Types (`packages/shared-types/src/index.ts`)

`DayPlan`, `DayPlanStatus`, `DayPlanUpdate`, `DayPlanPatchInput` hinzugefügt.  
`EventOwner` um `"dayPlan"` erweitert.  
`AUTH_RESOURCES` und `REALTIME_INVALIDATION_SCOPES` enthalten `"dayPlans"`.

### Frontend

| Datei | Inhalt |
|---|---|
| `apps/web/src/api/day-plans.ts` | API-Client |
| `apps/web/src/hooks/useDayPlan.ts` | React-Hook für Tagesplan-State |
| `apps/web/src/pages/DayPlanPage.tsx` | Vollständige Seite: Aufgaben-Formular, Termin-Formular, Tagesnotizen, Status-Toggle, Tagesüberblick-Panel, Datums-Navigation |
| `apps/web/src/App.tsx` | Route `/day-plan` eingetragen, `dayPlanAccess`-Permission-Check |
| `apps/web/src/components/layout/Sidebar.tsx` | Nav-Eintrag „Tagesplan" |
| `apps/web/src/components/calendar/WeekCalendar.tsx` | Erkennt `dayPlan`-Owner, zeigt „Tagesplan" als Herkunft |
| `apps/web/src/components/journal/JournalPanel.tsx` | Label „Tagesplan" für Journal-Einträge |

### Tests

`tests/integration/api/day-plans.test.ts` — 4 Integration-Tests mit echter DB und echtem Auth:
- 401 ohne Session, 403 bei Reader-Schreibzugriff
- Idempotenz-Check (GET erstellt Plan genau einmal)
- Datum-Semantikprüfung (`2026-13-01` → 400)
- Versions-Konflikt (409 bei veraltetem `expectedVersion`)
- Task-/Event-Unlink ohne Datenverlust

### Bekannte Kleinigkeit

In `createDayPlanEvent` werden zwei DB-Writes verwendet (Insert via `createEvent` + `updateEventPosition`), wo einer ausreichen würde. Kein Bug, leichtes Optimierungspotenzial.

---

## Was noch aussteht (MILE-20)

MILE-20 umfasst **zwei** Arbeiten. Nur die erste ist erledigt:

- ✅ Tagesplanung-Ebene einführen (TASK-96) — **abgeschlossen**
- ⬜ **Kalender-Refactoring** — noch keine Aufgabe angelegt

Das Kalender-Refactoring soll die bestehende Kalenderkomponente überarbeiten, um den neuen `day_plans`-Kontext nativ zu unterstützen und die Codebasis für künftige Planungsfeatures vorzubereiten. Konkrete Scope-Definition steht noch aus.

---

## Dokumentation & Projekt Manager

| Artefakt | Wo |
|---|---|
| Feature-Dokumentation (Anwendersicht) | FEAT-42 im Projekt Manager, `content`-Feld |
| Redaktionelle Markdown-Datei | `docs/tagesplanung-editorial.md` |
| Codex-Auftrag | `docs/tasks/2026-05-27-tagesplanung-ebene-day-plans.md` |
| Codex-Auftrag als Attachment | An TASK-96 angehängt |

---

## Nächste Schritte für den neuen Chat

1. **Kalender-Refactoring** konkretisieren: Scope mit dem Nutzer klären, dann Codex-Auftrag für MILE-20 anlegen
2. **Roll-over-Logik** (bewusst out-of-scope gelassen): unerledigte Tagesaufgaben auf den nächsten Tag verschieben — eigene Folge-Aufgabe
3. **FEAT-42 weiterentwickeln**: Use Cases anlegen, sobald Rückmeldung aus dem ersten produktiven Einsatz vorliegt
