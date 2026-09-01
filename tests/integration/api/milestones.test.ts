/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App, echte MySQL-Testdatenbank, echte Routen, echte Services und echtes Dateisystem für Uploads.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Dedizierte temporäre MySQL-Datenbank pro Suite; Upload- und Preview-Verzeichnisse unter os.tmpdir().
 *
 * Abgedeckte Regeln:
 * - Meilensteine sind projektgebundene, versionierte Projektmanagement-Objekte mit CRUD und expectedVersion.
 * - Meilensteine können Tasks, Tickets, Features, Tags, Notes, Comments, Attachments und Events zugeordnet werden.
 * - Löschregeln entfernen exklusive Parent-Anhänge samt Upload-Datei, lösen DMS-Links und löschen keine unabhängigen Fachobjekte.
 * - Meilenstein-Listen skalieren ohne Pool-Queue-Überlauf auf mindestens 500 Einträge.
 *
 * Fehlerfälle:
 * - Fehlende oder veraltete expectedVersion, unbekannte Projekte und unbekannte Meilensteine.
 *
 * Ziel:
 * Milestone-Repository, Service, Routen und Owner-Relationen mit echter MySQL-Testdatenbank absichern.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  buildTestApp,
  createFeature,
  createMilestone,
  createProject,
  createTag,
  createTask,
  createTestDb,
  createTicket,
  truncateAll,
  type TestDb
} from "../../fixtures/api/index.js";

const uploadDir = path.join(os.tmpdir(), `taskmanager-api-milestone-attachments-${process.pid}`);
const previewCacheDir = path.join(os.tmpdir(), `taskmanager-api-milestone-previews-${process.pid}`);

async function countRows(testDb: TestDb, table: string, where: string, value: number): Promise<number> {
  const [rows] = await testDb.pool.execute(`SELECT COUNT(*) AS count FROM \`${table}\` WHERE \`${where}\` = ?`, [value]);
  return Number((rows as Array<{ count: bigint | number }>)[0].count);
}

async function insertMilestonesDirectly(testDb: TestDb, projectId: number, amount: number, namePrefix: string): Promise<void> {
  if (amount === 0) {
    return;
  }

  const now = new Date().toISOString();
  const rows = Array.from({ length: amount }, (_, index) => [
    projectId,
    `${namePrefix} ${index.toString().padStart(3, "0")}`,
    "active",
    "#14b8a6",
    1,
    1,
    now,
    now
  ]);
  const placeholders = rows.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
  await testDb.pool.query(
    `INSERT INTO milestones (project_id, name, status, color, responsible_user_id, version, created_at, updated_at) VALUES ${placeholders}`,
    rows.flat()
  );
}

