/**
 * Test Scope: GET /api/tasks — Tiefen-Vertrag der globalen Aufgabenliste
 *
 * Test-Ebene:
 * - Integration (API). Echte Fastify-App, echte HTTP-Aufrufe über supertest.
 *
 * Realitätsgrad:
 * - Volle Vertikale: Route (tasksListQuerySchema, Opt-in-Pagination) → Service
 *   (listTasks / listTasksPaginated) → Repository (buildRootTasksWhere: status-Gleichheit,
 *   q-LIKE über Titel/Beschreibung; findRootTasksPage LIMIT/OFFSET; countRootTasks) →
 *   echte MySQL-Test-DB. Keine Schicht wird umgangen.
 *
 * Mock-Entscheidung:
 * - Keine Mocks. Der Wert dieses Tests liegt gerade im echten Zusammenspiel von
 *   JSON-Schema-Validierung (AJV-Coercion/Constraints), SQL-Filter und Pagination-Arithmetik.
 *
 * Isolation:
 * - Temp-Test-DB (createTestDb) je Datei, truncateAll(pool) vor jedem Test. Der Auth-Block
 *   fährt eine ZWEITE App-Instanz mit enableAuth:true auf derselben Test-DB hoch und
 *   setzt authBypassAdmin/apiKey pro Test zurück (Muster aus tickets.test.ts).
 *
 * Abgedeckte Regeln:
 * - Filter `status`/`q` wirken NUR im paginierten Pfad (die Route reicht sie ausschließlich
 *   an listTasksPaginated weiter; listTasks im Array-Pfad bekommt keine Argumente — per Lauf
 *   verifiziert, spiegelt den Web-Client wider: getTasks() ohne, getTasksPage() mit Filter).
 * - Filter `status` (paginiert): exakte Gleichheit auf tasks.status; passende rein, andere
 *   raus (Nachweis per id). `total` == Anzahl NACH Filter.
 * - Suche `q` (paginiert): LIKE %q% über Titel UND Beschreibung; Treffer rein, Nicht-Treffer raus.
 * - Array-Pfad-Vertrag: `status`/`q` werden dort IGNORIERT (Gegenbeispiel bleibt in der Liste).
 * - Pagination-Grenzfälle (per echtem Lauf verifiziert, nicht geraten): 0 Einträge, genau 1,
 *   mehr als pageSize, teilgefüllte letzte Seite, Seite HINTER dem Ende (data:[], total stabil).
 * - Schema-Grenzen: pageSize>100 und page<=0 verletzen die JSON-Schema-Constraints
 *   (paginationQuerySchema: page minimum 1, pageSize maximum 100) → Fastify antwortet 400
 *   (Clamp findet NICHT statt — der Code lehnt ab).
 * - Auth: GET /api/tasks ohne Session → 401; Admin → 200; Reader → 200 (Lesen erlaubt);
 *   Reader-Schreibzugriff POST /api/projects/:id/tasks → 403.
 *
 * Fehlerfälle / Gegenbeispiele (PFLICHT):
 * - Jeder Filter-/Suchtest legt mindestens ein NICHT passendes Objekt an und prüft dessen
 *   Abwesenheit — nicht nur die Anwesenheit der Treffer.
 * - Grenzwerte 0/1/über-pageSize/hinter-Ende sowie die 400-Fälle als hartes Gegenkriterium
 *   zum Happy Path.
 *
 * Ziel:
 * - Sichert die TIEFEN Aspekte des tasks-Listen-Vertrags (Filter/Suche/Pagination-Ränder/Auth)
 *   test-getrieben ab, ergänzend zum Array-vs-Paginated-Grundvertrag in
 *   list-pagination-contracts.test.ts (dort NICHT dupliziert).
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createProject, createTask, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

interface TaskListEntry {
  id: number;
  title: string;
  status: string;
}

const idsOf = (entries: TaskListEntry[]): number[] => entries.map((entry) => entry.id);

describe("GET /api/tasks — Listen-Vertrag (Filter, Suche, Pagination-Ränder)", () => {
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

  // Verhaltens-Weiche (per Lauf verifiziert): Die Filter `status`/`q` wirken NUR im
  // paginierten Pfad (Route reicht sie ausschließlich an listTasksPaginated weiter;
  // listTasks(app.db) im Array-Pfad bekommt keine Argumente). Der Array-Pfad ist der
  // ungefilterte Alt-Vertrag — der Web-Client getTasks() sendet dort bewusst keine Filter,
  // nur getTasksPage() baut die Filter-Query. Die Tests schreiben genau dieses reale
  // Verhalten fest: Filter greifen paginiert (rein/raus per id), im Array-Pfad werden sie
  // ignoriert.
  describe("Filter status (paginierter Pfad)", () => {
    it("?status=todo liefert nur Aufgaben mit Status todo (Gegenbeispiel raus)", async () => {
      const project = await createProject(app, { name: "Status-Projekt" });
      const todo = await createTask(app, project.id, { title: "Offen", status: "todo" });
      const inProgress = await createTask(app, project.id, { title: "In Arbeit", status: "in_progress" });
      const done = await createTask(app, project.id, { title: "Erledigt", status: "done" });

      const res = await supertest(app.server).get("/api/tasks?status=todo&page=1&pageSize=25").expect(200);
      const ids = idsOf(res.body.data as TaskListEntry[]);

      expect(ids).toContain(todo.id);
      expect(ids).not.toContain(inProgress.id);
      expect(ids).not.toContain(done.id);
      expect((res.body.data as TaskListEntry[]).every((task) => task.status === "todo")).toBe(true);
    });

    it("?status=todo meldet total = Anzahl NACH Filter", async () => {
      const project = await createProject(app, { name: "Status-Total-Projekt" });
      await createTask(app, project.id, { title: "T1", status: "todo" });
      await createTask(app, project.id, { title: "T2", status: "todo" });
      await createTask(app, project.id, { title: "T3", status: "todo" });
      // Gegenbeispiele: dürfen weder total noch data beeinflussen.
      await createTask(app, project.id, { title: "X1", status: "in_progress" });
      await createTask(app, project.id, { title: "X2", status: "done" });

      const res = await supertest(app.server).get("/api/tasks?status=todo&page=1&pageSize=25").expect(200);

      expect(res.body.total).toBe(3);
      expect(res.body.data.length).toBe(3);
      expect((res.body.data as TaskListEntry[]).every((task) => task.status === "todo")).toBe(true);
    });

    it("?status=done ohne passende Aufgaben liefert leere Seite mit total 0", async () => {
      const project = await createProject(app, { name: "Kein-Done-Projekt" });
      await createTask(app, project.id, { title: "Nur offen", status: "todo" });

      const res = await supertest(app.server).get("/api/tasks?status=done&page=1&pageSize=25").expect(200);

      expect(res.body.total).toBe(0);
      expect(res.body.data).toEqual([]);
    });

    it("Array-Pfad (ohne page) ignoriert status: liefert auch nicht passende Aufgaben", async () => {
      const project = await createProject(app, { name: "Array-Status-Projekt" });
      const todo = await createTask(app, project.id, { title: "Offen", status: "todo" });
      const inProgress = await createTask(app, project.id, { title: "In Arbeit", status: "in_progress" });

      const res = await supertest(app.server).get("/api/tasks?status=todo").expect(200);
      const ids = idsOf(res.body as TaskListEntry[]);

      // Alt-Vertrag: der Array-Pfad filtert NICHT — das Gegenbeispiel bleibt enthalten.
      expect(ids).toContain(todo.id);
      expect(ids).toContain(inProgress.id);
    });
  });

  describe("Suche q (paginierter Pfad)", () => {
    it("?q=Alpha trifft Titel-Treffer und schließt Nicht-Treffer aus", async () => {
      const project = await createProject(app, { name: "Suche-Projekt" });
      const hit = await createTask(app, project.id, { title: "Alpha Bericht" });
      const miss = await createTask(app, project.id, { title: "Beta Notiz" });

      const res = await supertest(app.server).get("/api/tasks?q=Alpha&page=1&pageSize=25").expect(200);
      const ids = idsOf(res.body.data as TaskListEntry[]);

      expect(ids).toContain(hit.id);
      expect(ids).not.toContain(miss.id);
      expect(res.body.total).toBe(1);
    });

    it("?q sucht auch in der Beschreibung (Treffer über description, Gegenbeispiel raus)", async () => {
      const project = await createProject(app, { name: "Suche-Description-Projekt" });
      const hit = await createTask(app, project.id, { title: "Ohne Schlagwort im Titel", description: "enthält Zauberwort im Text" });
      const miss = await createTask(app, project.id, { title: "Anderer Titel", description: "völlig unbeteiligt" });

      const res = await supertest(app.server).get("/api/tasks?q=Zauberwort&page=1&pageSize=25").expect(200);
      const ids = idsOf(res.body.data as TaskListEntry[]);

      expect(ids).toContain(hit.id);
      expect(ids).not.toContain(miss.id);
    });

    it("?q ohne Treffer liefert leere Seite mit total 0", async () => {
      const project = await createProject(app, { name: "Suche-Leer-Projekt" });
      await createTask(app, project.id, { title: "Irgendetwas" });

      const res = await supertest(app.server).get("/api/tasks?q=GarantiertNichtVorhandenXYZ&page=1&pageSize=25").expect(200);

      expect(res.body.total).toBe(0);
      expect(res.body.data).toEqual([]);
    });

    it("Array-Pfad (ohne page) ignoriert q: liefert auch Nicht-Treffer", async () => {
      const project = await createProject(app, { name: "Array-Suche-Projekt" });
      const hit = await createTask(app, project.id, { title: "Alpha Bericht" });
      const miss = await createTask(app, project.id, { title: "Beta Notiz" });

      const res = await supertest(app.server).get("/api/tasks?q=Alpha").expect(200);
      const ids = idsOf(res.body as TaskListEntry[]);

      // Alt-Vertrag: der Array-Pfad sucht NICHT — der Nicht-Treffer bleibt enthalten.
      expect(ids).toContain(hit.id);
      expect(ids).toContain(miss.id);
    });
  });

  describe("Pagination-Grenzfälle", () => {
    it("0 Einträge: page=1 liefert leere Seite mit total 0", async () => {
      const res = await supertest(app.server).get("/api/tasks?page=1&pageSize=10").expect(200);

      expect(res.body).toMatchObject({ total: 0, page: 1, pageSize: 10 });
      expect(res.body.data).toEqual([]);
    });

    it("genau 1 Eintrag: eine volle Seite, total 1", async () => {
      const project = await createProject(app, { name: "Ein-Eintrag-Projekt" });
      await createTask(app, project.id, { title: "Einziger" });

      const res = await supertest(app.server).get("/api/tasks?page=1&pageSize=10").expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.data.length).toBe(1);
    });

    it("mehr als pageSize: erste Seite ist voll, total zählt alle", async () => {
      const project = await createProject(app, { name: "Ueberlauf-Projekt" });
      for (let i = 0; i < 5; i += 1) {
        await createTask(app, project.id, { title: `Ueberlauf ${i}` });
      }

      const res = await supertest(app.server).get("/api/tasks?page=1&pageSize=2").expect(200);

      expect(res.body.total).toBe(5);
      expect(res.body.data.length).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(2);
    });

    it("teilgefüllte letzte Seite: Rest kleiner als pageSize, total unverändert", async () => {
      const project = await createProject(app, { name: "Restseite-Projekt" });
      for (let i = 0; i < 5; i += 1) {
        await createTask(app, project.id, { title: `Rest ${i}` });
      }

      // 5 Einträge, pageSize 2 -> Seite 3 enthält genau 1 Eintrag.
      const res = await supertest(app.server).get("/api/tasks?page=3&pageSize=2").expect(200);

      expect(res.body.total).toBe(5);
      expect(res.body.data.length).toBe(1);
      expect(res.body.page).toBe(3);
    });

    it("Seite hinter dem Ende: data leer, total bleibt die Gesamtzahl", async () => {
      const project = await createProject(app, { name: "Hinter-Ende-Projekt" });
      for (let i = 0; i < 3; i += 1) {
        await createTask(app, project.id, { title: `Vorhanden ${i}` });
      }

      const res = await supertest(app.server).get("/api/tasks?page=99&pageSize=10").expect(200);

      expect(res.body.total).toBe(3);
      expect(res.body.data).toEqual([]);
      expect(res.body.page).toBe(99);
    });

    it("pageSize über 100 verletzt das Schema-Maximum → 400", async () => {
      await supertest(app.server).get("/api/tasks?page=1&pageSize=101").expect(400);
    });

    it("page <= 0 verletzt das Schema-Minimum → 400", async () => {
      await supertest(app.server).get("/api/tasks?page=0&pageSize=10").expect(400);
    });
  });
});

describe("GET /api/tasks — Auth-Vertrag", () => {
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

  it("ohne Session → 401", async () => {
    await supertest(authApp.server).get("/api/tasks").expect(401);
  });

  it("Admin darf lesen → 200; Reader darf lesen → 200; Reader darf nicht anlegen → 403", async () => {
    const admin = supertest.agent(authApp.server);
    await admin.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);

    // Admin: Lesezugriff auf die globale Liste.
    await admin.get("/api/tasks").expect(200);

    // Reader-Rolle ermitteln und Reader-Benutzer anlegen.
    const roles = (await admin.get("/api/admin/roles").expect(200)).body as Array<{ key: string; id: number }>;
    const readerRole = roles.find((r) => r.key === "reader")!;
    await admin
      .post("/api/admin/users")
      .send({
        firstName: "Reader",
        lastName: "Tasks",
        email: "reader-tasks-list-auth@example.test",
        roleId: readerRole.id,
        password: "password123",
        isActive: true
      })
      .expect(201);

    // Projekt als Admin anlegen (Reader darf nicht anlegen) — Schreibziel für den 403-Nachweis.
    const project = (await admin.post("/api/projects").send({ name: "Auth-Projekt" }).expect(201)).body as { id: number };

    const reader = supertest.agent(authApp.server);
    await reader.post("/api/auth/login").send({ email: "reader-tasks-list-auth@example.test", password: "password123" }).expect(200);

    // Reader: Lesen erlaubt.
    await reader.get("/api/tasks").expect(200);

    // Reader: Schreiben auf Task-Erstellung unter dem Projekt verboten.
    await reader.post(`/api/projects/${project.id}/tasks`).send({ title: "Reader darf nicht" }).expect(403);
  });
});
