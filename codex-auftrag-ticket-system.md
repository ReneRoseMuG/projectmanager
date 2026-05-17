# Codex-Auftrag: Ticket- & Bug-Tracking-System

> **Erstellt:** 2026-05-17  
> **Ziel:** Vollständige Implementierung eines Ticket-/Bug-Tracking-Systems als dritte Kerndomäne der MugPlan-App.

---

## ⚙️ Arbeitsprotokoll — Pflichtlektüre vor dem Start

- **Jeden Schritt vollständig abschließen**, bevor der nächste beginnt. Kein Schritt darf mittendrin abgebrochen werden.
- **Tritt ein Fehler oder Blocker auf**, notiere ihn sofort in `codex-blocker-log.md` im Projektstamm (Format unten) und **arbeite trotzdem weiter**. Nicht anhalten, nicht auf Bestätigung warten.
- **TypeScript-Fehler** nach jedem Backend-Schritt: `cd apps/api && npx tsc --noEmit` ausführen. Fehler ins Blocker-Log schreiben, aber weitermachen.
- **Tests** dürfen am Ende eines Schritts fehlschlagen, wenn sie sich auf noch nicht implementierte Schritte beziehen — solche Fehler ebenfalls nur loggen.
- **Keine bestehenden Dateien löschen** ohne expliziten Auftrag in diesem Dokument.
- **Am Ende** (nach Schritt 11): `codex-abschlussbericht.md` im Projektstamm erstellen.

### Format `codex-blocker-log.md`
```
## Blocker #1
- Schritt: [Schritt-Nummer und Titel]
- Datei: [Dateiname]
- Problem: [Kurzbeschreibung]
- Aktion: [Was wurde stattdessen gemacht oder übersprungen]
```

### Format `codex-abschlussbericht.md`
```
## Erledigte Schritte ✅
## Übersprungene / teilweise abgeschlossene Schritte ⚠️
## Offene Blocker 🔴
## Empfehlungen / Hinweise
```

---

## 🎯 Ziel

Tickets sind die dritte Kern-Entität der App neben **Tasks** (Projektdurchführung) und **Features** (Dokumentation/Lastenheft). Ein Ticket repräsentiert einen Bug, eine Verbesserung, eine Frage oder eine technische Aufgabe, die immer einem Projekt zugeordnet ist. Tickets teilen die bestehende Infrastruktur für Kommentare, Anhänge, Notizen und Tags.

**Neue Entitäten:** `tickets`, `ticket_relations`, `ticketTags`, `ticketNotes`  
**Erweiterte Entitäten:** `attachments` (+`ticketId`), `COMMENT_ENTITY_TYPES` (+`"ticket"`)  
**Neue Routen:** `/api/projects/:id/tickets`, `/api/tickets/:id`, `/api/tickets/:id/relations`, …  
**Neue Seiten:** `/tickets` (projektübergreifend), Ticket-Tab in ProjectDetailPage

---

## 📐 Architektur-Kontext

```
apps/
  api/
    src/
      db/
        schema.ts          ← zentrale Drizzle-Schema-Datei
        migrations/        ← SQL-Migrations via drizzle-kit
      routes/              ← Fastify-Routes (eine Datei pro Domäne)
      services/            ← Business-Logik (eine Datei pro Domäne)
      types.ts             ← interne API-Typen
    tests/
      helpers/
        factories.ts       ← Testhelfer-Factories (analog zu createTask, createProject)
        index.ts           ← Re-Exports
      integration/         ← Integrationstests (eine Datei pro Domäne)
  web/
    src/
      api/                 ← Fetch-Wrapper (eine Datei pro Domäne)
      components/
        tickets/           ← neu anlegen
      hooks/               ← React Query Hooks
      pages/               ← Seitenkomponenten
packages/
  shared-types/src/        ← gemeinsame TypeScript-Typen (index.ts + index.js + index.js.map)
```

**Wichtige Konventionen (aus bestehendem Code abgeleitet):**
- Services: synchrone Drizzle-Queries mit `database.select().from(...).where(...).get()` / `.all()`
- Routes: Fastify mit JSON-Schema-Validierung, Typen aus `@taskmanager/shared-types`
- Enums: in `schema.ts` als `as const`-Arrays, dann in Routes direkt referenziert
- Tests: Vitest + Supertest, `beforeEach(() => truncateAll(testDb.sqlite))`
- Alle Timestamps: ISO-String (`text`), Default `sql\`(datetime('now'))\``
- Positions für Drag&Drop: `real("position")` mit Startwert 1024, Inkrement 1024

---

## Schritt 1 — Datenbankschema & Migration

**Ziel:** Neue Tabellen und Spalten im Schema definieren, Migration generieren und anwenden.

### 1.1 — `apps/api/src/db/schema.ts` erweitern

Am Ende der Datei (nach `taskUseCases`) folgende Konstanten und Tabellen **ergänzen**:

```typescript
// Neue Enums
export const TICKET_TYPES = ["bug", "improvement", "question", "task"] as const;
export const TICKET_STATUSES = ["open", "in_progress", "in_review", "resolved", "closed"] as const;
export const TICKET_SEVERITIES = ["critical", "major", "minor", "trivial"] as const;
export const TICKET_RESOLUTIONS = ["fixed", "wont_fix", "duplicate", "cant_reproduce", "by_design"] as const;
export const TICKET_RELATION_TYPES = ["blocks", "related", "duplicate"] as const;

// Haupttabelle
export const tickets = sqliteTable("tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  parentId: integer("parent_id").references((): AnySQLiteColumn => tickets.id, { onDelete: "cascade" }),
  type: text("type", { enum: TICKET_TYPES }).notNull().default("bug"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: TICKET_STATUSES }).notNull().default("open"),
  priority: text("priority", { enum: PRIORITIES }).notNull().default("medium"),
  severity: text("severity", { enum: TICKET_SEVERITIES }),
  resolution: text("resolution", { enum: TICKET_RESOLUTIONS }),
  reporter: text("reporter"),
  assignee: text("assignee"),
  environment: text("environment"),
  affectedVersion: text("affected_version"),
  dueDate: text("due_date"),
  resolvedAt: text("resolved_at"),
  position: real("position").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`)
});

