/**
 * Test Scope: Notes API
 *
 * Covers project/task note links, note CRUD, JSON content persistence, and join cleanup.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  buildTestApp,
  createNoteForProject,
  createNoteForTask,
  createProject,
  createTask,
  createTestDb,
  truncateAll,
  type TestDb
} from "../helpers/index.js";

describe("Notes API", () => {
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

  it("GET /api/tasks/:id/notes gibt alle Task-Notizen zurueck", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const note1 = await createNoteForTask(app, task.id, { title: "A" });
    const note2 = await createNoteForTask(app, task.id, { title: "B" });

    const res = await supertest(app.server).get(`/api/tasks/${task.id}/notes`).expect(200);
    const ids = res.body.map((note: { id: number }) => note.id);

    expect(ids).toContain(note1.id);
    expect(ids).toContain(note2.id);
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
    expect(res.body.contentJson).toEqual(contentJson);
  });

  it("DELETE /api/notes/:id loescht Notiz und Join-Eintraege", async () => {
    const project = await createProject(app);
    const note = await createNoteForProject(app, project.id);

    await supertest(app.server).delete(`/api/notes/${note.id}`).expect(204);
    await supertest(app.server).get(`/api/notes/${note.id}`).expect(404);

    const list = await supertest(app.server).get(`/api/projects/${project.id}/notes`).expect(200);
    expect(list.body).toHaveLength(0);
  });

  it("contentJson mit verschachteltem TipTap-Inhalt wird korrekt gespeichert und gelesen", async () => {
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

    expect(res.body.contentJson).toEqual(contentJson);
  });
});
