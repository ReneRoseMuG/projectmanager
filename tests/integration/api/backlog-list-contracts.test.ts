/**
 * Test Scope: Backlog-Listen-API — TIEFE Vertragsaspekte (GET /api/projects/:id/backlog)
 *
 * Test-Ebene:
 * - Integration (API).
 *
 * Realitätsgrad:
 * - Echte Fastify-App über buildTestApp, echte migrierte MySQL-Test-DB, echte
 *   Service-/Repository-/Routen-Schicht, echte HTTP-Antworten über supertest. Keine Mocks.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Die Filter-/Suche-/Pagination-/Auth-Semantik entsteht erst im Zusammenspiel
 *   von Ajv-Query-Validierung (backlogQuerySchema inkl. paginationQuerySchema), der geteilten
 *   WHERE-Klausel (buildProjectWhere) und dem SQL. Ein Mock würde genau diese Zusage nicht prüfen.
 *
 * Isolation:
 * - Temp-Test-DB (createTestDb), truncateAll vor jedem Test. Der Auth-Block baut eine eigene App
 *   mit enableAuth:true; der config-Bypass (authBypassAdmin/apiKey) wird je Test hart abgeschaltet,
 *   damit die Guard-Negativfälle (401/403) echt greifen.
 *
 * Abgedeckte Regeln (per Lauf verifiziert, nicht geraten):
 * - ACHTUNG — anders als projects/tickets: Backlog wendet die Filter in BEIDEN Pfaden an.
 *   Der Array-Pfad (OHNE `page`) ruft listBacklogItems(db, id, filters) MIT filters; Alt-Pfad
 *   (findByProject) und paginierter Pfad (findPage/countFiltered) teilen sich buildProjectWhere.
 *   Deshalb wird der status-Filter hier über BEIDE Pfade festgeschrieben (id-genaue Gegenbeispiele);
 *   `total` im paginierten Pfad == Anzahl der gefilterten Menge (nicht der Gesamtmenge).
 * - Filter `featureId`: Gleichheit auf backlogItems.featureId; nur zugeordnete Items, Items ohne
 *   bzw. mit anderer featureId raus.
 * - Suche `q`: LIKE %q% NUR über den Titel (backlogItems.title) — NICHT über die Beschreibung
 *   (anders als projects). Titel-Treffer drin, Titel-Nicht-Treffer raus; ein Item, dessen Begriff
 *   nur in der Beschreibung steht, ist bewusst ein Gegenbeispiel (kein Treffer).
 * - Grenzfälle Pagination. Schema-Semantik (route-schemas.paginationQuerySchema):
 *     * page:     { integer, minimum: 1 }            → page <= 0 verletzt minimum → 400
 *     * pageSize: { integer, minimum: 1, max: 100 }  → pageSize > 100 / <= 0 verletzt Grenzen → 400
 *   KEIN Clamping im Service; die Route reicht page/pageSize (Default 25) durch, Ajv validiert hart.
 * - Projekt-Isolierung: buildProjectWhere erzwingt eq(projectId); Items eines anderen Projekts
 *   erscheinen NIE in der Liste (eigener Gegenbeispiel-Test mit zwei Projekten, Array + paginiert).
 * - Auth (enableAuth): GET ohne Session → 401; Admin liest → 200; Reader liest → 200;
 *   Reader POST /api/projects/:id/backlog → 403.
 *
 * Fehlerfälle / Gegenbeispiele (PFLICHT):
 * - Jeder Filter-/Suchtest enthält mindestens ein angelegtes, aber NICHT erwartetes Item, das
 *   per id explizit ausgeschlossen wird — kein Test nur mit Treffern.
 * - Ungültige Pagination-Parameter (pageSize>100, page<=0, pageSize<=0) als Negativvertrag (400).
 *
 * Ziel:
 * Sichert die tiefen Vertragszusagen der projektgebundenen Backlog-Listen-API (Filter in beiden
 * Pfaden, Titelsuche, Pagination-Grenzen, Projekt-Isolierung, Rollen-Autorisierung) test-getrieben
 * nach dem opt-in-Pagination-Umbau ab.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createBacklogItem, createFeature, createProject, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

interface BacklogListItem {
  id: number;
  projectId: number;
  featureId: number | null;
  title: string;
  status: string;
}

interface PaginatedBacklog {
  data: BacklogListItem[];
  total: number;
  page: number;
  pageSize: number;
}

describe("Backlog-Listen-API: Filter, Suche, Pagination-Grenzen, Isolierung", () => {
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

  // ACHTUNG — anders als projects/tickets: Backlog filtert BEIDE Pfade. Der Array-Pfad (ohne `page`)
  // reicht die Filter an listBacklogItems durch (routes/backlog.ts Z.55-58). Alt-Pfad und paginierter
  // Pfad teilen sich dieselbe WHERE-Klausel. Deshalb wird status hier über BEIDE Pfade geprüft.
  describe("Filter status (Gleichheit) — Array-Pfad UND paginiert", () => {
    it("Array-Pfad: GET .../backlog?status=open → nur offene (andere per id ausgeschlossen)", async () => {
      const project = await createProject(app, { name: "Backlog Status Array" });
      const openA = await createBacklogItem(app, project.id, { title: "Offen A", status: "open" });
      const openB = await createBacklogItem(app, project.id, { title: "Offen B", status: "open" });
      // Gegenbeispiele: andere Status
      const inProgress = await createBacklogItem(app, project.id, { title: "In Arbeit", status: "in_progress" });
      const rejected = await createBacklogItem(app, project.id, { title: "Verworfen", status: "rejected" });

      const res = await supertest(app.server).get(`/api/projects/${project.id}/backlog?status=open`).expect(200);
      const body = res.body as BacklogListItem[];
      const ids = body.map((b) => b.id);

      // Treffer
      expect(ids).toContain(openA.id);
      expect(ids).toContain(openB.id);
      // Gegenbeispiele explizit raus — belegt, dass der Array-Pfad die Filter TATSÄCHLICH anwendet
      expect(ids).not.toContain(inProgress.id);
      expect(ids).not.toContain(rejected.id);
      expect(body).toHaveLength(2);
      for (const item of body) {
        expect(item.status).toBe("open");
      }
    });

    it("Paginiert: GET .../backlog?status=open&page=1&pageSize=50 → nur offene, total == Anzahl offener", async () => {
      const project = await createProject(app, { name: "Backlog Status Paginiert" });
      const openA = await createBacklogItem(app, project.id, { title: "Offen A", status: "open" });
      const openB = await createBacklogItem(app, project.id, { title: "Offen B", status: "open" });
      const openC = await createBacklogItem(app, project.id, { title: "Offen C", status: "open" });
      // Gegenbeispiele: andere Status zählen NICHT in total
      const inProgress = await createBacklogItem(app, project.id, { title: "In Arbeit", status: "in_progress" });
      const rejected = await createBacklogItem(app, project.id, { title: "Verworfen", status: "rejected" });

      const res = await supertest(app.server).get(`/api/projects/${project.id}/backlog?status=open&page=1&pageSize=50`).expect(200);
      const body = res.body as PaginatedBacklog;
      const ids = body.data.map((b) => b.id);

      expect(ids).toContain(openA.id);
      expect(ids).toContain(openB.id);
      expect(ids).toContain(openC.id);
      expect(ids).not.toContain(inProgress.id);
      expect(ids).not.toContain(rejected.id);
      // total ist die gefilterte Gesamtzahl (3 offen), NICHT die Gesamtzahl (5)
      expect(body.total).toBe(3);
      for (const item of body.data) {
        expect(item.status).toBe("open");
      }
    });
  });

  describe("Filter featureId (Gleichheit)", () => {
    it("GET .../backlog?featureId=X → nur zugeordnete Items (ohne/andere featureId per id ausgeschlossen)", async () => {
      const project = await createProject(app, { name: "Backlog Feature Filter" });
      const feature = await createFeature(app, { title: "Zielfeature" });
      const otherFeature = await createFeature(app, { title: "Anderes Feature" });

      const assignedA = await createBacklogItem(app, project.id, { title: "Zugeordnet A", featureId: feature.id });
      const assignedB = await createBacklogItem(app, project.id, { title: "Zugeordnet B", featureId: feature.id });
      // Gegenbeispiele: kein Feature bzw. anderes Feature
      const withoutFeature = await createBacklogItem(app, project.id, { title: "Ohne Feature" });
      const otherAssigned = await createBacklogItem(app, project.id, { title: "Anderes Feature", featureId: otherFeature.id });

      const res = await supertest(app.server).get(`/api/projects/${project.id}/backlog?featureId=${feature.id}`).expect(200);
      const body = res.body as BacklogListItem[];
      const ids = body.map((b) => b.id);

      expect(ids).toContain(assignedA.id);
      expect(ids).toContain(assignedB.id);
      expect(ids).not.toContain(withoutFeature.id);
      expect(ids).not.toContain(otherAssigned.id);
      expect(body).toHaveLength(2);
      for (const item of body) {
        expect(item.featureId).toBe(feature.id);
      }
    });
  });

  // Backlog sucht mit LIKE %q% NUR über den Titel (repository: like(backlogItems.title, ...)),
  // NICHT über die Beschreibung — bewusst anders als projects. Das Beschreibung-Item ist deshalb
  // ein Gegenbeispiel, kein Treffer.
  describe("Suche q (nur Titel)", () => {
    it("GET .../backlog?q=... trifft nur über den Titel; Nicht-Treffer inkl. Nur-Beschreibung raus", async () => {
      const project = await createProject(app, { name: "Backlog Suche" });
      const byTitle = await createBacklogItem(app, project.id, { title: "Zephyr Backlog", description: "irrelevant" });
      // Gegenbeispiel 1: Begriff nur in der Beschreibung → KEIN Treffer (q filtert nur den Titel)
      const onlyInDescription = await createBacklogItem(app, project.id, { title: "Anderer Titel", description: "Enthält Zephyr im Text" });
      // Gegenbeispiel 2: weder Titel noch Beschreibung passen
      const miss = await createBacklogItem(app, project.id, { title: "Komplett anderes", description: "nichts passendes" });

      const res = await supertest(app.server).get(`/api/projects/${project.id}/backlog?q=Zephyr`).expect(200);
      const body = res.body as BacklogListItem[];
      const ids = body.map((b) => b.id);

      expect(ids).toContain(byTitle.id);
      // Nur-Beschreibung-Treffer ist bewusst ausgeschlossen (Titelsuche)
      expect(ids).not.toContain(onlyInDescription.id);
      expect(ids).not.toContain(miss.id);
      expect(body).toHaveLength(1);
      for (const item of body) {
        expect(item.title).toContain("Zephyr");
      }
    });

    it("Paginiert: GET .../backlog?q=...&page=1 → total zählt nur Titel-Treffer (Gegenbeispiele raus)", async () => {
      const project = await createProject(app, { name: "Backlog Suche Paginiert" });
      const hitA = await createBacklogItem(app, project.id, { title: "Suchbegriff-Alpha" });
      const hitB = await createBacklogItem(app, project.id, { title: "Suchbegriff-Beta" });
      // Gegenbeispiel: Begriff nur in der Beschreibung
      const onlyDescription = await createBacklogItem(app, project.id, { title: "Ohne Begriff", description: "Suchbegriff steckt nur hier" });

      const res = await supertest(app.server).get(`/api/projects/${project.id}/backlog?q=Suchbegriff&page=1&pageSize=25`).expect(200);
      const body = res.body as PaginatedBacklog;
      const ids = body.data.map((b) => b.id);

      expect(body.total).toBe(2);
      expect(body.data).toHaveLength(2);
      expect(ids).toContain(hitA.id);
      expect(ids).toContain(hitB.id);
      expect(ids).not.toContain(onlyDescription.id);
    });
  });

  describe("Grenzfälle Pagination", () => {
    it("0 Einträge → { data: [], total: 0 }", async () => {
      const project = await createProject(app, { name: "Backlog Leer" });

      const res = await supertest(app.server).get(`/api/projects/${project.id}/backlog?page=1&pageSize=10`).expect(200);
      const body = res.body as PaginatedBacklog;

      expect(body.data).toEqual([]);
      expect(body.total).toBe(0);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(10);
    });

    it("genau 1 Eintrag → eine Seite mit einem Element, total 1", async () => {
      const project = await createProject(app, { name: "Backlog Eins" });
      const only = await createBacklogItem(app, project.id, { title: "Einziges" });

      const res = await supertest(app.server).get(`/api/projects/${project.id}/backlog?page=1&pageSize=10`).expect(200);
      const body = res.body as PaginatedBacklog;

      expect(body.total).toBe(1);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(only.id);
    });

    it("mehr Einträge als pageSize → mehrere Seiten, letzte teilgefüllt, keine Überlappung", async () => {
      const project = await createProject(app, { name: "Backlog Mehrseitig" });
      const created: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        // sortOrder aufsteigend, damit die Reihenfolge (sortOrder, createdAt) deterministisch ist
        const item = await createBacklogItem(app, project.id, { title: `Seite-${i}` });
        created.push(item.id);
      }

      const page1 = (await supertest(app.server).get(`/api/projects/${project.id}/backlog?page=1&pageSize=2`).expect(200)).body as PaginatedBacklog;
      const page2 = (await supertest(app.server).get(`/api/projects/${project.id}/backlog?page=2&pageSize=2`).expect(200)).body as PaginatedBacklog;
      const page3 = (await supertest(app.server).get(`/api/projects/${project.id}/backlog?page=3&pageSize=2`).expect(200)).body as PaginatedBacklog;

      // total bleibt über alle Seiten konstant die Gesamtzahl
      expect(page1.total).toBe(5);
      expect(page2.total).toBe(5);
      expect(page3.total).toBe(5);

      // Volle Seiten, letzte Seite teilgefüllt (5 = 2 + 2 + 1)
      expect(page1.data).toHaveLength(2);
      expect(page2.data).toHaveLength(2);
      expect(page3.data).toHaveLength(1);

      // Keine Überlappung; genau die 5 angelegten IDs über alle Seiten
      const collected = [...page1.data, ...page2.data, ...page3.data].map((b) => b.id);
      expect(new Set(collected).size).toBe(5);
      expect(collected.sort((a, b) => a - b)).toEqual([...created].sort((a, b) => a - b));
    });

    it("Seite hinter dem Ende → data: [], total unverändert", async () => {
      const project = await createProject(app, { name: "Backlog Hinter Ende" });
      for (let i = 0; i < 3; i += 1) {
        await createBacklogItem(app, project.id, { title: `Vorhanden-${i}` });
      }

      // Bei pageSize 2 gibt es Seiten 1..2; Seite 5 liegt weit hinter dem Ende
      const res = await supertest(app.server).get(`/api/projects/${project.id}/backlog?page=5&pageSize=2`).expect(200);
      const body = res.body as PaginatedBacklog;

      expect(body.data).toEqual([]);
      expect(body.total).toBe(3);
      expect(body.page).toBe(5);
    });

    it("pageSize wird bei Weglassen auf Default 25 gesetzt", async () => {
      const project = await createProject(app, { name: "Backlog Default PageSize" });
      await createBacklogItem(app, project.id, { title: "Default" });

      const res = await supertest(app.server).get(`/api/projects/${project.id}/backlog?page=1`).expect(200);
      const body = res.body as PaginatedBacklog;

      // Route reicht den Ajv-Default (25) durch — bestätigt per Lauf
      expect(body.pageSize).toBe(25);
      expect(body.total).toBe(1);
    });

    it("pageSize > 100 verletzt das Schema-Maximum → 400 (kein Clamping)", async () => {
      const project = await createProject(app, { name: "Backlog pageSize>100" });
      await createBacklogItem(app, project.id, { title: "Egal" });

      // paginationQuerySchema: pageSize { maximum: 100 } → Ajv lehnt 101 ab
      await supertest(app.server).get(`/api/projects/${project.id}/backlog?page=1&pageSize=101`).expect(400);
    });

    it("page <= 0 verletzt das Schema-Minimum → 400 (kein Defaulting)", async () => {
      const project = await createProject(app, { name: "Backlog page<=0" });
      await createBacklogItem(app, project.id, { title: "Egal" });

      // paginationQuerySchema: page { minimum: 1 } → Ajv lehnt 0 ab
      await supertest(app.server).get(`/api/projects/${project.id}/backlog?page=0&pageSize=10`).expect(400);
    });

    it("pageSize <= 0 verletzt das Schema-Minimum → 400 (kein Clamping)", async () => {
      const project = await createProject(app, { name: "Backlog pageSize<=0" });
      await createBacklogItem(app, project.id, { title: "Egal" });

      // paginationQuerySchema: pageSize { minimum: 1 } → Ajv lehnt 0 ab
      await supertest(app.server).get(`/api/projects/${project.id}/backlog?page=1&pageSize=0`).expect(400);
    });
  });

  // Backlog ist projektgebunden: buildProjectWhere erzwingt eq(projectId). Items eines anderen
  // Projekts dürfen NIE erscheinen — in BEIDEN Pfaden.
  describe("Projekt-Isolierung (zwei Projekte)", () => {
    it("Array + paginiert: Liste von Projekt A enthält keine Items von Projekt B", async () => {
      const projectA = await createProject(app, { name: "Projekt A" });
      const projectB = await createProject(app, { name: "Projekt B" });

      const inA1 = await createBacklogItem(app, projectA.id, { title: "A-Item 1" });
      const inA2 = await createBacklogItem(app, projectA.id, { title: "A-Item 2" });
      // Gegenbeispiele: gehören zu Projekt B
      const inB1 = await createBacklogItem(app, projectB.id, { title: "B-Item 1" });
      const inB2 = await createBacklogItem(app, projectB.id, { title: "B-Item 2" });

      // Array-Pfad
      const arrayRes = await supertest(app.server).get(`/api/projects/${projectA.id}/backlog`).expect(200);
      const arrayBody = arrayRes.body as BacklogListItem[];
      const arrayIds = arrayBody.map((b) => b.id);
      expect(arrayIds).toContain(inA1.id);
      expect(arrayIds).toContain(inA2.id);
      expect(arrayIds).not.toContain(inB1.id);
      expect(arrayIds).not.toContain(inB2.id);
      expect(arrayBody).toHaveLength(2);
      for (const item of arrayBody) {
        expect(item.projectId).toBe(projectA.id);
      }

      // Paginierter Pfad: total zählt nur Projekt-A-Items
      const pagedRes = await supertest(app.server).get(`/api/projects/${projectA.id}/backlog?page=1&pageSize=50`).expect(200);
      const pagedBody = pagedRes.body as PaginatedBacklog;
      const pagedIds = pagedBody.data.map((b) => b.id);
      expect(pagedBody.total).toBe(2);
      expect(pagedIds).toContain(inA1.id);
      expect(pagedIds).toContain(inA2.id);
      expect(pagedIds).not.toContain(inB1.id);
      expect(pagedIds).not.toContain(inB2.id);
    });
  });
});

describe("Backlog-Listen-API: Auth-/Rollenvertrag", () => {
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

  it("GET /api/projects/:id/backlog ohne Session → 401", async () => {
    // Ohne Login greift der globale Auth-Guard vor der Projektauflösung — 401 unabhängig von der id.
    await supertest(authApp.server).get("/api/projects/1/backlog").expect(401);
  });

  it("Admin liest → 200; Reader liest → 200; Reader POST /api/projects/:id/backlog → 403", async () => {
    const admin = supertest.agent(authApp.server);
    await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);

    // Admin legt ein Projekt an (Schreiben erlaubt) und liest dessen Backlog
    const created = await admin.post("/api/projects").send({ name: "Auth Backlog Projekt", status: "active" }).expect(201);
    const projectId = (created.body as { id: number }).id;
    await admin.get(`/api/projects/${projectId}/backlog`).expect(200);

    // Reader-Rolle ermitteln und Reader-User anlegen
    const roles = (await admin.get("/api/admin/roles").expect(200)).body as Array<{ key: string; id: number }>;
    const readerRole = roles.find((r) => r.key === "reader")!;
    await admin
      .post("/api/admin/users")
      .send({
        firstName: "Reader",
        lastName: "Backlog",
        email: "reader-backlog-list@example.test",
        roleId: readerRole.id,
        password: "password123",
        isActive: true
      })
      .expect(201);

    const reader = supertest.agent(authApp.server);
    await reader.post("/api/auth/login").send({ email: "reader-backlog-list@example.test", password: "password123" }).expect(200);

    // Reader: Lesen erlaubt (200), Schreiben verboten (403)
    await reader.get(`/api/projects/${projectId}/backlog`).expect(200);
    await reader.post(`/api/projects/${projectId}/backlog`).send({ title: "Nicht erlaubt" }).expect(403);
  });
});