// Relationen zwischen Tickets
export const ticketRelations = sqliteTable(
  "ticket_relations",
  {
    seedRunId: text("seed_run_id").references(() => seedRuns.id),
    sourceTicketId: integer("source_ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    targetTicketId: integer("target_ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    relationType: text("relation_type", { enum: TICKET_RELATION_TYPES }).notNull().default("related"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    ticketRelationUnique: uniqueIndex("ticket_relations_source_target_type_unique").on(
      table.sourceTicketId, table.targetTicketId, table.relationType
    ),
    noSelfRelation: check(
      "ticket_relations_no_self_relation",
      sql`${table.sourceTicketId} <> ${table.targetTicketId}`
    )
  })
);

// Join-Tabellen
export const ticketTags = sqliteTable("ticket_tags", {
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" })
});

export const ticketNotes = sqliteTable("ticket_notes", {
  seedRunId: text("seed_run_id").references(() => seedRuns.id),
  ticketId: integer("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  noteId: integer("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" })
});
```

### 1.2 — `COMMENT_ENTITY_TYPES` erweitern

Die bestehende Konstante in `schema.ts` **ersetzen**:

```typescript
// ALT:
export const COMMENT_ENTITY_TYPES = ["task", "feature", "project", "useCase", "backlogItem", "wikiPage"] as const;

// NEU:
export const COMMENT_ENTITY_TYPES = ["task", "feature", "project", "useCase", "backlogItem", "wikiPage", "ticket"] as const;
```

### 1.3 — `attachments`-Tabelle: `ticketId`-Spalte ergänzen

Die Tabelle `attachments` in `schema.ts` erhält eine neue Spalte und eine aktualisierte CHECK-Constraint. Da SQLite keine `ALTER TABLE ... ADD CONSTRAINT` unterstützt, muss die Tabelle neu erstellt werden.

**Ersetze die gesamte `attachments`-Tabellendefinition** durch:

```typescript
export const attachments = sqliteTable(
  "attachments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seedRunId: text("seed_run_id").references(() => seedRuns.id),
    projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
    taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    featureId: integer("feature_id").references(() => features.id, { onDelete: "cascade" }),
    ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    filename: text("filename").notNull(),
    mimetype: text("mimetype").notNull(),
    size: integer("size").notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`)
  },
  (table) => ({
    ownerCheck: check(
      "attachments_exactly_one_owner",
      sql`(${table.projectId} is not null and ${table.taskId} is null and ${table.featureId} is null and ${table.ticketId} is null)
       or (${table.projectId} is null and ${table.taskId} is not null and ${table.featureId} is null and ${table.ticketId} is null)
       or (${table.projectId} is null and ${table.taskId} is null and ${table.featureId} is not null and ${table.ticketId} is null)
       or (${table.projectId} is null and ${table.taskId} is null and ${table.featureId} is null and ${table.ticketId} is not null)`
    )
  })
);
```

### 1.4 — Migration generieren und anwenden

```bash
cd apps/api
npx drizzle-kit generate
npx drizzle-kit migrate
```

Falls `drizzle-kit` die `attachments`-Tabelle nicht automatisch mit Tabellen-Rebuild migriert (SQLite-Einschränkung), die generierte SQL-Migration manuell prüfen. Falls nötig, die Migration manuell korrigieren:

```sql
-- In der generierten Migration prüfen ob vorhanden, sonst manuell ergänzen:
PRAGMA foreign_keys=OFF;
CREATE TABLE attachments_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seed_run_id TEXT REFERENCES seed_runs(id),
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  feature_id INTEGER REFERENCES features(id) ON DELETE CASCADE,
  ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  mimetype TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (project_id is not null and task_id is null and feature_id is null and ticket_id is null)
    or (project_id is null and task_id is not null and feature_id is null and ticket_id is null)
    or (project_id is null and task_id is null and feature_id is not null and ticket_id is null)
    or (project_id is null and task_id is null and feature_id is null and ticket_id is not null)
  )
);
INSERT INTO attachments_new SELECT id, seed_run_id, project_id, task_id, feature_id, NULL, original_name, filename, mimetype, size, created_at FROM attachments;
DROP TABLE attachments;
ALTER TABLE attachments_new RENAME TO attachments;
PRAGMA foreign_keys=ON;
```

### ✅ Abnahmekriterien Schritt 1

- [ ] `npx drizzle-kit migrate` läuft ohne Fehler durch
- [ ] Tabellen `tickets`, `ticket_relations`, `ticket_tags`, `ticket_notes` existieren in der DB
- [ ] `attachments` hat Spalte `ticket_id`
- [ ] `npx tsc --noEmit` in `apps/api` ohne Schema-Fehler

---

## Schritt 2 — Shared Types

**Ziel:** TypeScript-Typen für das Frontend und Backend in `packages/shared-types/src/index.ts` ergänzen. Danach Package neu bauen.

### 2.1 — `packages/shared-types/src/index.ts`

Falls noch keine `index.ts` existiert, prüfe ob `index.js` die alleinige Quelle ist und ergänze entsprechend. Ergänze folgende Typen am Ende der Datei:

```typescript
// ─── Tickets ─────────────────────────────────────────────────────────────────

export type TicketType = "bug" | "improvement" | "question" | "task";
export type TicketStatus = "open" | "in_progress" | "in_review" | "resolved" | "closed";
export type TicketSeverity = "critical" | "major" | "minor" | "trivial";
export type TicketResolution = "fixed" | "wont_fix" | "duplicate" | "cant_reproduce" | "by_design";
export type TicketRelationType = "blocks" | "related" | "duplicate";

export interface Ticket {
  id: number;
  projectId: number;
  parentId: number | null;
  type: TicketType;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: "low" | "medium" | "high" | "urgent";
  severity: TicketSeverity | null;
  resolution: TicketResolution | null;
  reporter: string | null;
  assignee: string | null;
  environment: string | null;
  affectedVersion: string | null;
  dueDate: string | null;
  resolvedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  subTicketCount: number;
}

export interface TicketDetail extends Ticket {
  comments: Comment[];
  notes: Note[];
  attachments: Attachment[];
  relations: TicketRelationEntry[];
  subTickets: Ticket[];
}

export interface TicketRelationEntry {
  id: number;
  relationType: TicketRelationType;
  ticket: Ticket;   // das verknüpfte Ticket (Quelle oder Ziel)
  direction: "outgoing" | "incoming"; // blocks → outgoing; blocked_by → incoming
}

export interface TicketInput {
  title: string;
  type?: TicketType;
  description?: string | null;
  status?: TicketStatus;
  priority?: "low" | "medium" | "high" | "urgent";
  severity?: TicketSeverity | null;
  reporter?: string | null;
  assignee?: string | null;
  environment?: string | null;
  affectedVersion?: string | null;
  dueDate?: string | null;
}

export type TicketUpdate = Partial<TicketInput> & {
  resolution?: TicketResolution | null;
  resolvedAt?: string | null;
};

export interface TicketPositionInput {
  status: TicketStatus;
  position: number;
}

export interface TicketRelationInput {
  targetTicketId: number;
  relationType: TicketRelationType;
}
```

### 2.2 — Package neu bauen

```bash
cd packages/shared-types
npm run build   # oder: npx tsc
```

### ✅ Abnahmekriterien Schritt 2

- [ ] `packages/shared-types` baut ohne Fehler
- [ ] `Ticket`, `TicketDetail`, `TicketInput`, `TicketUpdate` sind exportiert
- [ ] `TicketRelationEntry` mit `direction`-Feld ist exportiert

---

## Schritt 3 — Backend: Tickets Service

**Ziel:** `apps/api/src/services/tickets.service.ts` neu anlegen. Orientierung an `tasks.service.ts`.

### 3.1 — `apps/api/src/services/tickets.service.ts`

```typescript
import type { Ticket, TicketDetail, TicketInput, TicketPositionInput, TicketRelationEntry, TicketRelationInput, TicketUpdate } from "@taskmanager/shared-types";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import type { DbClient } from "../db/client.js";
import { projects, ticketRelations, tickets, ticketTags, tags } from "../db/schema.js";
import { badRequest, notFound } from "../utils/errors.js";
import { listTicketAttachments } from "./attachments.service.js";    // wird in Schritt 5 ergänzt
import { listComments } from "./comments.service.js";
import { cleanNullable, nowIso, requireNonEmpty } from "./helpers.js";
import { listTicketNotes } from "./notes.service.js";               // wird in Schritt 5 ergänzt
import { getTicketTags, getTicketTagsMap } from "./tags.service.js"; // wird in Schritt 5 ergänzt
```

**Hilfsfunktionen (analog zu tasks.service.ts):**

```typescript
type TicketRecord = typeof tickets.$inferSelect;

function ensureProjectExists(database: DbClient, projectId: number): void {
  const project = database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get();
  if (!project) throw notFound(`Project with id ${projectId} not found`);
}

function getTicketRecord(database: DbClient, id: number): TicketRecord {
  const ticket = database.select().from(tickets).where(eq(tickets.id, id)).get();
  if (!ticket) throw notFound(`Ticket with id ${id} not found`);
  return ticket;
}

function getSubTicketCounts(database: DbClient, ticketIds: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  if (ticketIds.length === 0) return counts;
  const rows = database.select({ parentId: tickets.parentId }).from(tickets).where(inArray(tickets.parentId, ticketIds)).all();
  for (const row of rows) {
    if (row.parentId !== null) counts.set(row.parentId, (counts.get(row.parentId) ?? 0) + 1);
  }
  return counts;
}

function nextPosition(database: DbClient, projectId: number, status: TicketRecord["status"], parentId: number | null): number {
  const where = parentId === null
    ? and(eq(tickets.projectId, projectId), eq(tickets.status, status), isNull(tickets.parentId))
    : and(eq(tickets.projectId, projectId), eq(tickets.status, status), eq(tickets.parentId, parentId));
  const positions = database.select({ position: tickets.position }).from(tickets).where(where).all();
  const max = positions.reduce((curr, row) => Math.max(curr, row.position), 0);
  return max + 1024;
}

export function mapTicket(
  database: DbClient,
  record: TicketRecord,
  tagsVal = getTicketTags(database, record.id),
  subTicketCount = getSubTicketCounts(database, [record.id]).get(record.id) ?? 0
): Ticket {
  return {
    id: record.id,
    projectId: record.projectId,
    parentId: record.parentId,
    type: record.type,
    title: record.title,
    description: record.description,
    status: record.status,
    priority: record.priority,
    severity: record.severity,
    resolution: record.resolution,
    reporter: record.reporter,
    assignee: record.assignee,
    environment: record.environment,
    affectedVersion: record.affectedVersion,
    dueDate: record.dueDate,
    resolvedAt: record.resolvedAt,
    position: record.position,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    tags: tagsVal,
    subTicketCount
  };
}
```

**Exportierte Service-Funktionen:**

```typescript
// Alle Tickets abrufen
export function listTickets(database: DbClient): Ticket[] {
  const rows = database.select().from(tickets).where(isNull(tickets.parentId)).all();
  if (rows.length === 0) return [];
  const ids = rows.map(r => r.id);
  const tagsMap = getTicketTagsMap(database, ids);
  const subCounts = getSubTicketCounts(database, ids);
  return rows.map(r => mapTicket(database, r, tagsMap.get(r.id) ?? [], subCounts.get(r.id) ?? 0));
}

// Tickets eines Projekts abrufen (nur Top-Level)
export function listProjectTickets(database: DbClient, projectId: number): Ticket[] {
  ensureProjectExists(database, projectId);
  const rows = database.select().from(tickets)
    .where(and(eq(tickets.projectId, projectId), isNull(tickets.parentId)))
    .all();
  if (rows.length === 0) return [];
  const ids = rows.map(r => r.id);
  const tagsMap = getTicketTagsMap(database, ids);
  const subCounts = getSubTicketCounts(database, ids);
  return rows.map(r => mapTicket(database, r, tagsMap.get(r.id) ?? [], subCounts.get(r.id) ?? 0));
}

// Sub-Tickets eines Tickets
export function listSubTickets(database: DbClient, parentId: number): Ticket[] {
  getTicketRecord(database, parentId); // wirft 404 wenn nicht gefunden
  const rows = database.select().from(tickets).where(eq(tickets.parentId, parentId)).all();
  if (rows.length === 0) return [];
  const ids = rows.map(r => r.id);
  const tagsMap = getTicketTagsMap(database, ids);
  return rows.map(r => mapTicket(database, r, tagsMap.get(r.id) ?? [], 0));
}

// Detail-View eines Tickets
export function getTicketDetail(database: DbClient, id: number): TicketDetail {
  const record = getTicketRecord(database, id);
  const ticket = mapTicket(database, record);
  const comments = listComments(database, "ticket", id);
  const notes = listTicketNotes(database, id);
  const attachments = listTicketAttachments(database, id);
  const relations = listTicketRelations(database, id);
  const subTickets = listSubTickets(database, id);
  return { ...ticket, comments, notes, attachments, relations, subTickets };
}

// Ticket anlegen
export function createTicket(database: DbClient, projectId: number, input: TicketInput): Ticket {
  ensureProjectExists(database, projectId);
  requireNonEmpty(input.title, "title");
  const status = input.status ?? "open";
  const position = nextPosition(database, projectId, status, null);
  const now = nowIso();
  const record = database.insert(tickets).values({
    projectId,
    type: input.type ?? "bug",
    title: input.title.trim(),
    description: cleanNullable(input.description),
    status,
    priority: input.priority ?? "medium",
    severity: input.severity ?? null,
    reporter: cleanNullable(input.reporter),
    assignee: cleanNullable(input.assignee),
    environment: cleanNullable(input.environment),
    affectedVersion: cleanNullable(input.affectedVersion),
    dueDate: cleanNullable(input.dueDate),
    position,
    createdAt: now,
    updatedAt: now
  }).returning().get();
  return mapTicket(database, record);
}

// Sub-Ticket anlegen
export function createSubTicket(database: DbClient, parentId: number, input: TicketInput): Ticket {
  const parent = getTicketRecord(database, parentId);
  requireNonEmpty(input.title, "title");
  const status = input.status ?? "open";
  const position = nextPosition(database, parent.projectId, status, parentId);
  const now = nowIso();
  const record = database.insert(tickets).values({
    projectId: parent.projectId,
    parentId,
    type: input.type ?? parent.type,
    title: input.title.trim(),
    description: cleanNullable(input.description),
    status,
    priority: input.priority ?? parent.priority,
    severity: input.severity ?? null,
    reporter: cleanNullable(input.reporter),
    assignee: cleanNullable(input.assignee),
    environment: cleanNullable(input.environment),
    affectedVersion: cleanNullable(input.affectedVersion),
    dueDate: cleanNullable(input.dueDate),
    position,
    createdAt: now,
    updatedAt: now
  }).returning().get();
  return mapTicket(database, record);
}

// Ticket aktualisieren
export function updateTicket(database: DbClient, id: number, input: TicketUpdate): Ticket {
  const existing = getTicketRecord(database, id);
  if (input.title !== undefined) requireNonEmpty(input.title, "title");

  // Wenn Status auf "resolved" oder "closed" gesetzt wird und resolvedAt fehlt → auto-setzen
  const resolvedAt = input.resolvedAt !== undefined
    ? input.resolvedAt
    : (input.status === "resolved" || input.status === "closed") && existing.resolvedAt === null
      ? nowIso()
      : undefined;

  const record = database.update(tickets).set({
    ...(input.title !== undefined && { title: input.title.trim() }),
    ...(input.type !== undefined && { type: input.type }),
    ...(input.description !== undefined && { description: cleanNullable(input.description) }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.severity !== undefined && { severity: input.severity }),
    ...(input.resolution !== undefined && { resolution: input.resolution }),
    ...(input.reporter !== undefined && { reporter: cleanNullable(input.reporter) }),
    ...(input.assignee !== undefined && { assignee: cleanNullable(input.assignee) }),
    ...(input.environment !== undefined && { environment: cleanNullable(input.environment) }),
    ...(input.affectedVersion !== undefined && { affectedVersion: cleanNullable(input.affectedVersion) }),
    ...(input.dueDate !== undefined && { dueDate: cleanNullable(input.dueDate) }),
    ...(resolvedAt !== undefined && { resolvedAt }),
    updatedAt: nowIso()
  }).where(eq(tickets.id, id)).returning().get();
  if (!record) throw notFound(`Ticket with id ${id} not found`);
  return mapTicket(database, record);
}

// Position aktualisieren
export function updateTicketPosition(database: DbClient, id: number, input: TicketPositionInput): Ticket {
  getTicketRecord(database, id);
  const record = database.update(tickets).set({
    status: input.status,
    position: input.position,
    updatedAt: nowIso()
  }).where(eq(tickets.id, id)).returning().get();
  if (!record) throw notFound(`Ticket with id ${id} not found`);
  return mapTicket(database, record);
}

// Ticket löschen
export function deleteTicket(database: DbClient, id: number): void {
  getTicketRecord(database, id);
  database.delete(tickets).where(eq(tickets.id, id)).run();
}

// ─── Relationen ──────────────────────────────────────────────────────────────

export function listTicketRelations(database: DbClient, ticketId: number): TicketRelationEntry[] {
  getTicketRecord(database, ticketId);

  const outgoing = database.select().from(ticketRelations)
    .where(eq(ticketRelations.sourceTicketId, ticketId)).all();
  const incoming = database.select().from(ticketRelations)
    .where(eq(ticketRelations.targetTicketId, ticketId)).all();

  const allRelatedIds = [
    ...outgoing.map(r => r.targetTicketId),
    ...incoming.map(r => r.sourceTicketId)
  ];
  if (allRelatedIds.length === 0) return [];

  const relatedTicketRows = database.select().from(tickets)
    .where(inArray(tickets.id, allRelatedIds)).all();
  const relatedMap = new Map(relatedTicketRows.map(t => [t.id, t]));

  const entries: TicketRelationEntry[] = [];

  for (const rel of outgoing) {
    const related = relatedMap.get(rel.targetTicketId);
    if (related) {
      entries.push({
        id: rel.sourceTicketId * 100000 + rel.targetTicketId, // pseudo-ID für Frontend-Keys
        relationType: rel.relationType,
        ticket: mapTicket(database, related),
        direction: "outgoing"
      });
    }
  }
  for (const rel of incoming) {
    const related = relatedMap.get(rel.sourceTicketId);
    if (related) {
      entries.push({
        id: rel.targetTicketId * 100000 + rel.sourceTicketId,
        relationType: rel.relationType,
        ticket: mapTicket(database, related),
        direction: "incoming"
      });
    }
  }

  return entries;
}

export function addTicketRelation(database: DbClient, ticketId: number, input: TicketRelationInput): void {
  getTicketRecord(database, ticketId);
  getTicketRecord(database, input.targetTicketId);
  if (ticketId === input.targetTicketId) throw badRequest("Ein Ticket kann keine Relation zu sich selbst haben");

  const existing = database.select().from(ticketRelations)
    .where(and(
      eq(ticketRelations.sourceTicketId, ticketId),
      eq(ticketRelations.targetTicketId, input.targetTicketId),
      eq(ticketRelations.relationType, input.relationType)
    )).get();
  if (existing) throw badRequest("Diese Relation existiert bereits");

  database.insert(ticketRelations).values({
    sourceTicketId: ticketId,
    targetTicketId: input.targetTicketId,
    relationType: input.relationType,
    createdAt: nowIso()
  }).run();
}

export function removeTicketRelation(database: DbClient, ticketId: number, targetTicketId: number, relationType: string): void {
  database.delete(ticketRelations)
    .where(and(
      eq(ticketRelations.sourceTicketId, ticketId),
      eq(ticketRelations.targetTicketId, targetTicketId),
      eq(ticketRelations.relationType, relationType as "blocks" | "related" | "duplicate")
    )).run();
}
```

### ✅ Abnahmekriterien Schritt 3

- [ ] Datei kompiliert ohne TypeScript-Fehler
- [ ] Alle exportierten Funktionen (listTickets, listProjectTickets, createTicket, createSubTicket, updateTicket, updateTicketPosition, deleteTicket, listTicketRelations, addTicketRelation, removeTicketRelation) sind vorhanden
- [ ] `resolvedAt` wird beim Übergang in `resolved`/`closed` automatisch gesetzt

---

## Schritt 4 — Backend: Tickets Routes

**Ziel:** `apps/api/src/routes/tickets.ts` anlegen und in `apps/api/src/app.ts` registrieren.

### 4.1 — `apps/api/src/routes/tickets.ts`

```typescript
import type { FastifyInstance } from "fastify";
import type { TicketInput, TicketPositionInput, TicketRelationInput, TicketUpdate } from "@taskmanager/shared-types";
import { PRIORITIES, TICKET_RELATION_TYPES, TICKET_RESOLUTIONS, TICKET_SEVERITIES, TICKET_STATUSES, TICKET_TYPES } from "../db/schema.js";
import {
  addTicketRelation, createSubTicket, createTicket, deleteTicket,
  getTicketDetail, listProjectTickets, listSubTickets, listTicketRelations,
  listTickets, removeTicketRelation, updateTicket, updateTicketPosition
} from "../services/tickets.service.js";
import { arrayResponseSchema, idParamSchema, objectResponseSchema, projectIdParamSchema } from "../utils/route-schemas.js";

const ticketBodySchema = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    type: { type: "string", enum: TICKET_TYPES },
    description: { type: ["string", "null"] },
    status: { type: "string", enum: TICKET_STATUSES },
    priority: { type: "string", enum: PRIORITIES },
    severity: { type: ["string", "null"], enum: [...TICKET_SEVERITIES, null] },
    reporter: { type: ["string", "null"] },
    assignee: { type: ["string", "null"] },
    environment: { type: ["string", "null"] },
    affectedVersion: { type: ["string", "null"] },
    dueDate: { type: ["string", "null"] }
  }
} as const;

const ticketPatchSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...ticketBodySchema.properties,
    resolution: { type: ["string", "null"], enum: [...TICKET_RESOLUTIONS, null] },
    resolvedAt: { type: ["string", "null"] }
  }
} as const;

const ticketPositionSchema = {
  type: "object",
  required: ["status", "position"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: TICKET_STATUSES },
    position: { type: "number" }
  }
} as const;

const ticketRelationSchema = {
  type: "object",
  required: ["targetTicketId", "relationType"],
  additionalProperties: false,
  properties: {
    targetTicketId: { type: "integer" },
    relationType: { type: "string", enum: TICKET_RELATION_TYPES }
  }
} as const;

const ticketRelationDeleteSchema = {
  type: "object",
  required: ["targetTicketId", "relationType"],
  additionalProperties: false,
  properties: {
    targetTicketId: { type: "integer" },
    relationType: { type: "string", enum: TICKET_RELATION_TYPES }
  }
} as const;

export async function registerTicketsRoutes(app: FastifyInstance): Promise<void> {
  // Alle Tickets (für globale Übersicht)
  app.get("/tickets", { schema: { response: { 200: arrayResponseSchema } } },
    async () => listTickets(app.db));

  // Tickets eines Projekts
  app.get<{ Params: { projectId: number } }>(
    "/projects/:projectId/tickets",
    { schema: { params: projectIdParamSchema, response: { 200: arrayResponseSchema } } },
    async (req) => listProjectTickets(app.db, req.params.projectId)
  );

  // Ticket anlegen
  app.post<{ Params: { projectId: number }; Body: TicketInput }>(
    "/projects/:projectId/tickets",
    { schema: { params: projectIdParamSchema, body: ticketBodySchema, response: { 201: objectResponseSchema } } },
    async (req, reply) => reply.status(201).send(createTicket(app.db, req.params.projectId, req.body))
  );

  // Ticket Detail
  app.get<{ Params: { id: number } }>(
    "/tickets/:id",
    { schema: { params: idParamSchema, response: { 200: objectResponseSchema } } },
    async (req) => getTicketDetail(app.db, req.params.id)
  );

  // Ticket aktualisieren
  app.patch<{ Params: { id: number }; Body: TicketUpdate }>(
    "/tickets/:id",
    { schema: { params: idParamSchema, body: ticketPatchSchema, response: { 200: objectResponseSchema } } },
    async (req) => updateTicket(app.db, req.params.id, req.body)
  );

  // Position aktualisieren
  app.patch<{ Params: { id: number }; Body: TicketPositionInput }>(
    "/tickets/:id/position",
    { schema: { params: idParamSchema, body: ticketPositionSchema, response: { 200: objectResponseSchema } } },
    async (req) => updateTicketPosition(app.db, req.params.id, req.body)
  );

  // Ticket löschen
  app.delete<{ Params: { id: number } }>(
    "/tickets/:id",
    { schema: { params: idParamSchema, response: { 204: { type: "null" } } } },
    async (req, reply) => { deleteTicket(app.db, req.params.id); return reply.status(204).send(); }
  );

  // Sub-Tickets
  app.get<{ Params: { id: number } }>(
    "/tickets/:id/sub-tickets",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (req) => listSubTickets(app.db, req.params.id)
  );

  app.post<{ Params: { id: number }; Body: TicketInput }>(
    "/tickets/:id/sub-tickets",
    { schema: { params: idParamSchema, body: ticketBodySchema, response: { 201: objectResponseSchema } } },
    async (req, reply) => reply.status(201).send(createSubTicket(app.db, req.params.id, req.body))
  );

  // Relationen
  app.get<{ Params: { id: number } }>(
    "/tickets/:id/relations",
    { schema: { params: idParamSchema, response: { 200: arrayResponseSchema } } },
    async (req) => listTicketRelations(app.db, req.params.id)
  );

  app.post<{ Params: { id: number }; Body: TicketRelationInput }>(
    "/tickets/:id/relations",
    { schema: { params: idParamSchema, body: ticketRelationSchema, response: { 201: objectResponseSchema } } },
    async (req, reply) => {
      addTicketRelation(app.db, req.params.id, req.body);
      return reply.status(201).send({ success: true });
    }
  );

  app.delete<{ Params: { id: number }; Body: { targetTicketId: number; relationType: string } }>(
    "/tickets/:id/relations",
    { schema: { params: idParamSchema, body: ticketRelationDeleteSchema } },
    async (req, reply) => {
      removeTicketRelation(app.db, req.params.id, req.body.targetTicketId, req.body.relationType);
      return reply.status(204).send();
    }
  );

  // Tags (analog zu tasks)
  app.put<{ Params: { id: number }; Body: { tagIds: number[] } }>(
    "/tickets/:id/tags",
    { schema: { params: idParamSchema } },
    async (req, reply) => {
      // Implementierung in Schritt 5 (Tags-Service-Erweiterung)
      // Hier Placeholder, damit Route registriert ist:
      return reply.status(501).send({ error: "Not yet implemented — see Schritt 5" });
    }
  );
}
```

### 4.2 — In `apps/api/src/app.ts` registrieren

Die Datei `app.ts` suchen (enthält `registerTasksRoutes`, `registerProjectsRoutes` etc.) und `registerTicketsRoutes` ergänzen:

```typescript
import { registerTicketsRoutes } from "./routes/tickets.js";
// ...
await registerTicketsRoutes(app);
```

### ✅ Abnahmekriterien Schritt 4

- [ ] `GET /api/tickets` antwortet mit `[]`
- [ ] `POST /api/projects/1/tickets` mit `{ "title": "Test" }` antwortet mit 201
- [ ] `GET /api/tickets/1` gibt Ticket-Detail zurück
- [ ] `DELETE /api/tickets/1` antwortet mit 204
- [ ] `POST /api/tickets/1/relations` mit `{ "targetTicketId": 2, "relationType": "blocks" }` antwortet mit 201
- [ ] `npx tsc --noEmit` ohne Fehler

---

## Schritt 5 — Backend: Shared Infrastruktur für Tickets

**Ziel:** Tags, Notes, Attachments und Comments auf Tickets ausweiten.

### 5.1 — Tags Service erweitern (`apps/api/src/services/tags.service.ts`)

Analog zu `getTaskTags` / `getTaskTagsMap` folgende Funktionen **ergänzen**:

```typescript
import { ticketTags } from "../db/schema.js"; // zum Import hinzufügen

export function getTicketTags(database: DbClient, ticketId: number): Tag[] {
  return database
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(ticketTags)
    .innerJoin(tags, eq(ticketTags.tagId, tags.id))
    .where(eq(ticketTags.ticketId, ticketId))
    .all();
}

export function getTicketTagsMap(database: DbClient, ticketIds: number[]): Map<number, Tag[]> {
  const map = new Map<number, Tag[]>();
  if (ticketIds.length === 0) return map;
  const rows = database
    .select({ ticketId: ticketTags.ticketId, id: tags.id, name: tags.name, color: tags.color })
    .from(ticketTags)
    .innerJoin(tags, eq(ticketTags.tagId, tags.id))
    .where(inArray(ticketTags.ticketId, ticketIds))
    .all();
  for (const row of rows) {
    const list = map.get(row.ticketId) ?? [];
    list.push({ id: row.id, name: row.name, color: row.color });
    map.set(row.ticketId, list);
  }
  return map;
}

export function setTicketTags(database: DbClient, ticketId: number, tagIds: number[]): void {
  database.delete(ticketTags).where(eq(ticketTags.ticketId, ticketId)).run();
  for (const tagId of tagIds) {
    database.insert(ticketTags).values({ ticketId, tagId }).run();
  }
}
```

Die `PUT /tickets/:id/tags`-Route in `tickets.ts` mit `setTicketTags` fertigstellen (Placeholder aus Schritt 4 ersetzen).

### 5.2 — Notes Service erweitern (`apps/api/src/services/notes.service.ts`)

Analog zu `listTaskNotes` / `createNoteForTask` folgende Funktionen **ergänzen**:

```typescript
import { ticketNotes } from "../db/schema.js"; // zum Import hinzufügen

export function listTicketNotes(database: DbClient, ticketId: number): Note[] {
  const rows = database
    .select({ noteId: ticketNotes.noteId })
    .from(ticketNotes)
    .where(eq(ticketNotes.ticketId, ticketId))
    .all();
  if (rows.length === 0) return [];
  return rows.map(r => getNoteById(database, r.noteId)).filter(Boolean) as Note[];
}

export function createNoteForTicket(database: DbClient, ticketId: number, input: NoteInput): Note {
  const note = createNote(database, input);
  database.insert(ticketNotes).values({ ticketId, noteId: note.id }).run();
  return note;
}

export function deleteNoteFromTicket(database: DbClient, ticketId: number, noteId: number): void {
  database.delete(ticketNotes)
    .where(and(eq(ticketNotes.ticketId, ticketId), eq(ticketNotes.noteId, noteId)))
    .run();
  database.delete(notes).where(eq(notes.id, noteId)).run();
}
```

Neue Routes für Notes auf Tickets in `tickets.ts` ergänzen:

```
GET  /tickets/:id/notes
POST /tickets/:id/notes
DELETE /tickets/:id/notes/:noteId
```

### 5.3 — Attachments Service erweitern (`apps/api/src/services/attachments.service.ts`)

```typescript
import { tickets, ticketTags /* ggf. andere */ } from "../db/schema.js"; // tickets importieren

// Existenz prüfen (analog zu ensureTaskExists)
function ensureTicketExists(database: DbClient, ticketId: number): void {
  const ticket = database.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, ticketId)).get();
  if (!ticket) throw notFound(`Ticket with id ${ticketId} not found`);
}

export function listTicketAttachments(database: DbClient, ticketId: number): Attachment[] {
  return database.select().from(attachments)
    .where(eq(attachments.ticketId, ticketId))
    .orderBy(desc(attachments.createdAt))
    .all()
    .map(mapAttachment);
}

export async function uploadTicketAttachment(
  database: DbClient, ticketId: number, upload: AttachmentUpload
): Promise<Attachment> {
  ensureTicketExists(database, ticketId);
  const filename = makeFilename(upload.originalName);
  const filePath = path.join(config.uploadsDir, filename);
  await fs.writeFile(filePath, upload.buffer);
  const record = database.insert(attachments).values({
    ticketId,
    originalName: upload.originalName,
    filename,
    mimetype: upload.mimetype,
    size: upload.buffer.length,
    createdAt: nowIso()
  }).returning().get();
  return mapAttachment(record);
}
```

Neue Routes für Attachments in `tickets.ts`:

```
GET    /tickets/:id/attachments
POST   /tickets/:id/attachments  (multipart)
DELETE /tickets/:id/attachments/:attachmentId
```

### 5.4 — Comments Service: `"ticket"` entityType unterstützen

Die vorhandene `listComments`-Funktion in `comments.service.ts` unterstützt bereits generische `entityType`-Werte. Prüfen, ob der Call `listComments(database, "ticket", id)` korrekt funktioniert. Falls `entityType`-Validierung nötig: sicherstellen, dass `"ticket"` in der Enum-Liste ist (wurde in Schritt 1 ergänzt).

Neue Routes in `tickets.ts`:

```
GET  /tickets/:id/comments
POST /tickets/:id/comments
```

### ✅ Abnahmekriterien Schritt 5

- [ ] `PUT /api/tickets/:id/tags` setzt Tags korrekt (nicht mehr 501)
- [ ] `POST /api/tickets/:id/notes` legt Note an und gibt sie zurück
- [ ] `POST /api/tickets/:id/attachments` lädt Datei hoch
- [ ] `POST /api/tickets/:id/comments` legt Kommentar an
- [ ] `GET /api/tickets/:id` gibt Detail zurück mit `notes`, `comments`, `attachments`, `relations`, `subTickets`

---

## Schritt 6 — Frontend: API Layer, Query-Keys, Invalidierung & Hooks

**Ziel:** `apps/web/src/api/tickets.ts` anlegen, `queryKeys.ts` und `invalidation.ts` erweitern, bestehende Owner-Hooks (`useNotes`, `useAttachments`) um `"ticket"` erweitern, zwei neue Ticket-Hooks anlegen.

> ⚠️ **Wichtig zum API-Client:** Die Codebase nutzt `ky` — kein eigener Wrapper. Importiert wird `api` aus `./client`. Alle URLs ohne führenden Slash. Beispiel: `api.get("tickets/1").json<TicketDetail>()`.

---

### 6.1 — `apps/web/src/api/tickets.ts` (neu)

Exakt nach dem Muster von `apps/web/src/api/tasks.ts`:

```typescript
import type {
  Ticket, TicketDetail, TicketInput, TicketPositionInput,
  TicketRelationEntry, TicketRelationInput, TicketUpdate
} from "@taskmanager/shared-types";
import type { NoteInput, Note } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getTickets(): Promise<Ticket[]> {
  return api.get("tickets").json<Ticket[]>();
}

export async function getProjectTickets(projectId: number): Promise<Ticket[]> {
  return api.get(`projects/${projectId}/tickets`).json<Ticket[]>();
}

export async function getTicket(id: number): Promise<TicketDetail> {
  return api.get(`tickets/${id}`).json<TicketDetail>();
}

export async function createTicket(projectId: number, input: TicketInput): Promise<Ticket> {
  return api.post(`projects/${projectId}/tickets`, { json: input }).json<Ticket>();
}

export async function updateTicket(id: number, input: TicketUpdate): Promise<Ticket> {
  return api.patch(`tickets/${id}`, { json: input }).json<Ticket>();
}

export async function updateTicketPosition(id: number, input: TicketPositionInput): Promise<Ticket> {
  return api.patch(`tickets/${id}/position`, { json: input }).json<Ticket>();
}

export async function deleteTicket(id: number): Promise<void> {
  await api.delete(`tickets/${id}`);
}

// Sub-Tickets
export async function getSubTickets(parentId: number): Promise<Ticket[]> {
  return api.get(`tickets/${parentId}/sub-tickets`).json<Ticket[]>();
}

export async function createSubTicket(parentId: number, input: TicketInput): Promise<Ticket> {
  return api.post(`tickets/${parentId}/sub-tickets`, { json: input }).json<Ticket>();
}

// Relationen
export async function getTicketRelations(id: number): Promise<TicketRelationEntry[]> {
  return api.get(`tickets/${id}/relations`).json<TicketRelationEntry[]>();
}

export async function addTicketRelation(id: number, input: TicketRelationInput): Promise<void> {
  await api.post(`tickets/${id}/relations`, { json: input });
}

export async function removeTicketRelation(
  id: number,
  data: { targetTicketId: number; relationType: string }
): Promise<void> {
  await api.delete(`tickets/${id}/relations`, { json: data });
}

// Tags
export async function setTicketTags(id: number, tagIds: number[]): Promise<void> {
  await api.put(`tickets/${id}/tags`, { json: { tagIds } });
}

// Notes (ticket-spezifisch)
export async function getTicketNotes(ticketId: number): Promise<Note[]> {
  return api.get(`tickets/${ticketId}/notes`).json<Note[]>();
}

export async function createTicketNote(ticketId: number, input: NoteInput): Promise<Note> {
  return api.post(`tickets/${ticketId}/notes`, { json: input }).json<Note>();
}

// Attachments (ticket-spezifisch) — Upload via FormData
export async function uploadTicketAttachment(ticketId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`tickets/${ticketId}/attachments`, { body: formData }).json();
}
```

---

### 6.2 — `apps/web/src/queries/queryKeys.ts` erweitern

**Zwei Stellen zu ändern:**

**a) `QueryOwnerType` und `NoteOwnerType` — `"ticket"` hinzufügen:**

```typescript
// ALT:
export type QueryOwnerType = "project" | "task" | "feature";
export type NoteOwnerType = "project" | "task";

// NEU:
export type QueryOwnerType = "project" | "task" | "feature" | "ticket";
export type NoteOwnerType = "project" | "task" | "ticket";
```

**b) `tickets`-Block am Ende des `queryKeys`-Objekts ergänzen** (vor der schließenden `}`):

```typescript
tickets: {
  root: ["tickets"] as const,
  list: () => [...queryKeys.tickets.root, "list"] as const,
  detail: (ticketId: number) => [...queryKeys.tickets.root, "detail", ticketId] as const,
  byProject: (projectId: number) => [...queryKeys.projects.detail(projectId), "tickets"] as const,
  relations: (ticketId: number) => [...queryKeys.tickets.detail(ticketId), "relations"] as const,
  subTickets: (ticketId: number) => [...queryKeys.tickets.detail(ticketId), "subTickets"] as const,
},
```

---

### 6.3 — `apps/web/src/queries/invalidation.ts` erweitern

**Zwei Stellen zu ändern:**

**a) Neue Funktion `invalidateTicketScope` ergänzen:**

