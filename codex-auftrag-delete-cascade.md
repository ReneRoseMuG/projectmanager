# Codex-Auftrag: Delete-Cascade — Vollständige Lösch-Bereinigung

## Ziel

Beim Löschen jeder Entität (Projekt, Task, Feature, UseCase, Ticket, BacklogItem, WikiPage) müssen **alle** abhängigen Objekte vollständig aus der Datenbank entfernt werden — auch solche, die nicht über FK-Constraints kaskadiert werden. Aktuell bleiben Kommentare (polymorphes Muster ohne FK) und Notes-Datensätze (Join-Tabellen kaskadieren, der eigentliche `notes`-Record aber nicht) als Datenmüll zurück.

**Erfolgskriterium:** Die Test Suite `tests/integration/delete-cascade.test.ts` läuft vollständig durch — kein Test schlägt fehl.

---

## Kontext

### Betroffene Dateien
- `apps/api/src/services/projects.service.ts` — `deleteProject`
- `apps/api/src/services/tasks.service.ts` — `deleteTask`
- `apps/api/src/services/features.service.ts` — `deleteFeature`
- `apps/api/src/services/use-cases.service.ts` — `deleteUseCase`
- `apps/api/src/services/tickets.service.ts` — `deleteTicket`
- `apps/api/src/services/backlog.service.ts` — `deleteBacklogItem`
- `apps/api/src/services/wiki.service.ts` — `deleteWikiPage`
- `apps/api/src/db/schema.ts` — Referenz für Tabellenstruktur

### Warum kaskadiert die DB nicht automatisch?

Die `comments`-Tabelle verwendet ein **duales Referenzmuster**:

```ts
// schema.ts
export const comments = sqliteTable("comments", {
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }), // nur für Tasks
  entityType: text("entity_type", { enum: COMMENT_ENTITY_TYPES }),  // polymorphisch
  entityId: integer("entity_id").notNull(),                          // kein FK!
  ...
});
```

`entityId` hat **keinen Foreign-Key-Constraint** — SQLite kann hier keine Cascade auslösen. Für alle Entity-Typen außer `task` (der über `taskId` kaskadiert) müssen Kommentare im Service-Code explizit gelöscht werden.

Die `notes`-Tabelle ist eigenständig und wird über Join-Tabellen verknüpft (`project_notes`, `task_notes`, `ticket_notes`). Die Join-Zeilen kaskadieren beim Löschen des Elternobjekts, der `notes`-Datensatz selbst aber nicht — er wird nie referenziert und bleibt als Waist zurück.

---

## Aufgabe

### 1. Hilfsfunktionen in bestehenden Services ergänzen

Ergänze in `projects.service.ts` (oder einem zentralen helpers-Modul) wiederverwendbare Funktionen:

```ts
// Löscht alle notes-Records, deren IDs über die Join-Tabelle gefunden werden
function deleteNotesByJoin(
  tx: DbClient,
  joinTable: typeof projectNotes | typeof taskNotes | typeof ticketNotes,
  fkColumn: ...,
  parentId: number
): void

// Löscht alle Kommentare für einen Entity-Typ und eine Entity-ID
function deleteCommentsByEntity(
  tx: DbClient,
  entityType: CommentEntityType,
  entityId: number
): void
```

Diese Funktionen **müssen innerhalb einer Transaktion** aufgerufen werden.

---

### 2. `deleteProject` — `projects.service.ts`

Erweitere die Funktion zu einer **Transaktion** mit folgender Reihenfolge:

```
database.transaction((tx) => {
  1. Alle BacklogItem-IDs des Projekts abfragen
  2. Kommentare (entityType="backlogItem") für diese IDs löschen
  3. Alle Ticket-IDs des Projekts abfragen (inkl. Sub-Tickets via Rekursion oder CTE)
  4. Kommentare (entityType="ticket") für diese IDs löschen
  5. Notes-Records via ticket_notes für diese Ticket-IDs löschen
  6. Task-IDs des Projekts abfragen (inkl. Sub-Tasks)
  7. Notes-Records via task_notes für diese Task-IDs löschen
  8. Notes-Records via project_notes für das Projekt löschen
  9. Kommentare (entityType="project") für das Projekt löschen
 10. database.delete(projects).where(eq(projects.id, id)) — DB-Cascade übernimmt den Rest
})
```

**Wichtig:** Notes und Kommentare **vor** dem Löschen des Projekts löschen, damit die ID-Abfragen noch Ergebnisse liefern. Das Löschen der Join-Tabelleneinträge (`project_notes`, `task_notes`, etc.) übernimmt die DB-Cascade.

---

### 3. `deleteTask` — `tasks.service.ts`

