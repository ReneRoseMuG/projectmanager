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
 * - Fachobjekt-gebundenes, aber sammlungsloses Dokument erscheint ebenfalls unter Nicht einsortiert (nur die Sammlung entscheidet).
 * - Geschuetzte System-Labels sind ueber setDocumentTags nicht setzbar (400).
 * - Orphan-Verhalten: Anhaenge werden beim Loeschen des Fachobjekts NICHT geloescht, sondern Nicht einsortiert.
 * - Verwaister Owner-Link (Fachobjekt bereits geloescht) blockiert das Loeschen des Dokuments nicht (204 statt 404).
 * - Upload-Kontext: `?folder=` und `?category=` ordnen die hochgeladene Datei symmetrisch zu (mit Gegenbeispiel
 *   ohne Query); der Upload bleibt schreibgeschuetzt (403 fuer Leser).
 *
 * Fehlerfaelle:
 * - 401 ohne Session, 403 Reader-Negativfall, 409 Dublette/Versionskonflikt/Loeschschutz, 400 Zyklus/System-Label.
 * - Upload mit unbekannter Kategorie: 404. Bekannte Grenze, die der Test festhaelt: Upload und Zuordnung liegen
 *   nicht in einer Transaktion, das Attachment bleibt angelegt (gilt seit jeher ebenso fuer `folder`).
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

  async function uploadDocument(admin: ReturnType<typeof supertest.agent>, name: string, folderId?: number) {
    const url = folderId !== undefined ? `/api/documents?folder=${folderId}` : "/api/documents";
    const res = await admin.post(url).attach("file", Buffer.from(`Inhalt ${name}`), { filename: name, contentType: "text/plain" }).expect(201);
    return res.body as { id: number };
  }

  // --- Berechtigungen ---

  it("lehnt Zugriff ohne Session ab (401)", async () => {
    await supertest(app.server).get("/api/documents").expect(401);
    await supertest(app.server).post("/api/attachment-categories").send({ name: "X" }).expect(401);
  });

  it("lehnt einen Leser beim Schreiben ab, erlaubt aber Lesen (403 / 200)", async () => {
    const reader = await loginReader();
    await reader.post("/api/attachment-categories").send({ name: "Verboten" }).expect(403);
    await reader.post("/api/attachment-folders").send({ name: "Verboten" }).expect(403);
    await reader.get("/api/documents").expect(200);
    await reader.get("/api/attachment-categories").expect(200);
  });

  // --- Kategorien ---

  it("Kategorie: anlegen, Dublette 409, umbenennen, Versionskonflikt 409, loeschen", async () => {
    const admin = await loginAdmin();
    const created = await admin.post("/api/attachment-categories").send({ name: "Rechnung", color: "#ff0000" }).expect(201);
    expect(created.body).toMatchObject({ name: "Rechnung", color: "#ff0000", version: 1 });

    await admin.post("/api/attachment-categories").send({ name: "Rechnung" }).expect(409);

    const renamed = await admin
      .patch(`/api/attachment-categories/${created.body.id}`)
      .send({ name: "Eingangsrechnung", expectedVersion: 1 })
      .expect(200);
    expect(renamed.body).toMatchObject({ name: "Eingangsrechnung", version: 2 });

    const conflict = await admin
      .patch(`/api/attachment-categories/${created.body.id}`)
      .send({ name: "Nochmal", expectedVersion: 1 })
      .expect(409);
    expect(conflict.body).toMatchObject({ error: "CONFLICT", statusCode: 409 });

    await admin.delete(`/api/attachment-categories/${created.body.id}`).expect(204);
    const list = await admin.get("/api/attachment-categories").expect(200);
    expect(list.body).toEqual([]);
  });

  // --- Sammlungen ---

  it("Sammlung: verschachteln, Zyklus verhindern 400, Loeschschutz bei Kindern 409 und rekursiv loeschen", async () => {
    const admin = await loginAdmin();
    const parent = await admin.post("/api/attachment-folders").send({ name: "Projekte" }).expect(201);
    const child = await admin.post("/api/attachment-folders").send({ name: "2026", parentId: parent.body.id }).expect(201);
    expect(child.body.parentId).toBe(parent.body.id);

    // Zyklus: Elternteil unter sein eigenes Kind haengen -> 400
    await admin
      .patch(`/api/attachment-folders/${parent.body.id}`)
      .send({ parentId: child.body.id, expectedVersion: parent.body.version })
      .expect(400);

    // Loeschen mit Kindern ohne recursive -> 409
    await admin.delete(`/api/attachment-folders/${parent.body.id}`).expect(409);

    // recursive loescht Eltern + Kind
    await admin.delete(`/api/attachment-folders/${parent.body.id}?recursive=true`).expect(204);
    const list = await admin.get("/api/attachment-folders").expect(200);
    expect(list.body).toEqual([]);
  });

  // --- Dokument-Organisation & Bibliotheks-Filter ---

  it("Dokument einsortieren und Bibliotheks-Filter grenzt korrekt ein (mit Gegenbeispiel)", async () => {
    const admin = await loginAdmin();
    const folder = await admin.post("/api/attachment-folders").send({ name: "Vertraege" }).expect(201);
    const inFolder = await uploadDocument(admin, "vertrag.txt");
    const outside = await uploadDocument(admin, "sonstiges.txt");

    await admin.post(`/api/attachment-folders/${folder.body.id}/documents/${inFolder.id}`).expect(204);

    const filtered = await admin.get(`/api/documents?folder=${folder.body.id}`).expect(200);
    const filteredIds = (filtered.body as Array<{ id: number }>).map((doc) => doc.id);
    expect(filteredIds).toContain(inFolder.id);
    expect(filteredIds).not.toContain(outside.id); // Gegenbeispiel: nicht einsortiertes Dokument ausgeschlossen

    // wieder herausnehmen -> verschwindet aus der Sammlung
    await admin.delete(`/api/attachment-folders/${folder.body.id}/documents/${inFolder.id}`).expect(204);
    const afterRemoval = await admin.get(`/api/documents?folder=${folder.body.id}`).expect(200);
    expect((afterRemoval.body as Array<{ id: number }>).map((doc) => doc.id)).not.toContain(inFolder.id);
  });

  it("Direktupload ohne Fachobjekt landet unter Nicht einsortiert", async () => {
    const admin = await loginAdmin();
    const doc = await uploadDocument(admin, "frei.txt");
    const unsorted = await admin.get("/api/documents?folder=unsorted").expect(200);
    expect((unsorted.body as Array<{ id: number }>).map((item) => item.id)).toContain(doc.id);
  });

  it("fuehrt ein an ein Fachobjekt gebundenes, sammlungsloses Dokument als Nicht einsortiert", async () => {
    const admin = await loginAdmin();
    const project = await admin.post("/api/projects").send({ name: "DMS-Projekt", status: "active", color: "#6366f1" }).expect(201);
    const upload = await admin
      .post(`/api/projects/${project.body.id}/attachments`)
      .attach("file", Buffer.from("gebunden, aber ohne Sammlung"), { filename: "gebunden.txt", contentType: "text/plain" })
      .expect(201);

    // Owner-gebunden, aber in keiner Sammlung -> erscheint unter Nicht einsortiert.
    const unsorted = await admin.get("/api/documents?folder=unsorted").expect(200);
    expect((unsorted.body as Array<{ id: number }>).map((item) => item.id)).toContain(upload.body.id);

    // Sobald es in eine Sammlung einsortiert wird, verschwindet es dort -> die Sammlung entscheidet, nicht der Owner.
    const folder = await admin.post("/api/attachment-folders").send({ name: "Vertraege" }).expect(201);
    await admin.post(`/api/attachment-folders/${folder.body.id}/documents/${upload.body.id}`).expect(204);
    const afterSort = await admin.get("/api/documents?folder=unsorted").expect(200);
    expect((afterSort.body as Array<{ id: number }>).map((item) => item.id)).not.toContain(upload.body.id);
  });

  // --- Upload-Kontext (Sammlung + Kategorie) ---

  it("Upload übernimmt Sammlung und Kategorie aus der Query", async () => {
    const admin = await loginAdmin();
    const folder = await admin.post("/api/attachment-folders").send({ name: "Rechnungen" }).expect(201);
    const category = await admin.post("/api/attachment-categories").send({ name: "Wichtig" }).expect(201);

    const withContext = await admin
      .post(`/api/documents?folder=${folder.body.id}&category=${category.body.id}`)
      .attach("file", Buffer.from("Inhalt"), { filename: "mit-kontext.txt", contentType: "text/plain" })
      .expect(201);

    const created = await admin.get(`/api/documents/${withContext.body.id}`).expect(200);
    expect(created.body.folders).toEqual([expect.objectContaining({ id: folder.body.id })]);
    expect(created.body.categories).toEqual([expect.objectContaining({ id: category.body.id })]);

    // Gegenbeispiel: ohne Query bleibt das Dokument ohne Sammlung und ohne Kategorie.
    const plain = await uploadDocument(admin, "ohne-kontext.txt");
    const fetched = await admin.get(`/api/documents/${plain.id}`).expect(200);
    expect(fetched.body.folders).toEqual([]);
    expect(fetched.body.categories).toEqual([]);
  });

  it("Upload mit unbekannter Kategorie antwortet 404 — das Dokument bleibt dennoch angelegt", async () => {
    const admin = await loginAdmin();
    const res = await admin
      .post("/api/documents?category=999999")
      .attach("file", Buffer.from("Inhalt"), { filename: "unbekannt.txt", contentType: "text/plain" })
      .expect(404);
    expect(res.body).toMatchObject({ error: "NOT_FOUND", statusCode: 404 });

    // Bekannte Grenze: Upload und Zuordnung liegen nicht in einer Transaktion. Das Attachment ist
    // bereits erzeugt, wenn die Zuordnung scheitert — dasselbe Verhalten gilt seit jeher für `folder`.
    const list = await admin.get("/api/documents").expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].categories).toEqual([]);
  });

  it("Upload mit Kontext bleibt schreibgeschützt: Leser erhält 403", async () => {
    const admin = await loginAdmin();
    const category = await admin.post("/api/attachment-categories").send({ name: "Gesperrt" }).expect(201);
    const reader = await loginReader();

    await reader
      .post(`/api/documents?category=${category.body.id}`)
      .attach("file", Buffer.from("Inhalt"), { filename: "verboten.txt", contentType: "text/plain" })
      .expect(403);
  });

  // --- System-Label-Schutz ---

  it("verhindert das Setzen eines geschuetzten System-Labels (400)", async () => {
    const admin = await loginAdmin();
    const tag = await admin.post("/api/tags").send({ name: "Storniert", color: "#ff0000" }).expect(201);
    await testDb.pool.execute("UPDATE tags SET is_system = 1 WHERE id = ?", [tag.body.id]);
    const doc = await uploadDocument(admin, "label.txt");

    await admin.put(`/api/documents/${doc.id}/tags`).send({ tagIds: [tag.body.id] }).expect(400);
  });

  // --- Orphan-Verhalten (Kernnachweis der Verhaltensaenderung) ---

  it("behaelt Anhaenge beim Loeschen des Fachobjekts und fuehrt sie als Nicht einsortiert", async () => {
    const admin = await loginAdmin();
    const project = await admin.post("/api/projects").send({ name: "DMS-Projekt", status: "active", color: "#6366f1" }).expect(201);
    const upload = await admin
      .post(`/api/projects/${project.body.id}/attachments`)
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

    await admin.delete(`/api/documents/${doc.id}`).expect(204);
    await admin.get(`/api/documents/${doc.id}`).expect(404);
  });
});