```typescript
export async function invalidateTicketScope(
  queryClient: QueryClient,
  projectId?: number,
  ticketId?: number
): Promise<void> {
  await invalidateMany(queryClient, [
    queryKeys.tickets.root,
    queryKeys.globalSearch.root,
    ...(projectId !== undefined
      ? [queryKeys.tickets.byProject(projectId), queryKeys.projects.detail(projectId)]
      : []),
    ...(ticketId !== undefined ? [queryKeys.tickets.detail(ticketId)] : [])
  ]);
}
```

**b) `invalidateSeedData` — `queryKeys.tickets.root` ergänzen:**

```typescript
// In der bestehenden invalidateSeedData-Funktion, nach queryKeys.calendarTasks.root:
queryKeys.tickets.root,
```

---

### 6.4 — `apps/web/src/hooks/useAttachments.ts` erweitern

Die bestehende `AttachmentOwner`-Union und die Switch-Logik um `"ticket"` ergänzen:

```typescript
// ALT:
export type AttachmentOwner =
  | { type: "project"; id: number }
  | { type: "task"; id: number }
  | { type: "feature"; id: number };

// NEU:
export type AttachmentOwner =
  | { type: "project"; id: number }
  | { type: "task"; id: number }
  | { type: "feature"; id: number }
  | { type: "ticket"; id: number };
```

