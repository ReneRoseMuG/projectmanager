/**
 * Test Scope: Projects API
 *
 * Covers project CRUD, defaults, task counts, timestamps, and cascade behavior.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createProject, createTask, createTestDb, truncateAll, type TestDb } from "../helpers/index.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Projects API", () => {
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

  it("GET /api/projects gibt leere Liste zurueck wenn keine Projekte existieren", async () => {
    const res = await supertest(app.server).get("/api/projects").expect(200);
    expect(res.body).toEqual([]);
  });

  it("POST /api/projects erstellt ein neues Projekt", async () => {
    const res = await supertest(app.server)
      .post("/api/projects")
      .send({ name: "Neues Projekt", description: "Beschreibung", status: "active", color: "#123456" })
      .expect(201);

    expect(res.body).toMatchObject({
      name: "Neues Projekt",
      description: "Beschreibung",
      status: "active",
      color: "#123456",
      openTaskCount: 0,
      tags: []
    });
    expect(res.body.id).toEqual(expect.any(Number));
  });

  it("POST /api/projects ohne name gibt 400 zurueck", async () => {
    await supertest(app.server).post("/api/projects").send({ status: "active" }).expect(400);
  });

  it("POST /api/projects mit ungueltigem Status gibt 400 zurueck", async () => {
    await supertest(app.server).post("/api/projects").send({ name: "Projekt", status: "invalid" }).expect(400);
  });

  it("POST /api/projects setzt Default-Werte wenn optionale Felder fehlen", async () => {
    const res = await supertest(app.server).post("/api/projects").send({ name: "Defaults" }).expect(201);

    expect(res.body.status).toBe("active");
    expect(res.body.color).toBe("#6366f1");
    expect(res.body.description).toBeNull();
    expect(res.body.openTaskCount).toBe(0);
    expect(res.body.tags).toEqual([]);
  });

  it("GET /api/projects gibt alle Projekte zurueck", async () => {
    const first = await createProject(app, { name: "Projekt A" });
    const second = await createProject(app, { name: "Projekt B" });

    const res = await supertest(app.server).get("/api/projects").expect(200);
    const ids = res.body.map((project: { id: number }) => project.id);

    expect(ids).toContain(first.id);
    expect(ids).toContain(second.id);
  });

  it("GET /api/projects/:id gibt das korrekte Projekt zurueck", async () => {
    const project = await createProject(app, { name: "Einzelprojekt" });

    const res = await supertest(app.server).get(`/api/projects/${project.id}`).expect(200);
    expect(res.body.id).toBe(project.id);
    expect(res.body.name).toBe("Einzelprojekt");
  });

  it("GET /api/projects/:id mit unbekannter ID gibt 404 zurueck", async () => {
    await supertest(app.server).get("/api/projects/9999").expect(404);
  });

  it("GET /api/projects enthaelt offene Aufgabenanzahl", async () => {
    const project = await createProject(app);
    await createTask(app, project.id, { title: "Todo", status: "todo" });
    await createTask(app, project.id, { title: "In Arbeit", status: "in_progress" });
    await createTask(app, project.id, { title: "Fertig", status: "done" });

    const res = await supertest(app.server).get("/api/projects").expect(200);
    const found = res.body.find((item: { id: number }) => item.id === project.id);

    expect(found.openTaskCount).toBe(2);
  });

  it("PATCH /api/projects/:id aktualisiert Name und Status", async () => {
    const project = await createProject(app);

    const res = await supertest(app.server)
      .patch(`/api/projects/${project.id}`)
      .send({ name: "Aktualisiert", status: "on_hold" })
      .expect(200);

    expect(res.body.name).toBe("Aktualisiert");
    expect(res.body.status).toBe("on_hold");
  });

  it("PATCH /api/projects/:id mit unbekannter ID gibt 404 zurueck", async () => {
    await supertest(app.server).patch("/api/projects/9999").send({ name: "Fehlt" }).expect(404);
  });

  it("PATCH /api/projects/:id aktualisiert updatedAt", async () => {
    const project = await createProject(app);
    await delay(10);

    const res = await supertest(app.server)
      .patch(`/api/projects/${project.id}`)
      .send({ name: "Neuer Name" })
      .expect(200);

    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(project.updatedAt).getTime());
  });

  it("DELETE /api/projects/:id loescht das Projekt", async () => {
    const project = await createProject(app);

    await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);
    await supertest(app.server).get(`/api/projects/${project.id}`).expect(404);
  });

  it("DELETE /api/projects/:id mit unbekannter ID gibt 404 zurueck", async () => {
    await supertest(app.server).delete("/api/projects/9999").expect(404);
  });

  it("DELETE /api/projects/:id entfernt nur die Task-Zuordnungen", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);
    await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
  });
});
