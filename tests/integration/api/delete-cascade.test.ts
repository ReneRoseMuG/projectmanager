/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Löschvorgänge entfernen abhängige Join-Tabellen-Einträge.
 * - Owner-basierte Comments werden über ihre Owner-Join-Tabellen bereinigt.
 * - Notes, Tags, Tickets, Tasks, Wiki-Seiten und Relationen behalten ihre jeweilige Löschregel.
 *
 * Fehlerfälle:
 * - Owner-Unlink darf mehrfach verknüpfte Tickets oder Tasks nicht löschen.
 * - Restrict-Regeln müssen weiterhin blockieren, wenn abhängige Objekte existieren.
 *
 * Ziel:
 * Die vollständige Lösch-Kaskadierung über das bereinigte Owner-/Join-Modell absichern.
 */

import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import {
  attachments,
  backlogItems,
  comments,
  dayPlanNotes,
  dayPlanTasks,
  dayPlans,
  featureAttachments,
  featureRelations,
  featureTasks,
  featureTickets,
  features,
  milestoneTags,
  notes,
  projectEvents,
  projectFeatures,
  projectNotes,
  projectTags,
  projectTasks,
  projectTickets,
  taskNotes,
  taskTags,
  ticketAttachments,
  ticketNotes,
  ticketRelations,
  ticketTags,
  tickets,
  useCaseTasks,
  useCases,
  wikiPageAttachments,
  wikiPageNotes,
  wikiPageRelations,
  wikiPageTasks,
  wikiPageTickets,
  wikiPages
} from "../../../apps/api/src/db/schema.js";
import {
  buildTestApp,
  createBacklogItem,
  createFeature,
  createMilestone,
  createNoteForProject,
  createNoteForTask,
  createNoteForWikiPage,
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
} from "../../fixtures/api/index.js";

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

/** Attachment direkt in DB anlegen und mit Owner verknüpfen */
async function insertAttachmentFor(
  testDb: TestDb,
  joinTable: string,
  ownerColumn: string,
  ownerId: number
): Promise<number> {
  const now = new Date().toISOString();
  const [result] = await testDb.pool.execute(
    "INSERT INTO attachments (original_name, filename, mimetype, size, kind, version, created_at, updated_at) VALUES (?, ?, ?, ?, 'parent_attachment', 1, ?, ?)",
    ["test.txt", `att-${Date.now()}.txt`, "text/plain", 100, now, now]
  );
  const attachmentId = (result as { insertId: number }).insertId;
  await testDb.pool.execute(
    `INSERT INTO \`${joinTable}\` (\`${ownerColumn}\`, attachment_id) VALUES (?, ?)`,
    [ownerId, attachmentId]
  );
  return attachmentId;
}

/** Features einem Projekt zuweisen */
async function setProjectFeatures(app: FastifyInstance, projectId: number, featureIds: number[]): Promise<void> {
  await supertest(app.server).put(`/api/projects/${projectId}/features`).send({ featureIds }).expect(200);
}

/** Features einer Aufgabe zuweisen */
async function setTaskFeatures(app: FastifyInstance, taskId: number, featureIds: number[]): Promise<void> {
  for (const featureId of featureIds) {
    await supertest(app.server).post(`/api/features/${featureId}/tasks/${taskId}`).expect(200);
  }
}

/** UseCases einer Aufgabe zuweisen */
async function setTaskUseCases(app: FastifyInstance, taskId: number, useCaseIds: number[]): Promise<void> {
  for (const useCaseId of useCaseIds) {
    await supertest(app.server).post(`/api/use-cases/${useCaseId}/tasks/${taskId}`).expect(200);
  }
}

// ---------------------------------------------------------------------------
// Test-Suite
// ---------------------------------------------------------------------------

const uploadDir = path.join(os.tmpdir(), `taskmanager-cascade-uploads-${process.pid}`);
const previewCacheDir = path.join(os.tmpdir(), `taskmanager-cascade-previews-${process.pid}`);
let originalUploadDir: string;
let originalPreviewCacheDir: string;