Erweitere zu einer Transaktion:

```
database.transaction((tx) => {
  1. Sub-Task-IDs abfragen (rekursiv, falls nötig)
  2. Notes-Records via task_notes für Sub-Task-IDs löschen
  3. Notes-Records via task_notes für den Task selbst löschen
  4. database.delete(tasks).where(eq(tasks.id, id)) — DB-Cascade übernimmt den Rest
})
```

Kommentare von Tasks werden bereits korrekt über den `taskId`-FK kaskadiert — hier ist **kein** manuelles Löschen nötig.

---

### 4. `deleteFeature` — `features.service.ts`

Die Funktion liest bereits UseCases vor dem Löschen. Ergänze:

```
1. UseCase-IDs abfragen
2. Kommentare (entityType="useCase") für diese IDs löschen
3. Kommentare (entityType="feature") für das Feature löschen
4. database.delete(features).where(eq(features.id, id)) — bestehende Logik beibehalten
5. Content-Dateien löschen (bereits vorhanden, beibehalten)
```

Alles muss in einer **Transaktion** ablaufen (DB-Delete + Kommentar-Deletes).

---

### 5. `deleteUseCase` — `use-cases.service.ts`

Ergänze vor dem DB-Delete:

```
1. Kommentare (entityType="useCase") für den UseCase löschen
2. database.delete(useCases).where(eq(useCases.id, id))
3. Content-Datei löschen (bereits vorhanden, beibehalten)
```

---

### 6. `deleteTicket` — `tickets.service.ts`

Erweitere zu einer Transaktion:

```
database.transaction((tx) => {
  1. Sub-Ticket-IDs abfragen (rekursiv)
  2. Kommentare (entityType="ticket") für Sub-Ticket-IDs löschen
  3. Notes-Records via ticket_notes für Sub-Ticket-IDs löschen
  4. Notes-Records via ticket_notes für das Ticket selbst löschen
  5. Kommentare (entityType="ticket") für das Ticket selbst löschen
  6. database.delete(tickets).where(eq(tickets.id, id))
})
```

---

### 7. `deleteBacklogItem` — `backlog.service.ts`

Ergänze vor dem DB-Delete:

```
1. Kommentare (entityType="backlogItem") für das BacklogItem löschen
2. database.delete(backlogItems).where(eq(backlogItems.id, id))
```

---

### 8. `deleteWikiPage` — `wiki.service.ts`

Ergänze vor dem DB-Delete:

```
1. Kommentare (entityType="wikiPage") für die WikiPage löschen
2. database.delete(wikiPages).where(eq(wikiPages.id, id))
3. Content-Datei löschen (bereits vorhanden, beibehalten)
```

---

## Regeln & Einschränkungen

- **Alle Änderungen müssen in Transaktionen** ablaufen — kein Teilzustand darf bei Fehlern in der DB bleiben.
- **Reihenfolge einhalten:** Abhängige Objekte (Kommentare, Notes) immer **vor** dem Elternobjekt löschen, damit die IDs noch abfragbar sind.
- **Keine neuen Tabellen oder Schema-Änderungen.** Das Schema bleibt unverändert.
- **Keine Breaking Changes an Service-Signaturen** — alle Funktionen behalten ihre Parameter und Return-Typen.
- Die bestehende Content-Datei-Bereinigung (`deleteContent(...)`) in features, use-cases und wiki **beibehalten und nicht anfassen**.
- **Sub-Entitäten rekursiv erfassen:** Beim Löschen eines Projekts müssen auch die BacklogItems, Tasks und Tickets der zweiten Ebene (Sub-Tasks, Sub-Tickets) berücksichtigt werden.

---

## Randfälle & Fehlerpfade

- **Keine Kommentare / Notes vorhanden:** `inArray(notes.id, [])` wirft in Drizzle einen Fehler oder liefert falsche Ergebnisse — guard mit `if (ids.length === 0) return` vor jedem `inArray`-Delete.
- **Projekt ohne Tasks / Tickets:** Abfragen liefern leere Arrays — Guards wie oben.
- **Feature ohne UseCases:** `linkedUseCases` ist leer — kein UseCase-Kommentar-Delete nötig, Guards setzen.
- **Nicht gefundene Entität:** Die bestehenden `notFound`-Würfe bleiben erhalten und funktionieren unverändert.
- **Transaktion schlägt fehl:** Durch den Transaktions-Wrapper rollt SQLite automatisch zurück — kein Teilzustand.

---

## Seiteneffekte

