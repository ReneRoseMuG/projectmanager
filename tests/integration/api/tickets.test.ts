/**
 * Test Scope: Tickets API
 *
 * Covered rules:
 * - CRUD, owner links for projects/tasks/features/use cases, sub-tickets, relations, tags, notes, comments, attachments, validation and list scaling.
 *
 * Failure cases:
 * - Missing title, invalid enum values, unknown owners, duplicate relations and self-relations.
 *
 * Test level:
 * - Integration with real Fastify app and migrated MySQL test database.
 *
 * Real data and isolation:
 * - Per-test database truncation plus process-local temp upload and preview directories; no mocks.
 *
 * Goal:
 * Ensure tickets are owner-independent domain objects that can be linked to multiple owner domains safely and listed in large sets.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import {
  buildTestApp,
  createFeature,
  createMilestone,
  createProject,
  createSubTicket,
  createTag,
  createTask,
  createTestDb,
  createTicket,
  createUseCase,
  truncateAll,
  type TestDb,
  type TestTicket
} from "../../fixtures/api/index.js";

const uploadDir = path.join(os.tmpdir(), `taskmanager-api-ticket-attachments-${process.pid}`);
const previewCacheDir = path.join(os.tmpdir(), `taskmanager-api-ticket-previews-${process.pid}`);

type TicketOwner = { type: "project" | "task" | "feature" | "useCase"; id: number; path: string };

async function insertTicketsDirectly(testDb: TestDb, amount: number, titlePrefix: string): Promise<void> {
  if (amount === 0) {
    return;
  }

  const now = new Date().toISOString();
  const rows = Array.from({ length: amount }, (_, index) => [
    null,
    "bug",
    `${titlePrefix} ${index.toString().padStart(3, "0")}`,
    "open",
    "medium",
    1,
    1,
    index + 1,
    1,
    now,
    now
  ]);
  const placeholders = rows.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");

  await testDb.pool.query(
    `INSERT INTO tickets (parent_id, type, title, status, priority, reporter_user_id, responsible_user_id, position, version, created_at, updated_at) VALUES ${placeholders}`,
    rows.flat()
  );
}

describe("Tickets API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let originalUploadDir: string;
  let originalPreviewCacheDir: string;

  beforeAll(async () => {
    originalUploadDir = config.uploadDir;
    originalPreviewCacheDir = config.previewCacheDir;
    process.env.UPLOAD_DIR = uploadDir;
    process.env.PREVIEW_CACHE_DIR = previewCacheDir;
    config.uploadDir = uploadDir;
    config.previewCacheDir = previewCacheDir;
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
    config.uploadDir = originalUploadDir;
    config.previewCacheDir = originalPreviewCacheDir;
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
  });

  async function createOwners(): Promise<TicketOwner[]> {
    const project = await createProject(app);
    const task = await createTask(app, project.id, { title: "Owner task" });
    const feature = await createFeature(app, { title: "Owner feature" });
    await supertest(app.server).put(`/api/projects/${project.id}/features`).send({ featureIds: [feature.id] }).expect(200);
    const useCase = await createUseCase(app, feature.id, { title: "Owner use case" });

    return [
      { type: "project", id: project.id, path: `/api/projects/${project.id}/tickets` },
      { type: "task", id: task.id, path: `/api/tasks/${task.id}/tickets` },
      { type: "feature", id: feature.id, path: `/api/features/${feature.id}/tickets` },
      { type: "useCase", id: useCase.id, path: `/api/use-cases/${useCase.id}/tickets` }
    ];
  }

  async function expectOwnerContains(owner: TicketOwner, ticketId: number): Promise<void> {
    const res = await supertest(app.server).get(owner.path).expect(200);
    expect((res.body as TestTicket[]).map((ticket) => ticket.id)).toContain(ticketId);
  }

  async function expectOwnerDoesNotContain(owner: TicketOwner, ticketId: number): Promise<void> {
    const res = await supertest(app.server).get(owner.path).expect(200);
    expect((res.body as TestTicket[]).map((ticket) => ticket.id)).not.toContain(ticketId);
  }

  it("POST /api/tickets creates an owner-independent ticket", async () => {
    const res = await supertest(app.server)
      .post("/api/tickets")
      .send({
        title: "Login fails",
        type: "bug",
        description: "Cannot sign in",
        status: "open",
        priority: "high",
        reporterUserId: 1,
        responsibleUserId: 1,
        environment: "Local",
        affectedVersion: "1.0",
        dueDate: "2026-06-30"
      })
      .expect(201);

    expect(res.body).toMatchObject({
      parentId: null,
      title: "Login fails",
      type: "bug",
      status: "open",
      priority: "high",
      reporterUserId: 1,
      reporterUser: expect.objectContaining({ id: 1 }),
      responsibleUserId: 1,
      responsibleUser: expect.objectContaining({ id: 1 }),
      environment: "Local",
      affectedVersion: "1.0",
      dueDate: "2026-06-30",
      resolvedAt: null
    });
    expect(res.body).not.toHaveProperty("projectId");
    expect(res.body).not.toHaveProperty("severity");
    expect(res.body.position).toBeGreaterThan(0);
  });

  it("POST /api/tickets without title returns 400", async () => {
    await supertest(app.server).post("/api/tickets").send({ status: "open" }).expect(400);
  });

  it("POST /api/tickets with invalid priority returns 400", async () => {
    await supertest(app.server).post("/api/tickets").send({ title: "Invalid", priority: "blocker" }).expect(400);
  });

  it("POST /api/tickets with invalid type returns 400", async () => {
    await supertest(app.server).post("/api/tickets").send({ title: "Invalid", type: "invalid" }).expect(400);
  });

  it("POST /api/tickets accepts dynamic ticket types from the catalog", async () => {
    await supertest(app.server)
      .post("/api/catalogs/ticketType")
      .send({ key: "support", label: "Support", sortOrder: 50, color: "#123456" })
      .expect(201);

    const res = await supertest(app.server)
      .post("/api/tickets")
      .send({ title: "Support request", type: "support" })
      .expect(201);

    expect(res.body.type).toBe("support");
  });

  it("POST /api/tickets with invalid status returns 400", async () => {
    await supertest(app.server).post("/api/tickets").send({ title: "Invalid", status: "waiting" }).expect(400);
  });

  it("creates tickets directly for project, task, feature and use case owners", async () => {
    const owners = await createOwners();

    for (const owner of owners) {
      const res = await supertest(app.server).post(owner.path).send({ title: `${owner.type} ticket`, status: "open" }).expect(201);
      expect(res.body.title).toBe(`${owner.type} ticket`);
      await expectOwnerContains(owner, res.body.id);
    }
  });

  it("POST to unknown project, task, feature and use case owners returns 404", async () => {
    await supertest(app.server).post("/api/projects/9999/tickets").send({ title: "Missing project" }).expect(404);
    await supertest(app.server).post("/api/tasks/9999/tickets").send({ title: "Missing task" }).expect(404);
    await supertest(app.server).post("/api/features/9999/tickets").send({ title: "Missing feature" }).expect(404);
    await supertest(app.server).post("/api/use-cases/9999/tickets").send({ title: "Missing use case" }).expect(404);
  });

  it("links an existing ticket to project, task, feature and use case owners", async () => {
    const owners = await createOwners();
    const ticket = await createTicket(app, null, { title: "Reusable ticket" });

    for (const owner of owners) {
      await supertest(app.server).post(`${owner.path}/${ticket.id}`).expect(200);
      await expectOwnerContains(owner, ticket.id);
    }
  });

  it("weist projektfremde Ticket-Owner-Links ab", async () => {
    const firstProject = await createProject(app, { name: "Erstes Projekt" });
    const secondProject = await createProject(app, { name: "Zweites Projekt" });
    const task = await createTask(app, secondProject.id, { title: "Task im zweiten Projekt" });
    const feature = await createFeature(app, { title: "Feature im zweiten Projekt" });
    await supertest(app.server).put(`/api/projects/${secondProject.id}/features`).send({ featureIds: [feature.id] }).expect(200);
    const useCase = await createUseCase(app, feature.id, { title: "Use Case im zweiten Projekt" });
    const ticket = await createTicket(app, firstProject.id, { title: "Projektfremdes Ticket" });

    await supertest(app.server).post(`/api/projects/${secondProject.id}/tickets/${ticket.id}`).expect(400);
    await supertest(app.server).post(`/api/tasks/${task.id}/tickets/${ticket.id}`).expect(400);
    await supertest(app.server).post(`/api/features/${feature.id}/tickets/${ticket.id}`).expect(400);
    await supertest(app.server).post(`/api/use-cases/${useCase.id}/tickets/${ticket.id}`).expect(400);
  });

  it("GET /api/tickets/link-candidates liefert nur projektkompatible unverknüpfte Tickets", async () => {
    const firstProject = await createProject(app, { name: "Erstes Projekt" });
    const secondProject = await createProject(app, { name: "Zweites Projekt" });
    const foreignTicket = await createTicket(app, firstProject.id, { title: "Fremdes Ticket" });
    const neutralTicket = await createTicket(app, null, { title: "Neutrales Ticket" });
    const closedNeutralTicket = await createTicket(app, null, { title: "Geschlossenes Ticket", status: "resolved" });
    const linkedTicket = await createTicket(app, secondProject.id, { title: "Schon verknüpftes Ticket" });

    const res = await supertest(app.server).get(`/api/tickets/link-candidates?ownerType=project&ownerId=${secondProject.id}`).expect(200);

    const ids = (res.body as TestTicket[]).map((ticket) => ticket.id);
    expect(ids).toContain(neutralTicket.id);
    expect(ids).not.toContain(foreignTicket.id);
    expect(ids).not.toContain(closedNeutralTicket.id);
    expect(ids).not.toContain(linkedTicket.id);
    await supertest(app.server).post(`/api/projects/${secondProject.id}/tickets/${closedNeutralTicket.id}`).expect(400);
  });

  it("GET /api/tickets/link-candidates und Milestone-Link ignorieren geschlossene Tickets", async () => {
    const project = await createProject(app, { name: "Ticket-Milestone-Projekt" });
    const milestone = await createMilestone(app, project.id, { name: "Ticket-Milestone" });
    const closedTicket = await createTicket(app, null, { title: "Geschlossenes Milestone-Ticket", status: "resolved" });
    const openTicket = await createTicket(app, null, { title: "Offenes Milestone-Ticket", status: "open" });

    const res = await supertest(app.server).get(`/api/tickets/link-candidates?ownerType=milestone&ownerId=${milestone.id}`).expect(200);
    const ids = (res.body as TestTicket[]).map((ticket) => ticket.id);

    expect(ids).toContain(openTicket.id);
    expect(ids).not.toContain(closedTicket.id);
    await supertest(app.server).post(`/api/milestones/${milestone.id}/tickets/${closedTicket.id}`).expect(400);
  });

  it("GET /api/tickets/link-candidates unterstützt Create-Kontext ohne Owner-Ausschluss", async () => {
    const project = await createProject(app, { name: "Ticket-Kontext-Projekt" });
    const foreignProject = await createProject(app, { name: "Fremdes Ticket-Projekt" });
    const milestone = await createMilestone(app, project.id, { name: "Ticket-Kontext-Meilenstein" });
    const projectTicket = await createTicket(app, { type: "project", id: project.id }, { title: "Bereits am Projekt" });
    const closedProjectTicket = await createTicket(app, { type: "project", id: project.id }, { title: "Geschlossenes Ticket", status: "resolved" });
    const foreignTicket = await createTicket(app, { type: "project", id: foreignProject.id }, { title: "Fremdes Ticket" });

    const res = await supertest(app.server).get(`/api/tickets/link-candidates?contextOwnerType=milestone&contextOwnerId=${milestone.id}`).expect(200);
    const ids = (res.body as TestTicket[]).map((ticket) => ticket.id);

    expect(ids).toContain(projectTicket.id);
    expect(ids).not.toContain(closedProjectTicket.id);
    expect(ids).not.toContain(foreignTicket.id);
  });

  it("GET /api/tickets/link-candidates unterstützt Projekt-Create-Kontext für neue Meilensteine", async () => {
    const project = await createProject(app, { name: "Neuer Ticket-Meilenstein" });
    const foreignProject = await createProject(app, { name: "Fremdes Ticket-Meilenstein-Projekt" });
    const projectTicket = await createTicket(app, { type: "project", id: project.id }, { title: "Offenes Projektticket", status: "open" });
    const closedProjectTicket = await createTicket(app, { type: "project", id: project.id }, { title: "Geschlossenes Projektticket", status: "resolved" });
    const foreignTicket = await createTicket(app, { type: "project", id: foreignProject.id }, { title: "Fremdes Projektticket", status: "open" });

    const res = await supertest(app.server).get(`/api/tickets/link-candidates?contextOwnerType=project&contextOwnerId=${project.id}`).expect(200);
    const ids = (res.body as TestTicket[]).map((ticket) => ticket.id);

    expect(ids).toContain(projectTicket.id);
    expect(ids).not.toContain(closedProjectTicket.id);
    expect(ids).not.toContain(foreignTicket.id);
  });

  it("GET /api/projects/:id/tickets liefert direkte und Meilenstein-Tickets kumulativ", async () => {
    const project = await createProject(app, { name: "Ticket-Projekt" });
    const milestone = await createMilestone(app, project.id, { name: "Ticket-Meilenstein" });
    const directTicket = await createTicket(app, { type: "project", id: project.id }, { title: "Direktes Ticket" });
    const inheritedTicket = await supertest(app.server).post(`/api/milestones/${milestone.id}/tickets`).send({ title: "Meilenstein-Ticket" }).expect(201);
    const duplicateTicket = await createTicket(app, { type: "project", id: project.id }, { title: "Doppeltes Ticket" });
    await supertest(app.server).post(`/api/milestones/${milestone.id}/tickets/${duplicateTicket.id}`).expect(200);

    const projectTickets = await supertest(app.server).get(`/api/projects/${project.id}/tickets`).expect(200);
    const projectTicketIds = projectTickets.body.map((ticket: { id: number }) => ticket.id);
    expect(projectTicketIds).toEqual(expect.arrayContaining([directTicket.id, inheritedTicket.body.id, duplicateTicket.id]));
    expect(projectTicketIds.filter((id: number) => id === duplicateTicket.id)).toHaveLength(1);
    expect(projectTickets.body.find((ticket: { id: number }) => ticket.id === directTicket.id).visibleParent).toMatchObject({ type: "project", id: project.id, label: "Ticket-Projekt", origin: "direct" });
    expect(projectTickets.body.find((ticket: { id: number }) => ticket.id === inheritedTicket.body.id).visibleParent).toMatchObject({ type: "milestone", id: milestone.id, label: "Ticket-Meilenstein", origin: "inherited" });

    const milestoneTickets = await supertest(app.server).get(`/api/milestones/${milestone.id}/tickets`).expect(200);
    expect(milestoneTickets.body.map((ticket: { id: number }) => ticket.id)).toEqual(expect.arrayContaining([inheritedTicket.body.id, duplicateTicket.id]));
    expect(milestoneTickets.body.find((ticket: { id: number }) => ticket.id === duplicateTicket.id).visibleParent).toMatchObject({ type: "milestone", id: milestone.id, origin: "direct" });
  });

  it("GET /api/projects/:id/tickets sortiert innerhalb einer Statusgruppe nach Aktualität statt nach Position", async () => {
    // TKT-113: Tickets werden in Auflistungen nach updatedAt, dann createdAt absteigend sortiert
    // — nicht mehr nach dem manuellen position-Feld. ticketA wird zuerst erstellt (niedrigere
    // Position); unter der alten Positions-Sortierung käme es zuerst, unter Aktualität zuletzt.
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const project = await createProject(app, { name: "Ticket-Sortierung" });
    const ticketA = await createTicket(app, project.id, { title: "Älter", status: "open" });
    await delay(10);
    const ticketB = await createTicket(app, project.id, { title: "Neuer", status: "open" });

    const order = async (): Promise<number[]> => {
      const res = await supertest(app.server).get(`/api/projects/${project.id}/tickets`).expect(200);
      return (res.body as TestTicket[])
        .filter((ticket) => ticket.status === "open" && (ticket.id === ticketA.id || ticket.id === ticketB.id))
        .map((ticket) => ticket.id);
    };

    // Frisch erstellt: neueres Ticket (ticketB) steht vor dem älteren (ticketA).
    expect(await order()).toEqual([ticketB.id, ticketA.id]);

    await delay(10);
    await supertest(app.server)
      .patch(`/api/tickets/${ticketA.id}`)
      .send({ title: "Älter, aber gerade bearbeitet", expectedVersion: ticketA.version })
      .expect(200);

    // Nach dem Update führt ticketA, weil updatedAt vor createdAt sortiert wird.
    expect(await order()).toEqual([ticketA.id, ticketB.id]);
  });

  it("owner ticket lists stay isolated until an explicit link is created", async () => {
    const owners = await createOwners();
    const projectOwner = owners[0];
    const taskOwner = owners[1];
    const ticket = await createTicket(app, projectOwner, { title: "Isolated owner ticket" });

    await expectOwnerContains(projectOwner, ticket.id);
    await expectOwnerDoesNotContain(taskOwner, ticket.id);

    await supertest(app.server).post(`${taskOwner.path}/${ticket.id}`).expect(200);
    await supertest(app.server).delete(`${projectOwner.path}/${ticket.id}`).expect(204);

    await expectOwnerDoesNotContain(projectOwner, ticket.id);
    await expectOwnerContains(taskOwner, ticket.id);
    await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
  });

  it("linking the same ticket twice is idempotent for an owner", async () => {
    const [owner] = await createOwners();
    const ticket = await createTicket(app, null, { title: "Idempotent ticket" });

    await supertest(app.server).post(`${owner.path}/${ticket.id}`).expect(200);
    await supertest(app.server).post(`${owner.path}/${ticket.id}`).expect(200);

    const res = await supertest(app.server).get(owner.path).expect(200);
    expect((res.body as TestTicket[]).filter((item) => item.id === ticket.id)).toHaveLength(1);
  });

  it("does not link sub-tickets to owners", async () => {
    const [owner] = await createOwners();
    const parent = await createTicket(app, null, { title: "Parent" });
    const child = await createSubTicket(app, parent.id, { title: "Child" });

    await supertest(app.server).post(`${owner.path}/${child.id}`).expect(400);
  });

  it("owner ticket link and unlink negative cases return not found", async () => {
    const [owner] = await createOwners();
    const ticket = await createTicket(app, null, { title: "Unlinked ticket" });

    await supertest(app.server).post(`${owner.path}/9999`).expect(404);
    await supertest(app.server).delete(`${owner.path}/${ticket.id}`).expect(404);
  });

  it("unlinks owner-ticket relations without deleting the ticket", async () => {
    const owners = await createOwners();
    const ticket = await createTicket(app, null, { title: "Unlinkable ticket" });

    for (const owner of owners) {
      await supertest(app.server).post(`${owner.path}/${ticket.id}`).expect(200);
      await supertest(app.server).delete(`${owner.path}/${ticket.id}`).expect(204);
      await expectOwnerDoesNotContain(owner, ticket.id);
      await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    }
  });

  it("GET /api/tickets returns top-level tickets globally", async () => {
    const owners = await createOwners();
    const ownerTicket = await createTicket(app, { type: "project", id: owners[0].id }, { title: "Owner ticket" });
    const globalTicket = await createTicket(app, null, { title: "Global ticket" });
    const subTicket = await createSubTicket(app, ownerTicket.id, { title: "Child" });

    const res = await supertest(app.server).get("/api/tickets").expect(200);

    expect((res.body as TestTicket[]).map((ticket) => ticket.id)).toEqual(expect.arrayContaining([ownerTicket.id, globalTicket.id]));
    expect((res.body as TestTicket[]).map((ticket) => ticket.id)).not.toContain(subTicket.id);
    expect((res.body as TestTicket[]).find((ticket) => ticket.id === ownerTicket.id)?.visibleParent).toMatchObject({
      type: "project",
      id: owners[0].id,
      label: "Testprojekt",
      origin: "direct"
    });
    expect((res.body as TestTicket[]).find((ticket) => ticket.id === globalTicket.id)?.visibleParent).toBeNull();
  });

  it("GET /api/tickets listet 500 Tickets ohne Pool-Queue-Überlauf", async () => {
    const project = await createProject(app, { name: "Ticket-Skalierungsprojekt" });
    await insertTicketsDirectly(testDb, 500, "Scale Ticket");

    const [linkedRows] = await testDb.pool.query("SELECT id FROM tickets WHERE title = ?", ["Scale Ticket 123"]);
    const linkedTicketId = Number((linkedRows as Array<{ id: number }>)[0].id);
    await testDb.pool.query("INSERT INTO project_tickets (owner_id, ticket_id, position) VALUES (?, ?, ?)", [
      project.id,
      linkedTicketId,
      1024
    ]);

    const res = await supertest(app.server).get("/api/tickets").expect(200);
    const tickets = res.body as TestTicket[];
    const linkedTicket = tickets.find((ticket) => ticket.id === linkedTicketId);

    expect(tickets).toHaveLength(500);
    expect(linkedTicket).toMatchObject({
      id: linkedTicketId,
      reporterUserId: 1,
      reporterUser: { id: 1, email: "admin@local" },
      responsibleUserId: 1,
      responsibleUser: { id: 1, email: "admin@local" },
      visibleParent: {
        type: "project",
        id: project.id,
        label: "Ticket-Skalierungsprojekt",
        origin: "direct"
      },
      tags: [],
      subTicketCount: 0,
      attachmentCount: 0,
      noteCount: 0,
      commentCount: 0
    });
  });

  it("GET /api/tickets liefert Support-Counter fuer Tickets", async () => {
    const countedTicket = await createTicket(app, null, { title: "Mit Support" });
    const emptyTicket = await createTicket(app, null, { title: "Ohne Support" });
    await supertest(app.server).post(`/api/tickets/${countedTicket.id}/notes`).send({ title: "Ticket note" }).expect(201);
    await supertest(app.server).post(`/api/tickets/${countedTicket.id}/comments`).send({ body: "Ticket comment" }).expect(201);
    await supertest(app.server)
      .post(`/api/tickets/${countedTicket.id}/attachments`)
      .attach("file", Buffer.from("Ticket-Datei"), { filename: "ticket.txt", contentType: "text/plain" })
      .expect(201);

    const res = await supertest(app.server).get("/api/tickets").expect(200);
    const counted = (res.body as TestTicket[]).find((ticket) => ticket.id === countedTicket.id);
    const empty = (res.body as TestTicket[]).find((ticket) => ticket.id === emptyTicket.id);

    expect(counted).toMatchObject({ attachmentCount: 1, noteCount: 1, commentCount: 1 });
    expect(empty).toMatchObject({ attachmentCount: 0, noteCount: 0, commentCount: 0 });
  });

  it("GET /api/tickets/:id returns ticket detail", async () => {
    const ticket = await createTicket(app, null);

    const res = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);

    expect(res.body).toMatchObject({ id: ticket.id, comments: [], notes: [], attachments: [], relations: [], subTickets: [] });
  });

  it("GET /api/tickets/:id liefert vorhandene Parent-Kontexte", async () => {
    const project = await createProject(app, { name: "Ticket-Projekt" });
    const ticket = await createTicket(app, project.id, { title: "Ticket mit Parent" });

    const res = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);

    expect(res.body.parentContexts).toEqual([
      { type: "project", id: project.id, label: "Ticket-Projekt", origin: "direct" }
    ]);
  });

  it("GET /api/tickets/9999 returns 404", async () => {
    await supertest(app.server).get("/api/tickets/9999").expect(404);
  });

  it("PATCH /api/tickets/:id updates fields", async () => {
    const ticket = await createTicket(app, null);

    const res = await supertest(app.server)
      .patch(`/api/tickets/${ticket.id}`)
      .send({ title: "Updated", status: "in_progress", priority: "urgent", responsibleUserId: 1, resolution: "fixed", expectedVersion: ticket.version })
      .expect(200);

    expect(res.body).toMatchObject({ title: "Updated", status: "in_progress", priority: "urgent", responsibleUserId: 1, responsibleUser: expect.objectContaining({ id: 1 }), resolution: "fixed" });
  });

  it("PATCH /api/tickets/:id weist unbekannte User-Bezüge ab", async () => {
    const ticket = await createTicket(app, null);

    await supertest(app.server)
      .patch(`/api/tickets/${ticket.id}`)
      .send({ reporterUserId: 9999, expectedVersion: ticket.version })
      .expect(400);
  });

  it("PATCH /api/tickets/:id sets resolvedAt for resolved and closed status", async () => {
    const resolvedTicket = await createTicket(app, null);
    const closedTicket = await createTicket(app, null, { title: "Closed" });

    const resolved = await supertest(app.server).patch(`/api/tickets/${resolvedTicket.id}`).send({ status: "resolved", expectedVersion: resolvedTicket.version }).expect(200);
    const closed = await supertest(app.server).patch(`/api/tickets/${closedTicket.id}`).send({ status: "closed", expectedVersion: closedTicket.version }).expect(200);

    expect(resolved.body.resolvedAt).toEqual(expect.any(String));
    expect(closed.body.resolvedAt).toEqual(expect.any(String));
  });

  it("PATCH /api/tickets/:id with invalid resolution returns 400", async () => {
    const ticket = await createTicket(app, null);

    await supertest(app.server).patch(`/api/tickets/${ticket.id}`).send({ resolution: "later", expectedVersion: ticket.version }).expect(400);
  });

  it("PATCH /api/tickets/:id/position updates status and position", async () => {
    const ticket = await createTicket(app, null);

    const res = await supertest(app.server).patch(`/api/tickets/${ticket.id}/position`).send({ status: "in_review", position: 42, expectedVersion: ticket.version }).expect(200);

    expect(res.body.status).toBe("in_review");
    expect(res.body.position).toBe(42);
  });

  it("DELETE /api/tickets/:id deletes an unlinked ticket", async () => {
    const ticket = await createTicket(app, null);

    await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);
    await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(404);
  });

  it("DELETE /api/tickets/:id blocks owner-linked tickets until the relation is removed", async () => {
    const [owner] = await createOwners();
    const ticket = await createTicket(app, owner, { title: "Linked ticket" });

    const blocked = await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(409);
    expect(blocked.body.message).toContain("Beziehungen");

    await supertest(app.server).delete(`${owner.path}/${ticket.id}`).expect(204);
    await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);
  });

  it("DELETE /api/tickets/:id blocks parent tickets with sub-tickets", async () => {
    const parent = await createTicket(app, null, { title: "Parent" });
    const child = await createSubTicket(app, parent.id, { title: "Child" });

    await supertest(app.server).delete(`/api/tickets/${parent.id}`).expect(409);
    await supertest(app.server).get(`/api/tickets/${child.id}`).expect(200);
  });

  it("POST /api/tickets/:id/sub-tickets creates a sub-ticket", async () => {
    const parent = await createTicket(app, null);

    const subTicket = await createSubTicket(app, parent.id, { title: "Sub" });

    expect(subTicket.parentId).toBe(parent.id);
    expect(subTicket).not.toHaveProperty("projectId");
  });

  it("GET /api/tickets/:id includes subTickets and subTicketCount", async () => {
    const parent = await createTicket(app, null);
    await createSubTicket(app, parent.id, { title: "Sub A" });
    await createSubTicket(app, parent.id, { title: "Sub B" });

    const res = await supertest(app.server).get(`/api/tickets/${parent.id}`).expect(200);

    expect(res.body.subTicketCount).toBe(2);
    expect(res.body.subTickets).toHaveLength(2);
  });

  it("POST /api/tickets/:id/relations creates outgoing and incoming relations", async () => {
    const source = await createTicket(app, null, { title: "Source" });
    const target = await createTicket(app, null, { title: "Target" });

    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send({ targetTicketId: target.id, relationType: "blocks" }).expect(201);

    const outgoing = await supertest(app.server).get(`/api/tickets/${source.id}/relations`).expect(200);
    const incoming = await supertest(app.server).get(`/api/tickets/${target.id}/relations`).expect(200);
    expect(outgoing.body[0]).toMatchObject({ relationType: "blocks", direction: "outgoing", ticket: { id: target.id } });
    expect(incoming.body[0]).toMatchObject({ relationType: "blocks", direction: "incoming", ticket: { id: source.id } });
  });

  it("weist projektfremde Ticket-Relationen ab und erlaubt neutrale Ziele", async () => {
    const firstProject = await createProject(app, { name: "Erstes Projekt" });
    const secondProject = await createProject(app, { name: "Zweites Projekt" });
    const source = await createTicket(app, firstProject.id, { title: "Source" });
    const foreignTarget = await createTicket(app, secondProject.id, { title: "Foreign target" });
    const neutralTarget = await createTicket(app, null, { title: "Neutral target" });
    const neutralSource = await createTicket(app, null, { title: "Neutral source" });

    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send({ targetTicketId: foreignTarget.id, relationType: "related" }).expect(400);
    await supertest(app.server).post(`/api/tickets/${neutralSource.id}/relations`).send({ targetTicketId: foreignTarget.id, relationType: "related" }).expect(400);
    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send({ targetTicketId: neutralTarget.id, relationType: "related" }).expect(201);
  });

  it("GET /api/tickets/:id/relation-candidates filtert projektfremde und bereits relationierte Tickets", async () => {
    const firstProject = await createProject(app, { name: "Erstes Projekt" });
    const secondProject = await createProject(app, { name: "Zweites Projekt" });
    const source = await createTicket(app, firstProject.id, { title: "Source" });
    const foreignTarget = await createTicket(app, secondProject.id, { title: "Foreign target" });
    const neutralTarget = await createTicket(app, null, { title: "Neutral target" });
    const closedTarget = await createTicket(app, null, { title: "Closed target", status: "resolved" });
    const relatedTarget = await createTicket(app, null, { title: "Related target" });
    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send({ targetTicketId: relatedTarget.id, relationType: "related" }).expect(201);

    const res = await supertest(app.server).get(`/api/tickets/${source.id}/relation-candidates`).expect(200);

    const ids = (res.body as TestTicket[]).map((ticket) => ticket.id);
    expect(ids).toContain(neutralTarget.id);
    expect(ids).not.toContain(foreignTarget.id);
    expect(ids).not.toContain(closedTarget.id);
    expect(ids).not.toContain(relatedTarget.id);
    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send({ targetTicketId: closedTarget.id, relationType: "related" }).expect(400);
  });

  it("GET /api/tickets/:id/relation-candidates und Relation-POST ignorieren geschlossene Quell-Tickets", async () => {
    const closedSource = await createTicket(app, null, { title: "Closed source", status: "resolved" });
    const openTarget = await createTicket(app, null, { title: "Open target", status: "open" });

    const res = await supertest(app.server).get(`/api/tickets/${closedSource.id}/relation-candidates`).expect(200);

    expect((res.body as TestTicket[]).map((ticket) => ticket.id)).not.toContain(openTarget.id);
    await supertest(app.server).post(`/api/tickets/${closedSource.id}/relations`).send({ targetTicketId: openTarget.id, relationType: "related" }).expect(400);
  });

  it("DELETE /api/tickets/:id blocks tickets with ticket relations until the relation is removed", async () => {
    const source = await createTicket(app, null);
    const target = await createTicket(app, null);
    const body = { targetTicketId: target.id, relationType: "related" };

    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send(body).expect(201);
    await supertest(app.server).delete(`/api/tickets/${source.id}`).expect(409);
    await supertest(app.server).delete(`/api/tickets/${source.id}/relations`).send(body).expect(204);
    await supertest(app.server).delete(`/api/tickets/${source.id}`).expect(204);
    await supertest(app.server).get(`/api/tickets/${target.id}/relations`).expect(200, []);
  });

  it("Duplicate, self and unknown relations are rejected", async () => {
    const source = await createTicket(app, null);
    const target = await createTicket(app, null);
    const body = { targetTicketId: target.id, relationType: "related" };

    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send(body).expect(201);
    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send(body).expect(400);
    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send({ targetTicketId: source.id, relationType: "related" }).expect(400);
    await supertest(app.server).post(`/api/tickets/${source.id}/relations`).send({ targetTicketId: 9999, relationType: "related" }).expect(404);
  });

  it("PUT /api/tickets/:id/tags sets and replaces tags", async () => {
    const ticket = await createTicket(app, null);
    const firstTag = await createTag(app, { name: "ticket-a" });
    const secondTag = await createTag(app, { name: "ticket-b" });

    await supertest(app.server).put(`/api/tickets/${ticket.id}/tags`).send({ tagIds: [firstTag.id] }).expect(200);
    const updated = await supertest(app.server).put(`/api/tickets/${ticket.id}/tags`).send({ tagIds: [secondTag.id] }).expect(200);

    expect(updated.body).toHaveLength(1);
    expect(updated.body[0].id).toBe(secondTag.id);
  });

  it("Ticket tags are included in detail responses", async () => {
    const ticket = await createTicket(app, null);
    const tag = await createTag(app, { name: "detail-tag" });

    await supertest(app.server).put(`/api/tickets/${ticket.id}/tags`).send({ tagIds: [tag.id] }).expect(200);

    const res = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    expect(res.body.tags[0].id).toBe(tag.id);
  });

  it("POST /api/tickets/:id/notes creates and removes a note", async () => {
    const ticket = await createTicket(app, null);
    const note = await supertest(app.server).post(`/api/tickets/${ticket.id}/notes`).send({ title: "Ticket note" }).expect(201);

    let detail = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    expect(detail.body.notes[0].id).toBe(note.body.id);

    await supertest(app.server).delete(`/api/tickets/${ticket.id}/notes/${note.body.id}`).expect(204);
    detail = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    expect(detail.body.notes).toHaveLength(0);
  });

  it("POST /api/tickets/:id/comments creates a comment", async () => {
    const ticket = await createTicket(app, null);

    const res = await supertest(app.server).post(`/api/tickets/${ticket.id}/comments`).send({ body: "Ticket comment" }).expect(201);

    expect(res.body).toMatchObject({ owners: [{ type: "ticket", id: ticket.id }], body: "<p>Ticket comment</p>" });
  });

  it("Ticket comments appear in detail", async () => {
    const ticket = await createTicket(app, null);
    await supertest(app.server).post(`/api/tickets/${ticket.id}/comments`).send({ body: "Ticket comment" }).expect(201);

    const res = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);

    expect(res.body.comments[0].body).toBe("<p>Ticket comment</p>");
  });

  it("POST /api/tickets/:id/attachments uploads a ticket file", async () => {
    const ticket = await createTicket(app, null);

    const res = await supertest(app.server)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .attach("file", Buffer.from("Ticket file"), { filename: "ticket.txt", contentType: "text/plain" })
      .expect(201);

    expect(res.body).toMatchObject({ owners: [{ type: "ticket", id: ticket.id }], originalName: "ticket.txt" });
  });

  it("Ticket attachments appear in detail", async () => {
    const ticket = await createTicket(app, null);
    const upload = await supertest(app.server)
      .post(`/api/tickets/${ticket.id}/attachments`)
      .attach("file", Buffer.from("Ticket file"), { filename: "ticket.txt", contentType: "text/plain" })
      .expect(201);

    const res = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);

    expect(res.body.attachments[0].id).toBe(upload.body.id);
  });

  it("deleting a project removes only the project-ticket link", async () => {
    const [owner] = await createOwners();
    const ticket = await createTicket(app, owner, { title: "Project owned ticket" });

    await supertest(app.server).delete(`/api/projects/${owner.id}`).expect(204);

    await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
  });

  describe("Auth-Schutz: Reader-Negativfall", () => {
    let authApp: FastifyInstance;
    let originalAuthBypassAdmin: boolean;
    let originalApiKey: string | null;

    beforeAll(async () => {
      originalAuthBypassAdmin = config.authBypassAdmin;
      originalApiKey = config.apiKey;
      authApp = await buildTestApp(testDb, { enableAuth: true });
    });

    beforeEach(async () => {
      config.authBypassAdmin = false;
      config.apiKey = null;
      await truncateAll(testDb.pool);
    });

    afterAll(async () => {
      config.authBypassAdmin = originalAuthBypassAdmin;
      config.apiKey = originalApiKey;
      await authApp?.close();
    });

    it("Reader darf kein Ticket anlegen (403)", async () => {
      const admin = supertest.agent(authApp.server);
      await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
      const roles = (await admin.get("/api/admin/roles").expect(200)).body as Array<{ key: string; id: number }>;
      const readerRole = roles.find((r) => r.key === "reader")!;
      await admin.post("/api/admin/users").send({
        firstName: "Reader", lastName: "Test",
        email: "reader-tickets-auth@example.test",
        roleId: readerRole.id, password: "password123", isActive: true
      }).expect(201);

      const reader = supertest.agent(authApp.server);
      await reader.post("/api/auth/login").send({ email: "reader-tickets-auth@example.test", password: "password123" }).expect(200);

      await reader.post("/api/tickets").send({ title: "Nicht erlaubt", type: "bug" }).expect(403);
      await reader.get("/api/tickets").expect(200);
    });
  });
});