In der `queryFn` des `attachmentsQuery` den `"ticket"`-Zweig ergänzen:

```typescript
// Import hinzufügen:
import { getTicketAttachments, uploadTicketAttachment } from "../api/tickets";

// In queryFn (statt der bisherigen ternary-Kette):
queryFn: () => {
  if (ownerType === "project") return getProjectAttachments(ownerId as number);
  if (ownerType === "task")    return getTaskAttachments(ownerId as number);
  if (ownerType === "ticket")  return getTicketAttachments(ownerId as number);
  return getFeatureAttachments(ownerId as number);
},
```

> **Hinweis:** `getTicketAttachments` ist die Gegenseite zu `uploadTicketAttachment` aus `api/tickets.ts`. Da `TicketDetail` die Attachments bereits als Array liefert (`GET /tickets/:id`), ist eine separate Route optional. Falls noch nicht vorhanden, `GET /tickets/:id/attachments` in Schritt 5 implementieren und hier aufrufen.

In `uploadMutation.mutationFn` den `"ticket"`-Zweig ergänzen:

```typescript
if (ownerType === "ticket") return uploadTicketAttachment(ownerId as number, file);
```

---

### 6.5 — `apps/web/src/hooks/useNotes.ts` erweitern

Analog zu `useAttachments`:

```typescript
// ALT:
export type NoteOwner = { type: "project"; id: number } | { type: "task"; id: number };

// NEU:
export type NoteOwner =
  | { type: "project"; id: number }
  | { type: "task"; id: number }
  | { type: "ticket"; id: number };
```

In `queryFn` und `createNoteMutation`:

```typescript
// Import hinzufügen:
import { createTicketNote, getTicketNotes } from "../api/tickets";

// In queryFn:
queryFn: () => {
  if (ownerType === "project") return getProjectNotes(ownerId as number);
  if (ownerType === "ticket")  return getTicketNotes(ownerId as number);
  return getTaskNotes(ownerId as number);
},

// In createNoteMutation.mutationFn:
if (ownerType === "project") return createProjectNote(ownerId as number, input);
if (ownerType === "ticket")  return createTicketNote(ownerId as number, input);
return createTaskNote(ownerId as number, input);
```

---

### 6.6 — `apps/web/src/hooks/useTickets.ts` (neu)

Exakt nach dem Muster von `useTasks.ts`:

```typescript
import type { TicketInput, TicketPositionInput, TicketUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createTicket as createTicketRequest,
  deleteTicket as deleteTicketRequest,
  getProjectTickets,
  updateTicket as updateTicketRequest,
  updateTicketPosition as updateTicketPositionRequest
} from "../api/tickets";
import { invalidateTicketScope } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useTickets(projectId?: number) {
  const queryClient = useQueryClient();
  const validProjectId =
    projectId !== undefined && Number.isFinite(projectId) ? projectId : undefined;

  const ticketsQuery = useQuery({
    queryKey: queryKeys.tickets.byProject(validProjectId ?? 0),
    queryFn: () => getProjectTickets(validProjectId as number),
    enabled: validProjectId !== undefined
  });

  const reload = useCallback(async () => {
    if (validProjectId !== undefined) await ticketsQuery.refetch();
  }, [ticketsQuery, validProjectId]);

  const createTicketMutation = useMutation({
    mutationFn: async (input: TicketInput) => {
      if (validProjectId === undefined) return null;
      return createTicketRequest(validProjectId, input);
    },
    onSuccess: async (created) => {
      await invalidateTicketScope(queryClient, created?.projectId ?? validProjectId, created?.id);
    }
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TicketUpdate }) =>
      updateTicketRequest(id, input),
    onSuccess: async (updated) => {
      await invalidateTicketScope(queryClient, updated.projectId, updated.id);
    }
  });

  const updateTicketPositionMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TicketPositionInput }) =>
      updateTicketPositionRequest(id, input),
    onSuccess: async (updated) => {
      await invalidateTicketScope(queryClient, updated.projectId, updated.id);
    }
  });

  const removeTicketMutation = useMutation({
    mutationFn: deleteTicketRequest,
    onSuccess: async (_result, id) => {
      await invalidateTicketScope(queryClient, validProjectId, id);
    }
  });

  const createTicket = useCallback(
    async (input: TicketInput) => createTicketMutation.mutateAsync(input),
    [createTicketMutation]
  );
  const updateTicket = useCallback(
    async (id: number, input: TicketUpdate) => updateTicketMutation.mutateAsync({ id, input }),
    [updateTicketMutation]
  );
  const updateTicketPosition = useCallback(
    async (id: number, input: TicketPositionInput) =>
      updateTicketPositionMutation.mutateAsync({ id, input }),
    [updateTicketPositionMutation]
  );
  const removeTicket = useCallback(
    async (id: number) => { await removeTicketMutation.mutateAsync(id); },
    [removeTicketMutation]
  );

  return {
    tickets: ticketsQuery.data ?? [],
    loading: ticketsQuery.isLoading,
    error: toQueryError(ticketsQuery.error),
    reload,
    createTicket,
    updateTicket,
    updateTicketPosition,
    removeTicket
  };
}
```

