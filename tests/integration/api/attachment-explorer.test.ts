/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-Routen, Auth-Hooks, MySQL-Testdatenbank, Services, Repositories,
 *   Migrationen und ein eindeutiger Dateisystem-Temp-Root.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Der native File-Opener wird nicht aufgerufen; der Test prüft reale
 *   HTTP-, DB-, ZIP- und Dateisystemeffekte.
 *
 * Isolation:
 * - Zufällig benannte Testdatenbank und Temp-Verzeichnisse unter dem Betriebssystem-Temp-Root.
 *
 * Abgedeckte Regeln:
 * - Lokale Windows-Ordner werden ownergebunden registriert, paginiert navigiert und sicher gelesen.
 * - Virtuelle Ordnerzuweisung, ZIP-Download, Bulk-Lösen und Bulk-Löschen arbeiten gesammelt und versionsgeschützt.
 * - Lokale Ursprungsdateien werden beim Lösen einer Ordner-Verknüpfung nicht gelöscht.
 * - Lesen benötigt attachments:read; Verknüpfen und Zuordnen benötigen attachments:write;
 *   endgültiges Löschen benötigt attachments:delete.
 *
 * Fehlerfälle:
 * - Pfad-Traversal, fehlende Session, Reader-Schreibzugriff und veraltete Version.
 *
 * Ziel:
 * Die Attachment-Explorer-Verträge über API, Persistenz und echtes Dateisystem ohne
 * Zugriff auf produktive Daten oder Upload-Verzeichnisse abzusichern.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest, { type SuperAgentTest } from "supertest";
import * as unzipper from "unzipper";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  buildTestApp,
  createTestDb,
  truncateAll,
  type TestDb
} from "../../fixtures/api/index.js";

const uploadDir = path.join(os.tmpdir(), `taskmanager-attachment-explorer-uploads-${process.pid}`);
const localRoot = path.join(os.tmpdir(), `taskmanager-attachment-explorer-local-${process.pid}`);

