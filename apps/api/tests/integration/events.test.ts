/**
 * Test Scope: Events API
 *
 * Covers calendar event CRUD, validation, date filtering, links, and null-on-delete semantics.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createEvent, createProject, createTask, createTestDb, truncateAll, type TestDb } from "../helpers/index.js";

describe("Events API", () => {
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

  it("POST /api/events erstellt einen Termin", async () => {
    const res = await supertest(app.server)
      .post("/api/events")
      .send({
        title: "Termin",
        description: "Beschreibung",
        startTime: "2026-06-01T10:00:00",
        endTime: "2026-06-01T11:00:00",
        color: "#123456"
      })
      .expect(201);

    expect(res.body).toMatchObject({
      title: "Termin",
      description: "Beschreibung",
      startTime: "2026-06-01T10:00:00",
      endTime: "2026-06-01T11:00:00",
      isAllDay: false,
      color: "#123456"
    });
  });

  it("POST ohne title gibt 400 zurueck", async () => {
    await supertest(app.server)
      .post("/api/events")
      .send({ startTime: "2026-06-01T10:00:00", endTime: "2026-06-01T11:00:00" })
      .expect(400);
  });

  it("POST mit endTime vor startTime gibt 400 zurueck", async () => {
    await supertest(app.server)
      .post("/api/events")
      .send({ title: "Falsch", startTime: "2026-06-01T12:00:00", endTime: "2026-06-01T11:00:00" })
      .expect(400);
  });

  it("POST mit Projekt-Verknuepfung speichert projectId", async () => {
    const project = await createProject(app);
    const event = await createEvent(app, { projectId: project.id });

    expect(event.projectId).toBe(project.id);
  });

  it("POST mit isAllDay speichert ganztaegigen Termin", async () => {
    const event = await createEvent(app, { isAllDay: true });
    expect(event.isAllDay).toBe(true);
  });

  it("GET /api/events?from=&to= gibt nur Termine im Zeitraum zurueck", async () => {
    const inside = await createEvent(app, {
      title: "Im Zeitraum",
      startTime: "2026-06-10T10:00:00",
      endTime: "2026-06-10T11:00:00"
    });
    const outside = await createEvent(app, {
      title: "Ausserhalb",
      startTime: "2026-07-10T10:00:00",
      endTime: "2026-07-10T11:00:00"
    });

    const res = await supertest(app.server).get("/api/events?from=2026-06-01T00:00:00&to=2026-06-30T23:59:59").expect(200);
    const ids = res.body.map((event: { id: number }) => event.id);

    expect(ids).toContain(inside.id);
    expect(ids).not.toContain(outside.id);
  });

  it("GET /api/events ohne Filter gibt alle Termine zurueck", async () => {
    const first = await createEvent(app, { title: "A" });
    const second = await createEvent(app, { title: "B" });

    const res = await supertest(app.server).get("/api/events").expect(200);
    const ids = res.body.map((event: { id: number }) => event.id);

    expect(ids).toContain(first.id);
    expect(ids).toContain(second.id);
  });

  it("GET /api/events/:id gibt den Termin zurueck", async () => {
    const event = await createEvent(app, { title: "Einzeltermin" });

    const res = await supertest(app.server).get(`/api/events/${event.id}`).expect(200);
    expect(res.body.id).toBe(event.id);
    expect(res.body.title).toBe("Einzeltermin");
  });

  it("PATCH /api/events/:id aktualisiert den Termin", async () => {
    const event = await createEvent(app);

    const res = await supertest(app.server)
      .patch(`/api/events/${event.id}`)
      .send({ title: "Aktualisiert", color: "#ffffff", isAllDay: true })
      .expect(200);

    expect(res.body.title).toBe("Aktualisiert");
    expect(res.body.color).toBe("#ffffff");
    expect(res.body.isAllDay).toBe(true);
  });

  it("DELETE /api/events/:id loescht den Termin", async () => {
    const event = await createEvent(app);

    await supertest(app.server).delete(`/api/events/${event.id}`).expect(204);
    await supertest(app.server).get(`/api/events/${event.id}`).expect(404);
  });

  it("Loeschen eines verknuepften Projekts setzt projectId auf NULL (kein Cascade)", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const event = await createEvent(app, { projectId: project.id, taskId: task.id });

    await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

    const res = await supertest(app.server).get(`/api/events/${event.id}`).expect(200);
    expect(res.body.projectId).toBeNull();
  });
});
