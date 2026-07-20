/**
 * Test Scope:
 * Attachments API
 *
 * Abgedeckte Regeln:
 * - Multipart-Uploads, Listen, Vorschau, Löschen und lokales Öffnen von Attachments.
 * - Lokales Öffnen nutzt einen injizierten File-Opener und verlangt attachments:read.
 * - Dateiinhalt, generierte Vorschauen und Kachel-Thumbnails werden ausschließlich über authentifizierte,
 *   berechtigungsgeprüfte Routen ausgeliefert; statische erratbare URLs bleiben geschlossen.
 *
 * Fehlerfälle:
 * - Fehlende Owner, fehlende Attachments, fehlende Dateien und fehlende Berechtigungen.
 *
 * Ziel:
 * Attachment-Metadaten, Dateisystemzugriffe und Berechtigungsschutz ohne echte native App-Aufrufe absichern.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  getActiveAttachmentWatcherCountForTests,
  setAttachmentWatcherPollIntervalForTests,
  setAttachmentWatcherSettleDelayForTests,
  setAttachmentWatcherTimeoutForTests,
  stopAllAttachmentWatchers
} from "../../../apps/api/src/services/attachment-watcher.service.js";
import {
  buildTestApp,
  createFeature,
  createMilestone,
  createProject,
  createTask,
  createTestDb,
  createTicket,
  createWikiPage,
  truncateAll,
  type TestDb
} from "../../fixtures/api/index.js";

const uploadDir = path.join(os.tmpdir(), `taskmanager-api-attachments-${process.pid}`);
const previewCacheDir = path.join(os.tmpdir(), `taskmanager-api-attachment-previews-${process.pid}`);

async function waitForCondition(assertion: () => boolean, timeoutMs = 1000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (assertion()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Condition was not met in time");
}

describe("Attachments API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let openedPaths: string[];
  let openerError: Error | null;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = uploadDir;
    process.env.PREVIEW_CACHE_DIR = previewCacheDir;
    testDb = await createTestDb();
    openedPaths = [];
    openerError = null;
    app = await buildTestApp(testDb, {
      enableMultipart: true,
      fileOpener: async (filePath) => {
        if (openerError) {
          throw openerError;
        }
        openedPaths.push(filePath);
      }
    });
  });

  beforeEach(async () => {
    openedPaths = [];
    openerError = null;
    await truncateAll(testDb.pool);
  });

  afterEach(async () => {
    stopAllAttachmentWatchers();
    setAttachmentWatcherPollIntervalForTests(null);
    setAttachmentWatcherSettleDelayForTests(null);
    setAttachmentWatcherTimeoutForTests(null);
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(previewCacheDir, { recursive: true });
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
  });

  it("POST /api/projects/:id/attachments laedt Datei hoch und gibt Metadaten zurueck", async () => {
    const project = await createProject(app);

    const res = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("Projekt-Datei"), { filename: "projekt.txt", contentType: "text/plain" })
      .expect(201);

    expect(res.body.owners).toEqual([{ type: "project", id: project.id }]);
    expect(res.body.originalName).toBe("projekt.txt");
    expect(res.body.mimetype).toBe("text/plain");
    expect(res.body.size).toBeGreaterThan(0);
    expect(res.body.url).toBe(`/api/attachments/${res.body.id}/content`);
  });

  it("GET /api/projects/:id/attachments gibt Attachment-Liste zurueck", async () => {
    const project = await createProject(app);
    const upload = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("Liste"), { filename: "liste.txt", contentType: "text/plain" })
      .expect(201);

    const res = await supertest(app.server).get(`/api/projects/${project.id}/attachments`).expect(200);
    expect(res.body.find((item: { id: number }) => item.id === upload.body.id)).toBeDefined();
  });

  it("POST /api/tasks/:id/attachments laedt Datei zum Task hoch", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    const res = await supertest(app.server)
      .post(`/api/tasks/${task.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("Task-Datei"), { filename: "aufgabe.pdf", contentType: "application/pdf" })
      .expect(201);

    expect(res.body.owners).toEqual([{ type: "task", id: task.id }]);
    expect(res.body.mimetype).toBe("application/pdf");
  });

  it("verknuepft ein Inhaltsduplikat mit dem neuen Parent, ohne Datei und Datensatz zu duplizieren", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    const first = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments`)
      .attach("file", Buffer.from("identischer Inhalt"), { filename: "original.txt", contentType: "text/plain" })
      .expect(201);
    const second = await supertest(app.server)
      .post(`/api/tasks/${task.id}/attachments`)
      .attach("file", Buffer.from("identischer Inhalt"), { filename: "kopie.txt", contentType: "text/plain" })
      .expect(201);

    expect(second.body.id).toBe(first.body.id);
    expect(second.body.filename).toBe(first.body.filename);
    expect(second.body.owners).toEqual(
      expect.arrayContaining([
        { type: "project", id: project.id },
        { type: "task", id: task.id }
      ])
    );

    const [attachmentRows] = await testDb.pool.execute("SELECT COUNT(*) AS count FROM attachments");
    expect((attachmentRows as Array<{ count: number }>)[0].count).toBe(1);
    await expect(fs.stat(path.join(uploadDir, first.body.filename))).resolves.toBeDefined();

    const projectList = await supertest(app.server).get(`/api/projects/${project.id}/attachments`).expect(200);
    const taskList = await supertest(app.server).get(`/api/tasks/${task.id}/attachments`).expect(200);
    expect((projectList.body as Array<{ id: number }>).map((item) => item.id)).toEqual([first.body.id]);
    expect((taskList.body as Array<{ id: number }>).map((item) => item.id)).toEqual([first.body.id]);
  });

  it.each([
    {
      label: "project",
      ownerType: "project",
      createOwner: async () => {
        const project = await createProject(app);
        return { id: project.id, path: `/api/projects/${project.id}/attachments` };
      }
    },
    {
      label: "milestone",
      ownerType: "milestone",
      createOwner: async () => {
        const project = await createProject(app);
        const milestone = await createMilestone(app, project.id);
        return { id: milestone.id, path: `/api/milestones/${milestone.id}/attachments` };
      }
    },
    {
      label: "task",
      ownerType: "task",
      createOwner: async () => {
        const project = await createProject(app);
        const task = await createTask(app, project.id);
        return { id: task.id, path: `/api/tasks/${task.id}/attachments` };
      }
    },
    {
      label: "feature",
      ownerType: "feature",
      createOwner: async () => {
        const feature = await createFeature(app);
        return { id: feature.id, path: `/api/features/${feature.id}/attachments` };
      }
    },
    {
      label: "ticket",
      ownerType: "ticket",
      createOwner: async () => {
        const ticket = await createTicket(app, null);
        return { id: ticket.id, path: `/api/tickets/${ticket.id}/attachments` };
      }
    },
    {
      label: "wikiPage",
      ownerType: "wikiPage",
      createOwner: async () => {
        const page = await createWikiPage(app);
        return { id: page.id, path: `/api/wiki/${page.id}/attachments` };
      }
    }
  ])("POST+GET verknuepft Attachments mit $label", async ({ label, ownerType, createOwner }) => {
    const owner = await createOwner();
    const filename = `${label}-create-flow.txt`;

    const created = await supertest(app.server)
      .post(`${owner.path}?libraryVisibility=document-library`)
      .attach("file", Buffer.from(`Datei fuer ${label}`), { filename, contentType: "text/plain" })
      .expect(201);
    const listed = await supertest(app.server).get(owner.path).expect(200);

    expect(created.body).toEqual(expect.objectContaining({ originalName: filename, isInDocumentLibrary: true, owners: [{ type: ownerType, id: owner.id }] }));
    expect(listed.body).toEqual([expect.objectContaining({ id: created.body.id, originalName: filename, isInDocumentLibrary: true, owners: [{ type: ownerType, id: owner.id }] })]);
  });

  it("DELETE /api/wiki/:id/attachments/:attachmentId entfernt die Wiki-Verknüpfung und behält das Attachment", async () => {
    const page = await createWikiPage(app);
    const created = await supertest(app.server)
      .post(`/api/wiki/${page.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("Wiki-Datei"), { filename: "wiki.txt", contentType: "text/plain" })
      .expect(201);

    await supertest(app.server)
      .delete(`/api/wiki/${page.id}/attachments/${created.body.id}?expectedVersion=${created.body.version}`)
      .expect(204);

    const listed = await supertest(app.server).get(`/api/wiki/${page.id}/attachments`).expect(200);
    expect(listed.body).toEqual([]);
    const [linkRows] = await testDb.pool.execute("SELECT attachment_id FROM wiki_page_attachments WHERE wiki_page_id = ? AND attachment_id = ?", [page.id, created.body.id]);
    expect((linkRows as unknown[]).length).toBe(0);
    const [existRows] = await testDb.pool.execute("SELECT id FROM attachments WHERE id = ?", [created.body.id]);
    expect((existRows as unknown[]).length).toBe(1);
  });

  it("POST zu nicht existierendem Projekt gibt 404 zurueck", async () => {
    await supertest(app.server)
      .post("/api/projects/9999/attachments?libraryVisibility=document-library")
      .attach("file", Buffer.from("X"), { filename: "x.txt", contentType: "text/plain" })
      .expect(404);
  });

  it("DELETE /api/attachments/:id entfernt den Eintrag aus der DB", async () => {
    const project = await createProject(app);
    const upload = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("Zu loeschen"), { filename: "delete-me.txt", contentType: "text/plain" })
      .expect(201);

    await supertest(app.server).delete(`/api/attachments/${upload.body.id}?expectedVersion=${upload.body.version}`).expect(204);

    const res = await supertest(app.server).get(`/api/projects/${project.id}/attachments`).expect(200);
    expect(res.body.find((item: { id: number }) => item.id === upload.body.id)).toBeUndefined();
  });

  it("DELETE eines nicht vorhandenen Attachments gibt 404 zurueck", async () => {
    await supertest(app.server).delete("/api/attachments/9999?expectedVersion=1").expect(404);
  });

  it("GET /api/attachments/:id/preview gibt Textvorschau begrenzt zurueck", async () => {
    const project = await createProject(app);
    const upload = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("Erste Zeile\nZweite Zeile"), { filename: "notiz.txt", contentType: "text/plain" })
      .expect(201);

    const res = await supertest(app.server).get(`/api/attachments/${upload.body.id}/preview`).expect(200);

    expect(res.body).toMatchObject({
      id: upload.body.id,
      kind: "text",
      status: "available",
      previewUrl: null
    });
    expect(res.body.text.content).toContain("Erste Zeile");
    expect(res.body.text.truncated).toBe(false);
  });

  it("GET /api/attachments/:id/preview erkennt PDF als native Vorschau", async () => {
    const project = await createProject(app);
    const upload = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("%PDF-1.4"), { filename: "dokument.pdf", contentType: "application/pdf" })
      .expect(201);

    const res = await supertest(app.server).get(`/api/attachments/${upload.body.id}/preview`).expect(200);

    expect(res.body).toMatchObject({
      id: upload.body.id,
      kind: "pdf",
      status: "available",
      previewUrl: upload.body.url,
      text: null
    });
  });

  it("POST /api/attachments/:id/open oeffnet die absolute Upload-Datei", async () => {
    const project = await createProject(app);
    const upload = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("Lokal öffnen"), { filename: "lokal.txt", contentType: "text/plain" })
      .expect(201);

    await supertest(app.server).post(`/api/attachments/${upload.body.id}/open`).expect(204);

    expect(openedPaths).toHaveLength(1);
    expect(path.isAbsolute(openedPaths[0] ?? "")).toBe(true);
    expect(path.relative(uploadDir, openedPaths[0] ?? "")).toBe(upload.body.filename);
  });

  it("POST /api/attachments/:id/open aktualisiert Metadaten nach externer Dateiänderung", async () => {
    const project = await createProject(app);
    const upload = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("vorher"), { filename: "watch.txt", contentType: "text/plain" })
      .expect(201);
    const [beforeRows] = await testDb.pool.execute("SELECT size, version, updated_at FROM attachments WHERE id = ?", [upload.body.id]);
    const before = (beforeRows as Array<{ size: number; version: number; updated_at: string }>)[0];

    setAttachmentWatcherPollIntervalForTests(20);
    await supertest(app.server).post(`/api/attachments/${upload.body.id}/open`).expect(204);
    expect(getActiveAttachmentWatcherCountForTests()).toBe(1);
    const diskPath = openedPaths[0] as string;
    await new Promise((resolve) => setTimeout(resolve, 50));
    await fs.writeFile(diskPath, "nachher-groesser", "utf8");

    await waitForCondition(() => getActiveAttachmentWatcherCountForTests() === 0, 3000);
    const [afterRows] = await testDb.pool.execute("SELECT size, version FROM attachments WHERE id = ?", [upload.body.id]);
    const after = (afterRows as Array<{ size: number; version: number }>)[0];
    expect(after).toMatchObject({
      size: Buffer.byteLength("nachher-groesser"),
      version: before.version + 1
    });
    expect(getActiveAttachmentWatcherCountForTests()).toBe(0);
  });

  it("beendet Attachment-Watcher nach Timeout ohne späteres Metadaten-Update", async () => {
    setAttachmentWatcherTimeoutForTests(30);
    setAttachmentWatcherPollIntervalForTests(20);
    const project = await createProject(app);
    const upload = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("timeout"), { filename: "timeout.txt", contentType: "text/plain" })
      .expect(201);
    const [beforeRows2] = await testDb.pool.execute("SELECT size, version FROM attachments WHERE id = ?", [upload.body.id]);
    const before = (beforeRows2 as Array<{ size: number; version: number }>)[0];

    await supertest(app.server).post(`/api/attachments/${upload.body.id}/open`).expect(204);
    await waitForCondition(() => getActiveAttachmentWatcherCountForTests() === 0);
    await fs.writeFile(path.join(uploadDir, upload.body.filename), "timeout-geändert", "utf8");
    await new Promise((resolve) => setTimeout(resolve, 80));

    const [afterRows2] = await testDb.pool.execute("SELECT size, version FROM attachments WHERE id = ?", [upload.body.id]);
    const after = (afterRows2 as Array<{ size: number; version: number }>)[0];
    expect(after).toEqual(before);
  });

  it("POST /api/attachments/:id/open gibt 404 fuer unbekanntes Attachment zurueck", async () => {
    await supertest(app.server).post("/api/attachments/9999/open").expect(404);
    expect(openedPaths).toHaveLength(0);
  });

  it("POST /api/attachments/:id/open gibt 404 fuer fehlende Upload-Datei zurueck", async () => {
    const project = await createProject(app);
    const upload = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("Fehlt"), { filename: "fehlt.txt", contentType: "text/plain" })
      .expect(201);

    await fs.rm(path.join(uploadDir, upload.body.filename), { force: true });

    await supertest(app.server).post(`/api/attachments/${upload.body.id}/open`).expect(404);
    expect(openedPaths).toHaveLength(0);
  });

  it("POST /api/attachments/:id/open meldet Opener-Fehler einheitlich", async () => {
    const project = await createProject(app);
    const upload = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("Fehler"), { filename: "fehler.txt", contentType: "text/plain" })
      .expect(201);

    openerError = new Error("Native App fehlt");

    const res = await supertest(app.server).post(`/api/attachments/${upload.body.id}/open`).expect(500);
    expect(res.body).toMatchObject({
      error: "INTERNAL_ERROR",
      message: "Datei konnte nicht geöffnet werden.",
      statusCode: 500
    });
  });
});

describe("Attachments API Auth", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = uploadDir;
    process.env.PREVIEW_CACHE_DIR = previewCacheDir;
    testDb = await createTestDb();
    app = await buildTestApp(testDb, {
      enableAuth: true,
      enableMultipart: true,
      fileOpener: async () => undefined
    });
  });

  beforeEach(async () => { await truncateAll(testDb.pool); });

  afterEach(async () => {
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(previewCacheDir, { recursive: true });
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.rm(previewCacheDir, { recursive: true, force: true });
  });

  async function loginAdmin() {
    const agent = supertest.agent(app.server);
    await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
    return agent;
  }

  async function createAttachmentWithAdmin() {
    const admin = await loginAdmin();
    const project = await admin.post("/api/projects").send({ name: "Auth-Projekt", status: "active", color: "#6366f1" }).expect(201);
    const upload = await admin
      .post(`/api/projects/${project.body.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("Auth"), { filename: "auth.txt", contentType: "text/plain" })
      .expect(201);
    return upload.body as { id: number; filename: string };
  }

  it("schützt Dateiinhalt und Vorschau vor anonymen, unberechtigten und statischen Zugriffen", async () => {
    const attachment = await createAttachmentWithAdmin();
    const admin = await loginAdmin();

    const anonymousContent = await supertest(app.server).get(`/api/attachments/${attachment.id}/content`).expect(401);
    expect(anonymousContent.body).toMatchObject({ error: "UNAUTHORIZED", statusCode: 401 });
    await supertest(app.server).get(`/api/attachments/${attachment.id}/preview-file`).expect(401);
    await supertest(app.server).get(`/api/documents/${attachment.id}/thumbnail`).expect(401);
    await supertest(app.server).get(`/uploads/${attachment.filename}`).expect(401);
    await supertest(app.server).get("/previews/erraten.pdf").expect(401);
    await admin.get(`/uploads/${attachment.filename}`).expect(404);
    await admin.get("/previews/erraten.pdf").expect(404);

    const role = await admin
      .post("/api/admin/roles")
      .send({ key: "content_without_attachments", label: "Ohne Dateizugriff", permissions: [{ resource: "projects", action: "read" }] })
      .expect(201);
    await admin
      .post("/api/admin/users")
      .send({ firstName: "No", lastName: "Content", email: "no-content@example.test", roleId: role.body.id, password: "password123", isActive: true })
      .expect(201);
    const custom = supertest.agent(app.server);
    await custom.post("/api/auth/login").send({ email: "no-content@example.test", password: "password123" }).expect(200);
    const forbiddenContent = await custom.get(`/api/attachments/${attachment.id}/content`).expect(403);
    expect(forbiddenContent.body).toMatchObject({ error: "FORBIDDEN", statusCode: 403 });
    await custom.get(`/api/attachments/${attachment.id}/preview-file`).expect(403);
    await custom.get(`/api/documents/${attachment.id}/thumbnail`).expect(403);

    await admin.get(`/api/documents/${attachment.id}/thumbnail`).expect(404);

    const content = await admin.get(`/api/attachments/${attachment.id}/content?download=true`).expect(200);
    expect(content.text).toBe("Auth");
    expect(content.headers["content-disposition"]).toContain("attachment");
    expect(content.headers["content-disposition"]).toContain("auth.txt");
  });

  it("blockiert manipulierte Speicherpfade vor dem Dateisystemzugriff", async () => {
    const attachment = await createAttachmentWithAdmin();
    const admin = await loginAdmin();
    await testDb.pool.execute("UPDATE attachments SET filename = '../outside.txt' WHERE id = ?", [attachment.id]);

    const response = await admin.get(`/api/attachments/${attachment.id}/content`).expect(400);

    expect(response.body).toMatchObject({ error: "BAD_REQUEST", statusCode: 400 });
    expect(response.body.message).toContain("outside the upload directory");
  });

  it("POST /api/attachments/:id/open verlangt eine Session", async () => {
    await supertest(app.server).post("/api/attachments/9999/open").expect(401);
  });

  it("POST /api/attachments/:id/open erlaubt Readern mit attachments:read den POST", async () => {
    const attachment = await createAttachmentWithAdmin();
    const admin = await loginAdmin();
    const [readerRoleRows] = await testDb.pool.execute("SELECT id FROM roles WHERE `key` = 'reader'");
    const readerRole = (readerRoleRows as Array<{ id: number }>)[0];
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Read", lastName: "Only", email: "attachment-reader@example.test", roleId: readerRole.id, password: "password123", isActive: true })
      .expect(201);

    const reader = supertest.agent(app.server);
    await reader.post("/api/auth/login").send({ email: "attachment-reader@example.test", password: "password123" }).expect(200);

    await reader.post(`/api/attachments/${attachment.id}/open`).expect(204);
  });

  it("POST /api/attachments/:id/open lehnt Rollen ohne attachments:read ab", async () => {
    const attachment = await createAttachmentWithAdmin();
    const admin = await loginAdmin();
    const role = await admin
      .post("/api/admin/roles")
      .send({ key: "project_reader_without_attachments", label: "Projektleser ohne Attachments", permissions: [{ resource: "projects", action: "read" }] })
      .expect(201);
    await admin
      .post("/api/admin/users")
      .send({ firstName: "No", lastName: "Attachments", email: "no-attachments@example.test", roleId: role.body.id, password: "password123", isActive: true })
      .expect(201);

    const custom = supertest.agent(app.server);
    await custom.post("/api/auth/login").send({ email: "no-attachments@example.test", password: "password123" }).expect(200);

    await custom.post(`/api/attachments/${attachment.id}/open`).expect(403);
  });
});
