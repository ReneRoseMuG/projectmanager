/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Katalogeinträge für Status, Priorität und Ticket-Typen sind per API les- und versioniert bearbeitbar.
 * - Katalogfarben werden gespeichert, validiert und als Default ergänzt.
 * - Gelöschte Katalogeinträge fallen bei betroffenen Objekten auf den niedrigsten Sortierwert zurück.
 *
 * Fehlerfälle:
 * - Ungültige Farben werden abgelehnt.
 * - Updates ohne aktuelle Version werden nicht getestet; Versionspflicht wird durch den erfolgreichen Update-Pfad mit expectedVersion abgesichert.
 *
 * Ziel:
 * Editierbare Kataloge gegen Datenprobleme beim Entfernen von Einträgen absichern.
 */

import type { FastifyInstance } from "fastify";
import type { CatalogKind } from "@taskmanager/shared-types";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createProject, createTask, createTestDb, createTicket, truncateAll, type TestDb } from "../../fixtures/api/index.js";

async function getCatalogEntryId(testDb: TestDb, kind: CatalogKind, key: string): Promise<number> {
  const [rows] = await testDb.pool.execute("SELECT id FROM catalog_entries WHERE kind = ? AND `key` = ?", [kind, key]);
  const [entry] = rows as Array<{ id: number }>;

  if (!entry) {
    throw new Error(`Missing catalog entry ${kind}/${key}`);
  }

  return entry.id;
}

async function resetCatalogCache(app: FastifyInstance): Promise<void> {
  const key = `cache_reset_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const created = await supertest(app.server)
    .post("/api/catalogs/priority")
    .send({ key, label: "Cache Reset", sortOrder: 9999, color: "#000000" })
    .expect(201);

  await supertest(app.server).delete(`/api/catalogs/priority/${created.body.id}`).expect(204);
}

describe("Catalog API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = await createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
    await resetCatalogCache(app);
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
  });

  it("listet und aktualisiert Katalogeinträge versioniert inklusive Farbe", async () => {
    const list = await supertest(app.server).get("/api/catalogs/workStatus").expect(200);
    const open = list.body.find((entry: { key: string }) => entry.key === "open");
    expect(open.color).toBe("var(--color-fern)");

    const res = await supertest(app.server)
      .patch(`/api/catalogs/workStatus/${open.id}`)
      .send({ label: "Geöffnet", sortOrder: 650, isClosed: false, color: "#123456", expectedVersion: open.version })
      .expect(200);

    expect(res.body).toMatchObject({ key: "open", label: "Geöffnet", sortOrder: 650, isClosed: false, color: "#123456", version: open.version + 1 });
  });

  it("legt Farben per Default an und lehnt ungültige Farben ab", async () => {
    const created = await supertest(app.server)
      .post("/api/catalogs/ticketType")
      .send({ key: "support", label: "Support", sortOrder: 50, isClosed: true })
      .expect(201);

    expect(created.body).toMatchObject({ kind: "ticketType", key: "support", isClosed: false, color: "var(--color-steel-700)" });

    await supertest(app.server)
      .post("/api/catalogs/ticketType")
      .send({ key: "invalid_color", label: "Invalid", color: "red" })
      .expect(400);
  });

  it("setzt betroffene Arbeitsstatus beim Löschen auf den niedrigsten Sortierwert zurück", async () => {
    const project = await createProject(app, { status: "active" });
    const activeId = await getCatalogEntryId(testDb, "workStatus", "active");

    await supertest(app.server).delete(`/api/catalogs/workStatus/${activeId}`).expect(204);

    const updatedProject = await supertest(app.server).get(`/api/projects/${project.id}`).expect(200);
    expect(updatedProject.body.status).toBe("on_hold");
  });

  it("setzt betroffene Prioritäten beim Löschen auf den niedrigsten Sortierwert zurück", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id, { priority: "low" });
    const lowId = await getCatalogEntryId(testDb, "priority", "low");

    await supertest(app.server).delete(`/api/catalogs/priority/${lowId}`).expect(204);

    const updatedTask = await supertest(app.server).get(`/api/tasks/${task.id}`).expect(200);
    expect(updatedTask.body.priority).toBe("medium");
  });

  it("setzt betroffene Ticket-Typen beim Löschen auf den niedrigsten Sortierwert zurück", async () => {
    const ticket = await createTicket(app, null, { type: "bug" });
    const bugId = await getCatalogEntryId(testDb, "ticketType", "bug");

    await supertest(app.server).delete(`/api/catalogs/ticketType/${bugId}`).expect(204);

    const updatedTicket = await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
    expect(updatedTicket.body.type).toBe("improvement");
  });
});