describe("Delete-Cascade: vollständige Bereinigung aller abhängigen Objekte", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    originalUploadDir = config.uploadDir;
    originalPreviewCacheDir = config.previewCacheDir;
    config.uploadDir = uploadDir;
    config.previewCacheDir = previewCacheDir;
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(previewCacheDir, { recursive: true });
    testDb = await createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(async () => { await truncateAll(testDb.pool); });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
    config.uploadDir = originalUploadDir;
    config.previewCacheDir = originalPreviewCacheDir;
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
  });

  // =========================================================================
  // PROJEKT LÖSCHEN
  // =========================================================================

  describe("deleteProject – alle abhängigen Objekte werden entfernt", () => {
    it("löscht alle Tasks des Projekts", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remainingLinks = (await testDb.db.select().from(projectTasks).where(eq(projectTasks.ownerId, project.id)));
      expect(remainingLinks).toHaveLength(0);
      await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
    });

    it("löscht Sub-Tasks der Projekt-Tasks rekursiv", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const sub = await createSubtask(app, task.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      await supertest(app.server).get(`/api/tasks/${sub.id}`).expect(200);
    });

    it("behält Task-Kommentare, solange der Task-Owner bestehen bleibt", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const commentId = await postComment(app, "tasks", task.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(1);
    });

    it("löscht Kommentare über den Project-Owner-Join", async () => {
      const project = await createProject(app);
      const commentId = await postComment(app, "projects", project.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(0);
    });

    it("löscht Kommentare der BacklogItems über den Owner-Join", async () => {
      const project = await createProject(app);
      const item = await createBacklogItem(app, project.id);
      const commentId = await postComment(app, "backlog", item.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(0);
    });

    it("behält Kommentare der Tickets beim Entfernen des Projekt-Links", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const commentId = await postComment(app, "tickets", ticket.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(1);
    });

    it("behält Kommentare der Sub-Tickets beim Entfernen des Projekt-Links", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const sub = await createSubTicket(app, ticket.id);
      const commentId = await postComment(app, "tickets", sub.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(1);
    });

    it("löscht den notes-Datensatz von Projekt-Notes (nicht nur den Join-Eintrag)", async () => {
      const project = await createProject(app);
      const note = await createNoteForProject(app, project.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = (await testDb.db.select().from(notes).where(eq(notes.id, note.id)));
      expect(remaining).toHaveLength(0);
    });

    it("löscht den notes-Datensatz von Task-Notes (nicht nur den Join-Eintrag)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const note = await createNoteForTask(app, task.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = (await testDb.db.select().from(notes).where(eq(notes.id, note.id)));
      expect(remaining).toHaveLength(1);
    });

    it("behält Ticket-Notes beim Entfernen des Projekt-Links", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const noteId = await createNoteForTicket(app, ticket.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = (await testDb.db.select().from(notes).where(eq(notes.id, noteId)));
      expect(remaining).toHaveLength(1);
    });

    it("entfernt project_tags-Einträge (Tag selbst bleibt erhalten)", async () => {
      const project = await createProject(app);
      const tag = await createTag(app);
      await setProjectTags(app, project.id, [tag.id]);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = (await testDb.db.select().from(projectTags).where(eq(projectTags.projectId, project.id)));
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

      const remaining = (await testDb.db.select().from(backlogItems).where(eq(backlogItems.id, item.id)));
      expect(remaining).toHaveLength(0);
    });

    it("entfernt project_tickets-Einträge, Ticket und Sub-Ticket bleiben erhalten", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const sub = await createSubTicket(app, ticket.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remainingLinks = (await testDb.db.select().from(projectTickets).where(eq(projectTickets.ownerId, project.id)));
      expect(remainingLinks).toHaveLength(0);

      const remainingTicket = (await testDb.db.select().from(tickets).where(eq(tickets.id, ticket.id)));
      expect(remainingTicket).toHaveLength(1);

      const remainingSub = (await testDb.db.select().from(tickets).where(eq(tickets.id, sub.id)));
      expect(remainingSub).toHaveLength(1);
    });

    it("entfernt Project-Event-Junctions, Events bleiben erhalten", async () => {
      const project = await createProject(app);
      const res = await supertest(app.server)
        .post("/api/events")
        .send({
          title: "Termin",
          startTime: "2026-07-01T10:00:00",
          endTime: "2026-07-01T11:00:00",
          isAllDay: false,
          owners: [{ type: "project", id: project.id }]
        })
        .expect(201);
      const eventId = (res.body as { id: number }).id;

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const event = await supertest(app.server).get(`/api/events/${eventId}`).expect(200);
      expect(event.body.owners).toEqual([]);
      expect((await testDb.db.select().from(projectEvents).where(eq(projectEvents.eventId, eventId)))).toHaveLength(0);
    });

    it("behält WikiPage beim Löschen des verknüpften Projekts", async () => {
      const project = await createProject(app);
      const wiki = await createWikiPage(app);
      await supertest(app.server).patch(`/api/projects/${project.id}`).send({ wikiPageId: wiki.id, expectedVersion: project.version }).expect(200);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = (await testDb.db.select().from(wikiPages).where(eq(wikiPages.id, wiki.id)));
      expect(remaining).toHaveLength(1);
      expect(remaining[0].title).toBe(wiki.title);
    });

    it("entfernt project_features-Einträge, Feature selbst bleibt erhalten", async () => {
      const project = await createProject(app);
      const feature = await createFeature(app);
      await setProjectFeatures(app, project.id, [feature.id]);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const joinRemaining = (await testDb.db.select().from(projectFeatures).where(eq(projectFeatures.projectId, project.id)));
      expect(joinRemaining).toHaveLength(0);

      const featureStillExists = (await testDb.db.select().from(features).where(eq(features.id, feature.id)));
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

      await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${task.id}`).expect(204);
      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);

      await supertest(app.server).get(`/api/tasks/${sub1.id}`).expect(404);
      await supertest(app.server).get(`/api/tasks/${sub2.id}`).expect(404);
    });

    it("löscht Kommentare der Aufgabe über den Owner-Join", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const commentId = await postComment(app, "tasks", task.id);

      await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${task.id}`).expect(204);
      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(0);
    });

    it("löscht den notes-Datensatz der Aufgabe (nicht nur den Join-Eintrag)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const note = await createNoteForTask(app, task.id);

      await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${task.id}`).expect(204);
      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);

      const remaining = (await testDb.db.select().from(notes).where(eq(notes.id, note.id)));
      expect(remaining).toHaveLength(0);
    });

    it("löscht notes-Datensätze von Sub-Tasks (nicht nur Join-Einträge)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const sub = await createSubtask(app, task.id);
      const note = await createNoteForTask(app, sub.id);

      await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${task.id}`).expect(204);
      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);

      const remaining = (await testDb.db.select().from(notes).where(eq(notes.id, note.id)));
      expect(remaining).toHaveLength(0);
    });

    it("entfernt task_tags-Einträge (Tag selbst bleibt erhalten)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const tag = await createTag(app);
      await setTaskTags(app, task.id, [tag.id]);

      await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${task.id}`).expect(204);
      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);

      const remaining = (await testDb.db.select().from(taskTags).where(eq(taskTags.taskId, task.id)));
      expect(remaining).toHaveLength(0);
    });

    it("blockiert Löschen bei Feature-Aufgabenbeziehung", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const feature = await createFeature(app);
      await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${task.id}`).expect(204);
      await setTaskFeatures(app, task.id, [feature.id]);

      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(409);

      const remaining = (await testDb.db.select().from(featureTasks).where(eq(featureTasks.taskId, task.id)));
      expect(remaining).toHaveLength(1);

      const featureStillExists = (await testDb.db.select().from(features).where(eq(features.id, feature.id)));
      expect(featureStillExists).toHaveLength(1);
    });

    it("blockiert Löschen bei Use-Case-Aufgabenbeziehung", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const feature = await createFeature(app);
      await setProjectFeatures(app, project.id, [feature.id]);
      const useCase = await createUseCase(app, feature.id);
      await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${task.id}`).expect(204);
      await setTaskUseCases(app, task.id, [useCase.id]);

      await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(409);

      const remaining = (await testDb.db.select().from(useCaseTasks).where(eq(useCaseTasks.taskId, task.id)));
      expect(remaining).toHaveLength(1);

      const ucStillExists = (await testDb.db.select().from(useCases).where(eq(useCases.id, useCase.id)));
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

      const remaining = (await testDb.db.select().from(useCases).where(eq(useCases.featureId, feature.id)));
      expect(remaining).toHaveLength(0);
      await supertest(app.server).get(`/api/use-cases/${uc1.id}`).expect(404);
      await supertest(app.server).get(`/api/use-cases/${uc2.id}`).expect(404);
    });

    it("löscht Kommentare über den Feature-Owner-Join", async () => {
      const feature = await createFeature(app);
      const commentId = await postComment(app, "features", feature.id);

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(0);
    });

    it("löscht Kommentare der zugehörigen UseCases über den Owner-Join", async () => {
      const feature = await createFeature(app);
      const uc = await createUseCase(app, feature.id);
      const commentId = await postComment(app, "use-cases", uc.id);

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(0);
    });

    it("löscht task_use_cases-Einträge der UseCases des Features", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const feature = await createFeature(app);
      await setProjectFeatures(app, project.id, [feature.id]);
      const uc = await createUseCase(app, feature.id);
      await setTaskUseCases(app, task.id, [uc.id]);

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remaining = (await testDb.db.select().from(useCaseTasks).where(eq(useCaseTasks.ownerId, uc.id)));
      expect(remaining).toHaveLength(0);
    });

    it("löscht feature_relations auf beiden Seiten (source und target)", async () => {
      const featureA = await createFeature(app);
      const featureB = await createFeature(app);
      await setFeatureRelation(app, featureA.id, featureB.id);

      // Relation A→B existiert
      const before = await testDb.db
        .select()
        .from(featureRelations)
        .where(eq(featureRelations.sourceFeatureId, featureA.id));

      expect(before).toHaveLength(1);

      // Feature B löschen – Relation muss verschwinden (target-Seite cascade)
      await supertest(app.server).delete(`/api/features/${featureB.id}`).expect(204);

      const after = await testDb.db
        .select()
        .from(featureRelations)
        .where(eq(featureRelations.sourceFeatureId, featureA.id));

      expect(after).toHaveLength(0);
    });

    it("löscht feature_relations auf source-Seite wenn source-Feature gelöscht wird", async () => {
      const featureA = await createFeature(app);
      const featureB = await createFeature(app);
      await setFeatureRelation(app, featureA.id, featureB.id);

      await supertest(app.server).delete(`/api/features/${featureA.id}`).expect(204);

      const after = await testDb.db
        .select()
        .from(featureRelations)
        .where(eq(featureRelations.targetFeatureId, featureB.id));

      expect(after).toHaveLength(0);
    });

    it("entfernt task_features-Einträge (Task bleibt erhalten)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const feature = await createFeature(app);
      await setProjectFeatures(app, project.id, [feature.id]);
      await setTaskFeatures(app, task.id, [feature.id]);

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remaining = (await testDb.db.select().from(featureTasks).where(eq(featureTasks.ownerId, feature.id)));
      expect(remaining).toHaveLength(0);
    });

    it("entfernt project_features-Einträge (Projekt bleibt erhalten)", async () => {
      const project = await createProject(app);
      const feature = await createFeature(app);
      await setProjectFeatures(app, project.id, [feature.id]);

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remaining = (await testDb.db.select().from(projectFeatures).where(eq(projectFeatures.featureId, feature.id)));
      expect(remaining).toHaveLength(0);
    });

    it("setzt featureId bei BacklogItems auf null (BacklogItem bleibt erhalten)", async () => {
      const project = await createProject(app);
      const feature = await createFeature(app);
      const item = await createBacklogItem(app, project.id, { featureId: feature.id });

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remaining = (await testDb.db.select().from(backlogItems).where(eq(backlogItems.id, item.id)));
      expect(remaining).toHaveLength(1);
      expect(remaining[0].featureId).toBeNull();
    });

    it("entfernt feature_attachments-Join und exklusiven Attachment-Datensatz", async () => {
      const feature = await createFeature(app);
      const attachmentId = await insertAttachmentFor(testDb, "feature_attachments", "feature_id", feature.id);

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remainingLinks = (await testDb.db.select().from(featureAttachments).where(eq(featureAttachments.featureId, feature.id)));
      expect(remainingLinks).toHaveLength(0);
      const remaining = (await testDb.db.select().from(attachments).where(eq(attachments.id, attachmentId)));
      expect(remaining).toHaveLength(0);
    });

    it("entfernt feature_tickets-Einträge (Ticket bleibt erhalten)", async () => {
      const feature = await createFeature(app);
      const ticket = await createTicket(app, { type: "feature", id: feature.id });

      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);

      const remainingLinks = (await testDb.db.select().from(featureTickets).where(eq(featureTickets.ownerId, feature.id)));
      expect(remainingLinks).toHaveLength(0);

      await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    });
  });

  // =========================================================================
  // USE CASE LÖSCHEN
  // =========================================================================

  describe("deleteUseCase – alle abhängigen Objekte werden entfernt", () => {
    it("löscht Kommentare über den Use-Case-Owner-Join", async () => {
      const feature = await createFeature(app);
      const uc = await createUseCase(app, feature.id);
      const commentId = await postComment(app, "use-cases", uc.id);

      await supertest(app.server).delete(`/api/use-cases/${uc.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(0);
    });

    it("entfernt task_use_cases-Einträge (Task bleibt erhalten)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const feature = await createFeature(app);
      await setProjectFeatures(app, project.id, [feature.id]);
      const uc = await createUseCase(app, feature.id);
      await setTaskUseCases(app, task.id, [uc.id]);

      await supertest(app.server).delete(`/api/use-cases/${uc.id}`).expect(204);

      const remaining = (await testDb.db.select().from(useCaseTasks).where(eq(useCaseTasks.ownerId, uc.id)));
      expect(remaining).toHaveLength(0);
    });

    it("setzt useCaseId bei BacklogItems auf null (BacklogItem bleibt erhalten)", async () => {
      const project = await createProject(app);
      const feature = await createFeature(app);
      const uc = await createUseCase(app, feature.id);
      const item = await createBacklogItem(app, project.id, { useCaseId: uc.id });

      await supertest(app.server).delete(`/api/use-cases/${uc.id}`).expect(204);

      const remaining = (await testDb.db.select().from(backlogItems).where(eq(backlogItems.id, item.id)));
      expect(remaining).toHaveLength(1);
      expect(remaining[0].useCaseId).toBeNull();
    });
  });

  // =========================================================================
  // TICKET LÖSCHEN
  // =========================================================================

  describe("deleteTicket – alle abhängigen Objekte werden entfernt", () => {
    it("blockiert Ticket-Löschung bei vorhandenen Sub-Tickets", async () => {
      const ticket = await createTicket(app, null);
      const sub = await createSubTicket(app, ticket.id);

      await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(409);

      await supertest(app.server).get(`/api/tickets/${sub.id}`).expect(200);
    });

    it("löscht Kommentare über den Ticket-Owner-Join", async () => {
      const ticket = await createTicket(app, null);
      const commentId = await postComment(app, "tickets", ticket.id);

      await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(0);
    });

    it("löscht Kommentare von direkt gelöschten Sub-Tickets über den Owner-Join", async () => {
      const parent = await createTicket(app, null);
      const sub = await createSubTicket(app, parent.id);
      const commentId = await postComment(app, "tickets", sub.id);

      await supertest(app.server).delete(`/api/tickets/${sub.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(0);
    });

    it("löscht den notes-Datensatz des Tickets (nicht nur den Join-Eintrag)", async () => {
      const ticket = await createTicket(app, null);
      const noteId = await createNoteForTicket(app, ticket.id);

      await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);

      const remaining = (await testDb.db.select().from(notes).where(eq(notes.id, noteId)));
      expect(remaining).toHaveLength(0);
    });

    it("löscht notes-Datensätze von direkt gelöschten Sub-Tickets", async () => {
      const parent = await createTicket(app, null);
      const sub = await createSubTicket(app, parent.id);
      const noteId = await createNoteForTicket(app, sub.id);

      await supertest(app.server).delete(`/api/tickets/${sub.id}`).expect(204);

      const remaining = (await testDb.db.select().from(notes).where(eq(notes.id, noteId)));
      expect(remaining).toHaveLength(0);
    });

    it("blockiert Ticket-Löschung bei vorhandenen Ticket-Relationen", async () => {
      const ticketA = await createTicket(app, null);
      const ticketB = await createTicket(app, null);

      await supertest(app.server)
        .post(`/api/tickets/${ticketA.id}/relations`)
        .send({ targetTicketId: ticketB.id, relationType: "related" })
        .expect(201);

      const before = await testDb.db
        .select()
        .from(ticketRelations)
        .where(eq(ticketRelations.sourceTicketId, ticketA.id));

      expect(before).toHaveLength(1);

      await supertest(app.server).delete(`/api/tickets/${ticketB.id}`).expect(409);

      const after = await testDb.db
        .select()
        .from(ticketRelations)
        .where(eq(ticketRelations.sourceTicketId, ticketA.id));

      expect(after).toHaveLength(1);
    });

    it("entfernt ticket_tags-Einträge (Tag bleibt erhalten)", async () => {
      const ticket = await createTicket(app, null);
      const tag = await createTag(app);
      await setTicketTags(app, ticket.id, [tag.id]);

      await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);

      const remaining = (await testDb.db.select().from(ticketTags).where(eq(ticketTags.ticketId, ticket.id)));
      expect(remaining).toHaveLength(0);
    });

    it("entfernt ticket_attachments-Join und exklusiven Attachment-Datensatz", async () => {
      const ticket = await createTicket(app, null);
      const attachmentId = await insertAttachmentFor(testDb, "ticket_attachments", "ticket_id", ticket.id);

      await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);

      const remainingLinks = (await testDb.db.select().from(ticketAttachments).where(eq(ticketAttachments.ticketId, ticket.id)));
      expect(remainingLinks).toHaveLength(0);
      const remaining = (await testDb.db.select().from(attachments).where(eq(attachments.id, attachmentId)));
      expect(remaining).toHaveLength(0);
    });

    it("bereinigt ticket_attachments-Join-Einträge vollständig", async () => {
      const ticket = await createTicket(app, null);
      await insertAttachmentFor(testDb, "ticket_attachments", "ticket_id", ticket.id);
      await insertAttachmentFor(testDb, "ticket_attachments", "ticket_id", ticket.id);

      await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);

      const remaining = (await testDb.db.select().from(ticketAttachments).where(eq(ticketAttachments.ticketId, ticket.id)));
      expect(remaining).toHaveLength(0);
    });
  });

  // =========================================================================
  // BACKLOG ITEM LÖSCHEN
  // =========================================================================

  describe("deleteBacklogItem – alle abhängigen Objekte werden entfernt", () => {
    it("löscht Kommentare über den Backlog-Owner-Join", async () => {
      const project = await createProject(app);
      const item = await createBacklogItem(app, project.id);
      const commentId = await postComment(app, "backlog", item.id);

      await supertest(app.server).delete(`/api/backlog/${item.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(0);
    });
  });

  // =========================================================================
  // WIKI PAGE LÖSCHEN
  // =========================================================================

  describe("deleteWikiPage – alle abhängigen Objekte werden entfernt", () => {
    it("löscht Kommentare über den Wiki-Owner-Join", async () => {
      const page = await createWikiPage(app);
      const commentId = await postComment(app, "wiki", page.id);

      await supertest(app.server).delete(`/api/wiki/${page.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(0);
    });

    it("verhindert das Löschen einer WikiPage die Kinder hat (restrict)", async () => {
      const parent = await createWikiPage(app);
      await createWikiPage(app, { parentId: parent.id });

      await supertest(app.server).delete(`/api/wiki/${parent.id}`).expect(409);
    });

    it("löscht den notes-Datensatz der WikiPage (nicht nur den Join-Eintrag)", async () => {
      const page = await createWikiPage(app);
      const note = await createNoteForWikiPage(app, page.id);

      await supertest(app.server).delete(`/api/wiki/${page.id}`).expect(204);

      const remaining = (await testDb.db.select().from(notes).where(eq(notes.id, note.id)));
      expect(remaining).toHaveLength(0);
    });

    it("bereinigt wiki_page_notes-Join-Einträge vollständig", async () => {
      const page = await createWikiPage(app);
      await createNoteForWikiPage(app, page.id);
      await createNoteForWikiPage(app, page.id);

      await supertest(app.server).delete(`/api/wiki/${page.id}`).expect(204);

      const remaining = (await testDb.db.select().from(wikiPageNotes).where(eq(wikiPageNotes.wikiPageId, page.id)));
      expect(remaining).toHaveLength(0);
    });

    it("entfernt wiki_page_tasks-Einträge (Task bleibt erhalten)", async () => {
      const page = await createWikiPage(app);
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      await supertest(app.server).post(`/api/wiki/${page.id}/tasks`).send({ taskId: task.id }).expect(201);

      await supertest(app.server).delete(`/api/wiki/${page.id}`).expect(204);

      const remainingLinks = (await testDb.db.select().from(wikiPageTasks).where(eq(wikiPageTasks.ownerId, page.id)));
      expect(remainingLinks).toHaveLength(0);

      await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
    });

    it("entfernt wiki_page_tickets-Einträge (Ticket bleibt erhalten)", async () => {
      const page = await createWikiPage(app);
      const ticket = await createTicket(app, null);
      await supertest(app.server).post(`/api/wiki/${page.id}/tickets`).send({ ticketId: ticket.id }).expect(201);

      await supertest(app.server).delete(`/api/wiki/${page.id}`).expect(204);

      const remainingLinks = (await testDb.db.select().from(wikiPageTickets).where(eq(wikiPageTickets.ownerId, page.id)));
      expect(remainingLinks).toHaveLength(0);

      await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    });

    it("entfernt wiki_page_relations wenn source-Seite gelöscht wird", async () => {
      const pageA = await createWikiPage(app);
      const pageB = await createWikiPage(app);
      await supertest(app.server).post(`/api/wiki/${pageA.id}/relations`).send({ targetWikiPageId: pageB.id }).expect(201);

      await supertest(app.server).delete(`/api/wiki/${pageA.id}`).expect(204);

      const remaining = (await testDb.db.select().from(wikiPageRelations).where(eq(wikiPageRelations.sourceWikiPageId, pageA.id)));
      expect(remaining).toHaveLength(0);
    });

    it("entfernt wiki_page_relations wenn target-Seite gelöscht wird", async () => {
      const pageA = await createWikiPage(app);
      const pageB = await createWikiPage(app);
      await supertest(app.server).post(`/api/wiki/${pageA.id}/relations`).send({ targetWikiPageId: pageB.id }).expect(201);

      await supertest(app.server).delete(`/api/wiki/${pageB.id}`).expect(204);

      const remaining = (await testDb.db.select().from(wikiPageRelations).where(eq(wikiPageRelations.sourceWikiPageId, pageA.id)));
      expect(remaining).toHaveLength(0);
    });

    it("entfernt wiki_page_attachments-Join und exklusiven Attachment-Datensatz", async () => {
      const page = await createWikiPage(app);
      const attachmentId = await insertAttachmentFor(testDb, "wiki_page_attachments", "wiki_page_id", page.id);

      await supertest(app.server).delete(`/api/wiki/${page.id}`).expect(204);

      const remainingJoin = (await testDb.db.select().from(wikiPageAttachments).where(eq(wikiPageAttachments.wikiPageId, page.id)));
      expect(remainingJoin).toHaveLength(0);

      const remainingRecord = (await testDb.db.select().from(attachments).where(eq(attachments.id, attachmentId)));
      expect(remainingRecord).toHaveLength(0);
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

      const remaining = (await testDb.db.select().from(projectTags).where(eq(projectTags.tagId, tag.id)));
      expect(remaining).toHaveLength(0);

      await supertest(app.server).get(`/api/projects/${project.id}`).expect(200);
    });

    it("entfernt task_tags-Einträge (Task bleibt erhalten)", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id);
      const tag = await createTag(app);
      await setTaskTags(app, task.id, [tag.id]);

      await supertest(app.server).delete(`/api/tags/${tag.id}`).expect(204);

      const remaining = (await testDb.db.select().from(taskTags).where(eq(taskTags.tagId, tag.id)));
      expect(remaining).toHaveLength(0);

      await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
    });

    it("entfernt ticket_tags-Einträge (Ticket bleibt erhalten)", async () => {
      const project = await createProject(app);
      const ticket = await createTicket(app, project.id);
      const tag = await createTag(app);
      await setTicketTags(app, ticket.id, [tag.id]);

      await supertest(app.server).delete(`/api/tags/${tag.id}`).expect(204);

      const remaining = (await testDb.db.select().from(ticketTags).where(eq(ticketTags.tagId, tag.id)));
      expect(remaining).toHaveLength(0);

      await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    });

    it("entfernt milestone_tags-Einträge (Meilenstein bleibt erhalten)", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      const tag = await createTag(app);
      await supertest(app.server).put(`/api/milestones/${milestone.id}/tags`).send({ tagIds: [tag.id] }).expect(200);

      await supertest(app.server).delete(`/api/tags/${tag.id}`).expect(204);

      const remaining = (await testDb.db.select().from(milestoneTags).where(eq(milestoneTags.tagId, tag.id)));
      expect(remaining).toHaveLength(0);

      await supertest(app.server).get(`/api/milestones/${milestone.id}`).expect(200);
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

      const remaining = (await testDb.db.select().from(taskTags).where(eq(taskTags.taskId, task.id)));
      expect(remaining).toHaveLength(1);
      expect(remaining[0].tagId).toBe(tagB.id);
    });

    it("Löschen eines Features lässt andere Features und deren Relationen unangetastet", async () => {
      const featureA = await createFeature(app);
      const featureB = await createFeature(app);
      const featureC = await createFeature(app);
      await setFeatureRelation(app, featureB.id, featureC.id);

      await supertest(app.server).delete(`/api/features/${featureA.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(featureRelations)
        .where(eq(featureRelations.sourceFeatureId, featureB.id));

      expect(remaining).toHaveLength(1);
    });

    it("keine verwaisten notes-Einträge nach mehrfachen Löschvorgängen", async () => {
      const notesBefore = (await testDb.db.select().from(notes));
      expect(notesBefore).toHaveLength(0);

      const project = await createProject(app);
      const task = await createTask(app, project.id);
      await createNoteForProject(app, project.id);
      await createNoteForTask(app, task.id);

      const notesDuring = (await testDb.db.select().from(notes));
      expect(notesDuring).toHaveLength(2);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const notesAfter = (await testDb.db.select().from(notes));
      expect(notesAfter).toHaveLength(1);
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

      expect((await testDb.db.select().from(comments))).toHaveLength(4);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);
      await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);
      await supertest(app.server).delete(`/api/wiki/${wiki.id}`).expect(204);

      const remaining = (await testDb.db.select().from(comments));
      expect(remaining).toHaveLength(0);
    });
  });

  // =========================================================================
  // DAY PLAN LÖSCHEN (DB-Ebene, kein API-Delete-Endpoint)
  // =========================================================================

  describe("deleteDayPlan (DB-Ebene) – dayPlanTask/dayPlanNote-Join bereinigt", () => {
    it("DayPlan-Löschung kaskadiert dayPlanTasks-Join, Task selbst bleibt erhalten", async () => {
      const project = await createProject(app);
      const task = await createTask(app, project.id, { title: "Cascade DayPlan Task" });

      // DayPlan direkt in DB anlegen (user_id=1 entspricht dem Admin-Seed-User)
      const [dayPlanResult] = await testDb.pool.execute(
        "INSERT INTO day_plans (user_id, date, status, version, created_at, updated_at) VALUES (1, '2026-06-15', 'open', 1, NOW(), NOW())"
      );
      const dayPlanId = (dayPlanResult as { insertId: number }).insertId;

      await testDb.pool.execute(
        "INSERT INTO day_plan_tasks (owner_id, task_id) VALUES (?, ?)",
        [dayPlanId, task.id]
      );

      const before = await testDb.db.select().from(dayPlanTasks).where(eq(dayPlanTasks.taskId, task.id));
      expect(before).toHaveLength(1);

      // Kaskaden-Auslöser: DayPlan auf DB-Ebene löschen
      await testDb.db.delete(dayPlans).where(eq(dayPlans.id, dayPlanId));

      const afterJoin = await testDb.db.select().from(dayPlanTasks).where(eq(dayPlanTasks.taskId, task.id));
      expect(afterJoin).toHaveLength(0);

      // Task selbst noch vorhanden
      await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
    });

    it("DayPlan-Löschung kaskadiert dayPlanNotes-Join, Note selbst bleibt erhalten", async () => {
      // DayPlan direkt anlegen
      const [dayPlanResult] = await testDb.pool.execute(
        "INSERT INTO day_plans (user_id, date, status, version, created_at, updated_at) VALUES (1, '2026-06-16', 'open', 1, NOW(), NOW())"
      );
      const dayPlanId = (dayPlanResult as { insertId: number }).insertId;

      // Note anlegen und verknüpfen (content_json hat kein DEFAULT → muss angegeben werden)
      const [noteResult] = await testDb.pool.execute(
        "INSERT INTO notes (title, content_json, version, created_at, updated_at) VALUES ('Cascade Note', '{}', 1, NOW(), NOW())"
      );
      const noteId = (noteResult as { insertId: number }).insertId;
      await testDb.pool.execute(
        "INSERT INTO day_plan_notes (day_plan_id, note_id) VALUES (?, ?)",
        [dayPlanId, noteId]
      );

      const beforeJoin = await testDb.db.select().from(dayPlanNotes).where(eq(dayPlanNotes.dayPlanId, dayPlanId));
      expect(beforeJoin).toHaveLength(1);

      await testDb.db.delete(dayPlans).where(eq(dayPlans.id, dayPlanId));

      const afterJoin = await testDb.db.select().from(dayPlanNotes).where(eq(dayPlanNotes.dayPlanId, dayPlanId));
      expect(afterJoin).toHaveLength(0);

      const remainingNote = await testDb.db.select().from(notes).where(eq(notes.id, noteId));
      expect(remainingNote).toHaveLength(1);
    });
  });
});
