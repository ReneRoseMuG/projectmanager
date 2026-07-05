/**
 * Test Scope: Dokumentenbibliothek-Listen-API (DMS, MS-75) — TIEFE Vertragsaspekte
 *             (GET /api/documents) nach dem opt-in-Pagination-Umbau.
 *
 * Test-Ebene:
 * - Integration (API).
 *
 * Realitätsgrad:
 * - Echte Fastify-App über buildTestApp (enableAuth:true, enableMultipart:true), echte
 *   migrierte MySQL-Test-DB, echte Service-/Repository-/Routen-Schicht, echte Auth-Plugins,
 *   echte Sessions/Rollen (admin/reader), echte Multipart-Uploads ins Temp-UPLOAD_DIR,
 *   echte HTTP-Antworten über supertest. Dokumente werden — mangels einfacher Factory —
 *   ausschließlich per Multipart-Upload (POST /api/documents) angelegt (lokaler Helfer).
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Einziger technischer Eingriff ohne Fachlogik-Einfluss: `fileOpener:
 *   async () => undefined` (identisch zur maßgeblichen Vorlage dms.test.ts). Er ist eine
 *   technische Attrappe für den bei enableMultipart mitregistrierten Static-/Öffnen-Pfad
 *   und wirkt NICHT auf die hier geprüfte Listen-/Filter-/Pagination-/Auth-Logik ein.
 *
 * Isolation:
 * - Temp-Test-DB pro Lauf (createTestDb), truncateAll vor jedem Test, Temp-UPLOAD_DIR unter
 *   os.tmpdir(). Auth-Bypass (authBypassAdmin/apiKey) je Test hart abgeschaltet, damit die
 *   Guard-Negativfälle (401/403) echt greifen.
 *
 * Abgedeckte Regeln (verifiziert an routes/dms.ts + services/document.service.ts, per Lauf
 * bestätigt — NICHT geraten):
 * - Array/Paginated-Grundvertrag: response `anyOf:[Array, Paginated]`. OHNE `page` → nacktes
 *   Array; MIT `page` → Paginated{data,total,page,pageSize}. Konsistenz Array↔paginiert.
 * - ACHTUNG (anders als projects/tickets): Der ARRAY-Pfad WENDET die Filter AN. Beleg:
 *   routes/dms.ts reicht `documentFilter` auch ohne `page` an listDocumentLibrary, das über
 *   applyLibraryFilters filtert. Deshalb werden q/folder hier über den Array-Pfad geprüft.
 * - Suche `q`: Teilstring über originalName/displayName; Treffer drin, Gegenbeispiel raus.
 * - Filter `folder`: numerische Sammlungs-ID → nur einsortierte Dokumente; `unsorted` → nur
 *   ownerlose, nicht einsortierte Dokumente. Jeweils mit id-genauem Gegenbeispiel.
 * - Grenzfälle Pagination (paginationQuerySchema): page {minimum:1}, pageSize {min:1,max:100}.
 *     * pageSize > 100 → Ajv 400 (kein Clamping).
 *     * page <= 0 / pageSize <= 0 → Ajv 400 (kein Defaulting/Clamping).
 *   Leere Bibliothek → {data:[], total:0}; Seite hinter dem Ende → {data:[], total unverändert}.
 * - Auth (attachmentsAuth("read")): GET ohne Session → 401; Admin lesen → 200; Reader lesen
 *   → 200; Reader Upload (POST /api/documents, write) → 403.
 *
 * Fehlerfälle / Gegenbeispiele (PFLICHT):
 * - Jeder Filter-/Suchtest enthält mindestens ein angelegtes, aber NICHT erwartetes Dokument
 *   (id-genaues Gegenbeispiel), das explizit ausgeschlossen wird.
 * - Ungültige Pagination-Parameter (page<=0, pageSize<=0, pageSize>100) als Negativvertrag.
 *
 * Ziel:
 * Sichert die tiefen Vertragszusagen der Dokumentenbibliothek-Listen-API (Array/Paginated,
 * Filter/Suche im Array-Pfad, Pagination-Grenzen, Rollen-Autorisierung) test-getrieben nach
 * dem opt-in-Pagination-Umbau ab.
 */

