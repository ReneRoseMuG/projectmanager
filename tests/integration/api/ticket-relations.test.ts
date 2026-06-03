/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App + MySQL Temp-DB, echte Rollen, Sessions und HTTP-Requests.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Temporäre MySQL-Datenbank, Truncate vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Ticket-Relationen (blocks / related / duplicate) können angelegt, gelesen und gelöscht werden.
 * - Self-Relation wird auf Serviceebene mit 400 abgelehnt.
 * - Reader darf keine Ticket-Relation anlegen (403).
 * - Relation zu nicht-existentem Ticket liefert 404.
 *
 * Fehlerfälle:
 * - Self-Relation → 400
 * - Nicht-existentes Ziel-Ticket → 404
 * - Reader POST → 403
 *
 * Ziel:
 * Den ticketRelations-Join (blocks / related / duplicate) als isolierte API absichern.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb, type TestTicket } from "../../fixtures/api/index.js";

async function loginAdmin(app: FastifyInstance) {
  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
  return agent;
}

async function createReaderAgent(app: FastifyInstance) {
  const admin = await loginAdmin(app);
  const roles = await admin.get("/api/admin/roles").expect(200);
  const readerRole = roles.body.find((role: { key: string }) => role.key === "reader") as { id: number };
  await admin
    .post("/api/admin/users")
    .send({ firstName: "Reader", lastName: "Only", email: "reader-ticket-rel@example.test", roleId: readerRole.id, password: "password123", isActive: true })
    .expect(201);
  const reader = supertest.agent(app.server);
  await reader.post("/api/auth/login").send({ email: "reader-ticket-rel@example.test", password: "password123" }).expect(200);
  return reader;
}