---

### 6.7 — `apps/web/src/hooks/useTicketDetail.ts` (neu)

Exakt nach dem Muster von `useTaskDetail.ts`:

```typescript
import type { Tag, TicketInput, TicketRelationInput, TicketUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  addTicketRelation as addTicketRelationRequest,
  createSubTicket as createSubTicketRequest,
  deleteTicket,
  getTicket,
  removeTicketRelation as removeTicketRelationRequest,
  setTicketTags,
  updateTicket as updateTicketRequest
} from "../api/tickets";
import { invalidateTagScope, invalidateTicketScope } from "../queries/invalidation";
// Hinweis: invalidateTagScope ggf. durch invalidateTags ersetzen (Name aus invalidation.ts prüfen)
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useTicketDetail(ticketId: number | null) {
  const queryClient = useQueryClient();
  const validTicketId =
    ticketId !== null && Number.isFinite(ticketId) ? ticketId : undefined;

  const ticketQuery = useQuery({
    queryKey: queryKeys.tickets.detail(validTicketId ?? 0),
    queryFn: () => getTicket(validTicketId as number),
    enabled: validTicketId !== undefined
  });

  const reload = useCallback(async () => {
    if (validTicketId !== undefined) await ticketQuery.refetch();
  }, [ticketQuery, validTicketId]);

  const updateTicketMutation = useMutation({
    mutationFn: async (input: TicketUpdate) => {
      if (validTicketId === undefined) return null;
      return updateTicketRequest(validTicketId, input);
    },
    onSuccess: async (updated) => {
      await invalidateTicketScope(
        queryClient,
        updated?.projectId ?? ticketQuery.data?.projectId,
        updated?.id ?? validTicketId
      );
    }
  });

  const updateTagsMutation = useMutation({
    mutationFn: async (tags: Tag[]) => {
      if (validTicketId === undefined) return;
      await setTicketTags(validTicketId, tags.map((t) => t.id));
    },
    onSuccess: async () => {
      await invalidateTicketScope(queryClient, ticketQuery.data?.projectId, validTicketId);
      // Tags-Liste global aktualisieren:
      await invalidateTags(queryClient); // Name aus invalidation.ts übernehmen
    }
  });

  const createSubTicketMutation = useMutation({
    mutationFn: async (input: TicketInput) => {
      if (validTicketId === undefined) return null;
      return createSubTicketRequest(validTicketId, input);
    },
    onSuccess: async (created) => {
      await invalidateTicketScope(
        queryClient,
        created?.projectId ?? ticketQuery.data?.projectId,
        created?.id
      );
      await invalidateTicketScope(queryClient, ticketQuery.data?.projectId, validTicketId);
    }
  });

  const removeSubTicketMutation = useMutation({
    mutationFn: deleteTicket,
    onSuccess: async (_result, id) => {
      await invalidateTicketScope(queryClient, ticketQuery.data?.projectId, id);
      await invalidateTicketScope(queryClient, ticketQuery.data?.projectId, validTicketId);
    }
  });

  const addRelationMutation = useMutation({
    mutationFn: async (input: TicketRelationInput) => {
      if (validTicketId === undefined) return;
      await addTicketRelationRequest(validTicketId, input);
    },
    onSuccess: async () => {
      await invalidateTicketScope(queryClient, ticketQuery.data?.projectId, validTicketId);
    }
  });

  const removeRelationMutation = useMutation({
    mutationFn: async (data: { targetTicketId: number; relationType: string }) => {
      if (validTicketId === undefined) return;
      await removeTicketRelationRequest(validTicketId, data);
    },
    onSuccess: async () => {
      await invalidateTicketScope(queryClient, ticketQuery.data?.projectId, validTicketId);
    }
  });

  // useCallback-Wrapper (analog useTaskDetail.ts)
  const updateTicket = useCallback(
    async (input: TicketUpdate) => { await updateTicketMutation.mutateAsync(input); },
    [updateTicketMutation]
  );
  const updateTags = useCallback(
    async (tags: Tag[]) => updateTagsMutation.mutateAsync(tags),
    [updateTagsMutation]
  );
  const createSubTicket = useCallback(
    async (input: TicketInput) => createSubTicketMutation.mutateAsync(input),
    [createSubTicketMutation]
  );
  const removeSubTicket = useCallback(
    async (id: number) => { await removeSubTicketMutation.mutateAsync(id); },
    [removeSubTicketMutation]
  );
  const addRelation = useCallback(
    async (input: TicketRelationInput) => addRelationMutation.mutateAsync(input),
    [addRelationMutation]
  );
  const removeRelation = useCallback(
    async (data: { targetTicketId: number; relationType: string }) =>
      removeRelationMutation.mutateAsync(data),
    [removeRelationMutation]
  );

  return {
    ticket: ticketQuery.data ?? null,
    loading: ticketQuery.isLoading,
    error: toQueryError(ticketQuery.error),
    reload,
    updateTicket,
    updateTags,
    createSubTicket,
    removeSubTicket,
    addRelation,
    removeRelation
  };
}
```

---

### ✅ Abnahmekriterien Schritt 6

- [ ] `api/tickets.ts` nutzt `api` (ky) mit `api.get("tickets/...").json<T>()` — kein eigener Wrapper, kein führender Slash
- [ ] `queryKeys.tickets` hat `root`, `list`, `detail`, `byProject`, `relations`, `subTickets`
- [ ] `QueryOwnerType` und `NoteOwnerType` enthalten `"ticket"`
- [ ] `invalidateTicketScope` ist in `invalidation.ts` vorhanden
- [ ] `invalidateSeedData` invalidiert auch `queryKeys.tickets.root`
- [ ] `useAttachments` akzeptiert `{ type: "ticket"; id: number }` als Owner
- [ ] `useNotes` akzeptiert `{ type: "ticket"; id: number }` als Owner
- [ ] `useTickets(projectId?)` und `useTicketDetail(ticketId)` existieren
- [ ] `npx tsc --noEmit` in `apps/web` ohne Fehler

---

## Schritt 7 — Frontend: Komponenten

**Ziel:** Kernkomponenten für Tickets unter `apps/web/src/components/tickets/` anlegen — **ausschließlich auf bestehenden UI-Basiskomponenten aufgebaut**. Keine neuen Styling-Primitiven, keine eigenen CSS-Klassen außer Tailwind-Utilities aus dem bestehenden Design-System.

> ⚠️ **Pflichtlektüre vor diesem Schritt:**
> - `src/components/tasks/TaskCard.tsx` — Card-Muster
> - `src/components/tasks/TaskForm.tsx` — Formular-Muster
> - `src/components/tasks/TaskListBoardView.tsx` — ListBoard-Muster
> - `src/components/ui/ItemCard.tsx` — Basis-Card
> - `src/components/ui/ItemRow.tsx` — Basis-Row
> - `src/components/ui/ListBoardView.tsx` — Basis-ListBoard
> - `src/components/ui/FormModal.tsx` — Basis-Formular-Modal
> - `src/components/ui/Pill.tsx` — PillTone-System
> - `src/components/ui/Badge.tsx` — BadgeTone-System
> - `src/utils/domainLabels.ts` — Labels und Tones aller Domänen

---

### 7.0 — `apps/web/src/utils/domainLabels.ts` erweitern (Pflicht zuerst)

Bevor irgendeine Komponente angelegt wird, die Ticket-Labels und -Tones in `domainLabels.ts` ergänzen. Alle anderen Komponenten importieren von hier — keine hardcodierten Strings oder Farben in Komponenten.

```typescript
// Imports ergänzen (TicketStatus, TicketSeverity, TicketType aus shared-types):
import type { ..., TicketSeverity, TicketStatus, TicketType } from "@taskmanager/shared-types";

// Ticket-Status
export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: "Offen",
  in_progress: "In Arbeit",
  in_review: "In Prüfung",
  resolved: "Gelöst",
  closed: "Geschlossen"
};

export const ticketStatusTones: Record<TicketStatus, PillTone> = {
  open: "steel",
  in_progress: "tangerine",
  in_review: "mustard",
  resolved: "fern",
  closed: "violet"
};

// Ticket-Typ
export const ticketTypeLabels: Record<TicketType, string> = {
  bug: "Bug",
  improvement: "Verbesserung",
  question: "Frage",
  task: "Aufgabe"
};

export const ticketTypeTones: Record<TicketType, BadgeTone> = {
  bug: "crimson",
  improvement: "teal",
  question: "violet",
  task: "steel"
};

// Ticket-Severity
export const ticketSeverityLabels: Record<TicketSeverity, string> = {
  critical: "Kritisch",
  major: "Schwer",
  minor: "Mittel",
  trivial: "Trivial"
};

export const ticketSeverityTones: Record<TicketSeverity, BadgeTone> = {
  critical: "crimson",
  major: "tangerine",
  minor: "mustard",
  trivial: "steel"
};
```

---

### 7.1 — `TicketCard.tsx`

**Basis:** `ItemCard` (card variant) und `ItemRow` (row variant) — exakt wie `TaskCard`.

