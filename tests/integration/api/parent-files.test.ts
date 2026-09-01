/**
 * Test Scope:
 * Parent-Anhänge, Parent-Ordner und explizite DMS-Dokumentverknüpfungen.
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-Routen, Services, Repositories, MySQL-Testdatenbank und Temp-Dateisystem.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Nur der native File-Opener ist als kontrollierter Test-Collaborator injiziert.
 *
 * Isolation:
 * - Zufällig benannte MySQL-Testdatenbank und eigener Upload-Temp-Root; Bereinigung je Test.
 *
 * Abgedeckte Regeln:
 * - Uploads an alle sechs Parent-Typen erzeugen exklusive Parent-Anhänge und keine DMS-Dokumente.
 * - Parent-Ordner sind ownerlokal und verändern globale DMS-Sammlungen nicht.
 * - Ein DMS-Dokument kann explizit verknüpft, parentlokal einsortiert und verlustfrei entknüpft werden.
 * - Das Löschen eines Parents entfernt dessen exklusiven Anhang samt Upload-Datei für alle sechs Parent-Typen.
 * - Parent-Anhänge und Dokumentlinks verwenden unabhängige Versionsprüfungen.
 * - Ordnernamen, Owner-Grenzen, Zyklen und das Löschen nicht leerer Ordner werden abgewiesen.
 *
 * Fehlerfälle:
 * - Doppelte Links, fremde Ordner, Zyklen, stale Version und nicht leere Ordner.
 *
 * Ziel:
 * Nachweis, dass Parent-Dateiansicht und globales DMS fachlich und persistent getrennt arbeiten.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
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

const uploadDir = path.join(os.tmpdir(), `taskmanager-parent-files-${process.pid}`);

interface OwnerTarget {
  type: "project" | "milestone" | "task" | "feature" | "wikiPage" | "ticket";
  id: number;
  path: string;
}

describe("Parent-Dateien API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = uploadDir;
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableMultipart: true, fileOpener: async () => undefined });
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
    await fs.rm(uploadDir, { recursive: true, force: true });
    await fs.mkdir(uploadDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(uploadDir, { recursive: true, force: true });
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
  });

  async function owners(): Promise<OwnerTarget[]> {
    const project = await createProject(app);
    const milestone = await createMilestone(app, project.id);
    const task = await createTask(app, project.id);
    const feature = await createFeature(app);
    const wikiPage = await createWikiPage(app);
    const ticket = await createTicket(app, project.id);
    return [
      { type: "project", id: project.id, path: `projects/${project.id}` },
      { type: "milestone", id: milestone.id, path: `milestones/${milestone.id}` },
      { type: "task", id: task.id, path: `tasks/${task.id}` },
      { type: "feature", id: feature.id, path: `features/${feature.id}` },
      { type: "wikiPage", id: wikiPage.id, path: `wiki/${wikiPage.id}` },
      { type: "ticket", id: ticket.id, path: `tickets/${ticket.id}` }
    ];
  }

  async function importDocument(filename = "dms.txt", content = "DMS-Inhalt") {
    return (
      await supertest(app.server)
        .post("/api/documents")
        .attach("file", Buffer.from(content), { filename, contentType: "text/plain" })
        .expect(201)
    ).body as { id: number; version: number; filename: string; kind: string };
  }

  it("erzeugt Uploads an allen Parent-Typen ausschließlich als Parent-Anhänge", async () => {
    const targets = await owners();
    for (const target of targets) {
      const created = await supertest(app.server)
        .post(`/api/${target.path}/attachments`)
        .attach("file", Buffer.from(`Inhalt ${target.type}`), { filename: `${target.type}.txt`, contentType: "text/plain" })
        .expect(201);
      expect(created.body).toMatchObject({
        kind: "parent_attachment",
        owners: [{ type: target.type, id: target.id }],
        parentFolderId: null
      });
      expect(created.body.url).toBe(`/api/attachments/${created.body.id}/content`);
    }

    const documents = await supertest(app.server).get("/api/documents").expect(200);
    expect(documents.body).toEqual([]);
    const [rows] = await testDb.pool.execute("SELECT kind, COUNT(*) AS count FROM attachments GROUP BY kind");
    expect(rows).toEqual([{ kind: "parent_attachment", count: 6 }]);
  });

  it("verwaltet ownerlokale Ordner ohne globale DMS-Sammlungen anzulegen", async () => {
    const firstProject = await createProject(app, { name: "Ordner A" });
    const secondProject = await createProject(app, { name: "Ordner B" });
    const firstRoot = await supertest(app.server)
      .post(`/api/projects/${firstProject.id}/attachment-folders`)
      .send({ name: "Bilder" })
      .expect(201);
    const secondRoot = await supertest(app.server)
      .post(`/api/projects/${secondProject.id}/attachment-folders`)
      .send({ name: "Bilder" })
      .expect(201);
    const child = await supertest(app.server)
      .post(`/api/projects/${firstProject.id}/attachment-folders`)
      .send({ name: "Freigabe", parentId: firstRoot.body.id })
      .expect(201);
    const attachment = await supertest(app.server)
      .post(`/api/projects/${firstProject.id}/attachments`)
      .attach("file", Buffer.from("Parent"), { filename: "parent.txt", contentType: "text/plain" })
      .expect(201);

    const moved = await supertest(app.server)
      .patch(`/api/projects/${firstProject.id}/attachments/${attachment.body.id}/folder`)
      .send({ folderId: child.body.id, expectedVersion: attachment.body.version })
      .expect(200);
    expect(moved.body.parentFolderId).toBe(child.body.id);
    expect(moved.body.version).toBe(attachment.body.version + 1);

    await supertest(app.server)
      .patch(`/api/projects/${firstProject.id}/attachments/${attachment.body.id}/folder`)
      .send({ folderId: null, expectedVersion: attachment.body.version })
      .expect(409);

    const firstFolders = await supertest(app.server).get(`/api/projects/${firstProject.id}/attachment-folders`).expect(200);
    expect(firstFolders.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: firstRoot.body.id, childCount: 1, directEntryCount: 0 }),
      expect.objectContaining({ id: child.body.id, childCount: 0, directEntryCount: 1 })
    ]));
    const secondFolders = await supertest(app.server).get(`/api/projects/${secondProject.id}/attachment-folders`).expect(200);
    expect(secondFolders.body).toEqual([expect.objectContaining({ id: secondRoot.body.id, name: "Bilder" })]);

    await supertest(app.server)
      .patch(`/api/projects/${firstProject.id}/attachments/${attachment.body.id}/folder`)
      .send({ folderId: secondRoot.body.id, expectedVersion: moved.body.version })
      .expect(404);
    await supertest(app.server)
      .patch(`/api/projects/${firstProject.id}/attachment-folders/${firstRoot.body.id}`)
      .send({ parentId: child.body.id, expectedVersion: firstRoot.body.version })
      .expect(400);
    await supertest(app.server)
      .post(`/api/projects/${firstProject.id}/attachment-folders`)
      .send({ name: "Freigabe", parentId: firstRoot.body.id })
      .expect(409);
    await supertest(app.server)
      .delete(`/api/projects/${firstProject.id}/attachment-folders/${child.body.id}?expectedVersion=${child.body.version}`)
      .expect(409);

    const collections = await supertest(app.server).get("/api/attachment-folders").expect(200);
    expect(collections.body).toEqual([]);
  });

  it("verknüpft ein DMS-Dokument parentlokal und löst nur die Relation", async () => {
    const project = await createProject(app);
    const folder = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachment-folders`)
      .send({ name: "Referenzen" })
      .expect(201);
    const destination = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachment-folders`)
      .send({ name: "Archiv" })
      .expect(201);
    const otherProject = await createProject(app, { name: "Fremder Owner" });
    const foreignFolder = await supertest(app.server)
      .post(`/api/projects/${otherProject.id}/attachment-folders`)
      .send({ name: "Fremd" })
      .expect(201);
    const document = await importDocument();

    await supertest(app.server)
      .post(`/api/projects/${project.id}/document-links`)
      .send({ documentId: document.id, folderId: foreignFolder.body.id })
      .expect(404);

    const linked = await supertest(app.server)
      .post(`/api/projects/${project.id}/document-links`)
      .send({ documentId: document.id, folderId: folder.body.id })
      .expect(201);
    expect(linked.body).toMatchObject({
      owner: { type: "project", id: project.id },
      document: { id: document.id, kind: "document", url: `/api/documents/${document.id}/content` },
      folder: { id: folder.body.id }
    });
    await supertest(app.server)
      .post(`/api/projects/${project.id}/document-links`)
      .send({ documentId: document.id })
      .expect(409);

    const moved = await supertest(app.server)
      .patch(`/api/projects/${project.id}/document-links/${linked.body.id}/folder`)
      .send({ folderId: destination.body.id, expectedVersion: linked.body.version })
      .expect(200);
    expect(moved.body).toMatchObject({
      id: linked.body.id,
      version: linked.body.version + 1,
      folder: { id: destination.body.id }
    });
    await supertest(app.server)
      .patch(`/api/projects/${project.id}/document-links/${linked.body.id}/folder`)
      .send({ folderId: null, expectedVersion: linked.body.version })
      .expect(409);

    const parentAttachments = await supertest(app.server).get(`/api/projects/${project.id}/attachments`).expect(200);
    expect(parentAttachments.body).toEqual([]);
    const links = await supertest(app.server).get(`/api/projects/${project.id}/document-links`).expect(200);
    expect(links.body).toEqual([expect.objectContaining({
      id: linked.body.id,
      folder: expect.objectContaining({ id: destination.body.id }),
      document: expect.objectContaining({ id: document.id })
    })]);

    await supertest(app.server)
      .delete(`/api/projects/${project.id}/document-links/${linked.body.id}?expectedVersion=${moved.body.version}`)
      .expect(204);
    await supertest(app.server).get(`/api/projects/${project.id}/document-links`).expect(200, []);
    const remainingDocument = await supertest(app.server).get(`/api/documents/${document.id}`).expect(200);
    expect(remainingDocument.body.kind).toBe("document");
    await supertest(app.server).get(`/api/documents/${document.id}/content`).expect(200, "DMS-Inhalt");
    await expect(fs.stat(path.join(uploadDir, document.filename))).resolves.toBeDefined();
  });

  it("löscht einen exklusiven Parent-Anhang vollständig und versionsgeschützt", async () => {
    const project = await createProject(app);
    const attachment = await supertest(app.server)
      .post(`/api/projects/${project.id}/attachments`)
      .attach("file", Buffer.from("Löschen"), { filename: "loeschen.txt", contentType: "text/plain" })
      .expect(201);

    await supertest(app.server)
      .delete(`/api/projects/${project.id}/attachments/${attachment.body.id}?expectedVersion=${attachment.body.version + 1}`)
      .expect(409);
    await supertest(app.server)
      .delete(`/api/projects/${project.id}/attachments/${attachment.body.id}?expectedVersion=${attachment.body.version}`)
      .expect(204);

    await supertest(app.server).get(`/api/projects/${project.id}/attachments`).expect(200, []);
    await supertest(app.server).get(`/api/attachments/${attachment.body.id}/content`).expect(404);
    await expect(fs.stat(path.join(uploadDir, attachment.body.filename))).rejects.toThrow();
  });

  it("löscht exklusive Parent-Anhänge beim Löschen jedes unterstützten Parent-Typs", async () => {
    const project = await createProject(app, { name: "Projekt mit Anhang" });
    const milestoneProject = await createProject(app, { name: "Meilenstein-Projekt" });
    const milestone = await createMilestone(app, milestoneProject.id);
    const taskProject = await createProject(app, { name: "Aufgaben-Projekt" });
    const task = await createTask(app, taskProject.id);
    const feature = await createFeature(app);
    const wikiPage = await createWikiPage(app);
    const ticket = await createTicket(app, null);
    const targets: OwnerTarget[] = [
      { type: "project", id: project.id, path: `projects/${project.id}` },
      { type: "milestone", id: milestone.id, path: `milestones/${milestone.id}` },
      { type: "task", id: task.id, path: `tasks/${task.id}` },
      { type: "feature", id: feature.id, path: `features/${feature.id}` },
      { type: "wikiPage", id: wikiPage.id, path: `wiki/${wikiPage.id}` },
      { type: "ticket", id: ticket.id, path: `tickets/${ticket.id}` }
    ];
    const uploaded: Array<{ id: number; filename: string }> = [];
    for (const target of targets) {
      const response = await supertest(app.server)
        .post(`/api/${target.path}/attachments`)
        .attach("file", Buffer.from(`Delete ${target.type}`), { filename: `delete-${target.type}.txt`, contentType: "text/plain" })
        .expect(201);
      uploaded.push({ id: response.body.id, filename: response.body.filename });
      await expect(fs.stat(path.join(uploadDir, response.body.filename))).resolves.toBeDefined();
    }

    await supertest(app.server).delete(`/api/projects/${project.id}`).expect(204);
    await supertest(app.server).delete(`/api/milestones/${milestone.id}`).expect(204);
    await supertest(app.server).delete(`/api/projects/${taskProject.id}/tasks/${task.id}`).expect(204);
    await supertest(app.server).delete(`/api/tasks/${task.id}`).expect(204);
    await supertest(app.server).delete(`/api/features/${feature.id}`).expect(204);
    await supertest(app.server).delete(`/api/wiki/${wikiPage.id}`).expect(204);
    await supertest(app.server).delete(`/api/tickets/${ticket.id}`).expect(204);

    for (const attachment of uploaded) {
      await supertest(app.server).get(`/api/attachments/${attachment.id}/content`).expect(404);
      await expect(fs.stat(path.join(uploadDir, attachment.filename))).rejects.toThrow();
    }
  });
});
