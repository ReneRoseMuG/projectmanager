/**
 * Test Scope: Features-Listen-API — TIEFE Vertragsaspekte (GET /api/features)
 *
 * Test-Ebene:
 * - Integration (API). Echte Fastify-App, echte HTTP-Aufrufe über supertest.
 *
 * Realitätsgrad:
 * - Volle Vertikale: Route (featureListQuerySchema, Opt-in-Pagination) → Service
 *   (listFeatures / listFeaturesPaginated) → Repository (buildListWhere: status-Gleichheit,
 *   q-LIKE über den TITEL; findPage LIMIT/OFFSET; countFiltered) → echte migrierte
 *   MySQL-Test-DB. Antworten über supertest. Keine Schicht wird umgangen.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Der Wert liegt gerade im echten Zusammenspiel von JSON-Schema-Validierung
 *   (Ajv-Coercion/Constraints), SQL-Filter und Pagination-Arithmetik.
 *
 * Isolation:
 * - Temp-Test-DB (createTestDb) je Datei, truncateAll(pool) vor jedem Test. Der Auth-Block
 *   fährt eine ZWEITE App-Instanz mit enableAuth:true auf einer eigenen Test-DB hoch und
 *   setzt authBypassAdmin/apiKey pro Test hart zurück (Muster aus tickets.test.ts), damit die
 *   Guard-Negativfälle (401/403) echt greifen.
 *
 * Abgedeckte Regeln (ergänzend zu list-pagination-contracts.test.ts, NICHT dupliziert):
 * - Filter `status`/`q` wirken NUR im paginierten Pfad. Die Route reicht sie ausschließlich an
 *   listFeaturesPaginated weiter; listFeatures(app.db) im Array-Pfad bekommt keine Argumente
 *   (per Lauf verifiziert, spiegelt den Web-Client wider: getFeatures() ohne, getFeaturesPage()
 *   mit Filter).
 * - Filter `status` (paginiert): exakte Gleichheit auf features.status; passende rein, andere
 *   raus (Nachweis per id). `total` == Anzahl NACH Filter (nicht der Gesamtmenge).
 * - Suche `q` (paginiert): LIKE %q% AUSSCHLIESSLICH über features.title (NICHT über die
 *   Beschreibung — bewusst anders als projects/tasks). Titel-Treffer rein, Titel-Nicht-Treffer
 *   raus; ein Feature, dessen Suchbegriff nur in der Beschreibung steht, ist ein Gegenbeispiel.
 * - Array-Pfad-Vertrag: `status`/`q` werden dort IGNORIERT (Gegenbeispiel bleibt in der Liste).
 * - Pagination-Grenzfälle (per echtem Lauf verifiziert, nicht geraten): 0 Einträge, genau 1,
 *   mehr als pageSize, teilgefüllte letzte Seite, Seite HINTER dem Ende (data:[], total stabil).
 * - Schema-Grenzen (route-schemas.paginationQuerySchema): page { minimum: 1 },
 *   pageSize { minimum: 1, maximum: 100 }, pageSize-Default 25. pageSize>100, page<=0 und
 *   pageSize<=0 verletzen die Constraints → Fastify/Ajv antwortet 400 (KEIN Clamping).
 * - Auth (enableAuth): GET /api/features ohne Session → 401; Admin → 200; Reader → 200 (Lesen
 *   erlaubt); Reader-Schreibzugriff POST /api/features → 403.
 *
 * Fehlerfälle / Gegenbeispiele (PFLICHT):
 * - Jeder Filter-/Suchtest legt mindestens ein NICHT passendes Feature an und prüft dessen
 *   Abwesenheit per id — kein Test nur mit Treffern.
 * - Ungültige Pagination-Parameter (page<=0, pageSize<=0, pageSize>100) als Negativvertrag.
 *
 * Ziel:
 * - Sichert die TIEFEN Aspekte des features-Listen-Vertrags (Filter/Suche/Pagination-Ränder/Auth)
 *   test-getrieben nach dem opt-in-Pagination-Umbau ab, ergänzend zum Array-vs-Paginated-
 *   Grundvertrag in list-pagination-contracts.test.ts (dort NICHT dupliziert).
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createFeature, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

interface FeatureListItem {
  id: number;
  title: string;
  status: string;
  description: string | null;
}

interface PaginatedFeatures {
  data: FeatureListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const idsOf = (entries: FeatureListItem[]): number[] => entries.map((entry) => entry.id);

describe("Features-Listen-API: Filter, Suche, Pagination-Grenzen", () => {
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

  // Verhaltens-Weiche (verifiziert an routes/features.ts + web/api/features.ts): Die Filter
  // `status`/`q` wirken NUR im paginierten Pfad. Ist `page` gesetzt, ruft die Route
  // listFeaturesPaginated(db, { status, q }, ...); ohne `page` ruft sie listFeatures(app.db)
  // OHNE Filter (Array-Alt-Vertrag, für MCP/interne Aufrufer). Deshalb wird der status/q-Vertrag
  // hier über den paginierten Pfad geprüft (id-genaue Gegenbeispiele), plus je ein Vertragstest,
  // der festschreibt, dass der Array-Pfad die Filter ignoriert. Gültige featureStatus-Keys
  // (Seed): draft, active, done, archived.
  describe("Filter status (Gleichheit, paginierter Pfad)", () => {
    it("GET /api/features?status=active&page=1&pageSize=100 → nur aktive (andere per id ausgeschlossen), total == Anzahl aktiver", async () => {
      const activeA = await createFeature(app, { title: "Aktiv A", status: "active" });
      const activeB = await createFeature(app, { title: "Aktiv B", status: "active" });
      const activeC = await createFeature(app, { title: "Aktiv C", status: "active" });
      // Gegenbeispiele: andere Status dürfen weder in data noch in total auftauchen.
      const draft = await createFeature(app, { title: "Entwurf", status: "draft" });
      const done = await createFeature(app, { title: "Erledigt", status: "done" });
      const archived = await createFeature(app, { title: "Archiviert", status: "archived" });

      const res = await supertest(app.server).get("/api/features?status=active&page=1&pageSize=100").expect(200);
      const body = res.body as PaginatedFeatures;
      const ids = idsOf(body.data);

      // Treffer: alle drei aktiven Features enthalten
      expect(ids).toContain(activeA.id);
      expect(ids).toContain(activeB.id);
      expect(ids).toContain(activeC.id);
      // Gegenbeispiele: nicht-aktive Features per id NICHT enthalten
      expect(ids).not.toContain(draft.id);
      expect(ids).not.toContain(done.id);
      expect(ids).not.toContain(archived.id);
      // total ist die gefilterte Gesamtzahl (3 aktive), NICHT die Gesamtzahl (6)
      expect(body.total).toBe(3);
      // Jede zurückgegebene Zeile trägt tatsächlich den Filterstatus
      for (const feature of body.data) {
        expect(feature.status).toBe("active");
      }
    });

    it("GET /api/features?status=done&page=1&pageSize=100 → total == Anzahl NACH Filter (Gegenbeispiele ausgeschlossen)", async () => {
      const doneA = await createFeature(app, { title: "Done 1", status: "done" });
      const doneB = await createFeature(app, { title: "Done 2", status: "done" });
      // Gegenbeispiele
      await createFeature(app, { title: "Noch Entwurf", status: "draft" });
      await createFeature(app, { title: "Noch aktiv", status: "active" });

      const res = await supertest(app.server).get("/api/features?status=done&page=1&pageSize=100").expect(200);
      const body = res.body as PaginatedFeatures;
      const ids = idsOf(body.data);

      expect(body.total).toBe(2);
      expect(body.data.length).toBe(2);
      expect(ids).toContain(doneA.id);
      expect(ids).toContain(doneB.id);
      expect(body.data.every((feature) => feature.status === "done")).toBe(true);
    });

    it("GET /api/features?status=archived&page=1&pageSize=100 ohne passende Features → leere Seite, total 0", async () => {
      await createFeature(app, { title: "Nur aktiv", status: "active" });
      await createFeature(app, { title: "Nur Entwurf", status: "draft" });

      const res = await supertest(app.server).get("/api/features?status=archived&page=1&pageSize=100").expect(200);
      const body = res.body as PaginatedFeatures;

      expect(body.total).toBe(0);
      expect(body.data).toEqual([]);
    });
  });

  // Vertragstest: Der Array-Pfad (ohne page) ruft listFeatures(app.db) OHNE Filter — status wird
  // dort IGNORIERT, das Gegenbeispiel bleibt in der Liste (Alt-Vertrag festgeschrieben).
  describe("Array-Pfad ignoriert Filter (Vertragstest)", () => {
    it("GET /api/features?status=active (ohne page) → status wird ignoriert, Nicht-Treffer bleibt enthalten", async () => {
      const active = await createFeature(app, { title: "Aktiv sichtbar", status: "active" });
      const draft = await createFeature(app, { title: "Entwurf trotzdem sichtbar", status: "draft" });

      const res = await supertest(app.server).get("/api/features?status=active").expect(200);
      // Array-Pfad: nacktes Array (kein { data, total, ... }).
      expect(Array.isArray(res.body)).toBe(true);
      const ids = idsOf(res.body as FeatureListItem[]);

      // Alt-Vertrag: der Array-Pfad filtert NICHT — das Gegenbeispiel bleibt enthalten.
      expect(ids).toContain(active.id);
      expect(ids).toContain(draft.id);
    });

    it("GET /api/features?q=... (ohne page) → q wird ignoriert, Nicht-Treffer bleibt enthalten", async () => {
      const hit = await createFeature(app, { title: "Zephyr Feature", status: "active" });
      const miss = await createFeature(app, { title: "Voellig anderes", status: "active" });

      const res = await supertest(app.server).get("/api/features?q=Zephyr").expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      const ids = idsOf(res.body as FeatureListItem[]);

      // Alt-Vertrag: der Array-Pfad sucht NICHT — der Nicht-Treffer bleibt enthalten.
      expect(ids).toContain(hit.id);
      expect(ids).toContain(miss.id);
    });
  });

  // q filtert AUSSCHLIESSLICH über features.title (Repository: like(features.title, %q%)).
  // Bewusst anders als projects/tasks (dort Titel + Beschreibung). Deshalb ist ein Feature,
  // dessen Suchbegriff nur in der Beschreibung steht, hier ein Gegenbeispiel — kein Treffer.
  describe("Suche q (nur Titel, paginierter Pfad)", () => {
    it("GET /api/features?q=Zephyr&page=1&pageSize=100 trifft Titel-Treffer, Nicht-Treffer per id ausgeschlossen", async () => {
      // Treffer über den Titel
      const byTitle = await createFeature(app, { title: "Zephyr Portal", status: "active", description: "irrelevant" });
      // Gegenbeispiel: Begriff nur in der Beschreibung, NICHT im Titel → darf NICHT matchen
      const onlyDescription = await createFeature(app, { title: "Anderer Titel", status: "active", description: "Enthaelt Zephyr im Text" });
      // Gegenbeispiel: weder Titel noch Beschreibung enthalten den Begriff
      const miss = await createFeature(app, { title: "Komplett anderes", status: "active", description: "nichts passendes" });

      const res = await supertest(app.server).get("/api/features?q=Zephyr&page=1&pageSize=100").expect(200);
      const body = res.body as PaginatedFeatures;
      const ids = idsOf(body.data);

      expect(ids).toContain(byTitle.id);
      // Beschreibungs-Treffer ist KEIN Treffer (q wirkt nur auf den Titel)
      expect(ids).not.toContain(onlyDescription.id);
      expect(ids).not.toContain(miss.id);
      // Genau der eine Titel-Treffer zählt in total
      expect(body.total).toBe(1);
      for (const feature of body.data) {
        expect(feature.title).toContain("Zephyr");
      }
    });

    it("GET /api/features?q=Suchbegriff&page=1&pageSize=100 → total zählt nur Titel-Treffer (Gegenbeispiel ausgeschlossen)", async () => {
      const hitA = await createFeature(app, { title: "Suchbegriff-Alpha", status: "active" });
      const hitB = await createFeature(app, { title: "Suchbegriff-Beta", status: "draft" });
      // Gegenbeispiel: kein Titel-Treffer
      const miss = await createFeature(app, { title: "Nichts davon", status: "active" });

      const res = await supertest(app.server).get("/api/features?q=Suchbegriff&page=1&pageSize=100").expect(200);
      const body = res.body as PaginatedFeatures;
      const ids = idsOf(body.data);

      expect(body.total).toBe(2);
      expect(body.data.length).toBe(2);
      expect(ids).toContain(hitA.id);
      expect(ids).toContain(hitB.id);
      expect(ids).not.toContain(miss.id);
      for (const feature of body.data) {
        expect(feature.title).toContain("Suchbegriff");
      }
    });

    it("GET /api/features?q=GarantiertNichtVorhandenXYZ&page=1&pageSize=100 → leere Seite, total 0", async () => {
      await createFeature(app, { title: "Irgendetwas", status: "active" });

      const res = await supertest(app.server).get("/api/features?q=GarantiertNichtVorhandenXYZ&page=1&pageSize=100").expect(200);
      const body = res.body as PaginatedFeatures;

      expect(body.total).toBe(0);
      expect(body.data).toEqual([]);
    });
  });

  describe("Grenzfälle Pagination", () => {
    it("0 Einträge → { data: [], total: 0 }", async () => {
      const res = await supertest(app.server).get("/api/features?page=1&pageSize=10").expect(200);
      const body = res.body as PaginatedFeatures;

      expect(body.data).toEqual([]);
      expect(body.total).toBe(0);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(10);
    });

    it("genau 1 Eintrag → eine Seite mit einem Element, total 1", async () => {
      const only = await createFeature(app, { title: "Einziges", status: "active" });

      const res = await supertest(app.server).get("/api/features?page=1&pageSize=10").expect(200);
      const body = res.body as PaginatedFeatures;

      expect(body.total).toBe(1);
      expect(body.data.length).toBe(1);
      expect(body.data[0].id).toBe(only.id);
    });

    it("mehr Einträge als pageSize → mehrere Seiten, Summe stimmt, keine Überlappung", async () => {
      // Deterministische Reihenfolge über sortOrder (ORDER BY sortOrder, title) für lückenlose
      // Seiten-Aufteilung ohne Zufallstitel-Kollisionen.
      const created: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const feature = await createFeature(app, { title: `Seite-${i}`, status: "active" });
        created.push(feature.id);
      }

      const page1 = (await supertest(app.server).get("/api/features?page=1&pageSize=2").expect(200)).body as PaginatedFeatures;
      const page2 = (await supertest(app.server).get("/api/features?page=2&pageSize=2").expect(200)).body as PaginatedFeatures;
      const page3 = (await supertest(app.server).get("/api/features?page=3&pageSize=2").expect(200)).body as PaginatedFeatures;

      // total bleibt über alle Seiten konstant die Gesamtzahl
      expect(page1.total).toBe(5);
      expect(page2.total).toBe(5);
      expect(page3.total).toBe(5);

      // Volle Seiten, letzte Seite teilgefüllt (5 = 2 + 2 + 1)
      expect(page1.data.length).toBe(2);
      expect(page2.data.length).toBe(2);
      expect(page3.data.length).toBe(1);

      // Keine Überlappung; genau die 5 angelegten IDs über alle Seiten
      const collected = [...page1.data, ...page2.data, ...page3.data].map((feature) => feature.id);
      expect(new Set(collected).size).toBe(5);
      expect(collected.sort((a, b) => a - b)).toEqual([...created].sort((a, b) => a - b));
    });

    it("teilgefüllte letzte Seite → Rest kleiner als pageSize, total unverändert", async () => {
      for (let i = 0; i < 5; i += 1) {
        await createFeature(app, { title: `Rest-${i}`, status: "active" });
      }

      // 5 Einträge, pageSize 2 → Seite 3 enthält genau 1 Eintrag.
      const res = await supertest(app.server).get("/api/features?page=3&pageSize=2").expect(200);
      const body = res.body as PaginatedFeatures;

      expect(body.total).toBe(5);
      expect(body.data.length).toBe(1);
      expect(body.page).toBe(3);
    });

    it("Seite hinter dem Ende → data: [], total unverändert", async () => {
      for (let i = 0; i < 3; i += 1) {
        await createFeature(app, { title: `Vorhanden-${i}`, status: "active" });
      }

      // Bei pageSize 2 gibt es Seiten 1..2; Seite 5 liegt weit hinter dem Ende.
      const res = await supertest(app.server).get("/api/features?page=5&pageSize=2").expect(200);
      const body = res.body as PaginatedFeatures;

      expect(body.data).toEqual([]);
      expect(body.total).toBe(3);
      expect(body.page).toBe(5);
    });

    it("pageSize wird bei Weglassen auf Default 25 gesetzt", async () => {
      await createFeature(app, { title: "Default-PageSize", status: "active" });

      const res = await supertest(app.server).get("/api/features?page=1").expect(200);
      const body = res.body as PaginatedFeatures;

      // Route reicht den Default (25) durch — bestätigt per Lauf.
      expect(body.pageSize).toBe(25);
      expect(body.total).toBe(1);
    });

    it("pageSize > 100 verletzt das Schema-Maximum → 400 (kein Clamping)", async () => {
      await createFeature(app, { title: "Egal", status: "active" });

      // paginationQuerySchema: pageSize { maximum: 100 } → Ajv lehnt 101 ab.
      await supertest(app.server).get("/api/features?page=1&pageSize=101").expect(400);
    });

    it("page <= 0 verletzt das Schema-Minimum → 400 (kein Defaulting)", async () => {
      await createFeature(app, { title: "Egal", status: "active" });

      // paginationQuerySchema: page { minimum: 1 } → Ajv lehnt 0 ab.
      await supertest(app.server).get("/api/features?page=0&pageSize=10").expect(400);
    });

    it("pageSize <= 0 verletzt das Schema-Minimum → 400 (kein Clamping)", async () => {
      await createFeature(app, { title: "Egal", status: "active" });

      // paginationQuerySchema: pageSize { minimum: 1 } → Ajv lehnt 0 ab.
      await supertest(app.server).get("/api/features?page=1&pageSize=0").expect(400);
    });
  });
});

describe("Features-Listen-API: Auth-/Rollenvertrag", () => {
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
    // Bypass hart aus, damit die Guard-Negativfälle (401/403) echt greifen.
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

  it("GET /api/features ohne Session → 401", async () => {
    await supertest(authApp.server).get("/api/features").expect(401);
  });

  it("Admin darf lesen → 200; Reader darf lesen → 200; Reader POST /api/features → 403", async () => {
    const admin = supertest.agent(authApp.server);
    await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);

    // Admin: Lesen erlaubt.
    await admin.get("/api/features").expect(200);

    // Reader-Rolle ermitteln und Reader-User anlegen.
    const roles = (await admin.get("/api/admin/roles").expect(200)).body as Array<{ key: string; id: number }>;
    const readerRole = roles.find((r) => r.key === "reader")!;
    await admin
      .post("/api/admin/users")
      .send({
        firstName: "Reader",
        lastName: "Features",
        email: "reader-features-list@example.test",
        roleId: readerRole.id,
        password: "password123",
        isActive: true
      })
      .expect(201);

    const reader = supertest.agent(authApp.server);
    await reader.post("/api/auth/login").send({ email: "reader-features-list@example.test", password: "password123" }).expect(200);

    // Reader: Lesen erlaubt (200), Schreiben verboten (403). POST /api/features braucht title.
    await reader.get("/api/features").expect(200);
    await reader.post("/api/features").send({ title: "Nicht erlaubt", status: "draft" }).expect(403);
  });
});