import type { FastifyInstance } from "fastify";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

const uploadDir = path.join(os.tmpdir(), `taskmanager-api-documents-list-${process.pid}`);

interface DocumentListItem {
  id: number;
  originalName: string;
  displayName: string | null;
}

interface PaginatedDocuments {
  data: DocumentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

describe("Dokumentenbibliothek-Listen-API: Array/Paginated, Filter, Suche, Pagination-Grenzen", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let originalAuthBypassAdmin: boolean;
  let originalApiKey: string | null;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = uploadDir;
    testDb = await createTestDb();
    originalAuthBypassAdmin = config.authBypassAdmin;
    originalApiKey = config.apiKey;
    // enableMultipart ist Pflicht: Upload-Anlage der Dokumente läuft über Multipart; der
    // fileOpener ist die technische Attrappe (siehe Scope), ohne Einfluss auf die Listenlogik.
    app = await buildTestApp(testDb, { enableAuth: true, enableMultipart: true, fileOpener: async () => undefined });
  }, 300000); // langsame lokale MySQL: DB anlegen + migrieren überschreitet den Default-Hook-Timeout deutlich

  beforeEach(async () => {
    // Bypass hart aus, damit die Auth-Negativfälle (401/403) echt greifen
    config.authBypassAdmin = false;
    config.apiKey = null;
    await truncateAll(testDb.pool);
    await fs.mkdir(uploadDir, { recursive: true });
  });

  afterAll(async () => {
    config.authBypassAdmin = originalAuthBypassAdmin;
    config.apiKey = originalApiKey;
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
      .send({ firstName: "Read", lastName: "Only", email: "documents-list-reader@example.test", roleId: readerRole.id, password: "password123", isActive: true })
      .expect(201);
    const reader = supertest.agent(app.server);
    await reader.post("/api/auth/login").send({ email: "documents-list-reader@example.test", password: "password123" }).expect(200);
    return reader;
  }

  // Dokumente entstehen ausschließlich per Multipart-Upload (keine einfache Factory). Optional
  // wird direkt beim Upload in eine Sammlung einsortiert (?folder=<id>), exakt wie in dms.test.ts.
  async function uploadDocument(admin: ReturnType<typeof supertest.agent>, name: string, folderId?: number) {
    const url = folderId !== undefined ? `/api/documents?folder=${folderId}` : "/api/documents";
    const res = await admin.post(url).attach("file", Buffer.from(`Inhalt ${name}`), { filename: name, contentType: "text/plain" }).expect(201);
    return res.body as DocumentListItem;
  }

  // --- Array/Paginated-Grundvertrag mit Daten ---

  describe("Array/Paginated-Grundvertrag (mit Daten)", () => {
    it("OHNE page → nacktes Array (alle Dokumente); MIT page → Paginated{data,total,page,pageSize}; Array↔paginiert konsistent", async () => {
      const admin = await loginAdmin();
      const a = await uploadDocument(admin, "grundvertrag-a.txt");
      const b = await uploadDocument(admin, "grundvertrag-b.txt");
      const c = await uploadDocument(admin, "grundvertrag-c.txt");

      // Array-Pfad: nacktes Array (kein Paginated-Wrapper), enthält alle drei Dokumente
      const arrayRes = await admin.get("/api/documents").expect(200);
      expect(Array.isArray(arrayRes.body)).toBe(true);
      const arrayIds = (arrayRes.body as DocumentListItem[]).map((doc) => doc.id);
      expect(arrayIds.length).toBeGreaterThanOrEqual(3);
      expect(arrayIds).toContain(a.id);
      expect(arrayIds).toContain(b.id);
      expect(arrayIds).toContain(c.id);

      // Paginierter Pfad: Wrapper-Form, Seitengröße 2 schneidet zu, total = Gesamtzahl (3)
      const page1 = (await admin.get("/api/documents?page=1&pageSize=2").expect(200)).body as PaginatedDocuments;
      expect(Array.isArray(page1)).toBe(false);
      expect(page1).toMatchObject({ total: 3, page: 1, pageSize: 2 });
      expect(page1.data.length).toBe(2);

      const page2 = (await admin.get("/api/documents?page=2&pageSize=2").expect(200)).body as PaginatedDocuments;
      expect(page2.total).toBe(3);
      expect(page2.data.length).toBe(1);

      // Konsistenz: paginiert zusammengesetzt == Array-Pfad (gleiche Menge, keine Überlappung)
      const paginated = [...page1.data, ...page2.data].map((doc) => doc.id);
      expect(new Set(paginated).size).toBe(3);
      expect(paginated.sort((x, y) => x - y)).toEqual([...arrayIds].sort((x, y) => x - y));
    });
  });

  // --- Suche q (Array-Pfad wendet Filter an — anders als projects/tickets) ---

  describe("Suche q (Array-Pfad)", () => {
    it("GET /api/documents?q=... trifft über originalName, Gegenbeispiel per id ausgeschlossen", async () => {
      const admin = await loginAdmin();
      const hit = await uploadDocument(admin, "quartalsbericht-zephyr.txt");
      const miss = await uploadDocument(admin, "sonstige-notiz.txt"); // Gegenbeispiel: kein Treffer

      // Array-Pfad (OHNE page) — hier wird der Filter tatsächlich angewandt
      const res = await admin.get("/api/documents?q=zephyr").expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      const ids = (res.body as DocumentListItem[]).map((doc) => doc.id);

      expect(ids).toContain(hit.id);
      expect(ids).not.toContain(miss.id);
      // Jede zurückgegebene Zeile trägt den Suchbegriff tatsächlich (Name oder Anzeigename)
      for (const doc of res.body as DocumentListItem[]) {
        const haystack = `${doc.originalName} ${doc.displayName ?? ""}`.toLowerCase();
        expect(haystack).toContain("zephyr");
      }
    });
  });

  // --- Filter folder (numerische Sammlung + unsorted) ---

  describe("Filter folder (Array-Pfad)", () => {
    it("?folder=<id> → nur einsortierte Dokumente; ?folder=unsorted → nur das ordnerlose (id-genaue Gegenbeispiele)", async () => {
      const admin = await loginAdmin();
      const folder = await admin.post("/api/attachment-folders").send({ name: "Rechnungen" }).expect(201);
      const inFolder = await uploadDocument(admin, "im-ordner.txt", folder.body.id);
      const outside = await uploadDocument(admin, "ohne-ordner.txt");

      // folder=<id>: nur das einsortierte Dokument, das ordnerlose ist Gegenbeispiel
      const inFolderRes = await admin.get(`/api/documents?folder=${folder.body.id}`).expect(200);
      const inFolderIds = (inFolderRes.body as DocumentListItem[]).map((doc) => doc.id);
      expect(inFolderIds).toContain(inFolder.id);
      expect(inFolderIds).not.toContain(outside.id);

      // folder=unsorted: nur das ordnerlose (ownerlose) Dokument, das einsortierte ist Gegenbeispiel
      const unsortedRes = await admin.get("/api/documents?folder=unsorted").expect(200);
      const unsortedIds = (unsortedRes.body as DocumentListItem[]).map((doc) => doc.id);
      expect(unsortedIds).toContain(outside.id);
      expect(unsortedIds).not.toContain(inFolder.id);
    });
  });

  // --- Grenzfälle Pagination ---

  describe("Grenzfälle Pagination", () => {
    it("leere Bibliothek → { data: [], total: 0 }", async () => {
      const admin = await loginAdmin();
      const res = await admin.get("/api/documents?page=1&pageSize=10").expect(200);
      const body = res.body as PaginatedDocuments;

      expect(body.data).toEqual([]);
      expect(body.total).toBe(0);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(10);
    });

    it("Seite hinter dem Ende → data: [], total unverändert", async () => {
      const admin = await loginAdmin();
      await uploadDocument(admin, "seite-a.txt");
      await uploadDocument(admin, "seite-b.txt");
      await uploadDocument(admin, "seite-c.txt");

      // Bei pageSize 2 gibt es Seiten 1..2; Seite 5 liegt weit hinter dem Ende
      const res = await admin.get("/api/documents?page=5&pageSize=2").expect(200);
      const body = res.body as PaginatedDocuments;

      expect(body.data).toEqual([]);
      expect(body.total).toBe(3);
      expect(body.page).toBe(5);
    });

    it("pageSize > 100 verletzt das Schema-Maximum → 400 (kein Clamping)", async () => {
      const admin = await loginAdmin();
      await uploadDocument(admin, "egal.txt");

      // paginationQuerySchema: pageSize { maximum: 100 } → Ajv lehnt 101 ab
      await admin.get("/api/documents?page=1&pageSize=101").expect(400);
    });

    it("page <= 0 verletzt das Schema-Minimum → 400 (kein Defaulting)", async () => {
      const admin = await loginAdmin();
      await uploadDocument(admin, "egal.txt");

      // paginationQuerySchema: page { minimum: 1 } → Ajv lehnt 0 ab
      await admin.get("/api/documents?page=0&pageSize=10").expect(400);
    });

    it("pageSize <= 0 verletzt das Schema-Minimum → 400 (kein Clamping)", async () => {
      const admin = await loginAdmin();
      await uploadDocument(admin, "egal.txt");

      // paginationQuerySchema: pageSize { minimum: 1 } → Ajv lehnt 0 ab
      await admin.get("/api/documents?page=1&pageSize=0").expect(400);
    });
  });
});

