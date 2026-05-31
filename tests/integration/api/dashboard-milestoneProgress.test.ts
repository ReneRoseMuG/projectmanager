/**
 * Test Scope: milestoneProgress-Widget – Mengengenauigkeit
 *
 * Abgedeckte Regeln:
 * - GET /api/projects/:id/milestones liefert je Meilenstein korrekte
 *   totalTaskCount, openTaskCount, doneTaskCount und ticketCount.
 * - Offene und abgeschlossene Aufgaben werden sauber getrennt gezählt.
 * - Die Zählwerte spiegeln Statuswechsel sofort wider.
 * - Mehrere Meilensteine bleiben voneinander isoliert.
 *
 * Fehlerfälle:
 * - Meilenstein ohne Tasks oder Tickets liefert Nullwerte, kein Fehler.
 *
 * Ziel:
 * Die Datenbasis des milestoneProgress-Widgets auf Korrektheit
 * der Fortschrittsfelder absichern.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

interface MilestoneResponse {
  id: number;
  name: string;
  status: string;
  totalTaskCount: number;
  openTaskCount: number;
  doneTaskCount: number;
  ticketCount: number;
  featureCount: number;
}

async function loginAdmin(app: FastifyInstance) {
  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
  return agent;
}

describe("Dashboard milestoneProgress Widget – Mengengenauigkeit", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
  });

  it("liefert korrekte Task- und Ticket-Zählwerte je Meilenstein", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Fortschritts-Projekt" }).expect(201);

    const closedStatus = await admin
      .post("/api/catalogs/workStatus")
      .send({ key: "prog_done", label: "Erledigt (Fortschritt)", sortOrder: 1400, isClosed: true, color: "var(--color-steel-500)" })
      .expect(201);

    // Meilenstein A: 2 offene, 1 abgeschlossener Task, 2 Tickets
    const msA = await admin.post(`/api/projects/${project.body.id}/milestones`).send({ name: "Alpha", status: "active" }).expect(201);
    await admin.post(`/api/milestones/${msA.body.id}/tasks`).send({ title: "A-Task offen 1", status: "todo", priority: "medium" }).expect(201);
    await admin.post(`/api/milestones/${msA.body.id}/tasks`).send({ title: "A-Task offen 2", status: "in_progress", priority: "high" }).expect(201);
    await admin.post(`/api/milestones/${msA.body.id}/tasks`).send({ title: "A-Task done", status: closedStatus.body.key, priority: "low" }).expect(201);
    await admin.post(`/api/milestones/${msA.body.id}/tickets`).send({ title: "A-Ticket 1", type: "bug", status: "open", priority: "medium" }).expect(201);
    await admin.post(`/api/milestones/${msA.body.id}/tickets`).send({ title: "A-Ticket 2", type: "bug", status: "open", priority: "low" }).expect(201);

    // Meilenstein B: keine Tasks, 1 Ticket
    const msB = await admin.post(`/api/projects/${project.body.id}/milestones`).send({ name: "Beta", status: "on_hold" }).expect(201);
    await admin.post(`/api/milestones/${msB.body.id}/tickets`).send({ title: "B-Ticket", type: "bug", status: "open", priority: "low" }).expect(201);

    // Meilenstein C: alle Tasks erledigt, 0 Tickets
    const msC = await admin.post(`/api/projects/${project.body.id}/milestones`).send({ name: "Gamma", status: "active" }).expect(201);
    await admin.post(`/api/milestones/${msC.body.id}/tasks`).send({ title: "C-Task done", status: closedStatus.body.key, priority: "medium" }).expect(201);

    const res = await admin.get(`/api/projects/${project.body.id}/milestones`).expect(200);
    const milestones = res.body as MilestoneResponse[];

    const alpha = milestones.find((m) => m.name === "Alpha")!;
    expect(alpha).toBeDefined();
    expect(alpha.totalTaskCount).toBe(3);
    expect(alpha.openTaskCount).toBe(2);
    expect(alpha.doneTaskCount).toBe(1);
    expect(alpha.ticketCount).toBe(2);

    const beta = milestones.find((m) => m.name === "Beta")!;
    expect(beta).toBeDefined();
    expect(beta.totalTaskCount).toBe(0);
    expect(beta.openTaskCount).toBe(0);
    expect(beta.doneTaskCount).toBe(0);
    expect(beta.ticketCount).toBe(1);

    const gamma = milestones.find((m) => m.name === "Gamma")!;
    expect(gamma).toBeDefined();
    expect(gamma.totalTaskCount).toBe(1);
    expect(gamma.openTaskCount).toBe(0);
    expect(gamma.doneTaskCount).toBe(1);
    expect(gamma.ticketCount).toBe(0);
  });

  it("Meilenstein ohne Tasks und Tickets liefert durchgängig Nullwerte", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Leerer Projekt" }).expect(201);
    await admin.post(`/api/projects/${project.body.id}/milestones`).send({ name: "Leerer Meilenstein", status: "active" }).expect(201);

    const res = await admin.get(`/api/projects/${project.body.id}/milestones`).expect(200);
    const milestone = (res.body as MilestoneResponse[])[0];

    expect(milestone.totalTaskCount).toBe(0);
    expect(milestone.openTaskCount).toBe(0);
    expect(milestone.doneTaskCount).toBe(0);
    expect(milestone.ticketCount).toBe(0);
  });

  it("spiegelt Aufgaben-Abschluss im Fortschritt sofort wider", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Live-Fortschritts-Projekt" }).expect(201);
    const milestone = await admin.post(`/api/projects/${project.body.id}/milestones`).send({ name: "Live-Meilenstein", status: "active" }).expect(201);
    const task = await admin.post(`/api/milestones/${milestone.body.id}/tasks`).send({ title: "Zu erledigender Task", status: "todo", priority: "medium" }).expect(201);

    // Vor Abschluss: 1 offen, 0 done
    const before = await admin.get(`/api/projects/${project.body.id}/milestones`).expect(200);
    const msBefore = (before.body as MilestoneResponse[]).find((m) => m.id === milestone.body.id)!;
    expect(msBefore.openTaskCount).toBe(1);
    expect(msBefore.doneTaskCount).toBe(0);

    // Task auf "done" (Systemstatus) setzen
    await admin.patch(`/api/tasks/${task.body.id}`).send({ status: "done", expectedVersion: task.body.version }).expect(200);

    // Nach Abschluss: 0 offen, 1 done
    const after = await admin.get(`/api/projects/${project.body.id}/milestones`).expect(200);
    const msAfter = (after.body as MilestoneResponse[]).find((m) => m.id === milestone.body.id)!;
    expect(msAfter.openTaskCount).toBe(0);
    expect(msAfter.doneTaskCount).toBe(1);
  });

  it("feature-Verknüpfungen werden im featureCount gezählt", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Feature-Fortschritts-Projekt" }).expect(201);
    const milestone = await admin.post(`/api/projects/${project.body.id}/milestones`).send({ name: "Feature-Meilenstein", status: "active" }).expect(201);

    const featureA = await admin.post("/api/features").send({ title: "Feature A", status: "draft" }).expect(201);
    const featureB = await admin.post("/api/features").send({ title: "Feature B", status: "active" }).expect(201);
    await admin.put(`/api/milestones/${milestone.body.id}/features`).send({ featureIds: [featureA.body.id, featureB.body.id] }).expect(200);

    const res = await admin.get(`/api/projects/${project.body.id}/milestones`).expect(200);
    const ms = (res.body as MilestoneResponse[]).find((m) => m.id === milestone.body.id)!;
    expect(ms.featureCount).toBe(2);
  });

  it("isoliert Zählwerte zwischen mehreren Projekten", async () => {
    const admin = await loginAdmin(app);
    const projectA = await admin.post("/api/projects").send({ name: "Projekt A" }).expect(201);
    const projectB = await admin.post("/api/projects").send({ name: "Projekt B" }).expect(201);
    const msA = await admin.post(`/api/projects/${projectA.body.id}/milestones`).send({ name: "MS-A", status: "active" }).expect(201);
    const msB = await admin.post(`/api/projects/${projectB.body.id}/milestones`).send({ name: "MS-B", status: "active" }).expect(201);

    // Tasks nur für Meilenstein A
    await admin.post(`/api/milestones/${msA.body.id}/tasks`).send({ title: "Nur-A-Task", status: "todo", priority: "medium" }).expect(201);

    const resA = await admin.get(`/api/projects/${projectA.body.id}/milestones`).expect(200);
    const resB = await admin.get(`/api/projects/${projectB.body.id}/milestones`).expect(200);

    const msBResponse = (resB.body as MilestoneResponse[]).find((m) => m.id === msB.body.id)!;
    expect(msBResponse.totalTaskCount).toBe(0);

    const msAResponse = (resA.body as MilestoneResponse[]).find((m) => m.id === msA.body.id)!;
    expect(msAResponse.totalTaskCount).toBe(1);
  });

  it("Tasks aus anderen Meilensteinen beeinflussen keine Zählwerte des Ziel-Meilensteins", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Kreuz-Isolations-Projekt" }).expect(201);
    const ms1 = await admin.post(`/api/projects/${project.body.id}/milestones`).send({ name: "Ziel-Meilenstein", status: "active" }).expect(201);
    const ms2 = await admin.post(`/api/projects/${project.body.id}/milestones`).send({ name: "Fremd-Meilenstein", status: "active" }).expect(201);

    // Mehrere Tasks für ms2 anlegen – ms1 darf sie NICHT zählen
    for (let i = 0; i < 3; i++) {
      await admin.post(`/api/milestones/${ms2.body.id}/tasks`).send({ title: `Fremd-Task ${i}`, status: "todo", priority: "medium" }).expect(201);
    }

    const res = await admin.get(`/api/projects/${project.body.id}/milestones`).expect(200);
    const targetMs = (res.body as MilestoneResponse[]).find((m) => m.id === ms1.body.id)!;
    expect(targetMs.totalTaskCount).toBe(0);
    expect(targetMs.openTaskCount).toBe(0);
  });
});
