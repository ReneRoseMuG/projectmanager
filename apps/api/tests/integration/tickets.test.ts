/**
 * Test Scope: Tickets API
 *
 * Covered rules:
 * - CRUD, sub-tickets, relations, tags, notes, comments, attachments, status transitions, cascade delete, validation.
 *
 * Failure cases:
 * - Missing title, invalid enum values, unknown resources, duplicate relations, self-relations.
 *
 * Goal:
 * Ensure the ticket domain behaves consistently with project ownership and shared infrastructure.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createProject, createSubTicket, createTag, createTestDb, createTicket, truncateAll, type TestDb } from "../helpers/index.js";

const uploadDir = path.join(os.tmpdir(), `taskmanager-api-ticket-attachments-${process.pid}`);
const previewCacheDir = path.join(os.tmpdir(), `taskmanager-api-ticket-previews-${process.pid}`);

describe("Tickets API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = uploadDir;
    process.env.PREVIEW_CACHE_DIR = previewCacheDir;
    testDb = createTestDb();
    app = await buildTestApp(testDb, { enableMultipart: true });
  });

  beforeEach(() => truncateAll(testDb.sqlite));

  afterEach(async () => {
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(previewCacheDir, { recursive: true });
  });

  afterAll(async () => {
    await app.close();
    testDb.sqlite.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
  });

  it("POST /api/projects/:id/tickets creates a ticket", async () => {
    const project = await createProject(app);

    const res = await supertest(app.server)
      .post(`/api/projects/${project.id}/tickets`)
      .send({
        title: "Login fails",
        type: "bug",
        description: "Cannot sign in",
        status: "open",
        priority: "high",
        severity: "critical",
        reporter: "QA",
        assignee: "Dev",
        environment: "Local",
        affectedVersion: "1.0",
        dueDate: "2026-06-30"
      })
      .expect(201);

    expect(res.body).toMatchObject({
      projectId: project.id,
      parentId: null,
      title: "Login fails",
      type: "bug",
      status: "open",
      priority: "high",
      severity: "critical",
      reporter: "QA",
      assignee: "Dev",
      environment: "Local",
      affectedVersion: "1.0",
      dueDate: "2026-06-30",
      resolvedAt: null
    });
    expect(res.body.position).toBeGreaterThan(0);
  });

  it("POST /api/projects/:id/tickets without title returns 400", async () => {
    const project = await createProject(app);
    await supertest(app.server).post(`/api/projects/${project.id}/tickets`).send({ status: "open" }).expect(400);
  });

  it("POST /api/projects/:id/tickets with invalid type returns 400", async () => {
    const project = await createProject(app);
    await supertest(app.server).post(`/api/projects/${project.id}/tickets`).send({ title: "Invalid", type: "invalid" }).expect(400);
  });

  it("POST /api/projects/:id/tickets with invalid severity returns 400", async () => {
    const project = await createProject(app);
    await supertest(app.server).post(`/api/projects/${project.id}/tickets`).send({ title: "Invalid", severity: "blocker" }).expect(400);
  });

  it("POST /api/projects/9999/tickets returns 404", async () => {
    await supertest(app.server).post("/api/projects/9999/tickets").send({ title: "Missing project" }).expect(404);
  });

  it("GET /api/projects/:id/tickets returns top-level tickets", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id, { title: "Parent" });
    const subTicket = await createSubTicket(app, ticket.id, { title: "Child" });

    const res = await supertest(app.server).get(`/api/projects/${project.id}/tickets`).expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(ticket.id);
    expect(res.body.find((item: { id: number }) => item.id === subTicket.id)).toBeUndefined();
  });

  it("GET /api/tickets returns top-level tickets across projects", async () => {
    const firstProject = await createProject(app, { name: "First" });
    const secondProject = await createProject(app, { name: "Second" });
    await createTicket(app, firstProject.id, { title: "First ticket" });
    await createTicket(app, secondProject.id, { title: "Second ticket" });

    const res = await supertest(app.server).get("/api/tickets").expect(200);

    expect(res.body).toHaveLength(2);
  });

  it("GET /api/tickets/:id returns ticket detail", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);

    const res = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);

    expect(res.body).toMatchObject({ id: ticket.id, comments: [], notes: [], attachments: [], relations: [], subTickets: [] });
  });

  it("GET /api/tickets/9999 returns 404", async () => {
    await supertest(app.server).get("/api/tickets/9999").expect(404);
  });

  it("PATCH /api/tickets/:id updates fields", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);

    const res = await supertest(app.server)
      .patch(`/api/tickets/${ticket.id}`)
      .send({ title: "Updated", status: "in_progress", priority: "urgent", assignee: "Erika", resolution: "fixed" })
      .expect(200);

    expect(res.body).toMatchObject({ title: "Updated", status: "in_progress", priority: "urgent", assignee: "Erika", resolution: "fixed" });
  });

  it("PATCH /api/tickets/:id sets resolvedAt for resolved status", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);

    const res = await supertest(app.server).patch(`/api/tickets/${ticket.id}`).send({ status: "resolved" }).expect(200);

    expect(res.body.status).toBe("resolved");
    expect(res.body.resolvedAt).toEqual(expect.any(String));
  });

  it("PATCH /api/tickets/:id sets resolvedAt for closed status", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);

    const res = await supertest(app.server).patch(`/api/tickets/${ticket.id}`).send({ status: "closed" }).expect(200);

    expect(res.body.status).toBe("closed");
    expect(res.body.resolvedAt).toEqual(expect.any(String));
  });

  it("PATCH /api/tickets/:id with invalid resolution returns 400", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);

    await supertest(app.server).patch(`/api/tickets/${ticket.id}`).send({ resolution: "later" }).expect(400);
  });

  it("PATCH /api/tickets/:id/position updates status and position", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);

    const res = await supertest(app.server).patch(`/api/tickets/${ticket.id}/position`).send({ status: "in_review", position: 42 }).expect(200);

    expect(res.body.status).toBe("in_review");
    expect(res.body.position).toBe(42);
  });

  it("DELETE /api/tickets/:id deletes a ticket", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);

    await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);
    await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(404);
  });

  it("DELETE /api/tickets/9999 returns 404", async () => {
    await supertest(app.server).delete("/api/tickets/9999").expect(404);
  });

  it("POST /api/tickets/:id/sub-tickets creates a sub-ticket with parent project", async () => {
    const project = await createProject(app);
    const parent = await createTicket(app, project.id);

    const subTicket = await createSubTicket(app, parent.id, { title: "Sub" });

    expect(subTicket.projectId).toBe(project.id);
    expect(subTicket.parentId).toBe(parent.id);
  });

  it("GET /api/tickets/:id includes subTickets and subTicketCount", async () => {
    const project = await createProject(app);
    const parent = await createTicket(app, project.id);
    await createSubTicket(app, parent.id, { title: "Sub A" });
    await createSubTicket(app, parent.id, { title: "Sub B" });

    const res = await supertest(app.server).get(`/api/tickets/${parent.id}`).expect(200);

    expect(res.body.subTicketCount).toBe(2);
    expect(res.body.subTickets).toHaveLength(2);
  });

  it("Deleting a parent ticket deletes its sub-tickets", async () => {
    const project = await createProject(app);
    const parent = await createTicket(app, project.id);
    const child = await createSubTicket(app, parent.id);

    await supertest(app.server).delete(`/api/tickets/${parent.id}`).expect(204);
    await supertest(app.server).get(`/api/tickets/${child.id}`).expect(404);
  });

  it("POST /api/tickets/:id/relations creates an outgoing relation", async () => {
    const project = await createProject(app);
    const source = await createTicket(app, project.id, { title: "Source" });
    const target = await createTicket(app, project.id, { title: "Target" });

    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send({ targetTicketId: target.id, relationType: "blocks" }).expect(201);

    const res = await supertest(app.server).get(`/api/tickets/${source.id}/relations`).expect(200);
    expect(res.body[0]).toMatchObject({ relationType: "blocks", direction: "outgoing", ticket: { id: target.id } });
  });

  it("Relation counterpart is returned as incoming", async () => {
    const project = await createProject(app);
    const source = await createTicket(app, project.id, { title: "Source" });
    const target = await createTicket(app, project.id, { title: "Target" });

    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send({ targetTicketId: target.id, relationType: "blocks" }).expect(201);

    const res = await supertest(app.server).get(`/api/tickets/${target.id}/relations`).expect(200);
    expect(res.body[0]).toMatchObject({ relationType: "blocks", direction: "incoming", ticket: { id: source.id } });
  });

  it("Duplicate relations return 400", async () => {
    const project = await createProject(app);
    const source = await createTicket(app, project.id);
    const target = await createTicket(app, project.id);
    const body = { targetTicketId: target.id, relationType: "related" };

    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send(body).expect(201);
    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send(body).expect(400);
  });

  it("Self-relations return 400", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);

    await supertest(app.server).post(`/api/tickets/${ticket.id}/relations`).send({ targetTicketId: ticket.id, relationType: "related" }).expect(400);
  });

  it("Relations to unknown tickets return 404", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);

    await supertest(app.server).post(`/api/tickets/${ticket.id}/relations`).send({ targetTicketId: 9999, relationType: "related" }).expect(404);
  });

  it("DELETE /api/tickets/:id/relations removes a relation", async () => {
    const project = await createProject(app);
    const source = await createTicket(app, project.id);
    const target = await createTicket(app, project.id);
    const body = { targetTicketId: target.id, relationType: "duplicate" };

    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send(body).expect(201);
    await supertest(app.server).delete(`/api/tickets/${source.id}/relations`).send(body).expect(204);

    const res = await supertest(app.server).get(`/api/tickets/${source.id}/relations`).expect(200);
    expect(res.body).toHaveLength(0);
  });

  it("PUT /api/tickets/:id/tags sets and replaces tags", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);
    const firstTag = await createTag(app, { name: "ticket-a" });
    const secondTag = await createTag(app, { name: "ticket-b" });

    await supertest(app.server).put(`/api/tickets/${ticket.id}/tags`).send({ tagIds: [firstTag.id] }).expect(200);
    const updated = await supertest(app.server).put(`/api/tickets/${ticket.id}/tags`).send({ tagIds: [secondTag.id] }).expect(200);

    expect(updated.body).toHaveLength(1);
    expect(updated.body[0].id).toBe(secondTag.id);
  });

  it("Ticket tags are included in detail responses", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);
    const tag = await createTag(app, { name: "detail-tag" });

    await supertest(app.server).put(`/api/tickets/${ticket.id}/tags`).send({ tagIds: [tag.id] }).expect(200);

    const res = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    expect(res.body.tags[0].id).toBe(tag.id);
  });

  it("POST /api/tickets/:id/notes creates a note", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);

    const res = await supertest(app.server).post(`/api/tickets/${ticket.id}/notes`).send({ title: "Ticket note", contentJson: { type: "doc" } }).expect(201);

    expect(res.body.title).toBe("Ticket note");
  });

  it("Ticket notes appear in detail and can be removed", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);
    const note = await supertest(app.server).post(`/api/tickets/${ticket.id}/notes`).send({ title: "Ticket note" }).expect(201);

    let detail = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    expect(detail.body.notes[0].id).toBe(note.body.id);

    await supertest(app.server).delete(`/api/tickets/${ticket.id}/notes/${note.body.id}`).expect(204);
    detail = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    expect(detail.body.notes).toHaveLength(0);
  });

  it("POST /api/tickets/:id/comments creates a comment", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);

    const res = await supertest(app.server).post(`/api/tickets/${ticket.id}/comments`).send({ body: "Ticket comment" }).expect(201);

    expect(res.body).toMatchObject({ entityType: "ticket", entityId: ticket.id, body: "Ticket comment" });
  });

  it("Ticket comments appear in detail", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);
    await supertest(app.server).post(`/api/tickets/${ticket.id}/comments`).send({ body: "Ticket comment" }).expect(201);

    const res = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);

    expect(res.body.comments[0].body).toBe("Ticket comment");
  });

  it("POST /api/tickets/:id/attachments uploads a ticket file", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);

    const res = await supertest(app.server)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .attach("file", Buffer.from("Ticket file"), { filename: "ticket.txt", contentType: "text/plain" })
      .expect(201);

    expect(res.body).toMatchObject({ ticketId: ticket.id, projectId: null, taskId: null, featureId: null, originalName: "ticket.txt" });
  });

  it("Ticket attachments appear in detail", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);
    const upload = await supertest(app.server)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .attach("file", Buffer.from("Ticket file"), { filename: "ticket.txt", contentType: "text/plain" })
      .expect(201);

    const res = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);

    expect(res.body.attachments[0].id).toBe(upload.body.id);
  });

  it("Deleting a project deletes its tickets", async () => {
    const project = await createProject(app);
    const ticket = await createTicket(app, project.id);

    await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);
    await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(404);
  });
});
