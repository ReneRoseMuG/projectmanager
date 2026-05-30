/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Journal-Routen sind authentifizierungspflichtig und benötigen `journal:read`.
 * - Mutationen erzeugen aussagekräftige Journal-Einträge mit Feldänderungen, Objektkontext und Akteur.
 *
 * Fehlerfälle:
 * - Benutzer ohne Journal-Leserecht dürfen das globale Journal nicht abrufen.
 *
 * Ziel:
 * Das Journal als nachvollziehbare Audit-Oberfläche für globale und objektbezogene Änderungen absichern.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

async function loginAdmin(app: FastifyInstance) {
  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
  return agent;
}

describe("Journal API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let originalAuthBypassAdmin: boolean;

  beforeAll(async () => {
    originalAuthBypassAdmin = config.authBypassAdmin;
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(async () => {
    config.authBypassAdmin = false;
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    config.authBypassAdmin = originalAuthBypassAdmin;
    await app?.close();
    await testDb?.close();
  });

  it("protokolliert Projektänderungen mit konkreter Feldänderung und Akteur", async () => {
    const admin = await loginAdmin(app);
    const created = await admin.post("/api/projects").send({ name: "Projekt Alpha", status: "active" }).expect(201);

    await admin.patch(`/api/projects/${created.body.id}`).send({ dueDate: "2026-06-15", expectedVersion: created.body.version }).expect(200);

    const journal = await admin.get("/api/journal").expect(200);
    const updateEntry = journal.body.entries.find((entry: { operation: string; objectType: string; objectId: number }) => entry.operation === "update" && entry.objectType === "project" && entry.objectId === created.body.id);

    expect(updateEntry).toMatchObject({
      objectLabel: "Projekt Alpha",
      actorName: "Admin, Test"
    });
    expect(updateEntry.summary).toContain('Projekt "Projekt Alpha" hat ein neues Enddatum');
    expect(updateEntry.changes).toEqual([
      expect.objectContaining({
        fieldKey: "dueDate",
        fieldLabel: "Enddatum",
        oldValueLabel: null,
        newValueLabel: "15.06.26"
      })
    ]);
  });

  it("liefert objektbezogene Journal-Einträge über den Kontext", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Projekt Beta", status: "active" }).expect(201);
    const task = await admin.post(`/api/projects/${project.body.id}/tasks`).send({ title: "Aufgabe im Projekt", status: "todo", priority: "medium" }).expect(201);

    const projectJournal = await admin.get(`/api/journal/objects/project/${project.body.id}`).expect(200);
    const taskCreate = projectJournal.body.entries.find((entry: { objectType: string; objectId: number }) => entry.objectType === "task" && entry.objectId === task.body.id);

    expect(taskCreate.summary).toContain('Aufgabe "Aufgabe im Projekt" wurde erstellt');
    expect(taskCreate.contexts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ objectType: "project", objectId: project.body.id, relation: "owner" }),
        expect.objectContaining({ objectType: "task", objectId: task.body.id, relation: "self" })
      ])
    );
  });

  it("blockiert globale Journal-Lesung ohne passende Permission", async () => {
    const admin = await loginAdmin(app);
    const role = await admin
      .post("/api/admin/roles")
      .send({ key: "project_reader_without_journal", label: "Projektleser ohne Journal", permissions: [{ resource: "projects", action: "read" }] })
      .expect(201);

    await admin
      .post("/api/admin/users")
      .send({ firstName: "Project", lastName: "Reader", email: "project.reader@example.test", roleId: role.body.id, password: "password123", isActive: true })
      .expect(201);

    const reader = supertest.agent(app.server);
    await reader.post("/api/auth/login").send({ email: "project.reader@example.test", password: "password123" }).expect(200);
    await reader.get("/api/projects").expect(200);
    await reader.get("/api/journal").expect(403);
  });
});
