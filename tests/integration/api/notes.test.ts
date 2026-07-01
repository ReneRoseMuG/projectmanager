/**
 * Test Scope: Notes API
 *
 * Covers project/task note links, note CRUD, JSON content persistence, and join cleanup.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import {
  buildTestApp,
  createMilestone,
  createNoteForProject,
  createNoteForTask,
  createProject,
  createTask,
  createTestDb,
  createTicket,
  createWikiPage,
  truncateAll,
  type TestDb
} from "../../fixtures/api/index.js";

describe("Notes API", () => {
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

  it("POST /api/projects/:id/notes erstellt Notiz und verknuepft mit Projekt", async () => {
    const project = await createProject(app);

    const res = await supertest(app.server)
      .post(`/api/projects/${project.id}/notes`)
      .send({ title: "Projekt-Notiz", contentJson: { type: "doc", content: [] } })
      .expect(201);

    expect(res.body.title).toBe("Projekt-Notiz");

    const list = await supertest(app.server).get(`/api/projects/${project.id}/notes`).expect(200);
    expect(list.body[0].id).toBe(res.body.id);
  });

  it("GET /api/projects/:id/notes gibt alle Projektnotizen zurueck", async () => {
    const project = await createProject(app);
    const note1 = await createNoteForProject(app, project.id, { title: "A" });
    const note2 = await createNoteForProject(app, project.id, { title: "B" });

    const res = await supertest(app.server).get(`/api/projects/${project.id}/notes`).expect(200);
    const ids = res.body.map((note: { id: number }) => note.id);

    expect(ids).toContain(note1.id);
    expect(ids).toContain(note2.id);
  });

  it("POST zu nicht existierendem Projekt gibt 404 zurueck", async () => {
    await supertest(app.server).post("/api/projects/9999/notes").send({ title: "Fehlt" }).expect(404);
  });

  it("POST /api/tasks/:id/notes erstellt Notiz und verknuepft mit Task", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    const res = await supertest(app.server)
      .post(`/api/tasks/${task.id}/notes`)
      .send({ title: "Task-Notiz", contentJson: { type: "doc", content: [] } })
      .expect(201);

    expect(res.body.title).toBe("Task-Notiz");

    const list = await supertest(app.server).get(`/api/tasks/${task.id}/notes`).expect(200);
    expect(list.body[0].id).toBe(res.body.id);
  });

  it.each([
    {
      label: "project",
      createOwner: async () => {
        const project = await createProject(app);
        return { id: project.id, path: `/api/projects/${project.id}/notes` };
      }
    },
    {
      label: "milestone",
      createOwner: async () => {
        const project = await createProject(app);
        const milestone = await createMilestone(app, project.id);
        return { id: milestone.id, path: `/api/milestones/${milestone.id}/notes` };
      }
    },
    {
      label: "task",
      createOwner: async () => {
        const project = await createProject(app);
        const task = await createTask(app, project.id);
        return { id: task.id, path: `/api/tasks/${task.id}/notes` };
      }
    },
    {
      label: "ticket",
      createOwner: async () => {
        const ticket = await createTicket(app, null);
        return { id: ticket.id, path: `/api/tickets/${ticket.id}/notes` };
      }
    },
    {
      label: "wikiPage",
      createOwner: async () => {
        const wikiPage = await createWikiPage(app);
        return { id: wikiPage.id, path: `/api/wiki/${wikiPage.id}/notes` };
      }
    }
  ])("POST+GET verknuepft Notizen mit $label", async ({ label, createOwner }) => {
    const owner = await createOwner();
    const title = `Notiz fuer ${label}`;
    const contentJson = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: label }] }] };
    const normalizedContentJson = { html: `<p>${label}</p>` };

    const created = await supertest(app.server).post(owner.path).send({ title, contentJson }).expect(201);
    const listed = await supertest(app.server).get(owner.path).expect(200);

    expect(created.body).toEqual(expect.objectContaining({ title, contentJson: normalizedContentJson }));
    expect(listed.body).toEqual([expect.objectContaining({ id: created.body.id, title, contentJson: normalizedContentJson })]);
  });

  it("DELETE /api/wiki/:id entfernt verknuepfte Wiki-Notizen vollstaendig", async () => {
    const wikiPage = await createWikiPage(app);
    const created = await supertest(app.server).post(`/api/wiki/${wikiPage.id}/notes`).send({ title: "Wiki-Notiz", contentJson: {} }).expect(201);

    await supertest(app.server).delete(`/api/wiki/${wikiPage.id}`).expect(204);

    await supertest(app.server).get(`/api/notes/${created.body.id}`).expect(404);
  });

  it("GET /api/tasks/:id/notes gibt alle Task-Notizen zurueck", async () => {
    const project = await createProject(app, { name: "Projekt Alpha" });
    const task = await createTask(app, project.id, { title: "Aufgabe Beta" });
    const note1 = await createNoteForTask(app, task.id, { title: "A" });
    const note2 = await createNoteForTask(app, task.id, { title: "B" });

    const res = await supertest(app.server).get(`/api/tasks/${task.id}/notes`).expect(200);
    const ids = res.body.map((note: { id: number }) => note.id);

    expect(ids).toContain(note1.id);
    expect(ids).toContain(note2.id);
  });

  it("GET /api/notes gibt alle Notizen ohne Statusgruppierung zurueck", async () => {
    const project = await createProject(app, { name: "Projekt Alpha" });
    const task = await createTask(app, project.id, { title: "Aufgabe Beta" });
    const projectNote = await createNoteForProject(app, project.id, { title: "Projektliste" });
    const taskNote = await createNoteForTask(app, task.id, { title: "Aufgabenliste" });

    const res = await supertest(app.server).get("/api/notes").expect(200);
    const ids = res.body.map((note: { id: number }) => note.id);

    expect(ids).toContain(projectNote.id);
    expect(ids).toContain(taskNote.id);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: projectNote.id,
          title: "Projektliste",
          parentContexts: [expect.objectContaining({ type: "project", id: project.id, label: "Projekt Alpha", origin: "direct" })]
        }),
        expect.objectContaining({
          id: taskNote.id,
          title: "Aufgabenliste",
          parentContexts: [expect.objectContaining({ type: "task", id: task.id, label: "Aufgabe Beta", origin: "direct" })]
        })
      ])
    );
    expect(res.body[0]).not.toHaveProperty("status");
  });

  it("GET /api/notes laedt Parent-Kontexte ohne Pool-Queue-Ueberlauf", async () => {
    const project = await createProject(app, { name: "Projekt Alpha" });
    for (let index = 0; index < 70; index += 1) {
      await createNoteForProject(app, project.id, { title: `Globale Notiz ${index}` });
    }

    const res = await supertest(app.server).get("/api/notes").expect(200);

    expect(res.body).toHaveLength(70);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        title: expect.stringMatching(/^Globale Notiz/),
        parentContexts: [expect.objectContaining({ type: "project", id: project.id, label: "Projekt Alpha", origin: "direct" })]
      })
    );
  });

  it("GET /api/notes/:id gibt die Notiz zurueck", async () => {
    const project = await createProject(app);
    const note = await createNoteForProject(app, project.id, { title: "Einzelnotiz" });

    const res = await supertest(app.server).get(`/api/notes/${note.id}`).expect(200);
    expect(res.body.id).toBe(note.id);
    expect(res.body.title).toBe("Einzelnotiz");
  });

  it("GET /api/notes/:id mit unbekannter ID gibt 404 zurueck", async () => {
    await supertest(app.server).get("/api/notes/9999").expect(404);
  });

  it("PATCH /api/notes/:id aktualisiert Titel und contentJson", async () => {
    const project = await createProject(app);
    const note = await createNoteForProject(app, project.id);

    const contentJson = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Neu" }] }] };
    const res = await supertest(app.server)
      .patch(`/api/notes/${note.id}`)
      .send({ title: "Aktualisiert", contentJson, expectedVersion: note.version })
      .expect(200);

    expect(res.body.title).toBe("Aktualisiert");
    expect(res.body.contentJson).toEqual({ html: "<p>Neu</p>" });
  });

  it("normalisiert Markdown-Notizinhalt beim Erstellen zu contentJson.html", async () => {
    const project = await createProject(app);

    const res = await supertest(app.server)
      .post(`/api/projects/${project.id}/notes`)
      .send({ title: "Markdown-Notiz", contentJson: { markdown: "**Fett** und `Code`" } })
      .expect(201);

    expect(res.body.contentJson).toEqual({ html: "<p><strong>Fett</strong> und <code>Code</code></p>" });
  });

  it("DELETE /api/notes/:id loescht Notiz und Join-Eintraege", async () => {
    const project = await createProject(app);
    const note = await createNoteForProject(app, project.id);

    await supertest(app.server).delete(`/api/notes/${note.id}`).expect(204);
    await supertest(app.server).get(`/api/notes/${note.id}`).expect(404);

    const list = await supertest(app.server).get(`/api/projects/${project.id}/notes`).expect(200);
    expect(list.body).toHaveLength(0);
  });

  it("contentJson mit verschachteltem TipTap-Inhalt wird als HTML gespeichert und gelesen", async () => {
    const project = await createProject(app);
    const contentJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hallo ", marks: [{ type: "bold" }] },
            { type: "text", text: "Welt" }
          ]
        }
      ]
    };

    const note = await createNoteForProject(app, project.id, { contentJson });
    const res = await supertest(app.server).get(`/api/notes/${note.id}`).expect(200);

    expect(res.body.contentJson).toEqual({ html: "<p>Hallo Welt</p>" });
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

    it("Reader darf keine Note anlegen (403)", async () => {
      const admin = supertest.agent(authApp.server);
      await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
      const project = (await admin.post("/api/projects").send({ name: "Reader Note Test", status: "active" }).expect(201)).body as { id: number };
      const roles = (await admin.get("/api/admin/roles").expect(200)).body as Array<{ key: string; id: number }>;
      const readerRole = roles.find((r) => r.key === "reader")!;
      await admin.post("/api/admin/users").send({
        firstName: "Reader", lastName: "Note",
        email: "reader-notes-auth@example.test",
        roleId: readerRole.id, password: "password123", isActive: true
      }).expect(201);

      const reader = supertest.agent(authApp.server);
      await reader.post("/api/auth/login").send({ email: "reader-notes-auth@example.test", password: "password123" }).expect(200);

      await reader.post(`/api/projects/${project.id}/notes`)
        .send({ title: "Nicht erlaubt", contentJson: { type: "doc", content: [] } })
        .expect(403);
      await reader.get(`/api/projects/${project.id}/notes`).expect(200);
    });
  });
});
