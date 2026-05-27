# Codex-Auftrag: Tagesplanung-Ebene einführen (day_plans)

**Parent:** MILE-20 — Refactoring Kalender/Planungs Sichten  
**Datum:** 2026-05-27  
**Aufgaben-ID:** TASK-96

---

## Ziel

Eine neue, eigenständige Tagesplan-Ebene in die App einführen. Nutzer sollen Tasks und Events für einen bestimmten Kalendertag anlegen können, ohne einen Projektkontext wählen zu müssen. Die neue Ebene wird als eigener Top-Level-Navigationspunkt in der UI verankert und ist vollständig CRUD-fähig.

---

## Hintergrund & Kontext

Die App ist aktuell strikt projektzentriert. Tasks und Events existieren immer als Kind eines Projekts oder Meilensteins — die zugehörigen Join-Tabellen (`projectTasks`, `milestoneTasks`, `projectEvents` usw.) erzwingen diesen Bezug auf UI-Ebene. Das Schema selbst lässt jedoch „orphane" Tasks und Events zu, da die `tasks`- und `events`-Tabellen keine direkten `projectId`-Felder besitzen.

Die neue `day_plans`-Tabelle schafft einen eigenständigen Container auf Tagesebene. Ein Tagesplan gehört einem Nutzer und einem Datum. Er kann Tasks und Events besitzen, die keinem Projekt angehören. Elemente im Tagesplan können nachträglich optional einem Projekt zugeordnet werden — der Tagesbezug bleibt dabei erhalten.

**Architekturentscheidung:** Wir verwenden Option B (eigener `day_plans`-Datensatz) statt einer reinen View-Lösung, weil der Tag als planbare Einheit im System eine eigene Identität benötigt — mit Status, Notizen und der Möglichkeit, ihn wieder aufzurufen.

---

## Aufgabe

### 1. Schema erweitern (`apps/api/src/db/schema.ts`)

Neue Tabellen hinzufügen:

```ts
export const DAY_PLAN_STATUSES = ["open", "completed"] as const;

export const dayPlans = sqliteTable("day_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),           // ISO-Format: YYYY-MM-DD
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: DAY_PLAN_STATUSES }).notNull().default("open"),
  notes: text("notes"),
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
}, (table) => ({
  dayPlansUserDateUnique: uniqueIndex("day_plans_user_date_unique").on(table.userId, table.date)
}));

export const dayPlanTasks = sqliteTable("day_plan_tasks", {
  ownerId: integer("owner_id")
    .notNull()
    .references(() => dayPlans.id, { onDelete: "cascade" }),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  position: real("position").notNull().default(0)
}, (table) => ({
  dayPlanTaskUnique: uniqueIndex("day_plan_tasks_owner_task_unique").on(table.ownerId, table.taskId)
}));

export const dayPlanEvents = sqliteTable("day_plan_events", {
  ownerId: integer("owner_id")
    .notNull()
    .references(() => dayPlans.id, { onDelete: "cascade" }),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  position: real("position").notNull().default(0)
}, (table) => ({
  dayPlanEventUnique: uniqueIndex("day_plan_events_owner_event_unique").on(table.ownerId, table.eventId)
}));
```

`JOURNAL_OBJECT_TYPES` um `"dayPlan"` erweitern.

### 2. Migration erstellen

Neue Drizzle-Migration generieren und prüfen. Keine bestehenden Tabellen anfassen.

### 3. Repository anlegen (`apps/api/src/repositories/day-plan.repository.ts`)

Methoden:
- `findByUserAndDate(userId, date)` — gibt Tagesplan mit Tasks und Events zurück, oder `null`
- `findOrCreateByUserAndDate(userId, date)` — legt Tagesplan an falls nicht vorhanden
- `addTask(dayPlanId, taskId, position?)` — Task in Join-Tabelle eintragen
- `removeTask(dayPlanId, taskId)`
- `addEvent(dayPlanId, eventId, position?)` — Event in Join-Tabelle eintragen
- `removeEvent(dayPlanId, eventId)`
- `updateStatus(dayPlanId, status, updatedBy)`
- `updateNotes(dayPlanId, notes, updatedBy)`

### 4. API-Routen anlegen (`apps/api/src/routes/day-plans.ts`)

Endpunkte:

| Method | Path | Beschreibung |
|--------|------|--------------|
| GET | `/api/day-plans/:date` | Tagesplan für eingeloggten User + Datum laden (ggf. anlegen) |
| PATCH | `/api/day-plans/:date` | Status oder Notizen aktualisieren |
| POST | `/api/day-plans/:date/tasks` | Neue Task erstellen und direkt zum Tagesplan hinzufügen |
| POST | `/api/day-plans/:date/tasks/:taskId` | Bestehende Task zum Tagesplan hinzufügen |
| DELETE | `/api/day-plans/:date/tasks/:taskId` | Task aus Tagesplan entfernen (Task bleibt erhalten) |
| POST | `/api/day-plans/:date/events` | Neues Event erstellen und direkt zum Tagesplan hinzufügen |
| POST | `/api/day-plans/:date/events/:eventId` | Bestehendes Event zum Tagesplan hinzufügen |
| DELETE | `/api/day-plans/:date/events/:eventId` | Event aus Tagesplan entfernen (Event bleibt erhalten) |

Datum-Parameter immer als `YYYY-MM-DD` validieren (Zod). Route in `app.ts` registrieren.

### 5. Frontend — Tagesplan-Seite

Neuen Top-Level-Navigationspunkt „Tagesplan" anlegen. Die Seite:
- Zeigt standardmäßig den heutigen Tag
- Ermöglicht Navigation zu anderen Tagen (Vor/Zurück-Buttons, Datepicker)
- Listet Tasks des Tages mit Checkbox (Status toggle)
- Listet Events des Tages mit Uhrzeit
- Ermöglicht neue Task / neues Event direkt auf der Seite anzulegen (kein Projekt-Pflichtfeld)
- Kein Projekt-Kontext sichtbar — sofern eine Task später einem Projekt zugeordnet wird, bleibt sie im Tagesplan und zeigt optional ein diskretes Projekt-Badge

---

## Technische Leitplanken

- **Kein Breaking Change** an bestehenden Endpoints oder Tabellen
- **Drizzle-Konventionen** einhalten: neues Schema in `schema.ts`, Migration generieren, Repository-Pattern
- **Auth**: Alle Day-Plan-Endpunkte benötigen authentifizierten User — `userId` immer aus Session, nie aus Request-Body
- **Datum immer als ISO-String** (`YYYY-MM-DD`) in der DB und API — keine JS-Date-Objekte in der Datenschicht
- **Journal**: Schreib-Operationen auf `dayPlans` in `journalEntries` festhalten (objectType: `"dayPlan"`)

---

## Regeln & Randfälle

- Pro User und Datum existiert maximal **ein** Tagesplan (Unique-Constraint in DB)
- `GET /api/day-plans/:date` ist idempotent und legt den Plan bei Bedarf still an (`findOrCreate`)
- Tasks und Events im Tagesplan können gleichzeitig einem Projekt angehören — kein Konflikt, beide Join-Tabellen dürfen einen Eintrag für dasselbe Objekt haben
- Löschen einer Task/eines Events aus dem Tagesplan entfernt nur den Join-Eintrag, das Objekt selbst bleibt erhalten
- Ungültige Datumsformate (`2026-13-01`, `foo`) → 400 Bad Request

---

## Seiteneffekte

- `JOURNAL_OBJECT_TYPES` in `schema.ts` muss `"dayPlan"` enthalten — Journal-Infrastruktur anpassen
- Navigation im Frontend erweitern (neuer Route + Nav-Eintrag)
- `app.ts` um neue Route ergänzen

---

## Testanforderungen

**Unit Tests (Repository):**
- `findOrCreateByUserAndDate` legt nur einen Datensatz an bei mehrfachem Aufruf
- `addTask` / `removeTask` schreiben korrekt in Join-Tabelle
- Datum-Validierung schlägt bei ungültigem Format fehl

**Integration Tests (API):**
- `GET /api/day-plans/2026-05-27` gibt 200 zurück und legt Plan an wenn nicht vorhanden
- Zweiter Aufruf gibt denselben Plan zurück (Idempotenz)
- `POST .../tasks` erstellt Task ohne Projektbezug und verknüpft sie mit dem Plan
- `DELETE .../tasks/:id` entfernt nur den Join, Task existiert weiterhin
- Ungültiges Datum → 400

---

## Abnahmekriterien

- [ ] Navigationsmenü zeigt „Tagesplan"-Eintrag
- [ ] Beim Öffnen des heutigen Tages wird eine leere Planung angezeigt (kein Fehler, kein Projekt nötig)
- [ ] Task kann direkt im Tagesplan angelegt werden — kein Projektfeld sichtbar oder pflicht
- [ ] Event kann direkt im Tagesplan angelegt werden
- [ ] Tagesplan für gestern ist über Navigation erreichbar
- [ ] Task aus Tagesplan entfernen löscht nicht die Task selbst
- [ ] Alle Integration-Tests grün
