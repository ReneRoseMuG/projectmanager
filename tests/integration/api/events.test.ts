/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Events verwenden ownerbasierte Junction-Tabellen für Projekte und Aufgaben.
 * - Globale Events ohne Owner bleiben erlaubt.
 * - Event-Updates sind versioniert und entfernen keine Owner ohne explizite Payload.
 *
 * Fehlerfälle:
 * - Fehlende oder veraltete expectedVersion liefert 400 bzw. 409.
 * - Nicht existierende Owner liefern 404.
 * - Parent- und Event-Deletes bereinigen Junction-Zeilen ohne Event-Datenverlust.
 *
 * Ziel:
 * Das Calendar-Event-Modell gegen Rückfälle auf direkte Owner-Spalten absichern.
 */

import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { projectEvents, taskEvents } from "../../../apps/api/src/db/schema.js";
import { buildTestApp, createEvent, createProject, createTask, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

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

  it("POST /api/events erstellt einen globalen Termin ohne Owner", async () => {
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
      color: "#123456",
      owners: [],
      version: 1
    });
    expect(res.body).not.toHaveProperty("projectId");
    expect(res.body).not.toHaveProperty("taskId");
  });

  it("POST ohne title gibt 400 zurück", async () => {
    await supertest(app.server)
      .post("/api/events")
      .send({ startTime: "2026-06-01T10:00:00", endTime: "2026-06-01T11:00:00" })
      .expect(400);
  });

  it("POST mit endTime vor startTime gibt 400 zurück", async () => {
    await supertest(app.server)
      .post("/api/events")
      .send({ title: "Falsch", startTime: "2026-06-01T12:00:00", endTime: "2026-06-01T11:00:00" })
      .expect(400);
  });

  it("POST mit Project-Owner schreibt project_events und liefert owners", async () => {
    const project = await createProject(app);
    const event = await createEvent(app, { owners: [{ type: "project", id: project.id }] });

    expect(event.owners).toEqual([{ type: "project", id: project.id }]);
    expect(testDb.db.select().from(projectEvents).where(eq(projectEvents.eventId, event.id)).all()).toEqual([
      expect.objectContaining({ projectId: project.id, eventId: event.id })
    ]);
  });

  it("POST mit Task-Owner schreibt task_events und liefert owners", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const event = await createEvent(app, { owners: [{ type: "task", id: task.id }] });

    expect(event.owners).toEqual([{ type: "task", id: task.id }]);
    expect(testDb.db.select().from(taskEvents).where(eq(taskEvents.eventId, event.id)).all()).toEqual([
      expect.objectContaining({ taskId: task.id, eventId: event.id })
    ]);
  });

  it("POST mit Project- und Task-Owner schreibt beide Junctions", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const event = await createEvent(app, {
      owners: [
        { type: "project", id: project.id },
        { type: "task", id: task.id }
      ]
    });

    expect(event.owners).toEqual([
      { type: "project", id: project.id },
      { type: "task", id: task.id }
    ]);
    expect(testDb.db.select().from(projectEvents).where(eq(projectEvents.eventId, event.id)).all()).toHaveLength(1);
    expect(testDb.db.select().from(taskEvents).where(eq(taskEvents.eventId, event.id)).all()).toHaveLength(1);
  });

  it("POST mit nicht existierendem Owner gibt 404 zurück", async () => {
    await supertest(app.server)
      .post("/api/events")
      .send({
        title: "Termin",
        startTime: "2026-06-01T10:00:00",
        endTime: "2026-06-01T11:00:00",
        owners: [{ type: "project", id: 99999 }]
      })
      .expect(404);
  });

  it("POST mit isAllDay speichert ganztägigen Termin", async () => {
    const event = await createEvent(app, { isAllDay: true });
    expect(event.isAllDay).toBe(true);
  });

  it("GET /api/events?from=&to= gibt nur Termine im Zeitraum zurück", async () => {
    const inside = await createEvent(app, {
      title: "Im Zeitraum",
      startTime: "2026-06-10T10:00:00",
      endTime: "2026-06-10T11:00:00"
    });
    const outside = await createEvent(app, {
      title: "Außerhalb",
      startTime: "2026-07-10T10:00:00",
      endTime: "2026-07-10T11:00:00"
    });

    const res = await supertest(app.server).get("/api/events?from=2026-06-01T00:00:00&to=2026-06-30T23:59:59").expect(200);
    const ids = res.body.map((event: { id: number }) => event.id);

    expect(ids).toContain(inside.id);
    expect(ids).not.toContain(outside.id);
  });

  it("GET /api/events ohne Filter gibt alle Termine zurück", async () => {
    const first = await createEvent(app, { title: "A" });
    const second = await createEvent(app, { title: "B" });

    const res = await supertest(app.server).get("/api/events").expect(200);
    const ids = res.body.map((event: { id: number }) => event.id);

    expect(ids).toContain(first.id);
    expect(ids).toContain(second.id);
  });

  it("GET /api/events/:id gibt den Termin mit owners zurück", async () => {
    const project = await createProject(app);
    const event = await createEvent(app, { title: "Einzeltermin", owners: [{ type: "project", id: project.id }] });

    const res = await supertest(app.server).get(`/api/events/${event.id}`).expect(200);
    expect(res.body.id).toBe(event.id);
    expect(res.body.title).toBe("Einzeltermin");
    expect(res.body.owners).toEqual([{ type: "project", id: project.id }]);
  });

  it("PATCH /api/events/:id aktualisiert den Termin mit expectedVersion", async () => {
    const event = await createEvent(app);

    const res = await supertest(app.server)
      .patch(`/api/events/${event.id}`)
      .send({ title: "Aktualisiert", color: "#ffffff", isAllDay: true, expectedVersion: event.version })
      .expect(200);

    expect(res.body.title).toBe("Aktualisiert");
    expect(res.body.color).toBe("#ffffff");
    expect(res.body.isAllDay).toBe(true);
    expect(res.body.version).toBe(event.version + 1);
  });

  it("PATCH ohne expectedVersion gibt 400 zurück", async () => {
    const event = await createEvent(app);

    await supertest(app.server).patch(`/api/events/${event.id}`).send({ title: "Ohne Version" }).expect(400);
  });

  it("PATCH mit veralteter expectedVersion gibt 409 zurück", async () => {
    const event = await createEvent(app);

    await supertest(app.server).patch(`/api/events/${event.id}`).send({ title: "A", expectedVersion: event.version }).expect(200);
    await supertest(app.server).patch(`/api/events/${event.id}`).send({ title: "B", expectedVersion: event.version }).expect(409);
  });

  it("PATCH kann einen zweiten Project-Owner hinzufügen", async () => {
    const firstProject = await createProject(app, { name: "A" });
    const secondProject = await createProject(app, { name: "B" });
    const event = await createEvent(app, { owners: [{ type: "project", id: firstProject.id }] });

    const res = await supertest(app.server)
      .patch(`/api/events/${event.id}`)
      .send({
        owners: [
          { type: "project", id: firstProject.id },
          { type: "project", id: secondProject.id }
        ],
        expectedVersion: event.version
      })
      .expect(200);

    expect(res.body.owners).toEqual([
      { type: "project", id: firstProject.id },
      { type: "project", id: secondProject.id }
    ]);
  });

  it("PATCH kann einen Owner lösen, ohne den Event zu löschen", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const event = await createEvent(app, {
      owners: [
        { type: "project", id: project.id },
        { type: "task", id: task.id }
      ]
    });

    const res = await supertest(app.server)
      .patch(`/api/events/${event.id}`)
      .send({ owners: [{ type: "task", id: task.id }], expectedVersion: event.version })
      .expect(200);

    expect(res.body.owners).toEqual([{ type: "task", id: task.id }]);
    await supertest(app.server).get(`/api/events/${event.id}`).expect(200);
  });

  it("DELETE /api/events/:id löscht den Termin und seine Junction-Zeilen", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const event = await createEvent(app, {
      owners: [
        { type: "project", id: project.id },
        { type: "task", id: task.id }
      ]
    });

    await supertest(app.server).delete(`/api/events/${event.id}`).expect(204);
    await supertest(app.server).get(`/api/events/${event.id}`).expect(404);
    expect(testDb.db.select().from(projectEvents).where(eq(projectEvents.eventId, event.id)).all()).toHaveLength(0);
    expect(testDb.db.select().from(taskEvents).where(eq(taskEvents.eventId, event.id)).all()).toHaveLength(0);
  });

  it("Löschen eines verknüpften Projekts entfernt nur den Project-Owner", async () => {
    const project = await createProject(app);
    const event = await createEvent(app, { owners: [{ type: "project", id: project.id }] });

    await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);

    const res = await supertest(app.server).get(`/api/events/${event.id}`).expect(200);
    expect(res.body.owners).toEqual([]);
  });

  it("Löschen einer verknüpften Aufgabe entfernt nur den Task-Owner", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);
    const event = await createEvent(app, { owners: [{ type: "task", id: task.id }] });

    await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${task.id}`).expect(204);
    await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);

    const res = await supertest(app.server).get(`/api/events/${event.id}`).expect(200);
    expect(res.body.owners).toEqual([]);
  });
});
