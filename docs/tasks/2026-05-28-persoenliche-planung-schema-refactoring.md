# Codex-Auftrag: Schema-Refactoring day_plan_notes + day_plan_comments

**Datum:** 2026-05-28
**Projekt:** PROJ-3 (Projekt Manager App)
**Meilenstein:** Persönliche Planung (Umbau)
**Feature:** FEAT-42 — Tagesplanung / Persönliche Planung

---

## Ziel

Das `notes`-Textfeld auf der `day_plans`-Tabelle ist ein Sonderfall: Alle anderen Entitäten (Projekt, Meilenstein, Task …) verwalten Notizen über eine Join-Tabelle auf die zentrale `notes`-Tabelle. Dasselbe gilt für Kommentare. Dieser Auftrag bringt `day_plans` auf denselben Stand:

- `day_plans.notes` (text) → entfernen
- Neue Join-Tabelle `day_plan_notes` (wie `task_notes`, `milestone_notes` etc.)
- Neue Join-Tabelle `day_plan_comments` (wie `task_comments`, `milestone_comments` etc.)

---

## Kontext & Muster

### Bestehendes Notizen-Muster (Referenz: `task_notes`)

```ts
// schema.ts
export const taskNotes = sqliteTable("task_notes", {
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  noteId: integer("note_id").notNull().references(() => notes.id, { onDelete: "cascade" })
});
```

### Bestehendes Kommentar-Muster (Referenz: `task_comments`)

```ts
// schema.ts
export const taskComments = sqliteTable(
  "task_comments",
  {
    taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    commentId: integer("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" })
  },
  (table) => ({
    taskCommentUnique: uniqueIndex("task_comments_parent_comment_unique").on(table.taskId, table.commentId)
  })
);
```

---

## Aufgaben

### 1. `apps/api/src/db/schema.ts`

- Feld `notes: text("notes")` aus der `dayPlans`-Tabelle entfernen
- Join-Tabelle `dayPlanNotes` analog zu `taskNotes` hinzufügen
- Join-Tabelle `dayPlanComments` analog zu `taskComments` hinzufügen (mit UniqueIndex)

### 2. Migration `apps/api/src/db/migrations/0032_day_plan_notes_comments.sql`

```sql
-- Notizen-Feld entfernen (SQLite: Tabelle neu erstellen ohne das Feld)
CREATE TABLE day_plans_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  version INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO day_plans_new SELECT id, date, user_id, status, version, created_by, updated_by, created_at, updated_at FROM day_plans;
DROP TABLE day_plans;
ALTER TABLE day_plans_new RENAME TO day_plans;
CREATE UNIQUE INDEX day_plans_user_date_unique ON day_plans(user_id, date);
CREATE INDEX day_plans_date_idx ON day_plans(date);

-- Neue Join-Tabellen
CREATE TABLE day_plan_notes (
  day_plan_id INTEGER NOT NULL REFERENCES day_plans(id) ON DELETE CASCADE,
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE
);

CREATE TABLE day_plan_comments (
  day_plan_id INTEGER NOT NULL REFERENCES day_plans(id) ON DELETE CASCADE,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  CONSTRAINT day_plan_comments_owner_comment_unique UNIQUE (day_plan_id, comment_id)
);
```

### 3. `apps/api/src/repositories/day-plan.repository.ts`

- Alle Stellen entfernen, die `notes` aus `dayPlans` lesen/schreiben
- Neue Methoden analog zum bestehenden Muster hinzufügen:
  - `addNote(dayPlanId, noteId)` / `removeNote(dayPlanId, noteId)` / `listNotes(dayPlanId)`
  - `addComment(dayPlanId, commentId)` / `removeComment(dayPlanId, commentId)` / `listComments(dayPlanId)`
- `findByDate` und `getById` dürfen `notes` nicht mehr im Select-Shape enthalten

### 4. `apps/api/src/services/day-plan.service.ts`

- `notes`-Feld aus `DayPlanPatchInput`-Verarbeitung entfernen
- Service-Methoden für Note- und Comment-Operationen hinzufügen (mit Journal-Integration analog zu anderen Entitäten)

### 5. `apps/api/src/routes/day-plans.ts`

- Endpunkte für Notes hinzufügen:
  - `POST /api/day-plans/:id/notes` — Note verknüpfen
  - `DELETE /api/day-plans/:id/notes/:noteId` — Note lösen
- Endpunkte für Comments hinzufügen:
  - `POST /api/day-plans/:id/comments` — Kommentar anlegen und verknüpfen
  - `DELETE /api/day-plans/:id/comments/:commentId` — Kommentar lösen
- `PATCH`-Handler: `notes`-Feld aus dem Body-Parsing entfernen

### 6. `packages/shared-types/src/index.ts`

- `DayPlan`-Typ: `notes?: string` entfernen
- `DayPlanPatchInput`: `notes?: string` entfernen
- Sicherstellen dass `"dayPlans"` bereits in `JOURNAL_OBJECT_TYPES` eingetragen ist (bereits der Fall)

### 7. Frontend: `apps/web/src/api/day-plans.ts` + `apps/web/src/hooks/useDayPlan.ts`

- `notes`-Feld aus API-Calls und Hook-State entfernen
- Neue API-Funktionen für Note- und Comment-Operationen analog zum Muster anderer Entitäten

### 8. Tests: `tests/integration/api/day-plans.test.ts`

- Test für `notes`-Patch entfernen oder anpassen
- Tests für Note-Attach / Note-Detach / Comment-Attach / Comment-Detach hinzufügen (mit echter DB, echtem Auth — analog zu bestehenden Tests in der Datei)

---

## Abhängigkeiten

- Dieser Auftrag ist Voraussetzung für:
  - **Auftrag 2** (noteList-Widget) — das Widget braucht den `day_plan_notes`-Endpunkt
  - **Auftrag 3** (Persönliche Planung Dashboard) — die Tabs Notizen/Kommentare brauchen die neuen Endpunkte

---

## Akzeptanzkriterien

- `tsc` läuft ohne Fehler durch
- Alle bestehenden Integration-Tests bleiben grün
- Neue Tests für Note- und Comment-Operationen sind grün
- `day_plans.notes` existiert weder im Schema noch in der Migrations-Zieldatenbank
- `day_plan_notes` und `day_plan_comments` sind korrekt befüllt und kaskadieren bei Löschung
