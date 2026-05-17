/**
 * Test Suite: Vollständige Lösch-Kaskadierung
 *
 * Stellt sicher, dass beim Löschen einer Entität ALLE abhängigen Objekte
 * mitgelöscht werden – direkt via DB-Cascade, Join-Tabellen-Einträge
 * und polymorphe Referenzen ohne FK-Constraint (Kommentare, Notes).
 *
 * Test-Matrix – geprüfte Relationen:
 *
 * deleteProject
 *   ├─ tasks (cascade)                              ✅ DB-Cascade
 *   │   ├─ subtasks (parentId cascade)             ✅ DB-Cascade
 *   │   ├─ comments via task_id FK                 ✅ DB-Cascade
 *   │   ├─ task_tags (cascade)                     ✅ DB-Cascade
 *   │   ├─ task_notes join (cascade)               ✅ DB-Cascade
 *   │   └─ notes record selbst                     ❌ BUG – orphaned
 *   ├─ comments entityType="project"               ❌ BUG – orphaned
 *   ├─ project_tags (cascade)                      ✅ DB-Cascade
 *   ├─ project_notes join (cascade)                ✅ DB-Cascade
 *   │   └─ notes record selbst                     ❌ BUG – orphaned
 *   ├─ backlog_items (cascade)                     ✅ DB-Cascade
 *   │   └─ comments entityType="backlogItem"       ❌ BUG – orphaned
 *   ├─ tickets (cascade)                           ✅ DB-Cascade
 *   │   ├─ sub-tickets (parentId cascade)          ✅ DB-Cascade
 *   │   ├─ ticket_relations (cascade)              ✅ DB-Cascade
 *   │   ├─ ticket_tags (cascade)                   ✅ DB-Cascade
 *   │   ├─ ticket_notes join (cascade)             ✅ DB-Cascade
 *   │   │   └─ notes record selbst                 ❌ BUG – orphaned
 *   │   └─ comments entityType="ticket"            ❌ BUG – orphaned
 *   ├─ attachments DB-Records (cascade)            ✅ DB-Cascade
 *   │   └─ physische Dateien auf Disk              ❌ BUG – nicht gelöscht (separater Test erforderlich)
 *   ├─ events.projectId → set null                 ✅ DB-Cascade
 *   ├─ wiki_pages.projectId → set null             ✅ DB-Cascade
 *   └─ project_features join (cascade)             ✅ DB-Cascade (Feature selbst bleibt)
 *
 * deleteTask
 *   ├─ subtasks (parentId cascade)                 ✅ DB-Cascade
 *   ├─ comments via task_id FK                     ✅ DB-Cascade
 *   ├─ task_tags (cascade)                         ✅ DB-Cascade
 *   ├─ task_notes join (cascade)                   ✅ DB-Cascade
 *   │   └─ notes record selbst                     ❌ BUG – orphaned
 *   ├─ task_features (cascade)                     ✅ DB-Cascade
 *   └─ task_use_cases (cascade)                    ✅ DB-Cascade
 *
 * deleteFeature
 *   ├─ use_cases (featureId cascade)               ✅ DB-Cascade
 *   │   └─ task_use_cases (cascade)               ✅ DB-Cascade
 *   ├─ comments entityType="feature"               ❌ BUG – orphaned
 *   ├─ comments entityType="useCase"               ❌ BUG – orphaned
 *   ├─ feature_relations source+target (cascade)   ✅ DB-Cascade
 *   ├─ task_features (cascade)                     ✅ DB-Cascade
 *   ├─ project_features (cascade)                  ✅ DB-Cascade
 *   └─ backlog_items.featureId → set null          ✅ DB-Cascade
 *
 * deleteUseCase
 *   ├─ comments entityType="useCase"               ❌ BUG – orphaned
 *   ├─ task_use_cases (cascade)                    ✅ DB-Cascade
 *   └─ backlog_items.useCaseId → set null          ✅ DB-Cascade
 *
 * deleteTicket
 *   ├─ sub-tickets (parentId cascade)              ✅ DB-Cascade
 *   ├─ comments entityType="ticket"                ❌ BUG – orphaned
 *   ├─ ticket_notes join (cascade)                 ✅ DB-Cascade
 *   │   └─ notes record selbst                     ❌ BUG – orphaned
 *   ├─ ticket_relations (beide Seiten, cascade)    ✅ DB-Cascade
 *   └─ ticket_tags (cascade)                       ✅ DB-Cascade
 *
 * deleteBacklogItem
 *   └─ comments entityType="backlogItem"           ❌ BUG – orphaned
 *
 * deleteWikiPage
 *   ├─ verhindert Löschen bei vorhandenen Kindern  ✅ restrict
 *   └─ comments entityType="wikiPage"              ❌ BUG – orphaned
 *
 * deleteTag
 *   ├─ project_tags (cascade)                      ✅ DB-Cascade
 *   ├─ task_tags (cascade)                         ✅ DB-Cascade
 *   └─ ticket_tags (cascade)                       ✅ DB-Cascade
 */