describe("Ticket-Relationen API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let originalAuthBypassAdmin: boolean;
  let originalApiKey: string | null;

  beforeAll(async () => {
    originalAuthBypassAdmin = config.authBypassAdmin;
    originalApiKey = config.apiKey;
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(async () => {
    config.authBypassAdmin = false;
    config.apiKey = null;
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    config.authBypassAdmin = originalAuthBypassAdmin;
    config.apiKey = originalApiKey;
    await app?.close();
    await testDb?.close();
  });

  // GET /tickets/:id/relations gibt TicketRelationEntry[] zurück:
  // { id: string, relationType: string, ticket: TestTicket, direction: "outgoing" | "incoming" }

  it("legt blocks-Relation an, liest sie aus und löscht sie wieder", async () => {
    const admin = await loginAdmin(app);
    const ticketA = (await admin.post("/api/tickets").send({ title: "Ticket A", type: "bug" }).expect(201)).body as TestTicket;
    const ticketB = (await admin.post("/api/tickets").send({ title: "Ticket B", type: "bug" }).expect(201)).body as TestTicket;

    await admin.post(`/api/tickets/${ticketA.id}/relations`).send({ targetTicketId: ticketB.id, relationType: "blocks" }).expect(201);

    const list = (await admin.get(`/api/tickets/${ticketA.id}/relations`).expect(200)).body as Array<{ relationType: string; ticket: { id: number }; direction: string }>;
    expect(list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ relationType: "blocks", ticket: expect.objectContaining({ id: ticketB.id }), direction: "outgoing" })
      ])
    );

    await admin.delete(`/api/tickets/${ticketA.id}/relations`).send({ targetTicketId: ticketB.id, relationType: "blocks" }).expect(204);

    const afterDelete = (await admin.get(`/api/tickets/${ticketA.id}/relations`).expect(200)).body as Array<{ ticket: { id: number } }>;
    expect(afterDelete.map((r) => r.ticket.id)).not.toContain(ticketB.id);

    const ticketBStillExists = await admin.get(`/api/tickets/${ticketB.id}`).expect(200);
    expect(ticketBStillExists.body.id).toBe(ticketB.id);
  });

  it("legt related-Relation an und löscht sie", async () => {
    const admin = await loginAdmin(app);
    const ticketA = (await admin.post("/api/tickets").send({ title: "Related A", type: "bug" }).expect(201)).body as TestTicket;
    const ticketB = (await admin.post("/api/tickets").send({ title: "Related B", type: "bug" }).expect(201)).body as TestTicket;

    await admin.post(`/api/tickets/${ticketA.id}/relations`).send({ targetTicketId: ticketB.id, relationType: "related" }).expect(201);

    const list = (await admin.get(`/api/tickets/${ticketA.id}/relations`).expect(200)).body as Array<{ relationType: string }>;
    expect(list.some((r) => r.relationType === "related")).toBe(true);

    await admin.delete(`/api/tickets/${ticketA.id}/relations`).send({ targetTicketId: ticketB.id, relationType: "related" }).expect(204);

    const afterDelete = (await admin.get(`/api/tickets/${ticketA.id}/relations`).expect(200)).body as unknown[];
    expect(afterDelete).toHaveLength(0);
  });

  it("legt duplicate-Relation an und löscht sie", async () => {
    const admin = await loginAdmin(app);
    const ticketA = (await admin.post("/api/tickets").send({ title: "Dup A", type: "bug" }).expect(201)).body as TestTicket;
    const ticketB = (await admin.post("/api/tickets").send({ title: "Dup B", type: "bug" }).expect(201)).body as TestTicket;

    await admin.post(`/api/tickets/${ticketA.id}/relations`).send({ targetTicketId: ticketB.id, relationType: "duplicate" }).expect(201);

    const list = (await admin.get(`/api/tickets/${ticketA.id}/relations`).expect(200)).body as Array<{ relationType: string }>;
    expect(list.some((r) => r.relationType === "duplicate")).toBe(true);

    await admin.delete(`/api/tickets/${ticketA.id}/relations`).send({ targetTicketId: ticketB.id, relationType: "duplicate" }).expect(204);

    const afterDelete = (await admin.get(`/api/tickets/${ticketA.id}/relations`).expect(200)).body as unknown[];
    expect(afterDelete).toHaveLength(0);
  });

  it("lehnt Self-Relation ab (400)", async () => {
    const admin = await loginAdmin(app);
    const ticket = (await admin.post("/api/tickets").send({ title: "Ticket Self", type: "bug" }).expect(201)).body as TestTicket;

    await admin.post(`/api/tickets/${ticket.id}/relations`).send({ targetTicketId: ticket.id, relationType: "related" }).expect(400);
  });

  it("liefert 404 für Relation zu nicht-existentem Ziel-Ticket", async () => {
    const admin = await loginAdmin(app);
    const ticket = (await admin.post("/api/tickets").send({ title: "Ticket X", type: "bug" }).expect(201)).body as TestTicket;

    await admin.post(`/api/tickets/${ticket.id}/relations`).send({ targetTicketId: 99999, relationType: "related" }).expect(404);
  });

  it("relation-candidates listet mögliche Ziel-Tickets ohne das Quell-Ticket selbst", async () => {
    const admin = await loginAdmin(app);
    const ticketA = (await admin.post("/api/tickets").send({ title: "Cand A", type: "bug" }).expect(201)).body as TestTicket;
    const ticketB = (await admin.post("/api/tickets").send({ title: "Cand B", type: "bug" }).expect(201)).body as TestTicket;

    const candidates = (await admin.get(`/api/tickets/${ticketA.id}/relation-candidates`).expect(200)).body as Array<{ id: number }>;
    const ids = candidates.map((c) => c.id);
    expect(ids).toContain(ticketB.id);
    expect(ids).not.toContain(ticketA.id);
  });

  it("Reader darf keine Ticket-Relation anlegen (403)", async () => {
    const admin = await loginAdmin(app);
    const ticketA = (await admin.post("/api/tickets").send({ title: "Auth A", type: "bug" }).expect(201)).body as TestTicket;
    const ticketB = (await admin.post("/api/tickets").send({ title: "Auth B", type: "bug" }).expect(201)).body as TestTicket;

    const reader = await createReaderAgent(app);

    await reader.post(`/api/tickets/${ticketA.id}/relations`).send({ targetTicketId: ticketB.id, relationType: "blocks" }).expect(403);

    const list = (await reader.get(`/api/tickets/${ticketA.id}/relations`).expect(200)).body as unknown[];
    expect(list).toHaveLength(0);
  });
});