```
TicketCard
  └─ variant="card" → ItemCard
       ├─ accentColor: priorityAccent[ticket.priority]  (gleiche Map wie TaskCard)
       ├─ header: Titel + Pill(ticketStatusTones) + Badge(ticketTypeTones) + Badge(ticketSeverityTones, nur wenn severity !== null)
       ├─ body: description (line-clamp-3, text-xs text-slate-600)
       └─ footer: subTicketCount-Icon + dueDate (CalendarClock, text-crimson wenn überfällig) + Tags als Badge

  └─ variant="row" → ItemRow
       ├─ accentColor: priorityAccent[ticket.priority]
       ├─ statusIndicator: farbiger Punkt nach ticketStatusTones
       ├─ title + description
       ├─ pills: Pill(status) + Badge(type)
       ├─ meta: dueDate + Avatar(assignee)
       └─ actions: Edit + Delete Button
```

Importierte Utilities ausschließlich aus:
- `../../utils/domainLabels` (ticketStatusLabels, ticketStatusTones, ticketTypeTones, ticketSeverityTones, priorityBadgeTones)
- `../../utils/date` (formatHumanDate, isOverdue)
- `../ui/ItemCard`, `../ui/ItemRow`, `../ui/Pill`, `../ui/Badge`, `../ui/Avatar`, `../ui/Button`

---

### 7.2 — `TicketForm.tsx`

**Basis:** `FormModal` + `Section` + `FormField` + `RadioList` + `Input` + `DatePicker` + `RichTextEditor` + `TagPicker` — exakt wie `TaskForm`.

Formular-Sektionen:

```
FormModal
  ├─ Section "Basisdaten"
  │    ├─ FormField "Titel" (required) → Input (autoFocus)
  │    └─ FormField "Beschreibung" → RichTextEditor (toolbar="minimal", minHeight="8rem")
  │
  ├─ Section "Typ & Priorität"
  │    ├─ FormField "Typ" → RadioList (bug/improvement/question/task mit Farben)
  │    └─ FormField "Priorität" → RadioList (analog TaskForm: fern/violet/tangerine/crimson)
  │
  ├─ Section "Status & Auflösung"
  │    ├─ FormField "Status" → RadioList (5 Optionen mit ticketStatusTones-Farben)
  │    └─ FormField "Lösung" (nur wenn status === "resolved" || "closed") → RadioList (fixed/wont_fix/duplicate/cant_reproduce/by_design)
  │
  ├─ Section "Zuweisung"
  │    ├─ FormField "Zuständig" → Input (iconLeft: UserRound)
  │    ├─ FormField "Reporter" → Input (iconLeft: UserRound)
  │    └─ DatePicker "Fällig"
  │
  ├─ Section "Details" (nur einblenden wenn type === "bug")
  │    ├─ FormField "Schweregrad" → RadioList (critical/major/minor/trivial) + null-Option "Kein"
  │    ├─ FormField "Umgebung" → Input (placeholder: "z. B. Production v1.2, Chrome 120")
  │    └─ FormField "Betroffene Version" → Input
  │
  └─ Section "Tags"
       └─ TagPicker
```

---

### 7.3 — `TicketDetail.tsx`

**Basis:** Analog zu `TaskDetail.tsx`. Prüfe zunächst die Struktur von `TaskDetail.tsx` und orientiere dich daran. Folgende Panels werden eingebunden — ausschließlich bestehende Komponenten:

| Panel | Komponente |
|---|---|
| Kommentare | `CommentThread` aus `src/components/ui/CommentThread.tsx` |
| Notizen | `NoteList` + `NoteEditor` aus `src/components/notes/` |
| Anhänge | `AttachmentList` + `AttachmentUploader` aus `src/components/attachments/` |
| Tags | `TagPicker` aus `src/components/tags/TagPicker.tsx` |
| Sub-Tickets | `TicketCard` (compact, variant="row") in einer Liste; Inline-Erstellungsformular |
| Relationen | `TicketRelationPanel` (siehe 7.4) |

Ticket-spezifische Detail-Felder (`severity`, `resolution`, `environment`, `affectedVersion`) als schreibgeschützte `FormField`-Segmente darstellen — bei Klick auf „Bearbeiten" öffnet `TicketForm`.

---

### 7.4 — `TicketRelationPanel.tsx`

**Basis:** Analog zu `FeatureRelationPanel.tsx` — prüfe zunächst dessen Struktur. Drei Sektionen:

- **Blockiert** (outgoing `blocks`-Relationen): „Dieses Ticket blockiert →"
- **Blockiert von** (incoming `blocks`-Relationen): „Wird blockiert durch →"
- **Verwandt / Duplikat** (`related` + `duplicate`)

Jeder Eintrag zeigt einen `TicketCard` (compact, variant="row") mit Remove-Button.

---

### 7.5 — `TicketListBoardView.tsx`

**Basis:** `ListBoardView` — exakt wie `TaskListBoardView`. Nur die domänenspezifischen Werte unterscheiden sich.

```typescript
// Statuskolumnen für das Kanban-Board:
const statusColumns = [
  { value: "open",       label: ticketStatusLabels.open },
  { value: "in_progress", label: ticketStatusLabels.in_progress },
  { value: "in_review",  label: ticketStatusLabels.in_review },
  { value: "resolved",   label: ticketStatusLabels.resolved },
  { value: "closed",     label: ticketStatusLabels.closed }
];
```

`renderCard` → `TicketCard` (variant="card")
`renderRow` → `TicketCard` (variant="row")

Search-Matching analog `matchesSearch` in `TaskListBoardView`:
```typescript
function matchesSearch(ticket: Ticket, searchValue: string) {
  const normalized = searchValue.trim().toLocaleLowerCase("de-DE");
  if (!normalized) return true;
  const values = [ticket.title, ticket.description, ticket.assignee, ticket.reporter,
                  ticket.status, ticket.type, ticket.severity, ticket.priority,
                  ...ticket.tags.map((t) => t.name)];
  return values.some((v) => (v ?? "").toLocaleLowerCase("de-DE").includes(normalized));
}
```

---

### 7.6 — `ProjectTicketPanel.tsx`

Panel für den Ticket-Tab in `ProjectDetailPage`. Zeigt `TicketListBoardView` für das gegebene `projectId`. „Neues Ticket"-Button öffnet `TicketForm` mit vorgesetztem `projectId`.

---

### ✅ Abnahmekriterien Schritt 7

- [ ] `domainLabels.ts` enthält `ticketStatusLabels`, `ticketStatusTones`, `ticketTypeLabels`, `ticketTypeTones`, `ticketSeverityLabels`, `ticketSeverityTones`
- [ ] `TicketCard` nutzt ausschließlich `ItemCard`/`ItemRow` als Basis — keine eigene Card-Struktur
- [ ] `TicketForm` nutzt `FormModal`, `Section`, `FormField`, `RadioList`, `Input`, `DatePicker`, `RichTextEditor`, `TagPicker` — keine eigenen Formular-Primitiven
- [ ] `TicketListBoardView` ist ein dünner Adapter auf `ListBoardView` — analog zu `TaskListBoardView`
- [ ] Alle Labels kommen aus `domainLabels.ts`, keine hardcodierten deutschen Strings in Komponenten
- [ ] `npx tsc --noEmit` ohne Fehler

---

## Schritt 8 — Frontend: Seiten & Navigation

**Ziel:** `/tickets`-Seite anlegen, Projekt-Detail erweitern, Sidebar aktualisieren.

### 8.1 — `apps/web/src/pages/TicketsPage.tsx`

```typescript
// Zeigt alle Tickets (projektübergreifend) mit Projekt-Filter-Dropdown oben.
// Verwendet useProjects() für das Dropdown.
// Bei Auswahl eines Projekts: useProjectTickets(projectId).
// Kein Projekt ausgewählt → Alle Tickets (useTickets oder alle Projekte zusammenführen).
// Ansichtswechsel: Board-View (nach Status) und Tabellen-View (Liste aller Tickets mit Spalten).
// Klick auf Ticket öffnet TicketDetail als Modal (analog zu TaskDetail).
```

### 8.2 — `ProjectDetailPage.tsx` erweitern

Die bestehende `ProjectDetailPage` hat Tabs (Tasks, Backlog etc.). Einen neuen Tab **„Tickets"** ergänzen, der `ProjectTicketPanel` rendert.

### 8.3 — `Sidebar.tsx` erweitern

In der bestehenden Sidebar einen Eintrag **„Tickets"** mit passendem Icon (z.B. 🐛 oder Bug-Icon) hinzufügen, der zu `/tickets` navigiert.

Die Sidebar-Einträge sollen danach folgende Reihenfolge haben:
1. Projekte
2. Tickets ← neu
3. Features
4. Wiki
5. Kalender
6. Einstellungen

### 8.4 — `apps/web/src/App.tsx` erweitern

```typescript
import { TicketsPage } from "./pages/TicketsPage";
// ...
<Route path="/tickets" element={<TicketsPage />} />
```

### ✅ Abnahmekriterien Schritt 8

- [ ] `/tickets` lädt ohne Fehler
- [ ] Projekt-Dropdown filtert Tickets korrekt
- [ ] Neues Ticket kann von `/tickets` aus angelegt werden
- [ ] Ticket-Tab in ProjectDetailPage sichtbar und funktionsfähig
- [ ] Sidebar zeigt „Tickets"-Eintrag mit korrektem Link

---

## Schritt 9 — Globale Suche um Tickets erweitern

**Ziel:** `useGlobalSearchData.ts` und `GlobalSearch.tsx` kennen Tickets — sie erscheinen in Suchergebnissen.

> ⚠️ Dieses Feature wurde durch `logs/2026-05-17-feature-global-query-sync.md` eingeführt. Der Hook `useGlobalSearchData` lädt alle suchbaren Entitäten zentral. **Jede neue Entität muss dort registriert werden.**

### 9.1 — `apps/web/src/hooks/useGlobalSearchData.ts`

**a) Import ergänzen:**

```typescript
import type { ..., Ticket } from "@taskmanager/shared-types";
import { getProjectTickets } from "../api/tickets";
```

**b) `GlobalSearchData`-Interface erweitern:**

