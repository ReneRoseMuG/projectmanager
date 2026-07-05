/**
 * Test Scope: Milestones-Listen-API — TIEFE Vertragsaspekte (GET /api/milestones)
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
 *   im Zusammenspiel von Ajv-Query-Validierung, SQL-WHERE/LIMIT/OFFSET und Rollen-Guard).
 *
 * Isolation:
 * - Temp-Test-DB (createTestDb), truncateAll vor jedem Test. Auth-Block eigener App-Bau
 *   mit enableAuth:true; config-Bypass (authBypassAdmin/apiKey) je Test hart abgeschaltet.
 *
 * Abgedeckte Regeln (ergänzend zu list-pagination-contracts.test.ts, NICHT dupliziert):
 * - Filter `status`: Gleichheit auf milestones.status (milestone.repository.buildListWhere);
 *   nur passende Meilensteine, andere raus. Paginierte Variante: `total` == Anzahl der
 *   gefilterten Menge (nicht der Gesamtmenge).
 * - Array-Pfad-Vertrag: GET /api/milestones OHNE `page` IGNORIERT `status`/`q` bewusst
 *   (Rückwärtskompatibilität; der Web-Client sendet Filter nur mit `page`). Ein nicht-aktives
 *   Gegenbeispiel bleibt in der ungefilterten Liste — festgeschrieben.
 * - Suche `q`: case-insensitive LIKE %q% NUR über milestones.name (nicht Beschreibung, s.
 *   milestones.service Kommentar "q sucht im Namen"); Treffer drin, Nicht-Treffer raus.
 * - Grenzfälle Pagination (per Lauf verifiziert, nicht geraten): 0/1/mehrseitig/Teil-Seite/
 *   Seite hinter dem Ende. Schema-Semantik (route-schemas.paginationQuerySchema):
 *     * page:     { integer, minimum: 1 }            → page <= 0 verletzt minimum → 400
 *     * pageSize: { integer, minimum: 1, max: 100 }  → pageSize > 100 / <= 0 → 400
 *   Es gibt KEIN Clamping im Service; die Route reicht page/pageSize (Default 25) durch,
 *   Ajv validiert hart. Das ist das tatsächliche Verhalten, das hier festgeschrieben wird.
 * - Auth (enableAuth): GET ohne Session → 401; Admin/Reader lesen → 200; Reader POST → 403.
 *
 * Fehlerfälle / Gegenbeispiele (PFLICHT):
 * - Jeder Filter-/Suchtest enthält mindestens ein Gegenbeispiel (angelegter, aber NICHT
 *   erwarteter Meilenstein), das explizit ausgeschlossen wird — kein Test nur mit Treffern.
 * - Ungültige Pagination-Parameter (page<=0, pageSize>100, pageSize<=0) als Negativvertrag.
 *
 * Ziel:
 * Sichert die tiefen Vertragszusagen der Meilenstein-Listen-API (Filter, Suche, Pagination-
 * Grenzen, Rollen-Autorisierung) test-getrieben nach dem opt-in-Pagination-Umbau ab.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createMilestone, createProject, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

interface MilestoneListItem {
  id: number;
  name: string;
  status: string;
  projectId: number;
}

interface PaginatedMilestones {
  data: MilestoneListItem[];
  total: number;
  page: number;
  pageSize: number;
}

describe("Milestones-Listen-API: Filter, Suche, Pagination-Grenzen", () => {
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

  // Vertragslage (verifiziert an routes/milestones.ts + milestone.repository.ts): Filter/Suche
  // wirken NUR im paginierten Pfad. Der nackte Array-Pfad ruft `listMilestones` OHNE Filter;
  // der Client sendet `status`/`q` auch nie ohne `page`. Deshalb wird der status/q-Vertrag hier
  // über den paginierten Pfad geprüft (id-genaue Gegenbeispiele).
  describe("Filter status (Gleichheit, paginierter Pfad)", () => {
    it("GET /api/milestones?status=active&page=1&pageSize=100 → nur aktive (andere per id ausgeschlossen), total == Anzahl aktiver", async () => {
      const project = await createProject(app, { name: "Filter-Projekt" });
      const activeA = await createMilestone(app, project.id, { name: "Aktiv A", status: "active" });
      const activeB = await createMilestone(app, project.id, { name: "Aktiv B", status: "active" });
      const activeC = await createMilestone(app, project.id, { name: "Aktiv C", status: "active" });
      const onHold = await createMilestone(app, project.id, { name: "Pausiert", status: "on_hold" });
      const completed = await createMilestone(app, project.id, { name: "Fertig", status: "completed" });

      const res = await supertest(app.server).get("/api/milestones?status=active&page=1&pageSize=100").expect(200);
      const body = res.body as PaginatedMilestones;
      const ids = body.data.map((m) => m.id);

      // Treffer: alle drei aktiven Meilensteine enthalten
      expect(ids).toContain(activeA.id);
      expect(ids).toContain(activeB.id);
      expect(ids).toContain(activeC.id);
      // Gegenbeispiele: nicht-aktive Meilensteine per id NICHT enthalten
      expect(ids).not.toContain(onHold.id);
      expect(ids).not.toContain(completed.id);
      // total ist die gefilterte Gesamtzahl (3 aktive), NICHT die Gesamtzahl (5)
      expect(body.total).toBe(3);
      // Jede zurückgegebene Zeile trägt tatsächlich den Filterstatus
      for (const milestone of body.data) {
        expect(milestone.status).toBe("active");
      }
    });
  });

  // Vertragstest Array-Pfad: OHNE `page` wird der Filter bewusst ignoriert (Rückwärtskompat.).
  describe("Array-Pfad ignoriert status/q (Rückwärtskompatibilität)", () => {
    it("GET /api/milestones?status=active OHNE page enthält AUCH nicht-aktive (Filter ignoriert)", async () => {
      const project = await createProject(app, { name: "Array-Projekt" });
      const active = await createMilestone(app, project.id, { name: "Aktiv", status: "active" });
      // Gegenbeispiel: nicht-aktiv — MUSS trotz status=active in der nackten Liste auftauchen
      const onHold = await createMilestone(app, project.id, { name: "Pausiert", status: "on_hold" });

      const res = await supertest(app.server).get("/api/milestones?status=active").expect(200);

      // Array-Alt-Vertrag: nacktes Array, kein Paginated-Objekt
      expect(Array.isArray(res.body)).toBe(true);
      const ids = (res.body as MilestoneListItem[]).map((m) => m.id);
      expect(ids).toContain(active.id);
      // Der Filter greift NICHT: das nicht-aktive Gegenbeispiel bleibt enthalten
      expect(ids).toContain(onHold.id);
    });

    it("GET /api/milestones?q=... OHNE page enthält AUCH den Nicht-Treffer (Suche ignoriert)", async () => {
      const project = await createProject(app, { name: "Array-Suche-Projekt" });
      const hit = await createMilestone(app, project.id, { name: "Zephyr Meilenstein", status: "active" });
      // Gegenbeispiel: Name ohne Suchbegriff — MUSS trotz q=Zephyr in der nackten Liste bleiben
      const miss = await createMilestone(app, project.id, { name: "Komplett anderes", status: "active" });

      const res = await supertest(app.server).get("/api/milestones?q=Zephyr").expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const ids = (res.body as MilestoneListItem[]).map((m) => m.id);
      expect(ids).toContain(hit.id);
      // Suche greift NICHT im Array-Pfad: der Nicht-Treffer bleibt enthalten
      expect(ids).toContain(miss.id);
    });
  });

  // `q` sucht case-insensitive NUR im Namen (milestone.repository: like(milestones.name, ...)),
  // anders als bei Projekten (dort auch Beschreibung). Deshalb kein Beschreibungs-Trefferfall.
  describe("Suche q (nur Name, paginierter Pfad)", () => {
    it("GET /api/milestones?q=...&page=1 trifft über den Namen, Nicht-Treffer per id ausgeschlossen", async () => {
      const project = await createProject(app, { name: "Such-Projekt" });
      // Treffer über den Namen
      const byName = await createMilestone(app, project.id, { name: "Zephyr Portal", status: "active", description: "irrelevant" });
      // Gegenbeispiel: Suchbegriff steht in der Beschreibung, NICHT im Namen → kein Treffer (q ist Name-only)
      const inDescriptionOnly = await createMilestone(app, project.id, { name: "Anderer Name", status: "active", description: "Enthält Zephyr im Text" });
      // Gegenbeispiel: weder Name noch Beschreibung enthalten den Begriff
      const miss = await createMilestone(app, project.id, { name: "Komplett anderes", status: "active", description: "nichts passendes" });

      const res = await supertest(app.server).get("/api/milestones?q=Zephyr&page=1&pageSize=100").expect(200);
      const body = res.body as PaginatedMilestones;
      const ids = body.data.map((m) => m.id);

      expect(ids).toContain(byName.id);
      // q trifft nur den Namen: Beschreibungs-Vorkommen zählt NICHT
      expect(ids).not.toContain(inDescriptionOnly.id);
      expect(ids).not.toContain(miss.id);
      // Genau der eine Namens-Treffer zählt in total
      expect(body.total).toBe(1);
      for (const milestone of body.data) {
        expect(milestone.name).toContain("Zephyr");
      }
    });

    it("GET /api/milestones?q=...&page=1 → total zählt nur die Namens-Treffer (Gegenbeispiel ausgeschlossen)", async () => {
      const project = await createProject(app, { name: "Such-Projekt-2" });
      const hitA = await createMilestone(app, project.id, { name: "Suchbegriff-Alpha", status: "active" });
      const hitB = await createMilestone(app, project.id, { name: "Suchbegriff-Beta", status: "on_hold" });
      // Gegenbeispiel: kein Treffer
      const miss = await createMilestone(app, project.id, { name: "Nichts davon", status: "active" });

      const res = await supertest(app.server).get("/api/milestones?q=Suchbegriff&page=1&pageSize=25").expect(200);
      const body = res.body as PaginatedMilestones;
      const ids = body.data.map((m) => m.id);

      expect(body.total).toBe(2);
      expect(body.data.length).toBe(2);
      expect(ids).toContain(hitA.id);
      expect(ids).toContain(hitB.id);
      expect(ids).not.toContain(miss.id);
      for (const milestone of body.data) {
        expect(milestone.name).toContain("Suchbegriff");
      }
    });
  });

  describe("Grenzfälle Pagination", () => {
    it("0 Einträge → { data: [], total: 0 }", async () => {
      const res = await supertest(app.server).get("/api/milestones?page=1&pageSize=10").expect(200);
      const body = res.body as PaginatedMilestones;

      expect(body.data).toEqual([]);
      expect(body.total).toBe(0);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(10);
    });

    it("genau 1 Eintrag → eine Seite mit einem Element, total 1", async () => {
      const project = await createProject(app, { name: "Ein-Meilenstein-Projekt" });
      const only = await createMilestone(app, project.id, { name: "Einziger", status: "active" });

      const res = await supertest(app.server).get("/api/milestones?page=1&pageSize=10").expect(200);
      const body = res.body as PaginatedMilestones;

      expect(body.total).toBe(1);
      expect(body.data.length).toBe(1);
      expect(body.data[0].id).toBe(only.id);
    });

    it("mehr Einträge als pageSize → mehrere Seiten, Summe stimmt, letzte Seite teilgefüllt, keine Überlappung", async () => {
      const project = await createProject(app, { name: "Seiten-Projekt" });
      const created: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const milestone = await createMilestone(app, project.id, { name: `Seite-${i}`, status: "active" });
        created.push(milestone.id);
      }

      const page1 = (await supertest(app.server).get("/api/milestones?page=1&pageSize=2").expect(200)).body as PaginatedMilestones;
      const page2 = (await supertest(app.server).get("/api/milestones?page=2&pageSize=2").expect(200)).body as PaginatedMilestones;
      const page3 = (await supertest(app.server).get("/api/milestones?page=3&pageSize=2").expect(200)).body as PaginatedMilestones;

      // total bleibt über alle Seiten konstant die Gesamtzahl
      expect(page1.total).toBe(5);
      expect(page2.total).toBe(5);
      expect(page3.total).toBe(5);

      // Volle Seiten, letzte Seite teilgefüllt (5 = 2 + 2 + 1)
      expect(page1.data.length).toBe(2);
      expect(page2.data.length).toBe(2);
      expect(page3.data.length).toBe(1);

      // Keine Überlappung; genau die 5 angelegten IDs über alle Seiten
      const collected = [...page1.data, ...page2.data, ...page3.data].map((m) => m.id);
      expect(new Set(collected).size).toBe(5);
      expect(collected.sort((a, b) => a - b)).toEqual([...created].sort((a, b) => a - b));
    });

    it("Seite hinter dem Ende → data: [], total unverändert", async () => {
      const project = await createProject(app, { name: "Hinter-Ende-Projekt" });
      for (let i = 0; i < 3; i += 1) {
        await createMilestone(app, project.id, { name: `Vorhanden-${i}`, status: "active" });
      }

      // Bei pageSize 2 gibt es Seiten 1..2; Seite 5 liegt weit hinter dem Ende
      const res = await supertest(app.server).get("/api/milestones?page=5&pageSize=2").expect(200);
      const body = res.body as PaginatedMilestones;

      expect(body.data).toEqual([]);
      expect(body.total).toBe(3);
      expect(body.page).toBe(5);
    });

    it("pageSize wird bei Weglassen auf Default 25 gesetzt", async () => {
      const project = await createProject(app, { name: "Default-Projekt" });
      await createMilestone(app, project.id, { name: "Default-PageSize", status: "active" });

      const res = await supertest(app.server).get("/api/milestones?page=1").expect(200);
      const body = res.body as PaginatedMilestones;

      // Service reicht den Ajv-Default (25) durch — bestätigt per Lauf
      expect(body.pageSize).toBe(25);
      expect(body.total).toBe(1);
    });

    it("pageSize > 100 verletzt das Schema-Maximum → 400 (kein Clamping)", async () => {
      const project = await createProject(app, { name: "Max-Projekt" });
      await createMilestone(app, project.id, { name: "Egal", status: "active" });

      // paginationQuerySchema: pageSize { maximum: 100 } → Ajv lehnt 101 ab
      await supertest(app.server).get("/api/milestones?page=1&pageSize=101").expect(400);
    });

    it("page <= 0 verletzt das Schema-Minimum → 400 (kein Defaulting)", async () => {
      const project = await createProject(app, { name: "Min-Page-Projekt" });
      await createMilestone(app, project.id, { name: "Egal", status: "active" });

      // paginationQuerySchema: page { minimum: 1 } → Ajv lehnt 0 ab
      await supertest(app.server).get("/api/milestones?page=0&pageSize=10").expect(400);
    });

    it("pageSize <= 0 verletzt das Schema-Minimum → 400 (kein Defaulting)", async () => {
      const project = await createProject(app, { name: "Min-Size-Projekt" });
      await createMilestone(app, project.id, { name: "Egal", status: "active" });

      // paginationQuerySchema: pageSize { minimum: 1 } → Ajv lehnt 0 ab
      await supertest(app.server).get("/api/milestones?page=1&pageSize=0").expect(400);
    });
  });
});

describe("Milestones-Listen-API: Auth-/Rollenvertrag", () => {
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

  it("GET /api/milestones ohne Session → 401", async () => {
    await supertest(authApp.server).get("/api/milestones").expect(401);
  });

  it("Admin darf lesen → 200; Reader darf lesen → 200; Reader POST /api/milestones → 403", async () => {
    const admin = supertest.agent(authApp.server);
    await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);

    // Admin: Lesen erlaubt
    await admin.get("/api/milestones").expect(200);

    // Reader-Rolle ermitteln und Reader-User anlegen
    const roles = (await admin.get("/api/admin/roles").expect(200)).body as Array<{ key: string; id: number }>;
    const readerRole = roles.find((r) => r.key === "reader")!;
    await admin
      .post("/api/admin/users")
      .send({
        firstName: "Reader",
        lastName: "Milestones",
        email: "reader-milestones-list@example.test",
        roleId: readerRole.id,
        password: "password123",
        isActive: true
      })
      .expect(201);

    const reader = supertest.agent(authApp.server);
    await reader.post("/api/auth/login").send({ email: "reader-milestones-list@example.test", password: "password123" }).expect(200);

    // Reader: Lesen erlaubt (200), Schreiben verboten (403). Der Guard greift vor der
    // Body-Validierung; projectId/name sind nur plausibel gefüllt, damit klar der
    // Autorisierungs- und kein Validierungspfad geprüft wird.
    await reader.get("/api/milestones").expect(200);
    await reader.post("/api/milestones").send({ projectId: 1, name: "Nicht erlaubt", status: "active" }).expect(403);
  });
});