import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  backlogItems,
  comments,
  events,
  featureRelations,
  features,
  notes,
  projectFeatures,
  projectNotes,
  projectTags,
  taskFeatures,
  taskNotes,
  taskTags,
  taskUseCases,
  ticketNotes,
  ticketRelations,
  ticketTags,
  tickets,
  useCases,
  wikiPages
} from "../../src/db/schema.js";
import {
  buildTestApp,
  createBacklogItem,
  createFeature,
  createNoteForProject,
  createNoteForTask,
  createProject,
  createSubtask,
  createSubTicket,
  createTag,
  createTask,
  createTestDb,
  createTicket,
  createUseCase,
  createWikiPage,
  truncateAll,
  type TestDb
} from "../helpers/index.js";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Kommentar für beliebigen Entity-Typ anlegen */
async function postComment(app: FastifyInstance, path: string, entityId: number): Promise<number> {
  const res = await supertest(app.server)
    .post(`/api/${path}/${entityId}/comments`)
    .send({ body: "Testkommentar" })
    .expect(201);
  return (res.body as { id: number }).id;
}

/** Note für ein Ticket anlegen */
async function createNoteForTicket(app: FastifyInstance, ticketId: number): Promise<number> {
  const res = await supertest(app.server)
    .post(`/api/tickets/${ticketId}/notes`)
    .send({ title: "Ticket-Notiz", contentJson: { type: "doc", content: [] } })
    .expect(201);
  return (res.body as { id: number }).id;
}

/** Feature-Relation setzen */
async function setFeatureRelation(app: FastifyInstance, featureId: number, targetId: number): Promise<void> {
  await supertest(app.server)
    .put(`/api/features/${featureId}/relations`)
    .send({ relations: [{ targetFeatureId: targetId, relationType: "related" }] })
    .expect(200);
}

/** Tags einem Projekt zuweisen */
async function setProjectTags(app: FastifyInstance, projectId: number, tagIds: number[]): Promise<void> {
  await supertest(app.server).put(`/api/projects/${projectId}/tags`).send({ tagIds }).expect(200);
}

/** Tags einer Aufgabe zuweisen */
async function setTaskTags(app: FastifyInstance, taskId: number, tagIds: number[]): Promise<void> {
  await supertest(app.server).put(`/api/tasks/${taskId}/tags`).send({ tagIds }).expect(200);
}

/** Tags einem Ticket zuweisen */
async function setTicketTags(app: FastifyInstance, ticketId: number, tagIds: number[]): Promise<void> {
  await supertest(app.server).put(`/api/tickets/${ticketId}/tags`).send({ tagIds }).expect(200);
}

/** Features einem Projekt zuweisen */
async function setProjectFeatures(app: FastifyInstance, projectId: number, featureIds: number[]): Promise<void> {
  await supertest(app.server).put(`/api/projects/${projectId}/features`).send({ featureIds }).expect(200);
}

