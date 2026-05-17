/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein Seed-Run erzeugt technisch markierte Testdaten über die zentralen Domänenobjekte.
 * - Ein einzelner Seed-Run kann isoliert gelöscht werden.
 * - Vorhandene echte Daten bleiben beim Löschen eines Seed-Runs erhalten.
 *
 * Fehlerfälle:
 * - Eine Löschung mit falscher Bestätigung wird abgewiesen.
 *
 * Ziel:
 * Die Admin-Testdatenfunktion gegen isolierte Datenbank-, Content- und Upload-Verzeichnisse absichern.
 */

import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../src/config.js";
import { attachments, projects, seedRuns, tasks } from "../../src/db/schema.js";
import { setContentBaseDir } from "../../src/services/content.service.js";
import { buildTestApp, createProject, createTestDb, truncateAll, type TestDb } from "../helpers/index.js";

describe("Seed data admin API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let tmpRoot: string;
  let tmpContentDir: string;
  let tmpUploadDir: string;

  beforeAll(async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taskmanager-seed-data-"));
    tmpContentDir = path.join(tmpRoot, "content");
    tmpUploadDir = path.join(tmpRoot, "uploads");
    fs.mkdirSync(tmpContentDir, { recursive: true });
    fs.mkdirSync(tmpUploadDir, { recursive: true });
    config.uploadDir = tmpUploadDir;
    setContentBaseDir(tmpContentDir);
    testDb = createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(() => {
    truncateAll(testDb.sqlite);
    fs.rmSync(tmpContentDir, { recursive: true, force: true });
    fs.rmSync(tmpUploadDir, { recursive: true, force: true });
    fs.mkdirSync(tmpContentDir, { recursive: true });
    fs.mkdirSync(tmpUploadDir, { recursive: true });
  });

  afterAll(async () => {
    await app.close();
    testDb.sqlite.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("erzeugt und löscht einen Seed-Run ohne echte Daten zu entfernen", async () => {
    const realProject = await createProject(app, { name: "Echtes Projekt" });

    const createRes = await supertest(app.server).post("/api/admin/seed-runs").send({ label: "Visueller Smoke Seed" }).expect(201);
    const seedRunId = createRes.body.id as string;

    expect(createRes.body).toMatchObject({ label: "Visueller Smoke Seed", scenario: "visual" });
    expect(createRes.body.summary.totalRecords).toBeGreaterThan(0);
    expect(testDb.db.select().from(seedRuns).where(eq(seedRuns.id, seedRunId)).all()).toHaveLength(1);
    expect(testDb.db.select().from(projects).where(eq(projects.seedRunId, seedRunId)).all()).toHaveLength(4);
    expect(testDb.db.select().from(tasks).where(eq(tasks.seedRunId, seedRunId)).all().length).toBeGreaterThan(4);
    expect(testDb.db.select().from(attachments).where(eq(attachments.seedRunId, seedRunId)).all()).toHaveLength(4);
    expect(fs.readdirSync(tmpContentDir, { recursive: true }).length).toBeGreaterThan(0);
    expect(fs.readdirSync(tmpUploadDir)).toHaveLength(4);

    await supertest(app.server).delete(`/api/admin/seed-runs/${seedRunId}`).send({ confirmationId: "wrong" }).expect(400);

    const preview = await supertest(app.server).get(`/api/admin/seed-runs/${seedRunId}/delete-preview`).expect(200);
    expect(preview.body.canDelete).toBe(true);

    const deleteRes = await supertest(app.server).delete(`/api/admin/seed-runs/${seedRunId}`).send({ confirmationId: seedRunId }).expect(200);
    expect(deleteRes.body.deletedFiles).toBeGreaterThan(0);
    expect(testDb.db.select().from(seedRuns).where(eq(seedRuns.id, seedRunId)).all()).toHaveLength(0);
    expect(testDb.db.select().from(projects).where(eq(projects.id, realProject.id)).all()).toHaveLength(1);
    expect(testDb.db.select().from(projects).where(eq(projects.seedRunId, seedRunId)).all()).toHaveLength(0);
    expect(fs.readdirSync(tmpUploadDir)).toHaveLength(0);
  });
});