- **Keine Seiteneffekte auf andere Services:** Die Änderungen sind rein intern in den jeweiligen Service-Funktionen.
- **Physische Attachment-Dateien:** Das Löschen der Dateien auf Disk beim kaskadierenden Löschen (Projekt, Task, Ticket, Feature) ist ein **separates Problem** und ist in diesem Auftrag **nicht** enthalten. Es ist im Audit-Bericht (`DELETE_CASCADE_AUDIT.md`) als BUG 3 dokumentiert.
- **`setFeatureRelations`:** Das Problem mit einseitigem Löschen eingehender Relationen (BUG 4 im Audit) ist ebenfalls **nicht** Teil dieses Auftrags.

---

## Testhinweise

Die Test Suite liegt fertig vor:

```
apps/api/tests/integration/delete-cascade.test.ts
```

**Ausführung:**
```bash
cd apps/api
npx vitest run tests/integration/delete-cascade.test.ts --reporter=verbose
```

Alle Tests müssen grün sein. Die Tests sind in folgende Gruppen gegliedert:

| Gruppe | Anzahl Tests | Kern-Assertions |
|---|---|---|
| `deleteProject` | 13 | Tasks, Subtasks, Kommentare (project/backlogItem/ticket), Notes (project/task/ticket), Tags, BacklogItems, Tickets, Events (set null), WikiPages (set null), Features (Join only) |
| `deleteTask` | 7 | Subtasks, Kommentare (taskId-FK), Notes, Tags, task_features, task_use_cases |
| `deleteFeature` | 8 | UseCases, Kommentare (feature/useCase), task_use_cases, feature_relations (beide Seiten), task_features, project_features, backlogItems (set null) |
| `deleteUseCase` | 3 | Kommentare (useCase), task_use_cases, backlogItems (set null) |
| `deleteTicket` | 7 | Sub-Tickets, Kommentare (ticket), Notes (ticket/sub-ticket), ticket_relations (beide Seiten), Tags |
| `deleteBacklogItem` | 1 | Kommentare (backlogItem) |
| `deleteWikiPage` | 2 | Kommentare (wikiPage), restrict bei Kindern |
| `deleteTag` | 3 | project_tags, task_tags, ticket_tags |
| Isolationstests | 4 | Keine Seiteneffekte auf unbeteiligte Objekte |

**Importpfade in den Tests** (zur Orientierung):
```ts
import { comments, notes, ... } from "../../src/db/schema.js";
import { eq, and } from "drizzle-orm";
// testDb.db.select().from(comments).where(...).all() — Direktzugriff auf DB
```

---

## Befund-Zusammenfassung (aus Audit `DELETE_CASCADE_AUDIT.md`)

### Was die DB bereits korrekt kaskadiert (nicht anfassen)

- `tasks.projectId` → `onDelete: cascade` ✅
- `tasks.parentId` → `onDelete: cascade` (Sub-Tasks) ✅
- `comments.taskId` → `onDelete: cascade` ✅
- `task_tags`, `project_tags`, `ticket_tags` → alle mit `onDelete: cascade` ✅
- `task_notes`, `project_notes`, `ticket_notes` Join-Zeilen → `onDelete: cascade` ✅
- `task_features`, `task_use_cases`, `project_features` → `onDelete: cascade` ✅
- `feature_relations.sourceFeatureId` + `.targetFeatureId` → beide `onDelete: cascade` ✅
- `ticket_relations.sourceTicketId` + `.targetTicketId` → beide `onDelete: cascade` ✅
- `tickets.projectId` → `onDelete: cascade` ✅
- `tickets.parentId` → `onDelete: cascade` (Sub-Tickets) ✅
- `backlog_items.projectId` → `onDelete: cascade` ✅
- `events.projectId` → `onDelete: set null` ✅
- `wiki_pages.projectId` → `onDelete: set null` ✅
- `wiki_pages.parentId` → `onDelete: restrict` ✅
- `backlog_items.featureId` / `useCaseId` → `onDelete: set null` ✅

### Was fehlt (diese Aufgabe)

| Bug | Entität | Problem |
|---|---|---|
| BUG 1 | Alle außer Task | `comments.entityId` ohne FK — Kommentare für project, feature, useCase, backlogItem, wikiPage, ticket werden nicht kaskadiert |
| BUG 2 | Project, Task, Ticket | `notes`-Record bleibt beim Löschen des Elternobjekts erhalten — nur Join-Zeile wird kaskadiert |

### Nicht in diesem Auftrag (Folgeaufgaben)

| Bug | Beschreibung |
|---|---|
| BUG 3 | Physische Attachment-Dateien auf Disk bleiben beim kaskadierenden Löschen erhalten |
| BUG 4 | `setFeatureRelations` löscht nur ausgehende Relationen, nicht eingehende |