describe("Attachment Explorer API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = uploadDir;
    testDb = await createTestDb();
    app = await buildTestApp(testDb, {
      enableAuth: true,
      enableMultipart: true,
      fileOpener: async () => undefined
    });
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(localRoot, { recursive: true, force: true });
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(path.join(localRoot, "Unterordner"), { recursive: true });
    await fs.writeFile(path.join(localRoot, "lokal.txt"), "Lokaler Inhalt", "utf8");
    await fs.writeFile(path.join(localRoot, "Unterordner", "bild.txt"), "Unterordner", "utf8");
  });

  afterEach(async () => {
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(localRoot, { recursive: true, force: true });
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
  });

  async function login(email = "admin@local"): Promise<SuperAgentTest> {
    const agent = supertest.agent(app.server);
    await agent
      .post("/api/auth/login")
      .send({ email, password: "password123" })
      .expect(200);
    return agent;
  }

  async function createProject(agent: SuperAgentTest) {
    return (
      await agent
        .post("/api/projects")
        .send({ name: "Explorer-Projekt", status: "active", color: "#6366f1" })
        .expect(201)
    ).body as { id: number };
  }

  async function uploadAttachment(
    agent: SuperAgentTest,
    projectId: number,
    filename: string,
    content: string,
    visibility: "attachment-only" | "document-library" = "attachment-only"
  ) {
    return (
      await agent
        .post(`/api/projects/${projectId}/attachments?libraryVisibility=${visibility}`)
        .attach("file", Buffer.from(content), {
          filename,
          contentType: "text/plain"
        })
        .expect(201)
    ).body as { id: number; version: number; filename: string };
  }

  it("registriert und navigiert eine lokale Ordnerquelle ohne die Ursprungsdateien zu verändern", async () => {
    const admin = await login();
    const project = await createProject(admin);

    const created = await admin
      .post("/api/attachment-local-folders")
      .send({
        ownerType: "project",
        ownerId: project.id,
        rootPath: localRoot,
        name: "Festplatten-Unterlagen"
      })
      .expect(201);

    expect(created.body).toMatchObject({
      owner: { type: "project", id: project.id },
      name: "Festplatten-Unterlagen",
      rootPath: await fs.realpath(localRoot),
      version: 1
    });

    const rootEntries = await admin
      .get(`/api/attachment-local-folders/${created.body.id}/entries?page=1&pageSize=1`)
      .expect(200);
    expect(rootEntries.body).toMatchObject({ total: 2, page: 1, pageSize: 1 });
    expect(rootEntries.body.data[0]).toMatchObject({
      kind: "directory",
      name: "Unterordner",
      relativePath: "Unterordner"
    });

    const secondPage = await admin
      .get(`/api/attachment-local-folders/${created.body.id}/entries?page=2&pageSize=1`)
      .expect(200);
    expect(secondPage.body.data[0]).toMatchObject({
      kind: "file",
      name: "lokal.txt",
      size: Buffer.byteLength("Lokaler Inhalt")
    });

    const content = await admin
      .get(
        `/api/attachment-local-folders/${created.body.id}/content?relativePath=${encodeURIComponent("lokal.txt")}`
      )
      .expect(200);
    expect(content.text).toBe("Lokaler Inhalt");

    const traversal = await admin
      .get(
        `/api/attachment-local-folders/${created.body.id}/content?relativePath=${encodeURIComponent("../außerhalb.txt")}`
      )
      .expect(400);
    expect(traversal.body).toMatchObject({ error: "BAD_REQUEST", statusCode: 400 });

    await admin
      .delete(
        `/api/attachment-local-folders/${created.body.id}?expectedVersion=${created.body.version}`
      )
      .expect(204);
    expect(await fs.readFile(path.join(localRoot, "lokal.txt"), "utf8")).toBe("Lokaler Inhalt");
  });

  it("ordnet Attachments gesammelt zu, lädt PM- und lokale Dateien als ZIP und löst Verknüpfungen gebündelt", async () => {
    const admin = await login();
    const project = await createProject(admin);
    const first = await uploadAttachment(admin, project.id, "eins.txt", "Eins");
    const second = await uploadAttachment(admin, project.id, "zwei.txt", "Zwei");
    const folder = await admin
      .post("/api/attachment-folders")
      .send({ name: "Virtuell" })
      .expect(201);
    const localFolder = await admin
      .post("/api/attachment-local-folders")
      .send({ ownerType: "project", ownerId: project.id, rootPath: localRoot })
      .expect(201);

    await admin
      .post("/api/attachments/bulk-folder")
      .send({
        ownerType: "project",
        ownerId: project.id,
        folderId: folder.body.id,
        attachments: [
          { id: first.id, expectedVersion: first.version },
          { id: second.id, expectedVersion: second.version }
        ]
      })
      .expect(204);

    const listed = await admin.get(`/api/projects/${project.id}/attachments`).expect(200);
    expect(listed.body).toHaveLength(2);
    expect(listed.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ folder: expect.objectContaining({ id: folder.body.id }), version: 2 }),
        expect.objectContaining({ folder: expect.objectContaining({ id: folder.body.id }), version: 2 })
      ])
    );

    const archiveResponse = await admin
      .post("/api/attachments/archive")
      .send({
        ownerType: "project",
        ownerId: project.id,
        attachmentIds: [first.id],
        localFiles: [{ folderId: localFolder.body.id, relativePath: "lokal.txt" }]
      })
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200)
      .expect("Content-Type", /application\/zip/);
    const archive = await unzipper.Open.buffer(archiveResponse.body as Buffer);
    const archivedNames = archive.files.map((file) => file.path).sort();
    expect(archivedNames).toEqual(["eins.txt", `${path.basename(localRoot)}/lokal.txt`].sort());

    await admin
      .post("/api/attachments/bulk-unlink")
      .send({
        ownerType: "project",
        ownerId: project.id,
        attachments: listed.body.map((attachment: { id: number; version: number }) => ({
          id: attachment.id,
          expectedVersion: attachment.version
        }))
      })
      .expect(204);

    await admin.get(`/api/projects/${project.id}/attachments`).expect(200, []);
    const [rows] = await testDb.pool.execute(
      "SELECT is_in_document_library AS isInDocumentLibrary FROM attachments WHERE id IN (?, ?)",
      [first.id, second.id]
    );
    expect(rows).toEqual([
      expect.objectContaining({ isInDocumentLibrary: 1 }),
      expect.objectContaining({ isInDocumentLibrary: 1 })
    ]);
  });

  it("löscht mehrere PM-Attachments versionsgeschützt, aber niemals lokale Dateien", async () => {
    const admin = await login();
    const project = await createProject(admin);
    const first = await uploadAttachment(admin, project.id, "delete-a.txt", "A");
    const second = await uploadAttachment(admin, project.id, "delete-b.txt", "B");

    await admin
      .post("/api/attachments/bulk-delete")
      .send({
        ownerType: "project",
        ownerId: project.id,
        attachments: [
          { id: first.id, expectedVersion: first.version },
          { id: second.id, expectedVersion: second.version }
        ]
      })
      .expect(204);

    const [rows] = await testDb.pool.execute(
      "SELECT id FROM attachments WHERE id IN (?, ?)",
      [first.id, second.id]
    );
    expect(rows).toEqual([]);
    await expect(fs.access(path.join(uploadDir, first.filename))).rejects.toBeDefined();
    await expect(fs.access(path.join(uploadDir, second.filename))).rejects.toBeDefined();
    expect(await fs.readFile(path.join(localRoot, "lokal.txt"), "utf8")).toBe("Lokaler Inhalt");
  });

  it("erzwingt Session sowie Read-, Write- und Delete-Berechtigungen", async () => {
    const admin = await login();
    const project = await createProject(admin);
    const attachment = await uploadAttachment(admin, project.id, "rechte.txt", "Rechte");

    await supertest(app.server)
      .get(
        `/api/attachment-local-folders?ownerType=project&ownerId=${project.id}`
      )
      .expect(401);

    const [readerRoleRows] = await testDb.pool.execute(
      "SELECT id FROM roles WHERE `key` = 'reader'"
    );
    const readerRole = (readerRoleRows as Array<{ id: number }>)[0];
    await admin
      .post("/api/admin/users")
      .send({
        firstName: "Attachment",
        lastName: "Reader",
        email: "attachment-explorer-reader@example.test",
        roleId: readerRole.id,
        password: "password123",
        isActive: true
      })
      .expect(201);
    const reader = await login("attachment-explorer-reader@example.test");

    await reader
      .get(
        `/api/attachment-local-folders?ownerType=project&ownerId=${project.id}`
      )
      .expect(200);
    await reader
      .post("/api/attachment-local-folders")
      .send({ ownerType: "project", ownerId: project.id, rootPath: localRoot })
      .expect(403);
    await reader
      .post("/api/attachments/bulk-delete")
      .send({
        ownerType: "project",
        ownerId: project.id,
        attachments: [{ id: attachment.id, expectedVersion: attachment.version }]
      })
      .expect(403);

    const stale = await admin
      .post("/api/attachments/bulk-folder")
      .send({
        ownerType: "project",
        ownerId: project.id,
        folderId: null,
        attachments: [{ id: attachment.id, expectedVersion: attachment.version + 1 }]
      })
      .expect(409);
    expect(stale.body).toMatchObject({ error: "CONFLICT", statusCode: 409 });
  });
});
