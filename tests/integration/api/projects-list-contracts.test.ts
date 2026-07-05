/**
 * Test Scope: Projects-Listen-API — TIEFE Vertragsaspekte (GET /api/projects)
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
 *   im Zusammenspiel von Ajv-Query-Validierung, Service-Clamp/Offset und SQL).
 *
 * Isolation:
 * - Temp-Test-DB (createTestDb), truncateAll vor jedem Test. Auth-Block eigener App-Bau
 *   mit enableAuth:true; config-Bypass (authBypassAdmin/apiKey) je Test hart abgeschaltet.
 *
 * Abgedeckte Regeln (ergänzend zu list-pagination-contracts.test.ts, NICHT dupliziert):
 * - Filter `status`: Gleichheit auf projects.status; nur passende Projekte, andere raus.
 *   Paginierte Variante: `total` == Anzahl der gefilterten Menge (nicht der Gesamtmenge).
 * - Suche `q`: LIKE %q% über Name + Beschreibung; Treffer drin, Nicht-Treffer raus.
 * - Grenzfälle Pagination (per Lauf verifiziert, nicht geraten): 0/1/mehrseitig/Teil-Seite/
 *   Seite hinter dem Ende. Schema-Semantik (route-schemas.paginationQuerySchema):
 *     * page:     { integer, minimum: 1 }            → page <= 0 verletzt minimum → 400
 *     * pageSize: { integer, minimum: 1, max: 100 }  → pageSize > 100 verletzt maximum → 400
 *   Es gibt KEIN Clamping im Service; die Route reicht page/pageSize (Default 25) durch,
 *   Ajv validiert hart. Das ist das tatsächliche Verhalten, das hier festgeschrieben wird.
 * - Auth (enableAuth): GET ohne Session → 401; Admin/Reader lesen → 200; Reader POST → 403.
 *
 * Fehlerfälle / Gegenbeispiele (PFLICHT):
 * - Jeder Filter-/Suchtest enthält mindestens ein Gegenbeispiel (angelegtes, aber NICHT
 *   erwartetes Projekt), das explizit ausgeschlossen wird — kein Test nur mit Treffern.
 * - Ungültige Pagination-Parameter (page<=0, pageSize>100) als Negativvertrag.
 *
 * Ziel:
 * Sichert die tiefen Vertragszusagen der Projekt-Listen-API (Filter, Suche, Pagination-
 * Grenzen, Rollen-Autorisierung) test-getrieben nach dem opt-in-Pagination-Umbau ab.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createProject, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

interface ProjectListItem {
  id: number;
  name: string;
  status: string;
  description: string | null;
}

interface PaginatedProjects {
  data: ProjectListItem[];
  total: number;
  page: number;
  pageSize: number;
}

describe("Projects-Listen-API: Filter, Suche, Pagination-Grenzen", () => {
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

  // Vertragslage (verifiziert an routes/projects.ts + web/api/projects.ts): Filter/Suche
  // wirken NUR im paginierten Pfad. Der nackte Array-Pfad ruft `listProjects` OHNE Filter;
  // der Client (getProjects) sendet `status`/`q` auch nie ohne `page`. Deshalb wird der
  // status/q-Vertrag hier über den paginierten Pfad geprüft (id-genaue Gegenbeispiele).
  describe("Filter status (Gleichheit, paginierter Pfad)", () => {
    it("GET /api/projects?status=active&page=1&pageSize=50 → nur aktive (andere per id ausgeschlossen), total == Anzahl aktiver", async () => {
      const activeA = await createProject(app, { name: "Aktiv A", status: "active" });
      const activeB = await createProject(app, { name: "Aktiv B", status: "active" });
      const activeC = await createProject(app, { name: "Aktiv C", status: "active" });
      const onHold = await createProject(app, { name: "Pausiert", status: "on_hold" });
      const completed = await createProject(app, { name: "Fertig", status: "completed" });

      const res = await supertest(app.server).get("/api/projects?status=active&page=1&pageSize=50").expect(200);
      const body = res.body as PaginatedProjects;
      const ids = body.data.map((p) => p.id);

      // Treffer: alle drei aktiven Projekte enthalten
      expect(ids).toContain(activeA.id);
      expect(ids).toContain(activeB.id);
      expect(ids).toContain(activeC.id);
      // Gegenbeispiele: nicht-aktive Projekte per id NICHT enthalten
      expect(ids).not.toContain(onHold.id);
      expect(ids).not.toContain(completed.id);
      // total ist die gefilterte Gesamtzahl (3 aktive), NICHT die Gesamtzahl (5)
      expect(body.total).toBe(3);
      // Jede zurückgegebene Zeile trägt tatsächlich den Filterstatus
      for (const project of body.data) {
        expect(project.status).toBe("active");
      }
    });
  });

  // Wie beim status-Filter wirkt `q` nur im paginierten Pfad (siehe Kommentar oben).
  describe("Suche q (Name + Beschreibung, paginierter Pfad)", () => {
    it("GET /api/projects?q=...&page=1 trifft über Name UND Beschreibung, Nicht-Treffer per id ausgeschlossen", async () => {
      // Treffer über den Namen
      const byName = await createProject(app, { name: "Zephyr Portal", status: "active", description: "irrelevant" });
      // Treffer über die Beschreibung (Name enthält den Begriff NICHT)
      const byDescription = await createProject(app, { name: "Anderer Name", status: "active", description: "Enthält Zephyr im Text" });
      // Gegenbeispiele: weder Name noch Beschreibung enthalten den Begriff
      const missName = await createProject(app, { name: "Komplett anderes", status: "active", description: "nichts passendes" });
      const missNull = await createProject(app, { name: "Ohne Beschreibung", status: "active", description: null });

      const res = await supertest(app.server).get("/api/projects?q=Zephyr&page=1&pageSize=50").expect(200);
      const body = res.body as PaginatedProjects;
      const ids = body.data.map((p) => p.id);

      expect(ids).toContain(byName.id);
      expect(ids).toContain(byDescription.id);
      expect(ids).not.toContain(missName.id);
      expect(ids).not.toContain(missNull.id);
      // Genau die beiden Treffer zählen in total
      expect(body.total).toBe(2);
    });

    it("GET /api/projects?q=...&page=1 → total zählt nur die Treffer (Gegenbeispiel ausgeschlossen)", async () => {
      const hitA = await createProject(app, { name: "Suchbegriff-Alpha", status: "active" });
      const hitB = await createProject(app, { name: "Suchbegriff-Beta", status: "on_hold" });
      // Gegenbeispiel: kein Treffer
      const miss = await createProject(app, { name: "Nichts davon", status: "active" });

      const res = await supertest(app.server).get("/api/projects?q=Suchbegriff&page=1&pageSize=25").expect(200);
      const body = res.body as PaginatedProjects;
      const ids = body.data.map((p) => p.id);

      expect(body.total).toBe(2);
      expect(body.data.length).toBe(2);
      expect(ids).toContain(hitA.id);
      expect(ids).toContain(hitB.id);
      expect(ids).not.toContain(miss.id);
      for (const project of body.data) {
        expect(project.name).toContain("Suchbegriff");
      }
    });
  });

  describe("Grenzfälle Pagination", () => {
    it("0 Einträge → { data: [], total: 0 }", async () => {
      const res = await supertest(app.server).get("/api/projects?page=1&pageSize=10").expect(200);
      const body = res.body as PaginatedProjects;

      expect(body.data).toEqual([]);
      expect(body.total).toBe(0);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(10);
    });

    it("genau 1 Eintrag → eine Seite mit einem Element, total 1", async () => {
      const only = await createProject(app, { name: "Einziges", status: "active" });

      const res = await supertest(app.server).get("/api/projects?page=1&pageSize=10").expect(200);
      const body = res.body as PaginatedProjects;

      expect(body.total).toBe(1);
      expect(body.data.length).toBe(1);
      expect(body.data[0].id).toBe(only.id);
    });

    it("mehr Einträge als pageSize → mehrere Seiten, Summe stimmt, keine Überlappung", async () => {
      const created: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const project = await createProject(app, { name: `Seite-${i}`, status: "active" });
        created.push(project.id);
      }

      const page1 = (await supertest(app.server).get("/api/projects?page=1&pageSize=2").expect(200)).body as PaginatedProjects;
      const page2 = (await supertest(app.server).get("/api/projects?page=2&pageSize=2").expect(200)).body as PaginatedProjects;
      const page3 = (await supertest(app.server).get("/api/projects?page=3&pageSize=2").expect(200)).body as PaginatedProjects;

      // total bleibt über alle Seiten konstant die Gesamtzahl
      expect(page1.total).toBe(5);
      expect(page2.total).toBe(5);
      expect(page3.total).toBe(5);

      // Volle Seiten, letzte Seite teilgefüllt (5 = 2 + 2 + 1)
      expect(page1.data.length).toBe(2);
      expect(page2.data.length).toBe(2);
      expect(page3.data.length).toBe(1);

      // Keine Überlappung; genau die 5 angelegten IDs über alle Seiten
      const collected = [...page1.data, ...page2.data, ...page3.data].map((p) => p.id);
      expect(new Set(collected).size).toBe(5);
      expect(collected.sort((a, b) => a - b)).toEqual([...created].sort((a, b) => a - b));
    });

    it("Seite hinter dem Ende → data: [], total unverändert", async () => {
      for (let i = 0; i < 3; i += 1) {
        await createProject(app, { name: `Vorhanden-${i}`, status: "active" });
      }

      // Bei pageSize 2 gibt es Seiten 1..2; Seite 5 liegt weit hinter dem Ende
      const res = await supertest(app.server).get("/api/projects?page=5&pageSize=2").expect(200);
      const body = res.body as PaginatedProjects;

      expect(body.data).toEqual([]);
      expect(body.total).toBe(3);
      expect(body.page).toBe(5);
    });

    it("pageSize wird bei Weglassen auf Default 25 gesetzt", async () => {
      await createProject(app, { name: "Default-PageSize", status: "active" });

      const res = await supertest(app.server).get("/api/projects?page=1").expect(200);
      const body = res.body as PaginatedProjects;

      // Service reicht den Ajv-Default (25) durch — bestätigt per Lauf
      expect(body.pageSize).toBe(25);
      expect(body.total).toBe(1);
    });

    it("pageSize > 100 verletzt das Schema-Maximum → 400 (kein Clamping)", async () => {
      await createProject(app, { name: "Egal", status: "active" });

      // paginationQuerySchema: pageSize { maximum: 100 } → Ajv lehnt 101 ab
      await supertest(app.server).get("/api/projects?page=1&pageSize=101").expect(400);
    });

    it("page <= 0 verletzt das Schema-Minimum → 400 (kein Defaulting)", async () => {
      await createProject(app, { name: "Egal", status: "active" });

      // paginationQuerySchema: page { minimum: 1 } → Ajv lehnt 0 ab
      await supertest(app.server).get("/api/projects?page=0&pageSize=10").expect(400);
    });
  });
});

describe("Projects-Listen-API: Auth-/Rollenvertrag", () => {
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

  it("GET /api/projects ohne Session → 401", async () => {
    await supertest(authApp.server).get("/api/projects").expect(401);
  });

  it("Admin darf lesen → 200; Reader darf lesen → 200; Reader POST /api/projects → 403", async () => {
    const admin = supertest.agent(authApp.server);
    await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);

    // Admin: Lesen erlaubt
    await admin.get("/api/projects").expect(200);

    // Reader-Rolle ermitteln und Reader-User anlegen
    const roles = (await admin.get("/api/admin/roles").expect(200)).body as Array<{ key: string; id: number }>;
    const readerRole = roles.find((r) => r.key === "reader")!;
    await admin
      .post("/api/admin/users")
      .send({
        firstName: "Reader",
        lastName: "Projects",
        email: "reader-projects-list@example.test",
        roleId: readerRole.id,
        password: "password123",
        isActive: true
      })
      .expect(201);

    const reader = supertest.agent(authApp.server);
    await reader.post("/api/auth/login").send({ email: "reader-projects-list@example.test", password: "password123" }).expect(200);

    // Reader: Lesen erlaubt (200), Schreiben verboten (403)
    await reader.get("/api/projects").expect(200);
    await reader.post("/api/projects").send({ name: "Nicht erlaubt", status: "active" }).expect(403);
  });
});