describe("Dokumentenbibliothek-Listen-API: Auth-/Rollenvertrag", () => {
  let testDb: TestDb;
  let authApp: FastifyInstance;
  let originalAuthBypassAdmin: boolean;
  let originalApiKey: string | null;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = uploadDir;
    testDb = await createTestDb();
    originalAuthBypassAdmin = config.authBypassAdmin;
    originalApiKey = config.apiKey;
    authApp = await buildTestApp(testDb, { enableAuth: true, enableMultipart: true, fileOpener: async () => undefined });
  }, 300000);

  beforeEach(async () => {
    // Bypass hart aus, damit die Guard-Negativfälle (401/403) echt greifen
    config.authBypassAdmin = false;
    config.apiKey = null;
    await truncateAll(testDb.pool);
    await fs.mkdir(uploadDir, { recursive: true });
  });

  afterAll(async () => {
    config.authBypassAdmin = originalAuthBypassAdmin;
    config.apiKey = originalApiKey;
    await authApp?.close();
    await testDb?.close();
    await fs.rm(uploadDir, { recursive: true, force: true });
  }, 120000);

  it("GET /api/documents ohne Session → 401", async () => {
    await supertest(authApp.server).get("/api/documents").expect(401);
  });

  it("Admin darf lesen → 200; Reader darf lesen → 200; Reader Upload POST /api/documents → 403", async () => {
    const admin = supertest.agent(authApp.server);
    await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);

    // Admin: Lesen erlaubt
    await admin.get("/api/documents").expect(200);

    // Reader-Rolle ermitteln und Reader-User anlegen
    const roles = (await admin.get("/api/admin/roles").expect(200)).body as Array<{ key: string; id: number }>;
    const readerRole = roles.find((r) => r.key === "reader")!;
    await admin
      .post("/api/admin/users")
      .send({
        firstName: "Reader",
        lastName: "Documents",
        email: "reader-documents-list@example.test",
        roleId: readerRole.id,
        password: "password123",
        isActive: true
      })
      .expect(201);

    const reader = supertest.agent(authApp.server);
    await reader.post("/api/auth/login").send({ email: "reader-documents-list@example.test", password: "password123" }).expect(200);

    // Reader: Lesen erlaubt (200), Upload (write) verboten (403)
    await reader.get("/api/documents").expect(200);
    await reader
      .post("/api/documents")
      .attach("file", Buffer.from("nicht erlaubt"), { filename: "verboten.txt", contentType: "text/plain" })
      .expect(403);
  });
});
