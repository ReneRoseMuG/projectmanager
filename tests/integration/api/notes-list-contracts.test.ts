/**
 * Test Scope: Notes-Listen-API — TIEFE Vertragsaspekte (GET /api/notes)
 *
 * Test-Ebene:
 * - Integration (API).
 *
 * Realitätsgrad:
 * - Echte Fastify-App über buildTestApp, echte migrierte MySQL-Test-DB, echte
 *   Service-/Repository-/Routen-Schicht, echte HTTP-Antworten über supertest. Keine Mocks.
 *
 * Mock-Entscheidung:
 * - Keine Mocks (Integrationsvertrag; die Filter-/Pagination-/Auth-Semantik entsteht erst
 *   im Zusammenspiel von Ajv-Query-Validierung, Service-Offset und SQL LIKE/COUNT).
 *
 * Isolation:
 * - Temp-Test-DB (createTestDb), truncateAll vor jedem Test. Auth-Block eigener App-Bau
 *   mit enableAuth:true; config-Bypass (authBypassAdmin/apiKey) je Test hart abgeschaltet.
 *
 * Abgedeckte Regeln (ergänzend zu list-pagination-contracts.test.ts, NICHT dupliziert):
 * - notes hat NUR den Suchfilter `q` (KEIN `status`) — verifiziert an routes/notes.ts
 *   (notesListQuerySchema = { q } + paginationQuerySchema).
 * - Suche `q`: LIKE %q% über Titel ODER Inhalt (title OR content_json); Treffer drin,
 *   Nicht-Treffer per id ausgeschlossen; `total` == Anzahl der gefilterten Menge VOR Pagination.
 *   Geprüft am PAGINIERTEN Pfad (`?q=...&page=1&pageSize=100`), weil `q` nur dort wirkt.
 * - Array-Pfad-Vertrag: `GET /api/notes?q=...` OHNE `page` ruft `listNotes` OHNE Filter —
 *   `q` wird bewusst IGNORIERT (der Web-Client sendet `q` nur zusammen mit `page`).
 * - Grenzfälle Pagination (per Lauf verifiziert, nicht geraten). Schema-Semantik
 *   (route-schemas.paginationQuerySchema):
 *     * page:     { integer, minimum: 1 }            → page <= 0 verletzt minimum → 400
 *     * pageSize: { integer, minimum: 1, max: 100 }  → pageSize <= 0 → 400; pageSize > 100 → 400
 *   Es gibt KEIN Clamping im Service; die Route reicht page/pageSize (Default 25) durch,
 *   Ajv validiert hart. Das ist das tatsächliche Verhalten, das hier festgeschrieben wird.
 * - Auth (enableAuth): GET /api/notes ohne Session → 401; Admin/Reader lesen → 200;
 *   Reader schreibt (POST /api/projects/:id/notes) → 403.
 *
 * Fehlerfälle / Gegenbeispiele (PFLICHT):
 * - Jeder Suchtest enthält mindestens ein Gegenbeispiel (angelegte, aber NICHT erwartete
 *   Notiz), das explizit per id ausgeschlossen wird — kein Test nur mit Treffern.
 * - Ungültige Pagination-Parameter (page<=0, pageSize<=0, pageSize>100) als Negativvertrag.
 *
 * Ziel:
 * Sichert die tiefen Vertragszusagen der Notes-Listen-API (Suche, Array-vs-Paginated,
 * Pagination-Grenzen, Rollen-Autorisierung) test-getrieben nach dem opt-in-Pagination-Umbau ab.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createNoteForProject, createProject, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

interface NoteListItem {
  id: number;
  title: string;
  version: number;
}

interface PaginatedNotes {
  data: NoteListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// Baut ein contentJson mit sichtbarem Text, damit der Inhalts-Zweig der Suche (content_json
// LIKE %q%) deterministisch getroffen wird. Die Factory legt sonst ein leeres doc an.
function contentWithText(text: string): object {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

describe("Notes-Listen-API: Suche, Array-vs-Paginated, Pagination-Grenzen", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = await createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(async () => {
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
  });

  // Vertragslage (verifiziert an routes/notes.ts + services/notes.service.ts): Der Suchfilter
  // `q` wirkt NUR im paginierten Pfad. Der nackte Array-Pfad ruft `listNotes` OHNE Filter; der
  // Web-Client sendet `q` nie ohne `page`. Deshalb wird der q-Vertrag hier über den paginierten
  // Pfad geprüft (id-genaue Gegenbeispiele). notes hat KEINEN status-Filter.
  describe("Suche q (Titel ODER Inhalt, paginierter Pfad)", () => {
    it("GET /api/notes?q=...&page=1&pageSize=100 trifft über Titel UND Inhalt, Nicht-Treffer per id ausgeschlossen", async () => {
      const project = await createProject(app, { name: "Notiz-Projekt" });

      // Treffer über den Titel
      const byTitle = await createNoteForProject(app, project.id, { title: "Zephyr Konzept" });
      // Treffer über den Inhalt (Titel enthält den Begriff NICHT)
      const byContent = await createNoteForProject(app, project.id, {
        title: "Anderer Titel",
        contentJson: contentWithText("Enthält Zephyr im Fließtext")
      });
      // Gegenbeispiel: weder Titel noch Inhalt enthalten den Begriff
      const miss = await createNoteForProject(app, project.id, {
        title: "Komplett anderes",
        contentJson: contentWithText("nichts passendes hier")
      });

      const res = await supertest(app.server).get("/api/notes?q=Zephyr&page=1&pageSize=100").expect(200);
      const body = res.body as PaginatedNotes;
      const ids = body.data.map((n) => n.id);

      expect(ids).toContain(byTitle.id);
      expect(ids).toContain(byContent.id);
      expect(ids).not.toContain(miss.id);
      // Genau die beiden Treffer zählen in total (nach Filter, VOR Pagination)
      expect(body.total).toBe(2);
    });

    it("GET /api/notes?q=...&page=1&pageSize=100 → total zählt nur die Titel-Treffer (Gegenbeispiel ausgeschlossen)", async () => {
      const project = await createProject(app, { name: "Suchprojekt" });

      const hitA = await createNoteForProject(app, project.id, { title: "Suchbegriff-Alpha" });
      const hitB = await createNoteForProject(app, project.id, { title: "Suchbegriff-Beta" });
      // Gegenbeispiel: kein Treffer (weder Titel noch leerer Inhalt matchen)
      const miss = await createNoteForProject(app, project.id, { title: "Nichts davon" });

      const res = await supertest(app.server).get("/api/notes?q=Suchbegriff&page=1&pageSize=100").expect(200);
      const body = res.body as PaginatedNotes;
      const ids = body.data.map((n) => n.id);

      expect(body.total).toBe(2);
      expect(body.data.length).toBe(2);
      expect(ids).toContain(hitA.id);
      expect(ids).toContain(hitB.id);
      expect(ids).not.toContain(miss.id);
      for (const note of body.data) {
        expect(note.title).toContain("Suchbegriff");
      }
    });
  });

  // Der Array-Pfad (ohne `page`) ist der Rückwärtskompatibilitäts-Pfad: er liefert das nackte
  // Array ALLER Notizen und ignoriert `q`. Dieser Vertragstest schreibt genau das fest.
  describe("Array-Pfad ignoriert q (Vertragstest)", () => {
    it("GET /api/notes?q=... OHNE page → nacktes Array, q ignoriert (Gegenbeispiel bleibt drin)", async () => {
      const project = await createProject(app, { name: "Array-Projekt" });

      const hit = await createNoteForProject(app, project.id, { title: "Zephyr-Treffer" });
      // Gegenbeispiel: würde bei aktivem Filter herausfallen — muss hier ENTHALTEN bleiben
      const nonMatch = await createNoteForProject(app, project.id, { title: "Ganz woanders" });

      const res = await supertest(app.server).get("/api/notes?q=Zephyr").expect(200);
      // Array-Pfad: die Antwort ist ein Array, KEIN Paginated-Objekt
      expect(Array.isArray(res.body)).toBe(true);
      const ids = (res.body as NoteListItem[]).map((n) => n.id);

      // q wird ignoriert: beide Notizen sind enthalten (auch der Nicht-Treffer)
      expect(ids).toContain(hit.id);
      expect(ids).toContain(nonMatch.id);
    });
  });

  describe("Grenzfälle Pagination", () => {
    it("0 Einträge → { data: [], total: 0 }", async () => {
      const res = await supertest(app.server).get("/api/notes?page=1&pageSize=10").expect(200);
      const body = res.body as PaginatedNotes;

      expect(body.data).toEqual([]);
      expect(body.total).toBe(0);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(10);
    });

    it("genau 1 Eintrag → eine Seite mit einem Element, total 1", async () => {
      const project = await createProject(app, { name: "Ein-Notiz-Projekt" });
      const only = await createNoteForProject(app, project.id, { title: "Einzige Notiz" });

      const res = await supertest(app.server).get("/api/notes?page=1&pageSize=10").expect(200);
      const body = res.body as PaginatedNotes;

      expect(body.total).toBe(1);
      expect(body.data.length).toBe(1);
      expect(body.data[0].id).toBe(only.id);
    });

    it("mehr Einträge als pageSize → mehrere Seiten, letzte Seite teilgefüllt, keine Überlappung", async () => {
      const project = await createProject(app, { name: "Mehrseiten-Projekt" });
      const created: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const note = await createNoteForProject(app, project.id, { title: `Seite-${i}` });
        created.push(note.id);
      }

      const page1 = (await supertest(app.server).get("/api/notes?page=1&pageSize=2").expect(200)).body as PaginatedNotes;
      const page2 = (await supertest(app.server).get("/api/notes?page=2&pageSize=2").expect(200)).body as PaginatedNotes;
      const page3 = (await supertest(app.server).get("/api/notes?page=3&pageSize=2").expect(200)).body as PaginatedNotes;

      // total bleibt über alle Seiten konstant die Gesamtzahl
      expect(page1.total).toBe(5);
      expect(page2.total).toBe(5);
      expect(page3.total).toBe(5);

      // Volle Seiten, letzte Seite teilgefüllt (5 = 2 + 2 + 1)
      expect(page1.data.length).toBe(2);
      expect(page2.data.length).toBe(2);
      expect(page3.data.length).toBe(1);

      // Keine Überlappung; genau die 5 angelegten IDs über alle Seiten
      const collected = [...page1.data, ...page2.data, ...page3.data].map((n) => n.id);
      expect(new Set(collected).size).toBe(5);
      expect(collected.sort((a, b) => a - b)).toEqual([...created].sort((a, b) => a - b));
    });

    it("Seite hinter dem Ende → data: [], total unverändert", async () => {
      const project = await createProject(app, { name: "Hinter-Ende-Projekt" });
      for (let i = 0; i < 3; i += 1) {
        await createNoteForProject(app, project.id, { title: `Vorhanden-${i}` });
      }

      // Bei pageSize 2 gibt es Seiten 1..2; Seite 5 liegt weit hinter dem Ende
      const res = await supertest(app.server).get("/api/notes?page=5&pageSize=2").expect(200);
      const body = res.body as PaginatedNotes;

      expect(body.data).toEqual([]);
      expect(body.total).toBe(3);
      expect(body.page).toBe(5);
    });

    it("pageSize wird bei Weglassen auf Default 25 gesetzt", async () => {
      const project = await createProject(app, { name: "Default-Projekt" });
      await createNoteForProject(app, project.id, { title: "Default-PageSize" });

      const res = await supertest(app.server).get("/api/notes?page=1").expect(200);
      const body = res.body as PaginatedNotes;

      // Route reicht den Ajv-Default (25) durch — bestätigt per Lauf
      expect(body.pageSize).toBe(25);
      expect(body.total).toBe(1);
    });

    it("pageSize > 100 verletzt das Schema-Maximum → 400 (kein Clamping)", async () => {
      const project = await createProject(app, { name: "Egal-Max" });
      await createNoteForProject(app, project.id, { title: "Egal" });

      // paginationQuerySchema: pageSize { maximum: 100 } → Ajv lehnt 101 ab
      await supertest(app.server).get("/api/notes?page=1&pageSize=101").expect(400);
    });

    it("page <= 0 verletzt das Schema-Minimum → 400 (kein Defaulting)", async () => {
      const project = await createProject(app, { name: "Egal-Page" });
      await createNoteForProject(app, project.id, { title: "Egal" });

      // paginationQuerySchema: page { minimum: 1 } → Ajv lehnt 0 ab
      await supertest(app.server).get("/api/notes?page=0&pageSize=10").expect(400);
    });

    it("pageSize <= 0 verletzt das Schema-Minimum → 400 (kein Clamping)", async () => {
      const project = await createProject(app, { name: "Egal-PageSizeMin" });
      await createNoteForProject(app, project.id, { title: "Egal" });

      // paginationQuerySchema: pageSize { minimum: 1 } → Ajv lehnt 0 ab
      await supertest(app.server).get("/api/notes?page=1&pageSize=0").expect(400);
    });
  });
});

describe("Notes-Listen-API: Auth-/Rollenvertrag", () => {
  let testDb: TestDb;
  let authApp: FastifyInstance;
  let originalAuthBypassAdmin: boolean;
  let originalApiKey: string | null;

  beforeAll(async () => {
    testDb = await createTestDb();
    originalAuthBypassAdmin = config.authBypassAdmin;
    originalApiKey = config.apiKey;
    authApp = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(async () => {
    // Bypass hart aus, damit die Guard-Negativfälle (401/403) echt greifen
    config.authBypassAdmin = false;
    config.apiKey = null;
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    config.authBypassAdmin = originalAuthBypassAdmin;
    config.apiKey = originalApiKey;
    await authApp?.close();
    await testDb?.close();
  });

  it("GET /api/notes ohne Session → 401", async () => {
    await supertest(authApp.server).get("/api/notes").expect(401);
  });

  it("Admin darf lesen → 200; Reader darf lesen → 200; Reader POST /api/projects/:id/notes → 403", async () => {
    const admin = supertest.agent(authApp.server);
    await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);

    // Admin: Notizliste lesen erlaubt
    await admin.get("/api/notes").expect(200);

    // Ein Projekt als Ziel für den Reader-Schreibversuch (der Note-Schreibendpunkt)
    const project = (await admin.post("/api/projects").send({ name: "Auth-Notiz-Projekt", status: "active" }).expect(201)).body as { id: number };

    // Reader-Rolle ermitteln und Reader-User anlegen
    const roles = (await admin.get("/api/admin/roles").expect(200)).body as Array<{ key: string; id: number }>;
    const readerRole = roles.find((r) => r.key === "reader")!;
    await admin
      .post("/api/admin/users")
      .send({
        firstName: "Reader",
        lastName: "Notes",
        email: "reader-notes-list@example.test",
        roleId: readerRole.id,
        password: "password123",
        isActive: true
      })
      .expect(201);

    const reader = supertest.agent(authApp.server);
    await reader.post("/api/auth/login").send({ email: "reader-notes-list@example.test", password: "password123" }).expect(200);

    // Reader: Lesen erlaubt (200), Schreiben verboten (403)
    await reader.get("/api/notes").expect(200);
    await reader
      .post(`/api/projects/${project.id}/notes`)
      .send({ title: "Nicht erlaubt", contentJson: { type: "doc", content: [] } })
      .expect(403);
  });
});
