/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App, echte SQLite-Testdatenbank, echter Multipart-Upload und echte Rollen/Sessions.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Temp-DB über Test-Fixture, keine produktiven Uploads oder Content-Dateien.
 *
 * Abgedeckte Regeln:
 * - Content-Bilder werden als BLOB in der Datenbank gespeichert und über ihre API-URL ausgeliefert.
 * - Schreibzugriff benötigt contentImages:write, Lesezugriff contentImages:read.
 *
 * Fehlerfälle:
 * - Nicht-Bild-MIME, leere oder zu große Uploads werden abgewiesen.
 * - Fehlende Session liefert 401, fehlende Schreibberechtigung 403.
 *
 * Ziel:
 * Editor-Bilder ohne Entity-spezifischen Attachment-Kontext über die geschützte API absichern.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

describe("Content Images API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let originalAdminInitialPassword: string | null;

  beforeAll(async () => {
    originalAdminInitialPassword = config.adminInitialPassword;
    config.adminInitialPassword = "password123";
    testDb = createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(() => {
    truncateAll(testDb.sqlite);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (testDb) {
      testDb.sqlite.close();
    }
    config.adminInitialPassword = originalAdminInitialPassword;
  });

  async function loginAdmin() {
    const agent = supertest.agent(app.server);
    await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
    return agent;
  }

  async function loginReader() {
    const admin = await loginAdmin();
    const readerRole = testDb.sqlite.prepare("SELECT id FROM roles WHERE key = 'reader'").get() as { id: number };
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Read", lastName: "Only", email: "content-image-reader@example.test", roleId: readerRole.id, password: "password123", isActive: true })
      .expect(201);

    const reader = supertest.agent(app.server);
    await reader.post("/api/auth/login").send({ email: "content-image-reader@example.test", password: "password123" }).expect(200);
    return reader;
  }

  async function uploadImage() {
    const admin = await loginAdmin();
    return admin
      .post("/api/content/images")
      .attach("file", Buffer.from("png-image-bytes"), { filename: "editor.png", contentType: "image/png" })
      .expect(201);
  }

  it("POST speichert ein Bild und GET liefert den BLOB mit MIME-Typ aus", async () => {
    const admin = await loginAdmin();

    const created = await admin
      .post("/api/content/images")
      .attach("file", Buffer.from("png-image-bytes"), { filename: "editor.png", contentType: "image/png" })
      .expect(201);

    expect(created.body.url).toMatch(/^\/api\/content\/images\/[0-9a-f-]+$/);
    const id = created.body.url.split("/").at(-1) as string;
    const row = testDb.sqlite.prepare("SELECT mime_type, size, data FROM content_images WHERE id = ?").get(id) as {
      mime_type: string;
      size: number;
      data: Buffer;
    };
    expect(row.mime_type).toBe("image/png");
    expect(row.size).toBe(Buffer.byteLength("png-image-bytes"));
    expect(Buffer.from(row.data).toString("utf8")).toBe("png-image-bytes");

    const fetched = await admin.get(created.body.url).buffer(true).parse(binaryParser).expect(200);
    expect(fetched.headers["content-type"]).toContain("image/png");
    expect(fetched.body.toString("utf8")).toBe("png-image-bytes");
  });

  it("POST lehnt Nicht-Bild-MIME ab", async () => {
    const admin = await loginAdmin();

    await admin
      .post("/api/content/images")
      .attach("file", Buffer.from("text"), { filename: "not-image.txt", contentType: "text/plain" })
      .expect(400);
  });

  it("POST lehnt Uploads über 10 MB ab", async () => {
    const admin = await loginAdmin();

    await admin
      .post("/api/content/images")
      .attach("file", Buffer.alloc(10 * 1024 * 1024 + 1, 1), { filename: "too-large.png", contentType: "image/png" })
      .expect(400);
  });

  it("POST und GET verlangen eine Session", async () => {
    const created = await uploadImage();

    await supertest(app.server)
      .post("/api/content/images")
      .attach("file", Buffer.from("png-image-bytes"), { filename: "editor.png", contentType: "image/png" })
      .expect(401);
    await supertest(app.server).get(created.body.url).expect(401);
  });

  it("Reader dürfen Content-Bilder lesen, aber nicht schreiben", async () => {
    const created = await uploadImage();
    const reader = await loginReader();

    const fetched = await reader.get(created.body.url).buffer(true).parse(binaryParser).expect(200);
    expect(fetched.body.toString("utf8")).toBe("png-image-bytes");

    await reader
      .post("/api/content/images")
      .attach("file", Buffer.from("png-image-bytes"), { filename: "editor.png", contentType: "image/png" })
      .expect(403);
  });
});

function binaryParser(res: NodeJS.ReadableStream, callback: (error: Error | null, body?: Buffer) => void): void {
  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
  res.on("error", (error: Error) => callback(error));
}
