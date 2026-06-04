/**
 * Test Scope: Comments API
 *
 * Covers comment creation, validation, listing order, deletion, and missing resources.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import {
  buildTestApp,
  createBacklogItem,
  createComment,
  createFeature,
  createMilestone,
  createProject,
  createTask,
  createTestDb,
  createTicket,
  createUseCase,
  createWikiPage,
  truncateAll,
  type TestDb
} from "../../fixtures/api/index.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Comments API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = await createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(async () => { await truncateAll(testDb.pool); });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
  });

  it("POST /api/tasks/:id/comments erstellt einen Kommentar", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    const res = await supertest(app.server)
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Erster Kommentar" })
      .expect(201);

    expect(res.body.body).toBe("<p>Erster Kommentar</p>");
    expect(res.body.owners).toEqual([{ type: "task", id: task.id }]);
  });

  it.each([
    {
      label: "project",
      ownerType: "project",
      createOwner: async () => {
        const project = await createProject(app);
        return { id: project.id, path: `/api/projects/${project.id}/comments` };
      }
    },
    {
      label: "milestone",
      ownerType: "milestone",
      createOwner: async () => {
        const project = await createProject(app);
        const milestone = await createMilestone(app, project.id);
        return { id: milestone.id, path: `/api/milestones/${milestone.id}/comments` };
      }
    },
    {
      label: "task",
      ownerType: "task",
      createOwner: async () => {
        const project = await createProject(app);
        const task = await createTask(app, project.id);
        return { id: task.id, path: `/api/tasks/${task.id}/comments` };
      }
    },
    {
      label: "feature",
      ownerType: "feature",
      createOwner: async () => {
        const feature = await createFeature(app);
        return { id: feature.id, path: `/api/features/${feature.id}/comments` };
      }
    },
    {
      label: "useCase",
      ownerType: "useCase",
      createOwner: async () => {
        const feature = await createFeature(app);
        const useCase = await createUseCase(app, feature.id);
        return { id: useCase.id, path: `/api/use-cases/${useCase.id}/comments` };
      }
    },
    {
      label: "backlogItem",
      ownerType: "backlogItem",
      createOwner: async () => {
        const project = await createProject(app);
        const item = await createBacklogItem(app, project.id);
        return { id: item.id, path: `/api/backlog/${item.id}/comments` };
      }
    },
    {
      label: "wikiPage",
      ownerType: "wikiPage",
      createOwner: async () => {
        const page = await createWikiPage(app);
        return { id: page.id, path: `/api/wiki/${page.id}/comments` };
      }
    },
    {
      label: "ticket",
      ownerType: "ticket",
      createOwner: async () => {
        const ticket = await createTicket(app, null);
        return { id: ticket.id, path: `/api/tickets/${ticket.id}/comments` };
      }
    }
  ])("POST+GET verknuepft Kommentare mit $label", async ({ ownerType, createOwner }) => {
    const owner = await createOwner();
    const body = `Kommentar fuer ${ownerType}`;

    const created = await supertest(app.server).post(owner.path).send({ body }).expect(201);
    const listed = await supertest(app.server).get(owner.path).expect(200);

    const normalizedBody = `<p>${body}</p>`;

    expect(created.body).toEqual(expect.objectContaining({ body: normalizedBody, owners: [{ type: ownerType, id: owner.id }] }));
    expect(listed.body).toEqual([expect.objectContaining({ id: created.body.id, body: normalizedBody, owners: [{ type: ownerType, id: owner.id }] })]);
  });

  it("POST ohne body gibt 400 zurueck", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    await supertest(app.server).post(`/api/tasks/${task.id}/comments`).send({}).expect(400);
  });

  it("POST zu nicht existierendem Task gibt 404 zurueck", async () => {
    await supertest(app.server).post("/api/tasks/9999/comments").send({ body: "Kommentar" }).expect(404);
  });

  it("GET /api/tasks/:id/comments gibt Kommentare chronologisch zurueck", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    await createComment(app, task.id, { body: "Erster" });
    await delay(5);
    await createComment(app, task.id, { body: "Zweiter" });

    const res = await supertest(app.server).get(`/api/tasks/${task.id}/comments`).expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].body).toBe("<p>Erster</p>");
    expect(res.body[1].body).toBe("<p>Zweiter</p>");
  });

  it("PATCH /api/comments/:id aktualisiert einen Kommentar versioniert", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const comment = await createComment(app, task.id, { body: "# Alt" });

    const res = await supertest(app.server)
      .patch(`/api/comments/${comment.id}`)
      .send({ body: "<h1>Neu</h1>", expectedVersion: comment.version })
      .expect(200);

    expect(res.body).toEqual(expect.objectContaining({ id: comment.id, body: "<h1>Neu</h1>", version: comment.version + 1 }));
    const listed = await supertest(app.server).get(`/api/tasks/${task.id}/comments`).expect(200);
    expect(listed.body[0]).toEqual(expect.objectContaining({ id: comment.id, body: "<h1>Neu</h1>", version: comment.version + 1 }));
  });

  it("normalisiert Markdown-Kommentare beim Erstellen zu HTML", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    const res = await supertest(app.server)
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "**Fett** und `Code`" })
      .expect(201);

    expect(res.body.body).toBe("<p><strong>Fett</strong> und <code>Code</code></p>");
  });

  it("PATCH /api/comments/:id verlangt expectedVersion und meldet Versionskonflikte", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const comment = await createComment(app, task.id);

    await supertest(app.server).patch(`/api/comments/${comment.id}`).send({ body: "Ohne Version" }).expect(400);
    await supertest(app.server)
      .patch(`/api/comments/${comment.id}`)
      .send({ body: "Konflikt", expectedVersion: comment.version + 1 })
      .expect(409);
  });

  it("DELETE /api/comments/:id loescht den Kommentar", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const comment = await createComment(app, task.id);

    await supertest(app.server).delete(`/api/comments/${comment.id}`).expect(204);

    const res = await supertest(app.server).get(`/api/tasks/${task.id}/comments`).expect(200);
    expect(res.body).toHaveLength(0);
  });

  it("DELETE eines nicht vorhandenen Kommentars gibt 404 zurueck", async () => {
    await supertest(app.server).delete("/api/comments/9999").expect(404);
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

    it("Reader darf keinen Kommentar anlegen (403)", async () => {
      const admin = supertest.agent(authApp.server);
      await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
      const project = (await admin.post("/api/projects").send({ name: "Reader Comment Test", status: "active" }).expect(201)).body as { id: number };
      const task = (await admin.post(`/api/projects/${project.id}/tasks`).send({ title: "Reader Task", status: "todo", priority: "medium" }).expect(201)).body as { id: number };
      const roles = (await admin.get("/api/admin/roles").expect(200)).body as Array<{ key: string; id: number }>;
      const readerRole = roles.find((r) => r.key === "reader")!;
      await admin.post("/api/admin/users").send({
        firstName: "Reader", lastName: "Comment",
        email: "reader-comments-auth@example.test",
        roleId: readerRole.id, password: "password123", isActive: true
      }).expect(201);

      const reader = supertest.agent(authApp.server);
      await reader.post("/api/auth/login").send({ email: "reader-comments-auth@example.test", password: "password123" }).expect(200);

      await reader.post(`/api/tasks/${task.id}/comments`).send({ body: "Nicht erlaubt" }).expect(403);
      await reader.get(`/api/tasks/${task.id}/comments`).expect(200);
    });
  });
});
