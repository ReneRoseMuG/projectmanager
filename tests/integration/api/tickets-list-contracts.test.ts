/**
 * Test Scope: Tickets-Listen-API — TIEFE Vertragsaspekte (GET /api/tickets)
 *
 * Test-Ebene:
 * - Integration (API). Echter HTTP-Weg über supertest gegen eine gebaute Fastify-App.
 *
 * Realitätsgrad:
 * - Echte Fastify-App (buildTestApp), echte MySQL-Test-DB (createTestDb), echte
 *   Service-/Repository-/SQL-Schicht (Filter, Suche, LIMIT/OFFSET, COUNT), echte
 *   JSON-Schema-Validierung der Route. Keine Umgehung von Produktivcode.
 *
 * Mock-Entscheidung:
 * - KEINE Mocks. Der Wert dieser Tests liegt gerade darin, dass Filter, Suche und
 *   Pagination bis in echtes SQL laufen — ein Mock würde die zu sichernde Grundmenge
 *   (WHERE/COUNT/ORDER/LIMIT) wegabstrahieren.
 *
 * Isolation:
 * - Eigene Temp-Test-DB pro Datei (createTestDb), truncateAll(pool) vor jedem Test.
 *   Der Auth-Block baut eine zweite App-Instanz (enableAuth: true) auf derselben DB.
 *
 * Abgedeckte Regeln (der Array/Paginated-Grundvertrag liegt bereits in
 * list-pagination-contracts.test.ts; hier die TIEFEN Aspekte):
 * - Filter `status`: nur Tickets mit passendem Status; Gegenbeispiele raus; `total` =
 *   gefilterte Gesamtzahl.
 * - Filter `type`: nur passender ticketType; andere Typen ausgeschlossen.
 * - Suche `q`: Titel-Teilstring (case-insensitive) — Treffer rein, Nicht-Treffer raus.
 * - Kombinierte Filter (status+type, type+q): UND-Verknüpfung; ein Gegenbeispiel, das
 *   NUR eine Bedingung erfüllt, muss RAUS.
 * - Grenzfälle Pagination: 0 / 1 / > pageSize / letzte Seite teilgefüllt / Seite hinter
 *   dem Ende (data:[], total unverändert). Schema-Grenzen (page<=0, pageSize<=0,
 *   pageSize>100) — tatsächliches Verhalten per Lauf verifiziert (Route validiert per
 *   JSON-Schema → 400, kein Clamp).
 *
 * WICHTIG — wo Filter/Suche greifen (per Lauf gegen den echten Code verifiziert):
 * - Filter (`status`/`type`) und Suche (`q`) sind ausschließlich am PAGINIERTEN Pfad
 *   zugesagt und werden dort serverseitig angewandt (routes/tickets.ts:
 *   `if (page !== undefined) return listTicketsPaginated(...filter...)`).
 *   Der nicht-paginierte Pfad ruft bewusst `listTickets(app.db)` OHNE Filter und liefert
 *   ALLE Root-Tickets — reiner Rückwärtskompatibilitäts-/Alt-Vertrag (MCP/interne
 *   Aufrufer). Der Web-Client filtert/sucht ausschließlich über `getTicketsPage`
 *   (Hook `useTicketsLibrary`), also immer mit `page`. Deshalb prüfen die Filter-/Such-
 *   Tests konsequent den paginierten Pfad — nur dort ist Filtern überhaupt Vertrag.
 *
 * Fehlerfälle / Gegenbeispiele:
 * - Zu jedem Positivfilter ein bewusstes Gegenbeispiel im Datenbestand, per id geprüft
 *   (nicht nur per Länge), damit „rein/raus" belastbar ist.
 * - Auth: GET ohne Session → 401; Admin/Reader → 200; Reader POST /api/tickets → 403.
 *
 * Ziel:
 * Sichert den Filter-/Such-/Pagination-Vertrag der Ticket-Listen-API test-getrieben ab,
 * damit der Skalierungs-Umbau (opt-in Seiten-Pagination) die semantischen Zusagen der
 * Liste (Grundmenge, total, Ausschluss von Nicht-Treffern) nicht verletzt.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createProject, createTicket, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

interface PaginatedBody {
  data: Array<{ id: number; title: string; type: string; status: string }>;
  total: number;
  page: number;
  pageSize: number;
}

const ownerOf = (projectId: number) => ({ type: "project" as const, id: projectId });

// Filter/Suche sind nur am paginierten Pfad zugesagt (siehe Scope-Kommentar). Dieser
// Helper ruft die gefilterte Liste paginiert mit einer Seitengröße ab, die die kleine
// Testmenge sicher abdeckt, und liefert die enthaltenen Ticket-IDs zum id-genauen
// „rein/raus"-Vergleich.
async function filteredTicketIds(app: FastifyInstance, query: string): Promise<number[]> {
  const separator = query.length > 0 ? "&" : "";
  const res = await supertest(app.server).get(`/api/tickets?page=1&pageSize=100${separator}${query}`).expect(200);
  const body = res.body as PaginatedBody;
  return body.data.map((ticket) => ticket.id);
}

describe("Tickets-Listen-API: Filter, Suche, Pagination (tiefe Verträge)", () => {
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

  describe("Filter status", () => {
    it("GET /api/tickets?status=open liefert nur offene Tickets (Gegenbeispiel raus)", async () => {
      const project = await createProject(app, { name: "Status-Projekt" });
      const open = await createTicket(app, ownerOf(project.id), { title: "Offen A", status: "open" });
      const inProgress = await createTicket(app, ownerOf(project.id), { title: "In Arbeit", status: "in_progress" });
      const done = await createTicket(app, ownerOf(project.id), { title: "Erledigt", status: "done" });

      const res = await supertest(app.server).get("/api/tickets?page=1&pageSize=100&status=open").expect(200);

      const body = res.body as PaginatedBody;
      const ids = body.data.map((ticket) => ticket.id);
      expect(ids).toContain(open.id);
      expect(ids).not.toContain(inProgress.id);
      expect(ids).not.toContain(done.id);
      expect(body.data.every((ticket) => ticket.status === "open")).toBe(true);
    });

    it("GET /api/tickets?status=open&page=1 liefert total = gefilterte Gesamtzahl", async () => {
      const project = await createProject(app, { name: "Status-Paginated" });
      await createTicket(app, ownerOf(project.id), { title: "Offen 1", status: "open" });
      await createTicket(app, ownerOf(project.id), { title: "Offen 2", status: "open" });
      await createTicket(app, ownerOf(project.id), { title: "Offen 3", status: "open" });
      await createTicket(app, ownerOf(project.id), { title: "Geschlossen", status: "closed" });

      const res = await supertest(app.server).get("/api/tickets?status=open&page=1&pageSize=2").expect(200);

      const body = res.body as PaginatedBody;
      // total ist die gefilterte Gesamtzahl VOR Pagination (3 offene, geschlossenes zählt nicht).
      expect(body.total).toBe(3);
      expect(body.data.length).toBe(2);
      expect(body.data.every((ticket) => ticket.status === "open")).toBe(true);
    });

    it("Alt-Vertrag: nicht-paginierter Pfad ignoriert `status` bewusst (alle Root-Tickets)", async () => {
      const project = await createProject(app, { name: "Alt-Vertrag-Projekt" });
      const open = await createTicket(app, ownerOf(project.id), { title: "Offen", status: "open" });
      const done = await createTicket(app, ownerOf(project.id), { title: "Erledigt", status: "done" });

      // Ohne `page` liefert die Route bewusst das ungefilterte nackte Array (Rückwärts-
      // kompatibilität für MCP/interne Aufrufer) — der status-Parameter greift hier NICHT.
      const res = await supertest(app.server).get("/api/tickets?status=open").expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const ids = (res.body as Array<{ id: number }>).map((ticket) => ticket.id);
      expect(ids).toContain(open.id);
      expect(ids).toContain(done.id);
    });
  });

  describe("Filter type", () => {
    it("GET /api/tickets?type=bug liefert nur Bugs (andere Typen ausgeschlossen)", async () => {
      const project = await createProject(app, { name: "Typ-Projekt" });
      const bug = await createTicket(app, ownerOf(project.id), { title: "Fehlerbericht", type: "bug" });
      const improvement = await createTicket(app, ownerOf(project.id), { title: "Verbesserung", type: "improvement" });
      const question = await createTicket(app, ownerOf(project.id), { title: "Frage", type: "question" });

      const res = await supertest(app.server).get("/api/tickets?page=1&pageSize=100&type=bug").expect(200);

      const body = res.body as PaginatedBody;
      const ids = body.data.map((ticket) => ticket.id);
      expect(ids).toContain(bug.id);
      expect(ids).not.toContain(improvement.id);
      expect(ids).not.toContain(question.id);
      expect(body.data.every((ticket) => ticket.type === "bug")).toBe(true);
    });
  });

  describe("Suche q", () => {
    it("GET /api/tickets?q=… trifft Titel-Teilstring (Treffer rein, Nicht-Treffer raus)", async () => {
      const project = await createProject(app, { name: "Such-Projekt" });
      const hit = await createTicket(app, ownerOf(project.id), { title: "Login schlägt fehl" });
      const miss = await createTicket(app, ownerOf(project.id), { title: "Export als PDF" });

      const ids = await filteredTicketIds(app, `q=${encodeURIComponent("Login")}`);
      expect(ids).toContain(hit.id);
      expect(ids).not.toContain(miss.id);
    });

    it("GET /api/tickets?q=… ist case-insensitive", async () => {
      const project = await createProject(app, { name: "Such-Case-Projekt" });
      const hit = await createTicket(app, ownerOf(project.id), { title: "Datenbank-Timeout" });
      const miss = await createTicket(app, ownerOf(project.id), { title: "Andere Sache" });

      const ids = await filteredTicketIds(app, `q=${encodeURIComponent("datenbank")}`);
      expect(ids).toContain(hit.id);
      expect(ids).not.toContain(miss.id);
    });
  });

  describe("Kombinierte Filter (UND-Verknüpfung)", () => {
    it("GET /api/tickets?status=open&type=bug: nur wer BEIDES erfüllt bleibt (Ein-Bedingungs-Gegenbeispiele raus)", async () => {
      const project = await createProject(app, { name: "Kombi-Projekt" });
      const bothMatch = await createTicket(app, ownerOf(project.id), { title: "Offener Bug", status: "open", type: "bug" });
      const onlyStatus = await createTicket(app, ownerOf(project.id), { title: "Offene Verbesserung", status: "open", type: "improvement" });
      const onlyType = await createTicket(app, ownerOf(project.id), { title: "Erledigter Bug", status: "done", type: "bug" });
      const neither = await createTicket(app, ownerOf(project.id), { title: "Erledigte Frage", status: "done", type: "question" });

      const ids = await filteredTicketIds(app, "status=open&type=bug");
      expect(ids).toContain(bothMatch.id);
      expect(ids).not.toContain(onlyStatus.id);
      expect(ids).not.toContain(onlyType.id);
      expect(ids).not.toContain(neither.id);
    });

    it("GET /api/tickets?type=bug&q=…: Typ UND Titel-Teilstring müssen gemeinsam passen", async () => {
      const project = await createProject(app, { name: "Kombi-Such-Projekt" });
      const bothMatch = await createTicket(app, ownerOf(project.id), { title: "Absturz beim Speichern", type: "bug" });
      const onlyType = await createTicket(app, ownerOf(project.id), { title: "Ladezeit zu hoch", type: "bug" });
      const onlyQuery = await createTicket(app, ownerOf(project.id), { title: "Absturz-Report als Idee", type: "improvement" });

      const ids = await filteredTicketIds(app, `type=bug&q=${encodeURIComponent("Absturz")}`);
      expect(ids).toContain(bothMatch.id);
      expect(ids).not.toContain(onlyType.id);
      expect(ids).not.toContain(onlyQuery.id);
    });
  });

  describe("Grenzfälle Pagination", () => {
    async function seedTickets(count: number, titlePrefix = "T"): Promise<number> {
      const project = await createProject(app, { name: `Pag-${titlePrefix}-${count}` });
      for (let i = 0; i < count; i += 1) {
        await createTicket(app, ownerOf(project.id), { title: `${titlePrefix}${i}` });
      }
      return project.id;
    }

    it("0 Einträge: data leer, total 0", async () => {
      const res = await supertest(app.server).get("/api/tickets?page=1&pageSize=10").expect(200);
      const body = res.body as PaginatedBody;
      expect(body.data).toEqual([]);
      expect(body.total).toBe(0);
      expect(body).toMatchObject({ page: 1, pageSize: 10 });
    });

    it("1 Eintrag: eine Seite mit genau einem Element", async () => {
      await seedTickets(1);
      const res = await supertest(app.server).get("/api/tickets?page=1&pageSize=10").expect(200);
      const body = res.body as PaginatedBody;
      expect(body.total).toBe(1);
      expect(body.data.length).toBe(1);
    });

    it("mehr als pageSize: erste Seite ist voll, total ist Gesamtzahl", async () => {
      await seedTickets(5);
      const res = await supertest(app.server).get("/api/tickets?page=1&pageSize=2").expect(200);
      const body = res.body as PaginatedBody;
      expect(body.total).toBe(5);
      expect(body.data.length).toBe(2);
    });

    it("letzte Seite teilgefüllt: Rest-Elemente, total unverändert", async () => {
      await seedTickets(5);
      // 5 Elemente, pageSize 2 → Seite 3 hat genau 1 Rest-Element.
      const res = await supertest(app.server).get("/api/tickets?page=3&pageSize=2").expect(200);
      const body = res.body as PaginatedBody;
      expect(body.total).toBe(5);
      expect(body.data.length).toBe(1);
      expect(body.page).toBe(3);
    });

    it("Seite hinter dem Ende: data leer, total unverändert", async () => {
      await seedTickets(3);
      const res = await supertest(app.server).get("/api/tickets?page=99&pageSize=10").expect(200);
      const body = res.body as PaginatedBody;
      expect(body.data).toEqual([]);
      expect(body.total).toBe(3);
      expect(body.page).toBe(99);
    });

    it("gesamte paginierte Menge (per id) == Grundmenge; keine Lücke, keine Dublette", async () => {
      const projectId = await seedTickets(5, "Sum");
      const bare = await supertest(app.server).get("/api/tickets").expect(200);
      const bareIds = new Set((bare.body as Array<{ id: number }>).map((ticket) => ticket.id));
      expect(bareIds.size).toBe(5);

      const pageSize = 2;
      const collected: number[] = [];
      const pageCount = Math.ceil(5 / pageSize);
      for (let page = 1; page <= pageCount; page += 1) {
        const res = await supertest(app.server).get(`/api/tickets?page=${page}&pageSize=${pageSize}`).expect(200);
        const body = res.body as PaginatedBody;
        expect(body.total).toBe(5);
        collected.push(...body.data.map((ticket) => ticket.id));
      }

      // Keine Dubletten über Seitengrenzen hinweg, exakt die Grundmenge abgedeckt.
      expect(new Set(collected).size).toBe(5);
      expect(new Set(collected)).toEqual(bareIds);
      void projectId;
    });

    it("pageSize > 100 wird per Schema abgewiesen (400)", async () => {
      await supertest(app.server).get("/api/tickets?page=1&pageSize=101").expect(400);
    });

    it("page <= 0 wird per Schema abgewiesen (400)", async () => {
      await supertest(app.server).get("/api/tickets?page=0&pageSize=10").expect(400);
    });

    it("pageSize <= 0 wird per Schema abgewiesen (400)", async () => {
      await supertest(app.server).get("/api/tickets?page=1&pageSize=0").expect(400);
    });
  });

  describe("Auth-Schutz", () => {
    let authApp: FastifyInstance;
    let originalAuthBypassAdmin: boolean;
    let originalApiKey: string | null;

    beforeAll(async () => {
      originalAuthBypassAdmin = config.authBypassAdmin;
      originalApiKey = config.apiKey;
      authApp = await buildTestApp(testDb, { enableAuth: true });
    });

    beforeEach(async () => {
      config.authBypassAdmin = false;
      config.apiKey = null;
      await truncateAll(testDb.pool);
    });

    afterAll(async () => {
      config.authBypassAdmin = originalAuthBypassAdmin;
      config.apiKey = originalApiKey;
      await authApp?.close();
    });

    it("GET /api/tickets ohne Session gibt 401", async () => {
      await supertest(authApp.server).get("/api/tickets").expect(401);
    });

    it("Admin darf die Ticket-Liste lesen (200)", async () => {
      const admin = supertest.agent(authApp.server);
      await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);

      await admin.get("/api/tickets").expect(200);
    });

    it("Reader darf lesen (200), aber kein Ticket anlegen (403)", async () => {
      const admin = supertest.agent(authApp.server);
      await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
      const roles = (await admin.get("/api/admin/roles").expect(200)).body as Array<{ key: string; id: number }>;
      const readerRole = roles.find((role) => role.key === "reader")!;
      await admin
        .post("/api/admin/users")
        .send({
          firstName: "Reader",
          lastName: "List",
          email: "reader-tickets-list@example.test",
          roleId: readerRole.id,
          password: "password123",
          isActive: true
        })
        .expect(201);

      const reader = supertest.agent(authApp.server);
      await reader.post("/api/auth/login").send({ email: "reader-tickets-list@example.test", password: "password123" }).expect(200);

      await reader.get("/api/tickets").expect(200);
      await reader.post("/api/tickets").send({ title: "Reader-Ticket", type: "bug" }).expect(403);
    });
  });
});