describe("Milestones API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = uploadDir;
    process.env.PREVIEW_CACHE_DIR = previewCacheDir;
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableMultipart: true });
  });

  beforeEach(async () => { await truncateAll(testDb.pool); });

  afterEach(async () => {
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(previewCacheDir, { recursive: true });
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
  });

  it("erstellt, liest, aktualisiert und verschiebt Meilensteine zwischen Projekten", async () => {
    const firstProject = await createProject(app, { name: "Projekt A" });
    const secondProject = await createProject(app, { name: "Projekt B" });

    const created = await supertest(app.server)
      .post(`/api/projects/${firstProject.id}/milestones`)
      .send({ name: "Alpha", description: "Start", status: "active", color: "#14b8a6", startDate: "2026-06-01", dueDate: "2026-06-30" })
      .expect(201);

    expect(created.body).toMatchObject({
      projectId: firstProject.id,
      name: "Alpha",
      status: "active",
      taskCount: 0,
      openTaskCount: 0,
      doneTaskCount: 0,
      totalTaskCount: 0,
      ticketCount: 0,
      featureCount: 0,
      attachmentCount: 0,
      noteCount: 0,
      commentCount: 0,
      tags: []
    });

    const projectList = await supertest(app.server).get(`/api/projects/${firstProject.id}/milestones`).expect(200);
    expect(projectList.body.map((item: { id: number }) => item.id)).toContain(created.body.id);

    const updated = await supertest(app.server)
      .patch(`/api/milestones/${created.body.id}`)
      .send({ projectId: secondProject.id, name: "Beta", status: "on_hold", expectedVersion: created.body.version })
      .expect(200);

    expect(updated.body).toMatchObject({ projectId: secondProject.id, name: "Beta", status: "on_hold", version: created.body.version + 1 });

    const oldProjectList = await supertest(app.server).get(`/api/projects/${firstProject.id}/milestones`).expect(200);
    expect(oldProjectList.body.find((item: { id: number }) => item.id === created.body.id)).toBeUndefined();

    const newProjectList = await supertest(app.server).get(`/api/projects/${secondProject.id}/milestones`).expect(200);
    expect(newProjectList.body.find((item: { id: number }) => item.id === created.body.id)).toBeDefined();
  });

  it("erzwingt expectedVersion und meldet fachliche Fehler", async () => {
    const project = await createProject(app);
    const milestone = await createMilestone(app, project.id);

    await supertest(app.server).patch(`/api/milestones/${milestone.id}`).send({ name: "Ohne Version" }).expect(400);
    await supertest(app.server).patch(`/api/milestones/${milestone.id}`).send({ name: "Veraltet", expectedVersion: milestone.version + 10 }).expect(409);
    await supertest(app.server).post("/api/milestones").send({ projectId: 9999, name: "Ohne Projekt" }).expect(404);
    await supertest(app.server).get("/api/milestones/9999").expect(404);
    await supertest(app.server).delete("/api/milestones/9999").expect(404);
  });

  it("listet 500 Meilensteine ohne Pool-Queue-Überlauf", async () => {
    const project = await createProject(app, { name: "Skalierungsprojekt" });
    const otherProject = await createProject(app, { name: "Anderes Projekt" });
    await insertMilestonesDirectly(testDb, project.id, 500, "Scale");
    await insertMilestonesDirectly(testDb, otherProject.id, 5, "Other");

    const projectList = await supertest(app.server).get(`/api/projects/${project.id}/milestones`).expect(200);
    expect(projectList.body).toHaveLength(500);
    expect(projectList.body.every((item: { projectId: number }) => item.projectId === project.id)).toBe(true);
    expect(projectList.body.find((item: { name: string }) => item.name === "Scale 123")).toMatchObject({
      projectId: project.id,
      responsibleUserId: 1,
      responsibleUser: { id: 1, email: "admin@local" },
      visibleParent: { type: "project", id: project.id, label: "Skalierungsprojekt", origin: "direct" },
      taskCount: 0,
      ticketCount: 0,
      tags: []
    });

    const globalList = await supertest(app.server).get("/api/milestones").expect(200);
    expect(globalList.body).toHaveLength(505);
    expect(globalList.body.filter((item: { projectId: number }) => item.projectId === otherProject.id)).toHaveLength(5);
  });

  it("verwaltet alle Milestone-Relationen mit echten Daten", async () => {
    const project = await createProject(app);
    const milestone = await createMilestone(app, project.id);
    const task = await createTask(app, project.id, { title: "Bestehende Aufgabe", status: "todo" });
    const ticket = await createTicket(app, null, { title: "Bestehendes Ticket" });
    const feature = await createFeature(app, { title: "Feature A" });
    const tag = await createTag(app, { name: "release", color: "#14b8a6" });

    const createdTask = await supertest(app.server)
      .post(`/api/milestones/${milestone.id}/tasks`)
      .send({ title: "Neue Aufgabe", status: "done", priority: "medium" })
      .expect(201);
    await supertest(app.server).post(`/api/milestones/${milestone.id}/tasks/${task.id}`).expect(200);

    const taskList = await supertest(app.server).get(`/api/milestones/${milestone.id}/tasks`).expect(200);
    expect(taskList.body.map((item: { id: number }) => item.id)).toEqual(expect.arrayContaining([createdTask.body.id, task.id]));

    const createdTicket = await supertest(app.server)
      .post(`/api/milestones/${milestone.id}/tickets`)
      .send({ title: "Neues Ticket", type: "bug", status: "open", priority: "medium" })
      .expect(201);
    await supertest(app.server).post(`/api/milestones/${milestone.id}/tickets/${ticket.id}`).expect(200);

    const ticketList = await supertest(app.server).get(`/api/milestones/${milestone.id}/tickets`).expect(200);
    expect(ticketList.body.map((item: { id: number }) => item.id)).toEqual(expect.arrayContaining([createdTicket.body.id, ticket.id]));

    const featureList = await supertest(app.server).put(`/api/milestones/${milestone.id}/features`).send({ featureIds: [feature.id] }).expect(200);
    expect(featureList.body).toHaveLength(1);
    expect(featureList.body[0].id).toBe(feature.id);

    const tagList = await supertest(app.server).put(`/api/milestones/${milestone.id}/tags`).send({ tagIds: [tag.id] }).expect(200);
    expect(tagList.body).toEqual([expect.objectContaining({ id: tag.id, name: "release" })]);

    const note = await supertest(app.server).post(`/api/milestones/${milestone.id}/notes`).send({ title: "Milestone-Notiz", contentJson: { type: "doc" } }).expect(201);
    const notes = await supertest(app.server).get(`/api/milestones/${milestone.id}/notes`).expect(200);
    expect(notes.body).toEqual([expect.objectContaining({ id: note.body.id, title: "Milestone-Notiz" })]);

    const comment = await supertest(app.server).post(`/api/milestones/${milestone.id}/comments`).send({ body: "Milestone-Kommentar" }).expect(201);
    const comments = await supertest(app.server).get(`/api/milestones/${milestone.id}/comments`).expect(200);
    expect(comments.body).toEqual([expect.objectContaining({ id: comment.body.id, body: "<p>Milestone-Kommentar</p>" })]);

    const attachment = await supertest(app.server)
      .post(`/api/milestones/${milestone.id}/attachments`)
      .attach("file", Buffer.from("Milestone-Datei"), { filename: "milestone.txt", contentType: "text/plain" })
      .expect(201);
    expect(attachment.body.owners).toEqual([{ type: "milestone", id: milestone.id }]);

    const event = await supertest(app.server)
      .post("/api/events")
      .send({
        title: "Milestone-Termin",
        startTime: "2026-06-01T10:00:00",
        endTime: "2026-06-01T11:00:00",
        owners: [{ type: "milestone", id: milestone.id }]
      })
      .expect(201);
    expect(event.body.owners).toEqual([{ type: "milestone", id: milestone.id }]);

    const detail = await supertest(app.server).get(`/api/milestones/${milestone.id}`).expect(200);
    expect(detail.body).toMatchObject({
      taskCount: 2,
      openTaskCount: 1,
      doneTaskCount: 1,
      totalTaskCount: 2,
      ticketCount: 2,
      featureCount: 1,
      attachmentCount: 1,
      noteCount: 1,
      commentCount: 1
    });

    await supertest(app.server).delete(`/api/milestones/${milestone.id}/tasks/${task.id}`).expect(204);
    await supertest(app.server).delete(`/api/milestones/${milestone.id}/tickets/${ticket.id}`).expect(204);

    const reducedDetail = await supertest(app.server).get(`/api/milestones/${milestone.id}`).expect(200);
    expect(reducedDetail.body).toMatchObject({
      taskCount: 1,
      openTaskCount: 0,
      doneTaskCount: 1,
      totalTaskCount: 1,
      ticketCount: 1,
      featureCount: 1,
      attachmentCount: 1,
      noteCount: 1,
      commentCount: 1
    });
  });

  it("löscht Milestone-Supportobjekte und exklusive Parent-Anhänge, aber keine unabhängigen Fachobjekte", async () => {
    const project = await createProject(app);
    const milestone = await createMilestone(app, project.id);
    const task = await createTask(app, project.id);
    const ticket = await createTicket(app, { type: "milestone", id: milestone.id });
    const feature = await createFeature(app);

    await supertest(app.server).post(`/api/milestones/${milestone.id}/tasks/${task.id}`).expect(200);
    await supertest(app.server).put(`/api/milestones/${milestone.id}/features`).send({ featureIds: [feature.id] }).expect(200);
    const note = await supertest(app.server).post(`/api/milestones/${milestone.id}/notes`).send({ title: "Delete Note", contentJson: { type: "doc" } }).expect(201);
    const comment = await supertest(app.server).post(`/api/milestones/${milestone.id}/comments`).send({ body: "Delete Comment" }).expect(201);
    const attachment = await supertest(app.server)
      .post(`/api/milestones/${milestone.id}/attachments`)
      .attach("file", Buffer.from("Delete"), { filename: "delete.txt", contentType: "text/plain" })
      .expect(201);
    const event = await supertest(app.server)
      .post("/api/events")
      .send({ title: "Bleibt", startTime: "2026-06-01T10:00:00", endTime: "2026-06-01T11:00:00", owners: [{ type: "milestone", id: milestone.id }] })
      .expect(201);

    await supertest(app.server).delete(`/api/milestones/${milestone.id}`).expect(204);

    await supertest(app.server).get(`/api/milestones/${milestone.id}`).expect(404);
    await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
    await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    await supertest(app.server).get(`/api/features/${feature.id}`).expect(200);

    expect(await countRows(testDb, "notes", "id", note.body.id)).toBe(0);
    expect(await countRows(testDb, "comments", "id", comment.body.id)).toBe(0);
    expect(await countRows(testDb, "attachments", "id", attachment.body.id)).toBe(0);
    await expect(fs.access(path.join(uploadDir, attachment.body.filename))).rejects.toThrow();
    expect(await countRows(testDb, "milestone_tasks", "owner_id", milestone.id)).toBe(0);
    expect(await countRows(testDb, "milestone_tickets", "owner_id", milestone.id)).toBe(0);
    expect(await countRows(testDb, "milestone_features", "milestone_id", milestone.id)).toBe(0);
    expect(await countRows(testDb, "milestone_attachments", "milestone_id", milestone.id)).toBe(0);
    expect(await countRows(testDb, "milestone_events", "milestone_id", milestone.id)).toBe(0);

    const events = await supertest(app.server).get("/api/events").expect(200);
    const remainingEvent = events.body.find((item: { id: number }) => item.id === event.body.id);
    expect(remainingEvent).toBeDefined();
    expect(remainingEvent.owners).toEqual([]);
  });

  it("bereinigt Milestone-Supportobjekte und exklusive Parent-Anhänge bei Projektlöschung", async () => {
    const project = await createProject(app);
    const milestone = await createMilestone(app, project.id);
    const note = await supertest(app.server).post(`/api/milestones/${milestone.id}/notes`).send({ title: "Projekt Delete Note", contentJson: { type: "doc" } }).expect(201);
    const attachment = await supertest(app.server)
      .post(`/api/milestones/${milestone.id}/attachments`)
      .attach("file", Buffer.from("Project Delete"), { filename: "project-delete.txt", contentType: "text/plain" })
      .expect(201);

    await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

    await supertest(app.server).get(`/api/milestones/${milestone.id}`).expect(404);
    expect(await countRows(testDb, "notes", "id", note.body.id)).toBe(0);
    expect(await countRows(testDb, "attachments", "id", attachment.body.id)).toBe(0);
    await expect(fs.access(path.join(uploadDir, attachment.body.filename))).rejects.toThrow();
    expect(await countRows(testDb, "milestone_attachments", "milestone_id", milestone.id)).toBe(0);
  });

  it("zählt beliebige per Katalog geschlossene Aufgaben als erledigt", async () => {
    const project = await createProject(app);
    const milestone = await createMilestone(app, project.id);
    const closedStatus = await supertest(app.server)
      .post("/api/catalogs/workStatus")
      .send({ key: "qa_passed", label: "QA passiert", sortOrder: 1300, isClosed: true, color: "var(--color-steel-500)" })
      .expect(201);

    await supertest(app.server).post(`/api/milestones/${milestone.id}/tasks`).send({ title: "Geschlossen 1", status: closedStatus.body.key, priority: "medium" }).expect(201);
    await supertest(app.server).post(`/api/milestones/${milestone.id}/tasks`).send({ title: "Geschlossen 2", status: closedStatus.body.key, priority: "medium" }).expect(201);
    await supertest(app.server).post(`/api/milestones/${milestone.id}/tasks`).send({ title: "Geschlossen 3", status: closedStatus.body.key, priority: "medium" }).expect(201);

    const detail = await supertest(app.server).get(`/api/milestones/${milestone.id}`).expect(200);
    expect(detail.body).toMatchObject({
      taskCount: 3,
      openTaskCount: 0,
      doneTaskCount: 3,
      totalTaskCount: 3,
      visibleParent: { type: "project", id: project.id, label: "Testprojekt", origin: "direct" }
    });

    const projectMilestones = await supertest(app.server).get(`/api/projects/${project.id}/milestones`).expect(200);
    expect(projectMilestones.body.find((item: { id: number }) => item.id === milestone.id)).toMatchObject({
      openTaskCount: 0,
      doneTaskCount: 3,
      totalTaskCount: 3,
      visibleParent: { type: "project", id: project.id, label: "Testprojekt", origin: "direct" }
    });
  });
});