```typescript
export interface GlobalSearchData {
  projects: Project[];
  features: Feature[];
  wikiPages: WikiPage[];
  tasks: Task[];
  notes: Note[];
  attachments: Attachment[];
  tickets: Ticket[];   // ← neu
}
```

**c) `loadGlobalSearchData`-Funktion erweitern:**

```typescript
async function loadGlobalSearchData(): Promise<GlobalSearchData> {
  const [projects, features, wikiPages] = await Promise.all([
    getProjects(), getFeatures(), getRootWikiPages()
  ]);
  const projectIds = projects.map((p) => p.id);

  const [taskLists, noteLists, attachmentLists, ticketLists] = await Promise.all([
    Promise.all(projectIds.map((id) => getProjectTasks(id))),
    Promise.all(projectIds.map((id) => getProjectNotes(id))),
    Promise.all(projectIds.map((id) => getProjectAttachments(id))),
    Promise.all(projectIds.map((id) => getProjectTickets(id)))  // ← neu
  ]);

  return {
    projects,
    features,
    wikiPages,
    tasks: taskLists.flat(),
    notes: noteLists.flat(),
    attachments: attachmentLists.flat(),
    tickets: ticketLists.flat()   // ← neu
  };
}
```

**d) Fallback-Wert im Hook ergänzen:**

```typescript
data: searchQuery.data ?? {
  projects: [],
  features: [],
  wikiPages: [],
  tasks: [],
  notes: [],
  attachments: [],
  tickets: []   // ← neu
},
```

### 9.2 — `apps/web/src/components/search/GlobalSearch.tsx`

Die Komponente nutzt `useGlobalSearchData` und rendert Suchergebnisse. Tickets als neuen Ergebnistyp ergänzen. Vorgehensweise analog zu Tasks:

- Tickets über `data.tickets` filtern (Titel-Match gegen Suchbegriff)
- Treffer in einer eigenen Gruppe „Tickets" anzeigen
- Ticket-Typ-Icon je nach `ticket.type` anzeigen (🐛 bug, ✨ improvement, ❓ question, 📋 task)
- Klick auf einen Treffer navigiert zu `/tickets` und öffnet das betreffende Ticket als Detail-Modal (oder navigiert zu `/projects/:projectId` und öffnet den Ticket-Tab)

### ✅ Abnahmekriterien Schritt 9

- [ ] `GlobalSearchData.tickets` ist typisiert
- [ ] Tickets werden pro Projekt geladen (`getProjectTickets` in `loadGlobalSearchData`)
- [ ] `invalidateTicketScope` invalidiert auch `queryKeys.globalSearch.root` (bereits in Schritt 6.3 definiert — hier prüfen)
- [ ] `GlobalSearch.tsx` zeigt Ticket-Treffer in eigener Gruppe
- [ ] `npx tsc --noEmit` ohne Fehler

---

## Schritt 10 — Seed-Daten (optional aber empfohlen)

**Ziel:** Demo-Daten für Tickets in `apps/api/src/services/seed-data.service.ts` ergänzen, damit die App nach einem Seed visuell befüllt ist.

Mindestens 5 Tickets pro Seed-Projekt anlegen mit verschiedenen Typen (2× bug, 1× improvement, 1× question, 1× task), Statuses und Severities. Mindestens 1 Relation (blocks) und 1 Sub-Ticket pro Projekt.

### ✅ Abnahmekriterien Schritt 10

- [ ] Nach `POST /api/admin/seed` sind Tickets in der DB vorhanden
- [ ] Tickets erscheinen auf der `/tickets`-Seite
- [ ] Tickets erscheinen in der globalen Suche nach dem Seed

---

## Schritt 11 — Tests

**Ziel:** Vollständige Testsuite für alle neuen Backend-Routen.

### 11.1 — `apps/api/tests/helpers/factories.ts` erweitern

Folgende Factory-Funktionen **ergänzen** (analog zu `createTask`, `createProject`):

```typescript
export interface TestTicket {
  id: number;
  projectId: number;
  parentId: number | null;
  type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  severity: string | null;
  resolution: string | null;
  reporter: string | null;
  assignee: string | null;
  environment: string | null;
  affectedVersion: string | null;
  dueDate: string | null;
  resolvedAt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  tags: TestTag[];
  subTicketCount: number;
}

export async function createTicket(
  app: FastifyInstance,
  projectId: number,
  overrides: Partial<{ title: string; type: string; status: string; priority: string; severity: string | null; assignee: string | null }> = {}
): Promise<TestTicket> {
  const body = { title: "Test-Ticket", type: "bug", status: "open", priority: "medium", ...overrides };
  const res = await supertest(app.server).post(`/api/projects/${projectId}/tickets`).send(body).expect(201);
  return res.body as TestTicket;
}

export async function createSubTicket(
  app: FastifyInstance,
  parentTicketId: number,
  overrides: Partial<{ title: string; status: string }> = {}
): Promise<TestTicket> {
  const body = { title: "Test-Sub-Ticket", ...overrides };
  const res = await supertest(app.server).post(`/api/tickets/${parentTicketId}/sub-tickets`).send(body).expect(201);
  return res.body as TestTicket;
}
```

### 11.2 — `apps/api/tests/integration/tickets.test.ts` anlegen

```typescript
/**
 * Test Scope: Tickets API
 *
 * Covers: CRUD, sub-tickets, relations, tags, notes, comments, attachments,
 * status transitions (resolvedAt auto-set), cascade delete, validation.
 */
```

**Pflicht-Testfälle:**

**CRUD:**
- `POST /projects/:id/tickets` legt Ticket an (201, Felder korrekt)
- `POST /projects/:id/tickets` ohne title → 400
- `POST /projects/:id/tickets` mit ungültigem type → 400
- `POST /projects/9999/tickets` → 404
- `GET /projects/:id/tickets` gibt Liste zurück
- `GET /tickets/:id` gibt Detail zurück
- `GET /tickets/9999` → 404
- `PATCH /tickets/:id` aktualisiert Felder
- `PATCH /tickets/:id` setzt `resolvedAt` automatisch bei Status `resolved`
- `PATCH /tickets/:id` setzt `resolvedAt` automatisch bei Status `closed`
- `DELETE /tickets/:id` löscht Ticket (204)
- `DELETE /tickets/9999` → 404

**Sub-Tickets:**
- `POST /tickets/:id/sub-tickets` legt Sub-Ticket an (projectId des Eltern-Tickets wird übernommen)
- Sub-Ticket erscheint in `GET /tickets/:id` unter `subTickets`
- `subTicketCount` auf Parent-Ticket wird korrekt berechnet
- Löschen des Parent-Tickets löscht Sub-Tickets (Cascade)

**Relationen:**
- `POST /tickets/:id/relations` legt Relation an
- Doppelte Relation → 400
- Self-Relation (`targetTicketId === sourceId`) → 400 oder DB-Check-Fehler
- Relation auf nicht existierendes Ticket → 404
- `GET /tickets/:id/relations` gibt Relation mit `direction: "outgoing"` zurück
- Gegenpartei (`GET /tickets/:targetId/relations`) gibt `direction: "incoming"`
- `DELETE /tickets/:id/relations` entfernt Relation

**Tags:**
- `PUT /tickets/:id/tags` setzt Tags, erneuter Aufruf überschreibt
- Tags erscheinen in `GET /tickets/:id`

**Notes:**
- `POST /tickets/:id/notes` legt Note an
- Note erscheint in `GET /tickets/:id` unter `notes`
- `DELETE /tickets/:id/notes/:noteId` entfernt Note

**Comments:**
- `POST /tickets/:id/comments` legt Kommentar an
- Kommentar erscheint in `GET /tickets/:id` unter `comments`

**Cascade:**
- Projekt löschen → alle Tickets des Projekts werden gelöscht

**Validierung:**
- `severity` mit ungültigem Wert → 400
- `resolution` mit ungültigem Wert → 400

### 11.3 — Tests ausführen

```bash
cd apps/api
npm test
```

Alle Tests müssen grün sein. Fehlschlagende Tests im Blocker-Log dokumentieren.

### ✅ Abnahmekriterien Schritt 11

- [ ] `npm test` läuft ohne Abbruch durch
- [ ] Alle 25+ Ticket-Tests bestehen
- [ ] Keine bestehenden Tests wurden durch die Änderungen gebrochen
- [ ] `createTicket`- und `createSubTicket`-Factories in `factories.ts` und `index.ts` re-exportiert

---

## 🏁 Gesamtabnahme

Die Implementierung ist vollständig, wenn:

| Kriterium | Beschreibung |
|---|---|
| Schema | Alle 4 neuen Tabellen existieren, `attachments.ticket_id` vorhanden |
| API | 18+ neue Endpunkte erreichbar, alle mit korrekten Status-Codes |
| Types | `Ticket`, `TicketDetail`, `TicketInput` in shared-types exportiert |
| Service | `resolvedAt` wird automatisch gesetzt, Self-Relationen werden abgelehnt |
| Frontend | `/tickets`-Seite, Ticket-Tab im Projekt, Sidebar-Eintrag |
| Globale Suche | `useGlobalSearchData` lädt Tickets, `GlobalSearch.tsx` zeigt Ticket-Treffer |
| Tests | Alle neuen Tests grün, keine Regression in bestehenden Tests |
| Protokoll | `codex-abschlussbericht.md` mit Status aller Schritte erstellt |

---

## 📎 Referenz: Bestehende Muster

| Muster | Referenz-Datei |
|---|---|
| Service-Struktur | `apps/api/src/services/tasks.service.ts` |
| Route-Struktur | `apps/api/src/routes/tasks.ts` |
| Test-Struktur | `apps/api/tests/integration/tasks.test.ts` |
| Factory-Muster | `apps/api/tests/helpers/factories.ts` |
| React Query Hook | `apps/web/src/hooks/useTasks.ts` |
| API-Client | `apps/web/src/api/tasks.ts` |
| Listenkomponente | `apps/web/src/components/tasks/TaskListBoardView.tsx` |
| Detailkomponente | `apps/web/src/components/tasks/TaskDetail.tsx` |
| Relationen-Panel | `apps/web/src/components/features/FeatureRelationPanel.tsx` |
