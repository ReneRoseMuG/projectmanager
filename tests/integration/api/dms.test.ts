/**
 * Test Scope:
 * Document Management System (MS-75) - API, Berechtigungen und geaendertes Orphan-Verhalten.
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitaetsgrad:
 * - Echte Fastify-App (buildTestApp), echte MySQL-Test-DB, echte Auth-Plugins, echte
 *   Sessions und Rollen (admin/reader), echte Multipart-Uploads ins Temp-Upload-Verzeichnis.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Einziger technischer Eingriff ohne Fachlogik-Einfluss: das Schutz-Flag
 *   tags.is_system wird direkt per SQL gesetzt (im Produktivbetrieb per Seed), da es
 *   keinen API-Weg dafuer gibt - der gepruefte Schutz in setDocumentTags bleibt real.
 *
 * Isolation:
 * - Temp-DB pro Lauf (createTestDb), truncateAll in beforeEach, Temp-UPLOAD_DIR unter os.tmpdir().
 *
 * Abgedeckte Regeln:
 * - Alle DMS-Routen laufen unter der Ressource attachments (401 ohne Session, 403 ohne Recht).
 * - Kategorie-CRUD mit Namens-Eindeutigkeit (409) und Versionskonflikt (409).
 * - Sammlung-CRUD mit Zyklusschutz (400) und Loeschschutz bei Unter-Sammlungen (409 -> recursive).
 * - Dokument in Sammlung einsortieren/entfernen + gefilterte Bibliotheks-Abfrage (mit Gegenbeispiel).
 * - Owner-loser Direktupload landet unter Nicht einsortiert.
 * - Importvertrag akzeptiert ohne Sammlung oder genau eine Sammlung plus DMS-Tags und lehnt
 *   unbekannte Ziele, Mehrfachsammlungen sowie Kategorieparameter vor der Dateianlage ab.
 * - Fachobjekt-gebundenes, aber sammlungsloses Dokument erscheint ebenfalls unter Nicht einsortiert (nur die Sammlung entscheidet).
 * - Geschuetzte System-Labels sind ueber setDocumentTags nicht setzbar (400).
 * - Manueller SHA-256-Duplikat-Check mit sichtbarem Scope, Dateifehlern, stabilen Gruppen und Schreibrecht.
 * - Orphan-Verhalten: Anhaenge werden beim Loeschen des Fachobjekts NICHT geloescht, sondern Nicht einsortiert.
 * - Verwaister Owner-Link (Fachobjekt bereits geloescht) blockiert das Loeschen des Dokuments nicht (204 statt 404).
 *
 * Fehlerfaelle:
 * - 401 ohne Session, 403 Reader-Negativfall, 409 Dublette/Versionskonflikt/Loeschschutz, 400 Zyklus/System-Label.
 *
 * Ziel:
 * Die neue DMS-Oberflaeche und die geaenderte Aufraeum-Semantik gegen Regressionen absichern.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const uploadDir = path.join(os.tmpdir(), `taskmanager-api-dms-${process.pid}`);

describe("DMS API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = uploadDir;
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true, enableMultipart: true, fileOpener: async () => undefined });
  }, 300000); // langsame lokale MySQL: das Anlegen + Migrieren der Test-DB braucht deutlich mehr als der Default-Hook-Timeout

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
      .send({ firstName: "Read", lastName: "Only", email: "dms-reader@example.test", roleId: readerRole.id, password: "password123", isActive: true })
      .expect(201);
    const reader = supertest.agent(app.server);
    await reader.post("/api/auth/login").send({ email: "dms-reader@example.test", password: "password123" }).expect(200);
    return reader;
  }

  async function uploadDocument(
    admin: ReturnType<typeof supertest.agent>,
    name: string,
    folderId?: number,
    content: string | Buffer = `Inhalt ${name}`
  ) {
    const url = folderId !== undefined ? `/api/documents?folder=${folderId}` : "/api/documents";
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const res = await admin.post(url).attach("file", buffer, { filename: name, contentType: "text/plain" }).expect(201);
    return res.body as { id: number; filename: string; version: number };
  }

  async function setDocumentFolder(
    admin: ReturnType<typeof supertest.agent>,
    document: { id: number; version: number },
    folderId: number | null
  ) {
    const response = await admin
      .put(`/api/documents/${document.id}/folder`)
      .send({ folderId, expectedVersion: document.version })
      .expect(200);
    return response.body as { id: number; version: number; folder: { id: number } | null; folders: Array<{ id: number }> };
  }

  async function waitForDuplicateCheck(admin: ReturnType<typeof supertest.agent>) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const response = await admin.get("/api/documents/duplicate-check").expect(200);
      if (response.body.status !== "running") {
        return response.body as {
          status: string;
          total: number;
          processed: number;
          groups: Array<{ documents: Array<{ id: number; folder: { id: number } | null; owners: unknown[] }> }>;
          issues: Array<{ attachmentId: number; kind: string }>;
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error("Die Duplikatprüfung wurde nicht rechtzeitig abgeschlossen.");
  }

  // --- Berechtigungen ---

  it("lehnt Zugriff ohne Session ab (401)", async () => {
    await supertest(app.server).get("/api/documents").expect(401);
    await supertest(app.server).post("/api/attachment-folders").send({ name: "X" }).expect(401);
  });

  it("lehnt einen Leser beim Schreiben ab, erlaubt aber Lesen (403 / 200)", async () => {
    const reader = await loginReader();
    await reader.post("/api/attachment-folders").send({ name: "Verboten" }).expect(403);
    await reader.get("/api/documents").expect(200);
  });

  it("erzwingt read, write und delete für eine benutzerdefinierte Nur-Lesen-Rolle getrennt", async () => {
    const admin = await loginAdmin();
    const document = await uploadDocument(admin, "custom-role.txt");
    const folder = await admin.post("/api/attachment-folders").send({ name: "Custom Role" }).expect(201);
    const tag = await admin.post("/api/tags").send({ name: "Custom Role Tag", domain: "dms" }).expect(201);
    const role = await admin
      .post("/api/admin/roles")
      .send({ key: "dms_read_only", label: "DMS nur lesen", permissions: [{ resource: "attachments", action: "read" }] })
      .expect(201);
    await admin
      .post("/api/admin/users")
      .send({ firstName: "DMS", lastName: "Reader", email: "dms-custom-reader@example.test", roleId: role.body.id, password: "password123", isActive: true })
      .expect(201);
    const custom = supertest.agent(app.server);
    await custom.post("/api/auth/login").send({ email: "dms-custom-reader@example.test", password: "password123" }).expect(200);

    await custom.get("/api/documents").expect(200);
    await custom.get(`/api/documents/${document.id}`).expect(200);
    await custom.get(`/api/attachments/${document.id}/content`).expect(200);
    const scan = await custom.post("/api/documents/duplicate-check").expect(403);
    const move = await custom.put(`/api/documents/${document.id}/folder`).send({ folderId: folder.body.id, expectedVersion: document.version }).expect(403);
    const tags = await custom.put(`/api/documents/${document.id}/tags`).send({ tagIds: [tag.body.id], expectedVersion: document.version }).expect(403);
    const library = await custom.delete(`/api/documents/${document.id}/library?expectedVersion=${document.version}`).expect(403);
    const permanent = await custom.delete(`/api/attachments/${document.id}?expectedVersion=${document.version}`).expect(403);
    for (const response of [scan, move, tags, library, permanent]) {
      expect(response.body).toMatchObject({ error: "FORBIDDEN", statusCode: 403 });
    }
    expect((await admin.get(`/api/documents/${document.id}`).expect(200)).body).toMatchObject({ version: document.version, folders: [], tags: [] });
  });

  it("stellt keine Kategorie-API und keine Kategorie-Felder mehr bereit", async () => {
    const admin = await loginAdmin();
    const document = await uploadDocument(admin, "ohne-kategorien.txt");

    await admin.get("/api/attachment-categories").expect(404);
    await admin.post("/api/attachment-categories").send({ name: "Alt" }).expect(404);
    await admin.post(`/api/documents/${document.id}/categories/1`).expect(404);
    expect((await admin.get(`/api/documents/${document.id}`).expect(200)).body).not.toHaveProperty("categories");
  });

  // --- Sammlungen ---

  it("Sammlung: bildet drei Ebenen ab, verhindert ungültige Parents und schützt nicht leere Sammlungen", async () => {
    const admin = await loginAdmin();
    const reader = await loginReader();
    const parent = await admin.post("/api/attachment-folders").send({ name: "Sauna" }).expect(201);
    const child = await admin.post("/api/attachment-folders").send({ name: "Oval Sauna", parentId: parent.body.id }).expect(201);
    const grandchild = await admin.post("/api/attachment-folders").send({ name: "Details", parentId: child.body.id }).expect(201);
    expect(child.body.parentId).toBe(parent.body.id);

    await admin.post("/api/attachment-folders").send({ name: "Ungültig", parentId: 999999 }).expect(404);
    await admin
      .patch(`/api/attachment-folders/${parent.body.id}`)
      .send({ parentId: grandchild.body.id, expectedVersion: parent.body.version })
      .expect(400);

    const moved = await admin
      .patch(`/api/attachment-folders/${grandchild.body.id}`)
      .send({ parentId: parent.body.id, expectedVersion: grandchild.body.version })
      .expect(200);
    expect(moved.body).toMatchObject({ parentId: parent.body.id, version: grandchild.body.version + 1 });
    await admin
      .patch(`/api/attachment-folders/${grandchild.body.id}`)
      .send({ name: "Veraltet", expectedVersion: grandchild.body.version })
      .expect(409);

    const folders = await admin.get("/api/attachment-folders").expect(200);
    expect(folders.body.find((folder: { id: number }) => folder.id === parent.body.id)).toMatchObject({ childCount: 2 });
    await admin.delete(`/api/attachment-folders/${parent.body.id}?expectedVersion=${parent.body.version}`).expect(409);

    const empty = await admin.post("/api/attachment-folders").send({ name: "Leer" }).expect(201);
    await reader.delete(`/api/attachment-folders/${empty.body.id}?expectedVersion=${empty.body.version}`).expect(403);
    await admin.delete(`/api/attachment-folders/${empty.body.id}?expectedVersion=${empty.body.version}`).expect(204);
    const list = await admin.get("/api/attachment-folders").expect(200);
    expect(list.body.map((folder: { id: number }) => folder.id)).not.toContain(empty.body.id);
  });

  // --- Dokument-Organisation & Bibliotheks-Filter ---

  it("ordnet atomar genau eine direkte Sammlung zu und filtert rekursiv über beliebig tiefe Nachfahren", async () => {
    const admin = await loginAdmin();
    const sauna = await admin.post("/api/attachment-folders").send({ name: "Sauna" }).expect(201);
    const oval = await admin.post("/api/attachment-folders").send({ name: "Oval Sauna", parentId: sauna.body.id }).expect(201);
    const details = await admin.post("/api/attachment-folders").send({ name: "Details", parentId: oval.body.id }).expect(201);
    const other = await admin.post("/api/attachment-folders").send({ name: "Andere" }).expect(201);
    const inFolder = await uploadDocument(admin, "oval-sauna.txt");
    const outside = await uploadDocument(admin, "sonstiges.txt");

    const assigned = await setDocumentFolder(admin, inFolder, details.body.id);
    expect(assigned).toMatchObject({ version: inFolder.version + 1, folder: { id: details.body.id } });
    expect(assigned.folders).toHaveLength(1);

    for (const folderId of [details.body.id, oval.body.id, sauna.body.id]) {
      const filtered = await admin.get(`/api/documents?folder=${folderId}`).expect(200);
      const filteredIds = (filtered.body as Array<{ id: number }>).map((doc) => doc.id);
      expect(filteredIds).toEqual([inFolder.id]);
      expect(filteredIds).not.toContain(outside.id);
    }
    await admin.delete(`/api/attachment-folders/${details.body.id}?expectedVersion=${details.body.version}`).expect(409);

    const moved = await setDocumentFolder(admin, assigned, other.body.id);
    expect(moved).toMatchObject({ version: assigned.version + 1, folder: { id: other.body.id } });
    expect(moved.folders).toHaveLength(1);
    await admin.put(`/api/documents/${inFolder.id}/folder`).send({ folderId: null, expectedVersion: assigned.version }).expect(409);

    const unassigned = await setDocumentFolder(admin, moved, null);
    expect(unassigned).toMatchObject({ version: moved.version + 1, folder: null, folders: [] });
    const unsorted = await admin.get("/api/documents?folder=unsorted").expect(200);
    expect((unsorted.body as Array<{ id: number }>).map((doc) => doc.id)).toContain(inFolder.id);
  });

  it("schützt Sammlung und Tags gegen veraltete Versionen und journalisiert die DMS-Lebenszyklen unterscheidbar", async () => {
    const admin = await loginAdmin();
    const project = await admin.post("/api/projects").send({ name: "Journal Owner", status: "active", color: "#6366f1" }).expect(201);
    const folder = await admin.post("/api/attachment-folders").send({ name: "Journal Sammlung" }).expect(201);
    const otherFolder = await admin.post("/api/attachment-folders").send({ name: "Andere Sammlung" }).expect(201);
    const tag = await admin.post("/api/tags").send({ name: "Journal Tag", domain: "dms" }).expect(201);
    const otherTag = await admin.post("/api/tags").send({ name: "Anderer Tag", domain: "dms" }).expect(201);
    const upload = await admin
      .post(`/api/projects/${project.body.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("Journal"), { filename: "journal.txt", contentType: "text/plain" })
      .expect(201);

    const moved = await admin
      .put(`/api/documents/${upload.body.id}/folder`)
      .send({ folderId: folder.body.id, expectedVersion: upload.body.version })
      .expect(200);
    const staleMove = await admin
      .put(`/api/documents/${upload.body.id}/folder`)
      .send({ folderId: otherFolder.body.id, expectedVersion: upload.body.version })
      .expect(409);
    expect(staleMove.body).toMatchObject({ error: "CONFLICT", statusCode: 409 });

    const tagged = await admin
      .put(`/api/documents/${upload.body.id}/tags`)
      .send({ tagIds: [tag.body.id], expectedVersion: moved.body.version })
      .expect(200);
    const staleTags = await admin
      .put(`/api/documents/${upload.body.id}/tags`)
      .send({ tagIds: [otherTag.body.id], expectedVersion: moved.body.version })
      .expect(409);
    expect(staleTags.body).toMatchObject({ error: "CONFLICT", statusCode: 409 });
    expect((await admin.get(`/api/documents/${upload.body.id}`).expect(200)).body).toMatchObject({
      folder: expect.objectContaining({ id: folder.body.id }),
      tags: [expect.objectContaining({ id: tag.body.id })],
      version: tagged.body.version
    });

    await admin
      .delete(`/api/projects/${project.body.id}/attachments/${upload.body.id}?expectedVersion=${tagged.body.version}`)
      .expect(204);
    const unlinked = await admin.get(`/api/documents/${upload.body.id}`).expect(200);
    await admin.delete(`/api/attachments/${upload.body.id}?expectedVersion=${unlinked.body.version}`).expect(204);

    const firstJournal = await admin.get(`/api/journal/objects/attachment/${upload.body.id}`).expect(200);
    const summaries = firstJournal.body.entries.map((entry: { summary: string }) => entry.summary);
    expect(summaries).toEqual(expect.arrayContaining([
      expect.stringContaining("wurde von Nicht einsortiert nach Journal Sammlung verschoben"),
      expect.stringContaining("erhielt eine neue Tag-Zuordnung"),
      expect.stringContaining("wurde von Projekt"),
      expect.stringContaining("wurde gelöscht")
    ]));
    expect(firstJournal.body.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: "update", changes: [expect.objectContaining({ fieldKey: "folderId" })] }),
      expect.objectContaining({ operation: "update", changes: [expect.objectContaining({ fieldKey: "tags" })] }),
      expect.objectContaining({ operation: "unlink" }),
      expect.objectContaining({ operation: "delete" })
    ]));

    const removable = await admin
      .post(`/api/projects/${project.body.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("Bibliothek"), { filename: "bibliothek-entfernen.txt", contentType: "text/plain" })
      .expect(201);
    await admin.delete(`/api/documents/${removable.body.id}/library?expectedVersion=${removable.body.version}`).expect(204);
    const secondJournal = await admin.get(`/api/journal/objects/attachment/${removable.body.id}`).expect(200);
    expect(secondJournal.body.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: "update", summary: expect.stringContaining("aus der Dokumentenbibliothek entfernt") })
    ]));
  });

  it("filtert und paginiert vollständig in SQL mit UND-Semantik für mehrere Tags", async () => {
    const admin = await loginAdmin();
    const sauna = await admin.post("/api/attachment-folders").send({ name: "Filter Sauna" }).expect(201);
    const oval = await admin.post("/api/attachment-folders").send({ name: "Filter Oval", parentId: sauna.body.id }).expect(201);
    const other = await admin.post("/api/attachment-folders").send({ name: "Filter Andere" }).expect(201);
    const tagA = await admin.post("/api/tags").send({ name: "Filter A", domain: "dms" }).expect(201);
    const tagB = await admin.post("/api/tags").send({ name: "Filter B", domain: "dms" }).expect(201);
    const first = await uploadDocument(admin, "filter-sauna.txt");
    const second = await uploadDocument(admin, "filter-frei.txt");
    const third = await uploadDocument(admin, "filter-andere.txt");

    const firstInFolder = await setDocumentFolder(admin, first, oval.body.id);
    const thirdInFolder = await setDocumentFolder(admin, third, other.body.id);
    await admin.put(`/api/documents/${first.id}/tags`).send({ tagIds: [tagA.body.id, tagB.body.id], expectedVersion: firstInFolder.version }).expect(200);
    await admin.put(`/api/documents/${second.id}/tags`).send({ tagIds: [tagA.body.id], expectedVersion: second.version }).expect(200);
    await admin.put(`/api/documents/${third.id}/tags`).send({ tagIds: [tagB.body.id], expectedVersion: thirdInFolder.version }).expect(200);

    const firstTagPage = await admin
      .get(`/api/documents?page=1&pageSize=1&tags=${tagA.body.id}`)
      .expect(200);
    expect(firstTagPage.body).toMatchObject({ total: 2, page: 1, pageSize: 1 });
    expect(firstTagPage.body.data).toHaveLength(1);
    const secondTagPage = await admin
      .get(`/api/documents?page=2&pageSize=1&tags=${tagA.body.id}`)
      .expect(200);
    expect(secondTagPage.body).toMatchObject({ total: 2, page: 2, pageSize: 1 });
    expect(secondTagPage.body.data).toHaveLength(1);
    expect([firstTagPage.body.data[0].id, secondTagPage.body.data[0].id].sort()).toEqual([first.id, second.id].sort());

    const andResult = await admin
      .get(`/api/documents?page=1&pageSize=25&tags=${tagA.body.id},${tagB.body.id}`)
      .expect(200);
    expect(andResult.body.total).toBe(1);
    expect(andResult.body.data.map((document: { id: number }) => document.id)).toEqual([first.id]);

    const parentFolder = await admin.get(`/api/documents?page=1&pageSize=25&folder=${sauna.body.id}`).expect(200);
    expect(parentFolder.body).toMatchObject({ total: 1 });
    expect(parentFolder.body.data[0].id).toBe(first.id);
    const unsorted = await admin.get("/api/documents?page=1&pageSize=25&folder=unsorted").expect(200);
    expect(unsorted.body).toMatchObject({ total: 1 });
    expect(unsorted.body.data[0].id).toBe(second.id);
    const typeResult = await admin.get("/api/documents?page=1&pageSize=25&type=text%2F").expect(200);
    expect(typeResult.body).toMatchObject({ total: 3 });
    const searchResult = await admin.get("/api/documents?page=1&pageSize=25&q=sauna").expect(200);
    expect(searchResult.body).toMatchObject({ total: 1 });

    const emptyCombination = await admin
      .get(`/api/documents?page=1&pageSize=25&folder=${other.body.id}&tags=${tagA.body.id}`)
      .expect(200);
    expect(emptyCombination.body).toMatchObject({ total: 0, data: [] });

    await admin.get("/api/documents?page=1&tags=1,abc").expect(400);
    await admin.get("/api/documents?page=1&tags=999999").expect(400);
    await admin.get("/api/documents?page=1&type=invalid").expect(400);
  });

  it("liefert bei 100, 1.000 und 3.000 Dokumenten nur die angeforderte Seite bei korrektem total", async () => {
    const admin = await loginAdmin();
    let inserted = 0;
    for (const target of [100, 1_000, 3_000]) {
      while (inserted < target) {
        const batchSize = Math.min(500, target - inserted);
        const now = new Date().toISOString();
        const placeholders = Array.from({ length: batchSize }, () => "(?, ?, 'text/plain', 1, true, ?, ?)").join(", ");
        const values: Array<string | number | boolean> = [];
        for (let offset = 0; offset < batchSize; offset += 1) {
          const index = inserted + offset;
          values.push(`last-${index}.txt`, `last-${index}.txt`, now, now);
        }
        await testDb.pool.query(
          `INSERT INTO attachments (original_name, filename, mimetype, size, is_in_document_library, created_at, updated_at) VALUES ${placeholders}`,
          values
        );
        inserted += batchSize;
      }

      const response = await admin.get("/api/documents?page=1&pageSize=25&type=text%2F").expect(200);
      expect(response.body).toMatchObject({ total: target, page: 1, pageSize: 25 });
      expect(response.body.data).toHaveLength(25);
    }
  }, 120_000);

  it("Direktupload ohne Fachobjekt landet unter Nicht einsortiert", async () => {
    const admin = await loginAdmin();
    const doc = await uploadDocument(admin, "frei.txt");
    const unsorted = await admin.get("/api/documents?folder=unsorted").expect(200);
    expect((unsorted.body as Array<{ id: number }>).map((item) => item.id)).toContain(doc.id);
  });

  it("prüft sichtbare Dokumente manuell nach Inhalt und weist Dateifehler getrennt aus", async () => {
    const admin = await loginAdmin();
    const reader = await loginReader();
    await reader.post("/api/documents/duplicate-check").expect(403);
    await reader.get("/api/documents/duplicate-check").expect(200);

    const folder = await admin.post("/api/attachment-folders").send({ name: "Duplikate" }).expect(201);
    const first = await uploadDocument(admin, "inhalt-a.txt", undefined, "identischer Inhalt");
    const second = await uploadDocument(admin, "anderer-name.txt", undefined, "identischer Inhalt");
    const sameNameDifferentContent = await uploadDocument(admin, "inhalt-a.txt", undefined, "abweichender Inhalt");
    const hiddenProject = await admin.post("/api/projects").send({ name: "Verstecktes Duplikat", status: "active", color: "#6366f1" }).expect(201);
    const hiddenUpload = await admin
      .post(`/api/projects/${hiddenProject.body.id}/attachments?libraryVisibility=attachment-only`)
      .attach("file", Buffer.from("identischer Inhalt"), { filename: "versteckt.txt", contentType: "text/plain" })
      .expect(201);
    const hidden = hiddenUpload.body as { id: number };
    const missing = await uploadDocument(admin, "fehlt.txt", undefined, "nicht mehr vorhanden");
    await setDocumentFolder(admin, first, folder.body.id);
    await fs.rm(path.join(uploadDir, missing.filename));

    const started = await admin.post("/api/documents/duplicate-check").expect(202);
    if (started.body.status === "running") {
      await admin.post("/api/documents/duplicate-check").expect(409);
    }
    const result = await waitForDuplicateCheck(admin);

    expect(result.status).toBe("completed");
    expect(result.processed).toBe(result.total);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.documents.map((document) => document.id)).toEqual([first.id, second.id]);
    expect(result.groups[0]?.documents[0]?.folder?.id).toBe(folder.body.id);
    expect(result.groups[0]?.documents[0]?.owners).toEqual([]);
    expect(result.groups[0]?.documents.map((document) => document.id)).not.toContain(hidden.id);
    expect(result.groups[0]?.documents.map((document) => document.id)).not.toContain(sameNameDifferentContent.id);
    expect(result.issues).toContainEqual(expect.objectContaining({ attachmentId: missing.id, kind: "missing" }));

    await admin.post("/api/documents/duplicate-check").expect(202);
    const repeated = await waitForDuplicateCheck(admin);
    expect(repeated.groups[0]?.documents.map((document) => document.id)).toEqual([first.id, second.id]);
    await admin.get(`/api/documents/${hidden.id}`).expect(404);
    const hiddenOwnerAttachments = await admin.get(`/api/projects/${hiddenProject.body.id}/attachments`).expect(200);
    expect(hiddenOwnerAttachments.body).toContainEqual(expect.objectContaining({ id: hidden.id, isInDocumentLibrary: false }));
  });

  it("fuehrt ein an ein Fachobjekt gebundenes, sammlungsloses Dokument als Nicht einsortiert", async () => {
    const admin = await loginAdmin();
    const project = await admin.post("/api/projects").send({ name: "DMS-Projekt", status: "active", color: "#6366f1" }).expect(201);
    const upload = await admin
      .post(`/api/projects/${project.body.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("gebunden, aber ohne Sammlung"), { filename: "gebunden.txt", contentType: "text/plain" })
      .expect(201);

    // Owner-gebunden, aber in keiner Sammlung -> erscheint unter Nicht einsortiert.
    const unsorted = await admin.get("/api/documents?folder=unsorted").expect(200);
    expect((unsorted.body as Array<{ id: number }>).map((item) => item.id)).toContain(upload.body.id);

    // Sobald es in eine Sammlung einsortiert wird, verschwindet es dort -> die Sammlung entscheidet, nicht der Owner.
    const folder = await admin.post("/api/attachment-folders").send({ name: "Vertraege" }).expect(201);
    await setDocumentFolder(admin, upload.body, folder.body.id);
    const afterSort = await admin.get("/api/documents?folder=unsorted").expect(200);
    expect((afterSort.body as Array<{ id: number }>).map((item) => item.id)).not.toContain(upload.body.id);
  });

  it("wendet für Web, Windows-Importer und MCP denselben singulären DMS-Importvertrag an", async () => {
    const admin = await loginAdmin();
    const folder = await admin.post("/api/attachment-folders").send({ name: "Import Sauna" }).expect(201);
    const dmsTag = await admin.post("/api/tags").send({ name: "Import Oval", domain: "dms" }).expect(201);
    const pmTag = await admin.post("/api/tags").send({ name: "Import Projekt", domain: "pm" }).expect(201);

    const imported = await admin
      .post(`/api/documents?folder=${folder.body.id}&tags=${dmsTag.body.id}`)
      .attach("file", Buffer.from("gemeinsamer Importvertrag"), { filename: "importiert.txt", contentType: "text/plain" })
      .expect(201);
    expect(imported.body).toMatchObject({
      isInDocumentLibrary: true,
      folders: [expect.objectContaining({ id: folder.body.id })],
      tags: [expect.objectContaining({ id: dmsTag.body.id, domain: "dms" })],
      version: expect.any(Number)
    });

    const withoutFolder = await admin
      .post("/api/documents")
      .attach("file", Buffer.from("ohne Sammlung"), { filename: "ohne-sammlung.txt", contentType: "text/plain" })
      .expect(201);
    expect(withoutFolder.body).toMatchObject({ isInDocumentLibrary: true, folders: [], tags: [], version: expect.any(Number) });

    const storedFileCount = (await fs.readdir(uploadDir)).length;
    const storedDocumentCount = ((await admin.get("/api/documents").expect(200)).body as Array<unknown>).length;
    await admin
      .post("/api/documents?folder=999999")
      .attach("file", Buffer.from("unbekannte Sammlung"), { filename: "unbekannt.txt", contentType: "text/plain" })
      .expect(404);
    await admin
      .post("/api/documents?tags=999999")
      .attach("file", Buffer.from("unbekannter Tag"), { filename: "unbekannter-tag.txt", contentType: "text/plain" })
      .expect(400);
    await admin
      .post(`/api/documents?tags=${pmTag.body.id}`)
      .attach("file", Buffer.from("falsche Domäne"), { filename: "pm-tag.txt", contentType: "text/plain" })
      .expect(400);
    const legacyListResponse = await admin.get("/api/documents?category=1").expect(400);
    expect(legacyListResponse.body).toMatchObject({ error: "BAD_REQUEST", statusCode: 400 });
    expect(legacyListResponse.body.message).toContain("Kategorien werden seit MS-80 nicht mehr unterstützt");
    const legacyUploadResponse = await admin
      .post("/api/documents?category=1")
      .attach("file", Buffer.from("alte Kategorie"), { filename: "kategorie.txt", contentType: "text/plain" })
      .expect(400);
    expect(legacyUploadResponse.body).toMatchObject({ error: "BAD_REQUEST", statusCode: 400 });
    expect(legacyUploadResponse.body.message).toContain("Kategorien werden seit MS-80 nicht mehr unterstützt");
    const multiFolderResponse = await admin
      .post(`/api/documents?folders=${folder.body.id},999999`)
      .attach("file", Buffer.from("mehrere Sammlungen"), { filename: "mehrfach.txt", contentType: "text/plain" })
      .expect(400);
    expect(multiFolderResponse.body.message).toContain("Mehrfachsammlungen werden seit MS-80 nicht mehr unterstützt");
    expect((await fs.readdir(uploadDir)).length).toBe(storedFileCount);
    expect((await admin.get("/api/documents").expect(200)).body as Array<unknown>).toHaveLength(storedDocumentCount);
  });

  it("erzwingt beim Owner-Upload die explizite Bibliotheksentscheidung", async () => {
    const admin = await loginAdmin();
    const project = await admin.post("/api/projects").send({ name: "Upload-Sichtbarkeit", status: "active", color: "#6366f1" }).expect(201);

    await admin
      .post(`/api/projects/${project.body.id}/attachments`)
      .attach("file", Buffer.from("ohne Auswahl"), { filename: "ohne-auswahl.txt", contentType: "text/plain" })
      .expect(400);

    const attachmentOnly = await admin
      .post(`/api/projects/${project.body.id}/attachments?libraryVisibility=attachment-only`)
      .attach("file", Buffer.from("nur Anhang"), { filename: "nur-anhang.txt", contentType: "text/plain" })
      .expect(201);
    expect(attachmentOnly.body).toMatchObject({ isInDocumentLibrary: false });
    expect(attachmentOnly.body.contentHash).toMatch(/^[a-f0-9]{64}$/);

    const ownerAttachments = await admin.get(`/api/projects/${project.body.id}/attachments`).expect(200);
    expect((ownerAttachments.body as Array<{ id: number }>).map((item) => item.id)).toContain(attachmentOnly.body.id);
    const libraryAfterAttachmentOnly = await admin.get("/api/documents").expect(200);
    expect((libraryAfterAttachmentOnly.body as Array<{ id: number }>).map((item) => item.id)).not.toContain(attachmentOnly.body.id);
    await admin.get(`/api/documents/${attachmentOnly.body.id}`).expect(404);

    const libraryAttachment = await admin
      .post(`/api/projects/${project.body.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("auch Bibliothek"), { filename: "bibliothek.txt", contentType: "text/plain" })
      .expect(201);
    expect(libraryAttachment.body).toMatchObject({ isInDocumentLibrary: true });
    expect(libraryAttachment.body.url).toBe(`/api/attachments/${libraryAttachment.body.id}/content`);

    const library = await admin.get("/api/documents").expect(200);
    expect((library.body as Array<{ id: number }>).map((item) => item.id)).toContain(libraryAttachment.body.id);

    const direct = await uploadDocument(admin, "direkt.txt");
    const directDetail = await admin.get(`/api/documents/${direct.id}`).expect(200);
    expect(directDetail.body).toMatchObject({ isInDocumentLibrary: true });
    await admin.delete(`/api/documents/${direct.id}/library?expectedVersion=${directDetail.body.version}`).expect(409);
    await admin.get(`/api/documents/${direct.id}`).expect(200);
  });

  it("trennt Owner-Unlink, Bibliotheksentfernung und endgültiges Löschen versionsgesichert", async () => {
    const admin = await loginAdmin();
    const reader = await loginReader();
    const firstProject = await admin.post("/api/projects").send({ name: "Owner A", status: "active", color: "#6366f1" }).expect(201);
    const secondProject = await admin.post("/api/projects").send({ name: "Owner B", status: "active", color: "#6366f1" }).expect(201);
    const hidden = await admin
      .post(`/api/projects/${firstProject.body.id}/attachments?libraryVisibility=attachment-only`)
      .attach("file", Buffer.from("mehrere Owner"), { filename: "mehrere-owner.txt", contentType: "text/plain" })
      .expect(201);
    await testDb.pool.execute("INSERT INTO project_attachments (project_id, attachment_id) VALUES (?, ?)", [
      secondProject.body.id,
      hidden.body.id
    ]);

    await reader
      .delete(`/api/projects/${firstProject.body.id}/attachments/${hidden.body.id}?expectedVersion=${hidden.body.version}`)
      .expect(403);
    await admin
      .delete(`/api/projects/${firstProject.body.id}/attachments/${hidden.body.id}?expectedVersion=${hidden.body.version}`)
      .expect(204);

    const firstOwnerList = await admin.get(`/api/projects/${firstProject.body.id}/attachments`).expect(200);
    const secondOwnerList = await admin.get(`/api/projects/${secondProject.body.id}/attachments`).expect(200);
    expect((firstOwnerList.body as Array<{ id: number }>).map((item) => item.id)).not.toContain(hidden.body.id);
    const afterFirstUnlink = (secondOwnerList.body as Array<{ id: number; version: number; isInDocumentLibrary: boolean }>).find(
      (item) => item.id === hidden.body.id
    );
    expect(afterFirstUnlink).toMatchObject({ version: hidden.body.version + 1, isInDocumentLibrary: false });

    await admin
      .delete(`/api/projects/${secondProject.body.id}/attachments/${hidden.body.id}?expectedVersion=${afterFirstUnlink?.version}`)
      .expect(409);
    await admin
      .delete(`/api/projects/${secondProject.body.id}/attachments/${hidden.body.id}?expectedVersion=${afterFirstUnlink?.version}&orphanAction=add-to-library`)
      .expect(204);
    const promoted = await admin.get(`/api/documents/${hidden.body.id}`).expect(200);
    expect(promoted.body).toMatchObject({ owners: [], isInDocumentLibrary: true, version: hidden.body.version + 2 });

    await reader
      .delete(`/api/attachments/${hidden.body.id}?expectedVersion=${promoted.body.version}`)
      .expect(403);
    await admin
      .delete(`/api/attachments/${hidden.body.id}?expectedVersion=${promoted.body.version - 1}`)
      .expect(409);
    await fs.access(path.join(uploadDir, hidden.body.filename));
    await admin
      .delete(`/api/attachments/${hidden.body.id}?expectedVersion=${promoted.body.version}`)
      .expect(204);
    await expect(fs.access(path.join(uploadDir, hidden.body.filename))).rejects.toThrow();

    const visible = await admin
      .post(`/api/projects/${firstProject.body.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("nur Sichtbarkeit ändern"), { filename: "sichtbar.txt", contentType: "text/plain" })
      .expect(201);
    await reader
      .delete(`/api/documents/${visible.body.id}/library?expectedVersion=${visible.body.version}`)
      .expect(403);
    await admin
      .delete(`/api/documents/${visible.body.id}/library?expectedVersion=${visible.body.version}`)
      .expect(204);
    await admin.get(`/api/documents/${visible.body.id}`).expect(404);
    const stillOwned = await admin.get(`/api/projects/${firstProject.body.id}/attachments`).expect(200);
    expect(stillOwned.body).toContainEqual(expect.objectContaining({ id: visible.body.id, isInDocumentLibrary: false }));
    await fs.access(path.join(uploadDir, visible.body.filename));
  });

  // --- System-Label-Schutz ---

  it("verhindert das Setzen eines geschuetzten System-Labels (400)", async () => {
    const admin = await loginAdmin();
    const tag = await admin.post("/api/tags").send({ name: "Storniert", color: "#ff0000" }).expect(201);
    await testDb.pool.execute("UPDATE tags SET is_system = 1 WHERE id = ?", [tag.body.id]);
    const doc = await uploadDocument(admin, "label.txt");

    await admin.put(`/api/documents/${doc.id}/tags`).send({ tagIds: [tag.body.id], expectedVersion: doc.version }).expect(400);
  });

  // --- Orphan-Verhalten (Kernnachweis der Verhaltensaenderung) ---

  it("behaelt Anhaenge beim Loeschen des Fachobjekts und fuehrt sie als Nicht einsortiert", async () => {
    const admin = await loginAdmin();
    const project = await admin.post("/api/projects").send({ name: "DMS-Projekt", status: "active", color: "#6366f1" }).expect(201);
    const upload = await admin
      .post(`/api/projects/${project.body.id}/attachments?libraryVisibility=document-library`)
      .attach("file", Buffer.from("bleibt erhalten"), { filename: "anhang.txt", contentType: "text/plain" })
      .expect(201);

    // Projekt loeschen
    await admin.delete(`/api/projects/${project.body.id}`).expect(204);

    // Anhang existiert weiterhin (frueher waere er hier geloescht worden)
    const stillThere = await admin.get(`/api/documents/${upload.body.id}`).expect(200);
    expect(stillThere.body.id).toBe(upload.body.id);
    expect(stillThere.body.owners).toEqual([]);

    // und er erscheint als Nicht einsortiert
    const unsorted = await admin.get("/api/documents?folder=unsorted").expect(200);
    expect((unsorted.body as Array<{ id: number }>).map((item) => item.id)).toContain(upload.body.id);
  });

  it("loescht ein Dokument trotz verwaistem Owner-Link (kein 404)", async () => {
    // Reproduziert den Produktionsfehler: Wird das Fachobjekt eines Owner-Links geloescht, ohne
    // dass die Junction-Zeile mitentfernt wird (in der Prod-DB mangels FK-Cascade beobachtet),
    // darf das Loeschen des Dokuments NICHT mit 404 abbrechen. Der verwaiste Link wird technisch
    // injiziert (FK-Checks kurz aus), da die Test-DB die Cascade korrekt anwendet.
    const admin = await loginAdmin();
    const doc = await uploadDocument(admin, "verwaist.txt");

    const conn = await testDb.pool.getConnection();
    try {
      await conn.query("SET FOREIGN_KEY_CHECKS=0");
      await conn.execute("INSERT INTO wiki_page_attachments (wiki_page_id, attachment_id) VALUES (?, ?)", [999999, doc.id]);
      await conn.query("SET FOREIGN_KEY_CHECKS=1");
    } finally {
      conn.release();
    }

    await admin.delete(`/api/attachments/${doc.id}?expectedVersion=${doc.version}`).expect(204);
    await admin.get(`/api/documents/${doc.id}`).expect(404);
  });
});
