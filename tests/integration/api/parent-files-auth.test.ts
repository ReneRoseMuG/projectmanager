/**
 * Test Scope:
 * Berechtigungsgrenzen zwischen Parent-Anhängen und globalem Dokumentenmanagement.
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Sessions, Auth-Hooks, Fastify-Routen, Rollenpersistenz, MySQL und Multipart-Uploads.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; ein nativer File-Opener wird in diesen Fällen nicht aufgerufen.
 *
 * Isolation:
 * - Eigene MySQL-Testdatenbank und eigener Upload-Temp-Root; vollständige Bereinigung je Test.
 *
 * Abgedeckte Regeln:
 * - documents und attachments sind getrennte Berechtigungsressourcen.
 * - Dokumentlinks verlangen zusätzlich die Berechtigung des betroffenen Parent-Typs.
 * - Schreibzugriff wird weder durch Reader- noch durch Teilberechtigungen ersetzt.
 *
 * Fehlerfälle:
 * - Anonyme Zugriffe, fehlendes documents:read/write und fehlendes projects:write.
 *
 * Ziel:
 * Nachweis, dass die API als verbindliche Sicherheitsgrenze beide Dateidomänen trennt.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest, { type SuperAgentTest } from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const uploadDir = path.join(os.tmpdir(), `taskmanager-parent-files-auth-${process.pid}`);

describe("Parent-Dateien Berechtigungen", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = uploadDir;
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true, enableMultipart: true, fileOpener: async () => undefined });
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.mkdir(uploadDir, { recursive: true });
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
  });

  async function login(email = "admin@local"): Promise<SuperAgentTest> {
    const agent = supertest.agent(app.server);
    await agent.post("/api/auth/login").send({ email, password: "password123" }).expect(200);
    return agent;
  }

  async function createUserWithPermissions(
    admin: SuperAgentTest,
    key: string,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<SuperAgentTest> {
    const role = await admin.post("/api/admin/roles").send({ key, label: key, permissions }).expect(201);
    const email = `${key}@example.test`;
    await admin.post("/api/admin/users").send({
      firstName: "Test",
      lastName: "User",
      email,
      roleId: role.body.id,
      password: "password123",
      isActive: true
    }).expect(201);
    return login(email);
  }

  it("trennt Attachment- und Dokumentrechte und verlangt die Parent-Berechtigung zusätzlich", async () => {
    const admin = await login();
    const project = await admin.post("/api/projects").send({ name: "Auth-Trennung", status: "active", color: "#6366f1" }).expect(201);
    const document = await admin.post("/api/documents")
      .attach("file", Buffer.from("Dokument"), { filename: "auth-dokument.txt", contentType: "text/plain" })
      .expect(201);
    const attachment = await admin.post(`/api/projects/${project.body.id}/attachments`)
      .attach("file", Buffer.from("Anhang"), { filename: "auth-anhang.txt", contentType: "text/plain" })
      .expect(201);

    await supertest(app.server).get("/api/documents").expect(401);
    await supertest(app.server).get(`/api/projects/${project.body.id}/attachments`).expect(401);

    const attachmentReader = await createUserWithPermissions(admin, "attachment_only", [
      { resource: "projects", action: "read" },
      { resource: "attachments", action: "read" }
    ]);
    await attachmentReader.get(`/api/projects/${project.body.id}/attachments`).expect(200);
    await attachmentReader.get(`/api/attachments/${attachment.body.id}/content`).expect(200);
    await attachmentReader.get("/api/documents").expect(403);
    await attachmentReader.get(`/api/projects/${project.body.id}/document-links`).expect(403);

    const documentReader = await createUserWithPermissions(admin, "document_reader", [
      { resource: "projects", action: "read" },
      { resource: "documents", action: "read" }
    ]);
    await documentReader.get("/api/documents").expect(200);
    await documentReader.get(`/api/documents/${document.body.id}/content`).expect(200);
    await documentReader.get(`/api/attachments/${attachment.body.id}/content`).expect(403);
    await documentReader.get(`/api/projects/${project.body.id}/document-links`).expect(200);
    await documentReader.post(`/api/projects/${project.body.id}/document-links`).send({ documentId: document.body.id }).expect(403);

    const documentWriterWithoutProjectWrite = await createUserWithPermissions(admin, "document_writer_no_project", [
      { resource: "projects", action: "read" },
      { resource: "documents", action: "read" },
      { resource: "documents", action: "write" }
    ]);
    const forbidden = await documentWriterWithoutProjectWrite
      .post(`/api/projects/${project.body.id}/document-links`)
      .send({ documentId: document.body.id })
      .expect(403);
    expect(forbidden.body).toMatchObject({ error: "FORBIDDEN", statusCode: 403 });

    const linked = await admin
      .post(`/api/projects/${project.body.id}/document-links`)
      .send({ documentId: document.body.id })
      .expect(201);
    expect(linked.body).toMatchObject({
      owner: { type: "project", id: project.body.id },
      document: { id: document.body.id, kind: "document" }
    });
  });
});
