/**
 * Test Scope:
 * Milestone- und Projekt-Kaskaden für meilenstein-eigene Supportobjekte.
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App, echte MySQL-Testdatenbank und echte Upload-Dateien im Temp-Verzeichnis.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Zufällig benannte MySQL-Testdatenbank und eigener Upload-/Preview-Temp-Root.
 *
 * Abgedeckte Regeln:
 * - Meilenstein-Löschung entfernt eigene Notes, Comments und exklusive Parent-Anhänge vollständig.
 * - Meilenstein-Löschung bereinigt alle Join-Tabellen: Tasks, Tickets, Features, Tags, Events.
 * - Projekt-Löschung löscht Meilensteine (DB-Kaskade) und deren Support-Objekte transitiv.
 *
 * Fehlerfälle:
 * - Verwaiste Support- und Join-Datensätze sowie zurückbleibende Upload-Dateien nach direkten und transitiven Löschungen.
 *
 * Ziel:
 * Die vollständige Bereinigung aller Meilenstein-Abhängigkeiten absichern.
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
  comments,
  milestoneAttachments,
  milestoneComments,
  milestoneEvents,
  milestoneFeatures,
  milestoneNotes,
  milestoneTags,
  milestoneTasks,
  milestoneTickets,
  milestones,
  notes,
} from "../../../apps/api/src/db/schema.js";
import {
  buildTestApp,
  createFeature,
  createMilestone,
  createNoteForMilestone,
  createProject,
  createTag,
  createTask,
  createTestDb,
  createTicket,
  truncateAll,
  type TestDb,
} from "../../fixtures/api/index.js";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

async function postCommentForMilestone(app: FastifyInstance, milestoneId: number): Promise<number> {
  const res = await supertest(app.server)
    .post(`/api/milestones/${milestoneId}/comments`)
    .send({ body: "Milestone-Testkommentar" })
    .expect(201);
  return (res.body as { id: number }).id;
}

async function uploadAttachmentForMilestone(app: FastifyInstance, milestoneId: number): Promise<{ id: number; filename: string }> {
  const response = await supertest(app.server)
    .post(`/api/milestones/${milestoneId}/attachments`)
    .attach("file", Buffer.from("Milestone-Anhang"), { filename: "milestone-test.txt", contentType: "text/plain" })
    .expect(201);
  return { id: response.body.id, filename: response.body.filename };
}

// ---------------------------------------------------------------------------
// Test-Suite
// ---------------------------------------------------------------------------

const uploadDir = path.join(os.tmpdir(), `taskmanager-milestone-cascade-uploads-${process.pid}`);
const previewCacheDir = path.join(os.tmpdir(), `taskmanager-milestone-cascade-previews-${process.pid}`);
let originalUploadDir: string;
let originalPreviewCacheDir: string;

describe("Milestone-Cascade: vollständige Bereinigung aller Meilenstein-Abhängigkeiten", () => {
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
    app = await buildTestApp(testDb, { enableMultipart: true });
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.mkdir(uploadDir, { recursive: true });
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
    config.uploadDir = originalUploadDir;
    config.previewCacheDir = originalPreviewCacheDir;
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
  });

  // =========================================================================
  // MEILENSTEIN LÖSCHEN – SUPPORT-OBJEKTE
  // =========================================================================

  describe("deleteMilestone – Comments werden vollständig gelöscht", () => {
    it("löscht den comment-Datensatz über den Meilenstein-Owner-Join", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      const commentId = await postCommentForMilestone(app, milestone.id);

      await supertest(app.server).delete(`/api/milestones/${milestone.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));

      expect(remaining).toHaveLength(0);
    });

    it("bereinigt alle milestone_comments-Join-Einträge", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      await postCommentForMilestone(app, milestone.id);
      await postCommentForMilestone(app, milestone.id);

      await supertest(app.server).delete(`/api/milestones/${milestone.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(milestoneComments)
        .where(eq(milestoneComments.milestoneId, milestone.id));

      expect(remaining).toHaveLength(0);
    });
  });

  describe("deleteMilestone – Notes werden vollständig gelöscht", () => {
    it("löscht den note-Datensatz über den Meilenstein-Owner-Join", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      const note = await createNoteForMilestone(app, milestone.id);

      await supertest(app.server).delete(`/api/milestones/${milestone.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(notes)
        .where(eq(notes.id, note.id));

      expect(remaining).toHaveLength(0);
    });

    it("bereinigt alle milestone_notes-Join-Einträge", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      await createNoteForMilestone(app, milestone.id);
      await createNoteForMilestone(app, milestone.id);

      await supertest(app.server).delete(`/api/milestones/${milestone.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(milestoneNotes)
        .where(eq(milestoneNotes.milestoneId, milestone.id));

      expect(remaining).toHaveLength(0);
    });
  });

  describe("deleteMilestone – Attachment-Verknüpfungen werden bereinigt", () => {
    it("entfernt milestone_attachments-Join, Attachment-Datensatz und Upload-Datei", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      const attachment = await uploadAttachmentForMilestone(app, milestone.id);

      await supertest(app.server).delete(`/api/milestones/${milestone.id}`).expect(204);

      const remainingLinks = await testDb.db
        .select()
        .from(milestoneAttachments)
        .where(eq(milestoneAttachments.milestoneId, milestone.id));
      expect(remainingLinks).toHaveLength(0);

      const remaining = await testDb.db
        .select()
        .from(attachments)
        .where(eq(attachments.id, attachment.id));

      expect(remaining).toHaveLength(0);
      await expect(fs.stat(path.join(uploadDir, attachment.filename))).rejects.toThrow();
    });

    it("bereinigt alle milestone_attachments-Join-Einträge", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      await uploadAttachmentForMilestone(app, milestone.id);
      await uploadAttachmentForMilestone(app, milestone.id);

      await supertest(app.server).delete(`/api/milestones/${milestone.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(milestoneAttachments)
        .where(eq(milestoneAttachments.milestoneId, milestone.id));

      expect(remaining).toHaveLength(0);
    });
  });

  // =========================================================================
  // MEILENSTEIN LÖSCHEN – JOIN-TABELLEN
  // =========================================================================

  describe("deleteMilestone – Join-Tabellen werden bereinigt", () => {
    it("entfernt milestone_tasks-Einträge (Task bleibt erhalten)", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      const task = await createTask(app, project.id);
      await supertest(app.server).post(`/api/milestones/${milestone.id}/tasks/${task.id}`).expect(200);

      await supertest(app.server).delete(`/api/milestones/${milestone.id}`).expect(204);

      const remainingLinks = await testDb.db
        .select()
        .from(milestoneTasks)
        .where(eq(milestoneTasks.ownerId, milestone.id));
      expect(remainingLinks).toHaveLength(0);

      await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
    });

    it("entfernt milestone_tickets-Einträge (Ticket bleibt erhalten)", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      const ticket = await createTicket(app, null);
      await supertest(app.server).post(`/api/milestones/${milestone.id}/tickets/${ticket.id}`).expect(200);

      await supertest(app.server).delete(`/api/milestones/${milestone.id}`).expect(204);

      const remainingLinks = await testDb.db
        .select()
        .from(milestoneTickets)
        .where(eq(milestoneTickets.ownerId, milestone.id));
      expect(remainingLinks).toHaveLength(0);

      await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    });

    it("entfernt milestone_features-Einträge (Feature bleibt erhalten)", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      const feature = await createFeature(app);
      await supertest(app.server)
        .put(`/api/milestones/${milestone.id}/features`)
        .send({ featureIds: [feature.id] })
        .expect(200);

      await supertest(app.server).delete(`/api/milestones/${milestone.id}`).expect(204);

      const remainingLinks = await testDb.db
        .select()
        .from(milestoneFeatures)
        .where(eq(milestoneFeatures.milestoneId, milestone.id));
      expect(remainingLinks).toHaveLength(0);

      await supertest(app.server).get(`/api/features/${feature.id}`).expect(200);
    });

    it("entfernt milestone_tags-Einträge (Tag bleibt erhalten)", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      const tag = await createTag(app);
      await supertest(app.server)
        .put(`/api/milestones/${milestone.id}/tags`)
        .send({ tagIds: [tag.id] })
        .expect(200);

      await supertest(app.server).delete(`/api/milestones/${milestone.id}`).expect(204);

      const remainingLinks = await testDb.db
        .select()
        .from(milestoneTags)
        .where(eq(milestoneTags.milestoneId, milestone.id));
      expect(remainingLinks).toHaveLength(0);

      await supertest(app.server).get(`/api/tags`).expect(200).then((r) => {
        expect((r.body as { id: number }[]).some((t) => t.id === tag.id)).toBe(true);
      });
    });

    it("entfernt milestone_events-Einträge (Event bleibt erhalten)", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      const res = await supertest(app.server)
        .post("/api/events")
        .send({
          title: "Meilenstein-Termin",
          startTime: "2026-07-01T10:00:00",
          endTime: "2026-07-01T11:00:00",
          isAllDay: false,
          owners: [{ type: "milestone", id: milestone.id }]
        })
        .expect(201);
      const eventId = (res.body as { id: number }).id;

      await supertest(app.server).delete(`/api/milestones/${milestone.id}`).expect(204);

      const remainingLinks = await testDb.db
        .select()
        .from(milestoneEvents)
        .where(eq(milestoneEvents.milestoneId, milestone.id));
      expect(remainingLinks).toHaveLength(0);

      const event = await supertest(app.server).get(`/api/events/${eventId}`).expect(200);
      expect(event.body.owners).toEqual([]);
    });
  });

  // =========================================================================
  // PROJEKT LÖSCHEN – MEILENSTEIN-KASKADE
  // =========================================================================

  describe("deleteProject – Meilenstein-Kaskade (transitiv)", () => {
    it("löscht Meilensteine des Projekts (DB-Kaskade)", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(milestones)
        .where(eq(milestones.id, milestone.id));
      expect(remaining).toHaveLength(0);
    });

    it("löscht Meilenstein-Comments transitiv beim Löschen des Projekts", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      const commentId = await postCommentForMilestone(app, milestone.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId));
      expect(remaining).toHaveLength(0);
    });

    it("löscht Meilenstein-Notes transitiv beim Löschen des Projekts", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      const note = await createNoteForMilestone(app, milestone.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(notes)
        .where(eq(notes.id, note.id));
      expect(remaining).toHaveLength(0);
    });

    it("entfernt Meilenstein-Anhänge transitiv samt Upload-Datei beim Löschen des Projekts", async () => {
      const project = await createProject(app);
      const milestone = await createMilestone(app, project.id);
      const attachment = await uploadAttachmentForMilestone(app, milestone.id);

      await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

      const remainingLinks = await testDb.db
        .select()
        .from(milestoneAttachments)
        .where(eq(milestoneAttachments.milestoneId, milestone.id));
      expect(remainingLinks).toHaveLength(0);

      const remaining = await testDb.db
        .select()
        .from(attachments)
        .where(eq(attachments.id, attachment.id));
      expect(remaining).toHaveLength(0);
      await expect(fs.stat(path.join(uploadDir, attachment.filename))).rejects.toThrow();
    });

    it("Löschen von Projekt A beeinflusst Meilensteine von Projekt B nicht", async () => {
      const projectA = await createProject(app, { name: "Projekt A" });
      const projectB = await createProject(app, { name: "Projekt B" });
      const milestoneB = await createMilestone(app, projectB.id);

      await supertest(app.server).delete(`/api/projects/${projectA.id}`).expect(204);

      const remaining = await testDb.db
        .select()
        .from(milestones)
        .where(eq(milestones.id, milestoneB.id));
      expect(remaining).toHaveLength(1);
    });
  });
});
