/**
 * Test Scope:
 * DMS Bulk-Operationen (MS-75) — Mehrfachauswahl: Sammlung/Kategorie zuweisen + Zip-Download.
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitaetsgrad:
 * - Echte Fastify-App (buildTestApp), echte MySQL-Test-DB, echte Auth-Plugins, echte Sessions
 *   und Rollen (admin/reader), echte Multipart-Uploads ins Temp-Upload-Verzeichnis, echtes Zip.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Der Zip-Download liest die echten Dateien aus dem Temp-UPLOAD_DIR.
 *
 * Isolation:
 * - Temp-DB pro Lauf (createTestDb), truncateAll in beforeEach, Temp-UPLOAD_DIR unter os.tmpdir().
 *
 * Abgedeckte Regeln:
 * - Bulk-Zuweisung (Sammlung/Kategorie) laeuft unter Ressource attachments (401 ohne Session,
 *   403 Reader), Bulk-Download nur lesend (Reader erlaubt).
 * - Mehrere Dokumente werden gebuendelt einer Sammlung bzw. Kategorie zugewiesen (mit Gegenbeispiel).
 * - Doppelte Zuweisung ist idempotent; leere Auswahl ist ungueltig (400); unbekannte Sammlung 404.
 * - Bulk-Download liefert ein echtes Zip (PK-Signatur) mit den Originalnamen der Dokumente.
 *
 * Fehlerfaelle:
 * - 401 ohne Session, 403 Reader-Negativfall (Schreiben), 400 leere Auswahl, 404 unbekanntes Ziel/leere Trefferliste.
 *
 * Ziel:
 * Die Mehrfachauswahl-Server-Aktionen gegen Regressionen absichern — echte DB-Wirkung und echtes Zip.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const uploadDir = path.join(os.tmpdir(), `taskmanager-api-dms-bulk-${process.pid}`);

describe("DMS Bulk-Operationen API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = uploadDir;
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true, enableMultipart: true, fileOpener: async () => undefined });
  }, 300000);

  beforeEach(async () => {
    await truncateAll(testDb.pool);
    await fs.mkdir(uploadDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.mkdir(uploadDir, { recursive: true });
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
  }, 120000);

  async function loginAdmin() {
    const agent = supertest.agent(app.server);
    await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
    return agent;
  }

  async function loginReader() {
    const admin = await loginAdmin();
    const [rows] = await testDb.pool.execute("SELECT id FROM roles WHERE `key` = 'reader'");
    const readerRole = (rows as Array<{ id: number }>)[0];
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Read", lastName: "Only", email: "dms-bulk-reader@example.test", roleId: readerRole.id, password: "password123", isActive: true })
      .expect(201);
    const reader = supertest.agent(app.server);
    await reader.post("/api/auth/login").send({ email: "dms-bulk-reader@example.test", password: "password123" }).expect(200);
    return reader;
  }

  async function uploadDocument(admin: ReturnType<typeof supertest.agent>, name: string) {
    const res = await admin.post("/api/documents").attach("file", Buffer.from(`Inhalt ${name}`), { filename: name, contentType: "text/plain" }).expect(201);
    return res.body as { id: number };
  }

  it("lehnt Bulk-Endpunkte ohne Session ab (401)", async () => {
    await supertest(app.server).post("/api/documents/bulk/folders/1").send({ attachmentIds: [1] }).expect(401);
    await supertest(app.server).post("/api/documents/bulk/categories/1").send({ attachmentIds: [1] }).expect(401);
    await supertest(app.server).post("/api/documents/download").send({ attachmentIds: [1] }).expect(401);
  });

  it("Reader: Bulk-Zuweisung verboten (403), Bulk-Download erlaubt (200)", async () => {
    const admin = await loginAdmin();
    const doc = await uploadDocument(admin, "reader-dl.txt");
    const folder = await admin.post("/api/attachment-folders").send({ name: "F" }).expect(201);
    const category = await admin.post("/api/attachment-categories").send({ name: "C" }).expect(201);

    const reader = await loginReader();
    await reader.post(`/api/documents/bulk/folders/${folder.body.id}`).send({ attachmentIds: [doc.id] }).expect(403);
    await reader.post(`/api/documents/bulk/categories/${category.body.id}`).send({ attachmentIds: [doc.id] }).expect(403);

    const download = await reader.post("/api/documents/download").send({ attachmentIds: [doc.id] }).responseType("blob").expect(200);
    expect((download.body as Buffer).subarray(0, 2).toString("latin1")).toBe("PK");
  });

  it("weist mehrere Dokumente gebuendelt einer Sammlung zu (mit Gegenbeispiel)", async () => {
    const admin = await loginAdmin();
    const folder = await admin.post("/api/attachment-folders").send({ name: "Sammlung" }).expect(201);
    const a = await uploadDocument(admin, "bulk-a.txt");
    const b = await uploadDocument(admin, "bulk-b.txt");
    const c = await uploadDocument(admin, "bulk-c.txt"); // bewusst nicht zugewiesen

    await admin.post(`/api/documents/bulk/folders/${folder.body.id}`).send({ attachmentIds: [a.id, b.id] }).expect(204);

    const inFolder = await admin.get(`/api/documents?folder=${folder.body.id}`).expect(200);
    const ids = (inFolder.body as Array<{ id: number }>).map((doc) => doc.id);
    expect(ids).toContain(a.id);
    expect(ids).toContain(b.id);
    expect(ids).not.toContain(c.id);
  });

  it("weist mehrere Dokumente gebuendelt einer Kategorie zu", async () => {
    const admin = await loginAdmin();
    const category = await admin.post("/api/attachment-categories").send({ name: "Wichtig" }).expect(201);
    const a = await uploadDocument(admin, "cat-a.txt");
    const b = await uploadDocument(admin, "cat-b.txt");

    await admin.post(`/api/documents/bulk/categories/${category.body.id}`).send({ attachmentIds: [a.id, b.id] }).expect(204);

    const filtered = await admin.get(`/api/documents?category=${category.body.id}`).expect(200);
    const ids = (filtered.body as Array<{ id: number }>).map((doc) => doc.id);
    expect(ids).toContain(a.id);
    expect(ids).toContain(b.id);
  });

  it("Bulk-Zuweisung ist idempotent und validiert Eingabe und Ziel", async () => {
    const admin = await loginAdmin();
    const folder = await admin.post("/api/attachment-folders").send({ name: "Idem" }).expect(201);
    const a = await uploadDocument(admin, "idem.txt");

    // Zweimal zuweisen -> kein Fehler (INSERT IGNORE), keine Dublette in der Sammlung.
    await admin.post(`/api/documents/bulk/folders/${folder.body.id}`).send({ attachmentIds: [a.id] }).expect(204);
    await admin.post(`/api/documents/bulk/folders/${folder.body.id}`).send({ attachmentIds: [a.id] }).expect(204);
    const inFolder = await admin.get(`/api/documents?folder=${folder.body.id}`).expect(200);
    expect((inFolder.body as Array<{ id: number }>).filter((doc) => doc.id === a.id)).toHaveLength(1);

    // Leere Auswahl -> 400 (Schema minItems 1).
    await admin.post(`/api/documents/bulk/folders/${folder.body.id}`).send({ attachmentIds: [] }).expect(400);

    // Unbekannte Sammlung -> 404.
    await admin.post("/api/documents/bulk/folders/999999").send({ attachmentIds: [a.id] }).expect(404);
  });

  it("buendelt die Auswahl zu einem Zip und lehnt leere/unbekannte Auswahl ab", async () => {
    const admin = await loginAdmin();
    const a = await uploadDocument(admin, "zip-a.txt");
    const b = await uploadDocument(admin, "zip-b.txt");

    const res = await admin.post("/api/documents/download").send({ attachmentIds: [a.id, b.id] }).responseType("blob").expect(200);
    expect(res.headers["content-type"]).toContain("application/zip");
    expect(res.headers["content-disposition"]).toContain("dokumente.zip");

    const body = res.body as Buffer;
    expect(body.subarray(0, 2).toString("latin1")).toBe("PK"); // echte Zip-Signatur
    // Dateinamen liegen im Zip als Klartext (nur der Inhalt wird komprimiert) -> beweist die Einträge.
    expect(body.includes(Buffer.from("zip-a.txt"))).toBe(true);
    expect(body.includes(Buffer.from("zip-b.txt"))).toBe(true);

    // Leere Auswahl -> 400.
    await admin.post("/api/documents/download").send({ attachmentIds: [] }).expect(400);

    // Nur unbekannte IDs -> 404 (keine Treffer).
    await admin.post("/api/documents/download").send({ attachmentIds: [999999] }).expect(404);
  });
});