/** Features einer Aufgabe zuweisen */
async function setTaskFeatures(app: FastifyInstance, taskId: number, featureIds: number[]): Promise<void> {
  await supertest(app.server).put(`/api/tasks/${taskId}/features`).send({ featureIds }).expect(200);
}

/** UseCases einer Aufgabe zuweisen */
async function setTaskUseCases(app: FastifyInstance, taskId: number, useCaseIds: number[]): Promise<void> {
  await supertest(app.server).put(`/api/tasks/${taskId}/use-cases`).send({ useCaseIds }).expect(200);
}

// ---------------------------------------------------------------------------
// Test-Suite
// ---------------------------------------------------------------------------

describe("Delete-Cascade: vollständige Bereinigung aller abhängigen Objekte", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(() => truncateAll(testDb.sqlite));

  afterAll(async () => {
    await app.close();
    testDb.sqlite.close();
  });

  // =========================================================================
  // PROJEKT LÖSCHEN
  // =========================================================================

  describe("deleteProject – alle abhängigen Objekte werden entfernt", () => {
    it("löscht alle Tasks des Projekts", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      await supertest(app.server).get(`/api/tasks/${task.id}`).expect(404);
    });

    it("löscht Sub-Tasks der Projekt-Tasks rekursiv", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const sub = await createSubtask(app, task.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      await supertest(app.server).get(`/api/tasks/${sub.id}`).expect(404);
    });

    it("löscht Task-Kommentare via task_id-FK (entityType=task)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      await postComment(app, "tasks", task.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(comments)
        .where(and(eq(comments.entityType, "task"), eq(comments.entityId, task.id)))
        .all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht Kommentare mit entityType='project'", async () => {
      const project = await createProject(app);
      await postComment(app, "projects", project.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(comments)
        .where(and(eq(comments.entityType, "project"), eq(comments.entityId, project.id)))
        .all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht Kommentare der BacklogItems (entityType='backlogItem')", async () => {
      const project = await createProject(app);
      const item = await createBacklogItem(app, project.id);
      await postComment(app, "backlog", item.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(comments)
        .where(and(eq(comments.entityType, "backlogItem"), eq(comments.entityId, item.id)))
        .all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht Kommentare der Tickets (entityType='ticket')", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      await postComment(app, "tickets", ticket.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(comments)
        .where(and(eq(comments.entityType, "ticket"), eq(comments.entityId, ticket.id)))
        .all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht Kommentare der Sub-Tickets (entityType='ticket')", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const sub = await createSubTicket(app, ticket.id);
      await postComment(app, "tickets", sub.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(comments)
        .where(and(eq(comments.entityType, "ticket"), eq(comments.entityId, sub.id)))
        .all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht den notes-Datensatz von Projekt-Notes (nicht nur den Join-Eintrag)", async () => {
      const project = await createProject(app);
      const note = await createNoteForProject(app, project.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = testDb.db.select().from(notes).where(eq(notes.id, note.id)).all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht den notes-Datensatz von Task-Notes (nicht nur den Join-Eintrag)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const note = await createNoteForTask(app, task.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = testDb.db.select().from(notes).where(eq(notes.id, note.id)).all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht den notes-Datensatz von Ticket-Notes (nicht nur den Join-Eintrag)", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const noteId = await createNoteForTicket(app, ticket.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = testDb.db.select().from(notes).where(eq(notes.id, noteId)).all();
      expect(remaining).toHaveLength(0);
    });

    it("entfernt project_tags-Einträge (Tag selbst bleibt erhalten)", async () => {
      const project = await createProject(app);
      const tag = await createTag(app);
      await setProjectTags(app, project.id, [tag.id]);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = testDb.db.select().from(projectTags).where(eq(projectTags.projectId, project.id)).all();
      expect(remaining).toHaveLength(0);

      // Tag selbst muss noch existieren
      await supertest(app.server).get(`/api/tags`).expect(200).then((r) => {
        expect((r.body as { id: number }[]).some((t) => t.id === tag.id)).toBe(true);
      });
    });

    it("löscht BacklogItems des Projekts", async () => {
      const project = await createProject(app);
      const item = await createBacklogItem(app, project.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = testDb.db.select().from(backlogItems).where(eq(backlogItems.id, item.id)).all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht Tickets und Sub-Tickets des Projekts", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const sub = await createSubTicket(app, ticket.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remainingTickets = testDb.db.select().from(tickets).where(eq(tickets.projectId, project.id)).all();
      expect(remainingTickets).toHaveLength(0);

      const remainingSub = testDb.db.select().from(tickets).where(eq(tickets.id, sub.id)).all();
      expect(remainingSub).toHaveLength(0);
    });

    it("setzt projectId bei Events auf null (Events bleiben erhalten)", async () => {
      const project = await createProject(app);
      const res = await supertest(app.server)
        .post("/api/events")
        .send({ title: "Termin", startTime: "2026-07-01T10:00:00", endTime: "2026-07-01T11:00:00", isAllDay: false, projectId: project.id })
        .expect(201);
      const eventId = (res.body as { id: number }).id;

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const event = await supertest(app.server).get(`/api/events/${eventId}`).expect(200);
      expect(event.body.projectId).toBeNull();
    });

    it("setzt projectId bei WikiPages auf null (WikiPages bleiben erhalten)", async () => {
      const project = await createProject(app);
      const wiki = await createWikiPage(app, { projectId: project.id });

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = testDb.db.select().from(wikiPages).where(eq(wikiPages.id, wiki.id)).all();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].projectId).toBeNull();
    });

    it("entfernt project_features-Einträge, Feature selbst bleibt erhalten", async () => {
      const project = await createProject(app);
      const feature = await createFeature(app);
      await setProjectFeatures(app, project.id, [feature.id]);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const joinRemaining = testDb.db.select().from(projectFeatures).where(eq(projectFeatures.projectId, project.id)).all();
      expect(joinRemaining).toHaveLength(0);

      const featureStillExists = testDb.db.select().from(features).where(eq(features.id, feature.id)).all();
      expect(featureStillExists).toHaveLength(1);
    });
  });

  // =========================================================================
  // TASK LÖSCHEN
  // =========================================================================

  describe("deleteTask – alle abhängigen Objekte werden entfernt", () => {
    it("löscht Sub-Tasks rekursiv", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const sub1 = await createSubtask(app, task.id);
      const sub2 = await createSubtask(app, task.id);

      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);

      await supertest(app.server).get(`/api/tasks/${sub1.id}`).expect(404);
      await supertest(app.server).get(`/api/tasks/${sub2.id}`).expect(404);
    });

    it("löscht Kommentare der Aufgabe via task_id-FK", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      await postComment(app, "tasks", task.id);

      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(comments)
        .where(and(eq(comments.entityType, "task"), eq(comments.entityId, task.id)))
        .all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht den notes-Datensatz der Aufgabe (nicht nur den Join-Eintrag)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const note = await createNoteForTask(app, task.id);

      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);

      const remaining = testDb.db.select().from(notes).where(eq(notes.id, note.id)).all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht notes-Datensätze von Sub-Tasks (nicht nur Join-Einträge)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const sub = await createSubtask(app, task.id);
      const note = await createNoteForTask(app, sub.id);

      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);

      const remaining = testDb.db.select().from(notes).where(eq(notes.id, note.id)).all();
      expect(remaining).toHaveLength(0);
    });

    it("entfernt task_tags-Einträge (Tag selbst bleibt erhalten)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const tag = await createTag(app);
      await setTaskTags(app, task.id, [tag.id]);

      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);

      const remaining = testDb.db.select().from(taskTags).where(eq(taskTags.taskId, task.id)).all();
      expect(remaining).toHaveLength(0);
    });

    it("entfernt task_features-Einträge (Feature bleibt erhalten)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const feature = await createFeature(app);
      await setTaskFeatures(app, task.id, [feature.id]);

      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);

      const remaining = testDb.db.select().from(taskFeatures).where(eq(taskFeatures.taskId, task.id)).all();
      expect(remaining).toHaveLength(0);

      const featureStillExists = testDb.db.select().from(features).where(eq(features.id, feature.id)).all();
      expect(featureStillExists).toHaveLength(1);
    });

    it("entfernt task_use_cases-Einträge (UseCase bleibt erhalten)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const feature = await createFeature(app);
      const useCase = await createUseCase(app, feature.id);
      await setTaskUseCases(app, task.id, [useCase.id]);

      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);

      const remaining = testDb.db.select().from(taskUseCases).where(eq(taskUseCases.taskId, task.id)).all();
      expect(remaining).toHaveLength(0);

      const ucStillExists = testDb.db.select().from(useCases).where(eq(useCases.id, useCase.id)).all();
      expect(ucStillExists).toHaveLength(1);
    });
  });

  // =========================================================================
  // FEATURE LÖSCHEN
  // =========================================================================

  describe("deleteFeature – alle abhängigen Objekte werden entfernt", () => {
    it("löscht alle UseCases des Features", async () => {
      const feature = await createFeature(app);
      const uc1 = await createUseCase(app, feature.id);
      const uc2 = await createUseCase(app, feature.id);

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remaining = testDb.db.select().from(useCases).where(eq(useCases.featureId, feature.id)).all();
      expect(remaining).toHaveLength(0);
      await supertest(app.server).get(`/api/use-cases/${uc1.id}`).expect(404);
      await supertest(app.server).get(`/api/use-cases/${uc2.id}`).expect(404);
    });

    it("löscht Kommentare mit entityType='feature'", async () => {
      const feature = await createFeature(app);
      await postComment(app, "features", feature.id);

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(comments)
        .where(and(eq(comments.entityType, "feature"), eq(comments.entityId, feature.id)))
        .all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht Kommentare der zugehörigen UseCases (entityType='useCase')", async () => {
      const feature = await createFeature(app);
      const uc = await createUseCase(app, feature.id);
      await postComment(app, "use-cases", uc.id);

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(comments)
        .where(and(eq(comments.entityType, "useCase"), eq(comments.entityId, uc.id)))
        .all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht task_use_cases-Einträge der UseCases des Features", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const feature = await createFeature(app);
      const uc = await createUseCase(app, feature.id);
      await setTaskUseCases(app, task.id, [uc.id]);

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remaining = testDb.db.select().from(taskUseCases).where(eq(taskUseCases.useCaseId, uc.id)).all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht feature_relations auf beiden Seiten (source und target)", async () => {
      const featureA = await createFeature(app);
      const featureB = await createFeature(app);
      await setFeatureRelation(app, featureA.id, featureB.id);

      // Relation A→B existiert
      const before = testDb.db
        .select()
        .from(featureRelations)
        .where(eq(featureRelations.sourceFeatureId, featureA.id))
        .all();
      expect(before).toHaveLength(1);

      // Feature B löschen – Relation muss verschwinden (target-Seite cascade)
      await supertest(app.server).delete(`/api/features/${featureB.id}`).expect(204);

      const after = testDb.db
        .select()
        .from(featureRelations)
        .where(eq(featureRelations.sourceFeatureId, featureA.id))
        .all();
      expect(after).toHaveLength(0);
    });

    it("löscht feature_relations auf source-Seite wenn source-Feature gelöscht wird", async () => {
      const featureA = await createFeature(app);
      const featureB = await createFeature(app);
      await setFeatureRelation(app, featureA.id, featureB.id);

      await supertest(app.server).delete(`/api/features/${featureA.id}`).expect(204);

      const after = testDb.db
        .select()
        .from(featureRelations)
        .where(eq(featureRelations.targetFeatureId, featureB.id))
        .all();
      expect(after).toHaveLength(0);
    });

    it("entfernt task_features-Einträge (Task bleibt erhalten)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const feature = await createFeature(app);
      await setTaskFeatures(app, task.id, [feature.id]);

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remaining = testDb.db.select().from(taskFeatures).where(eq(taskFeatures.featureId, feature.id)).all();
      expect(remaining).toHaveLength(0);
    });

    it("entfernt project_features-Einträge (Projekt bleibt erhalten)", async () => {
      const project = await createProject(app);
      const feature = await createFeature(app);
      await setProjectFeatures(app, project.id, [feature.id]);

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remaining = testDb.db.select().from(projectFeatures).where(eq(projectFeatures.featureId, feature.id)).all();
      expect(remaining).toHaveLength(0);
    });

    it("setzt featureId bei BacklogItems auf null (BacklogItem bleibt erhalten)", async () => {
      const project = await createProject(app);
      const feature = await createFeature(app);
      const item = await createBacklogItem(app, project.id, { featureId: feature.id });

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remaining = testDb.db.select().from(backlogItems).where(eq(backlogItems.id, item.id)).all();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].featureId).toBeNull();
    });
  });

  // =========================================================================
  // USE CASE LÖSCHEN
  // =========================================================================

  describe("deleteUseCase – alle abhängigen Objekte werden entfernt", () => {
    it("löscht Kommentare mit entityType='useCase'", async () => {
      const feature = await createFeature(app);
      const uc = await createUseCase(app, feature.id);
      await postComment(app, "use-cases", uc.id);

      await supertest(app.server).delete(`/api/use-cases/${uc.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(comments)
        .where(and(eq(comments.entityType, "useCase"), eq(comments.entityId, uc.id)))
        .all();
      expect(remaining).toHaveLength(0);
    });

    it("entfernt task_use_cases-Einträge (Task bleibt erhalten)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const feature = await createFeature(app);
      const uc = await createUseCase(app, feature.id);
      await setTaskUseCases(app, task.id, [uc.id]);

      await supertest(app.server).delete(`/api/use-cases/${uc.id}`).expect(204);

      const remaining = testDb.db.select().from(taskUseCases).where(eq(taskUseCases.useCaseId, uc.id)).all();
      expect(remaining).toHaveLength(0);
    });

    it("setzt useCaseId bei BacklogItems auf null (BacklogItem bleibt erhalten)", async () => {
      const project = await createProject(app);
      const feature = await createFeature(app);
      const uc = await createUseCase(app, feature.id);
      const item = await createBacklogItem(app, project.id, { useCaseId: uc.id });

      await supertest(app.server).delete(`/api/use-cases/${uc.id}`).expect(204);

      const remaining = testDb.db.select().from(backlogItems).where(eq(backlogItems.id, item.id)).all();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].useCaseId).toBeNull();
    });
  });

  // =========================================================================
  // TICKET LÖSCHEN
  // =========================================================================

  describe("deleteTicket – alle abhängigen Objekte werden entfernt", () => {
    it("löscht Sub-Tickets rekursiv", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const sub = await createSubTicket(app, ticket.id);

      await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);

      await supertest(app.server).get(`/api/tickets/${sub.id}`).expect(404);
    });

    it("löscht Kommentare mit entityType='ticket'", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      await postComment(app, "tickets", ticket.id);

      await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(comments)
        .where(and(eq(comments.entityType, "ticket"), eq(comments.entityId, ticket.id)))
        .all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht Kommentare von Sub-Tickets (entityType='ticket')", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const sub = await createSubTicket(app, ticket.id);
      await postComment(app, "tickets", sub.id);

      await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(comments)
        .where(and(eq(comments.entityType, "ticket"), eq(comments.entityId, sub.id)))
        .all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht den notes-Datensatz des Tickets (nicht nur den Join-Eintrag)", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const noteId = await createNoteForTicket(app, ticket.id);

      await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);

      const remaining = testDb.db.select().from(notes).where(eq(notes.id, noteId)).all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht notes-Datensätze von Sub-Tickets", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const sub = await createSubTicket(app, ticket.id);
      const noteId = await createNoteForTicket(app, sub.id);

      await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);

      const remaining = testDb.db.select().from(notes).where(eq(notes.id, noteId)).all();
      expect(remaining).toHaveLength(0);
    });

    it("löscht ticket_relations auf beiden Seiten (source und target)", async () => {
      const project = await createProject(app);
      const ticketA = await createTicket(app, project.id);
      const ticketB = await createTicket(app, project.id);

      await supertest(app.server)
        .post(`/api/tickets/${ticketA.id}/relations`)
        .send({ targetTicketId: ticketB.id, relationType: "related" })
        .expect(201);

      const before = testDb.db
        .select()
        .from(ticketRelations)
        .where(eq(ticketRelations.sourceTicketId, ticketA.id))
        .all();
      expect(before).toHaveLength(1);

      // Ticket B löschen – Relation muss verschwinden (target-Seite cascade)
      await supertest(app.server).delete(`/api/tickets/${ticketB.id}`).expect(204);

      const after = testDb.db
        .select()
        .from(ticketRelations)
        .where(eq(ticketRelations.sourceTicketId, ticketA.id))
        .all();
      expect(after).toHaveLength(0);
    });

    it("entfernt ticket_tags-Einträge (Tag bleibt erhalten)", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const tag = await createTag(app);
      await setTicketTags(app, ticket.id, [tag.id]);

      await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);

      const remaining = testDb.db.select().from(ticketTags).where(eq(ticketTags.ticketId, ticket.id)).all();
      expect(remaining).toHaveLength(0);
    });
  });

  // =========================================================================
  // BACKLOG ITEM LÖSCHEN
  // =========================================================================

  describe("deleteBacklogItem – alle abhängigen Objekte werden entfernt", () => {
    it("löscht Kommentare mit entityType='backlogItem'", async () => {
      const project = await createProject(app);
      const item = await createBacklogItem(app, project.id);
      await postComment(app, "backlog", item.id);

      await supertest(app.server).delete(`/api/backlog/${item.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(comments)
        .where(and(eq(comments.entityType, "backlogItem"), eq(comments.entityId, item.id)))
        .all();
      expect(remaining).toHaveLength(0);
    });
  });

  // =========================================================================
  // WIKI PAGE LÖSCHEN
  // =========================================================================

  describe("deleteWikiPage – alle abhängigen Objekte werden entfernt", () => {
    it("löscht Kommentare mit entityType='wikiPage'", async () => {
      const page = await createWikiPage(app);
      await postComment(app, "wiki", page.id);

      await supertest(app.server).delete(`/api/wiki/${page.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(comments)
        .where(and(eq(comments.entityType, "wikiPage"), eq(comments.entityId, page.id)))
        .all();
      expect(remaining).toHaveLength(0);
    });

    it("verhindert das Löschen einer WikiPage die Kinder hat (restrict)", async () => {
      const parent = await createWikiPage(app);
      await createWikiPage(app, { parentId: parent.id });

      await supertest(app.server).delete(`/api/wiki/${parent.id}`).expect(409);
    });
  });

  // =========================================================================
  // TAG LÖSCHEN
  // =========================================================================

  describe("deleteTag – alle Join-Tabelleneinträge werden entfernt", () => {
    it("entfernt project_tags-Einträge (Projekt bleibt erhalten)", async () => {
      const project = await createProject(app);
      const tag = await createTag(app);
      await setProjectTags(app, project.id, [tag.id]);

      await supertest(app.server).delete(`/api/tags/${tag.id}`).expect(204);

      const remaining = testDb.db.select().from(projectTags).where(eq(projectTags.tagId, tag.id)).all();
      expect(remaining).toHaveLength(0);

      await supertest(app.server).get(`/api/projects/${project.id}`).expect(200);
    });

    it("entfernt task_tags-Einträge (Task bleibt erhalten)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const tag = await createTag(app);
      await setTaskTags(app, task.id, [tag.id]);

      await supertest(app.server).delete(`/api/tags/${tag.id}`).expect(204);

      const remaining = testDb.db.select().from(taskTags).where(eq(taskTags.tagId, tag.id)).all();
      expect(remaining).toHaveLength(0);

      await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
    });

    it("entfernt ticket_tags-Einträge (Ticket bleibt erhalten)", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const tag = await createTag(app);
      await setTicketTags(app, ticket.id, [tag.id]);

      await supertest(app.server).delete(`/api/tags/${tag.id}`).expect(204);

      const remaining = testDb.db.select().from(ticketTags).where(eq(ticketTags.tagId, tag.id)).all();
      expect(remaining).toHaveLength(0);

      await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    });
  });

  // =========================================================================
  // KEINE SEITENEFFEKTE – übergreifende Isolationstests
  // =========================================================================

  describe("Keine Seiteneffekte auf nicht betroffene Objekte", () => {
    it("Löschen von Projekt A beeinflusst Projekt B nicht", async () => {
      const projectA = await createProject(app, { name: "Projekt A" });
      const projectB = await createProject(app, { name: "Projekt B" });
      const taskB = await createTask(app, projectB.id);

      await supertest(app.server).delete(`/api/projects/${projectA.id}`).expect(204);

      await supertest(app.server).get(`/api/projects/${projectB.id}`).expect(200);
      await supertest(app.server).get(`/api/tasks/${taskB.id}`).expect(200);
    });

    it("Löschen eines Tags entfernt nur dessen eigene Verknüpfungen", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const tagA = await createTag(app);
      const tagB = await createTag(app);
      await setTaskTags(app, task.id, [tagA.id, tagB.id]);

      await supertest(app.server).delete(`/api/tags/${tagA.id}`).expect(204);

      const remaining = testDb.db.select().from(taskTags).where(eq(taskTags.taskId, task.id)).all();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].tagId).toBe(tagB.id);
    });

    it("Löschen eines Features lässt andere Features und deren Relationen unangetastet", async () => {
      const featureA = await createFeature(app);
      const featureB = await createFeature(app);
      const featureC = await createFeature(app);
      await setFeatureRelation(app, featureB.id, featureC.id);

      await supertest(app.server).delete(`/api/features/${featureA.id}`).expect(204);

      const remaining = testDb.db
        .select()
        .from(featureRelations)
        .where(eq(featureRelations.sourceFeatureId, featureB.id))
        .all();
      expect(remaining).toHaveLength(1);
    });

    it("keine verwaisten notes-Einträge nach mehrfachen Löschvorgängen", async () => {
      const notesBefore = testDb.db.select().from(notes).all();
      expect(notesBefore).toHaveLength(0);

      const project = await createProject(app);
      const task = await createTask(app, project.id);
      await createNoteForProject(app, project.id);
      await createNoteForTask(app, task.id);

      const notesDuring = testDb.db.select().from(notes).all();
      expect(notesDuring).toHaveLength(2);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const notesAfter = testDb.db.select().from(notes).all();
      expect(notesAfter).toHaveLength(0);
    });

    it("keine verwaisten comments-Einträge nach Löschen verschiedener Entity-Typen", async () => {
      const project = await createProject(app);
      const feature = await createFeature(app);
      const uc = await createUseCase(app, feature.id);
      const wiki = await createWikiPage(app);

      await postComment(app, "projects", project.id);
      await postComment(app, "features", feature.id);
      await postComment(app, "use-cases", uc.id);
      await postComment(app, "wiki", wiki.id);

      expect(testDb.db.select().from(comments).all()).toHaveLength(4);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);
      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);
      await supertest(app.server).delete(`/api/wiki/${wiki.id}`).expect(204);

      const remaining = testDb.db.select().from(comments).all();
      expect(remaining).toHaveLength(0);
    });
  });
});
