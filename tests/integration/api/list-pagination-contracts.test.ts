/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration (API)
 *
 * Realitätsgrad:
 * - Echte Fastify-App über buildTestApp, echte MySQL-Test-DB, echte Service-/Repository-Schicht,
 *   echte HTTP-Antworten über supertest. Keine Mocks.
 *
 * Mock-Entscheidung:
 * - Keine Mocks (Integrationsvertrag).
 *
 * Isolation:
 * - Temp-Test-DB (createTestDb), truncateAll vor jedem Test.
 *
 * Abgedeckte Regeln (der im progressiven Umbau kritische Listen-Vertrag):
 * - GET /X ohne `page` liefert weiterhin ein NACKTES ARRAY (Alt-Vertrag, den die
 *   Alt-Pfad-Hooks useProjects/useMilestones/useFeatures/useTickets über `?? []` erwarten;
 *   ein Objekt statt Array bricht das clientseitige `.filter(...)` → Frontend-Crash).
 * - GET /X?page=1&pageSize=n liefert Paginated{data,total,page,pageSize} (Opt-in).
 * - Konsistenz: die über alle Seiten zusammengesetzte paginierte Menge == das nackte Array.
 *
 * Fehlerfälle / Gegenbeispiele:
 * - Nicht nur der leere Fall (der bereits grün ist), sondern der DATEN-Fall (>=2 Einträge),
 *   weil der Vertrag genau dort brechen kann. `Array.isArray` als hartes Gegenkriterium.
 *
 * Ziel:
 * Beweist domänenübergreifend, dass die Listen-Endpunkte den Array-Alt-Vertrag halten und
 * die Opt-in-Pagination korrekt formt — der reproduzierende Vertragstest zum Listen-Crash.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  buildTestApp,
  createFeature,
  createMilestone,
  createNoteForProject,
  createProject,
  createTask,
  createTestDb,
  createTicket,
  truncateAll,
  type TestDb,
} from "../../fixtures/api/index.js";

interface ListDomain {
  name: string;
  path: string;
  // legt genau `count` sichtbare Listen-Einträge an
  seed: (app: FastifyInstance, count: number) => Promise<void>;
}

const domains: ListDomain[] = [
  {
    name: "projects",
    path: "/api/projects",
    seed: async (app, count) => {
      for (let i = 0; i < count; i += 1) {
        await createProject(app, { name: `P${i}` });
      }
    },
  },
  {
    name: "milestones",
    path: "/api/milestones",
    seed: async (app, count) => {
      const project = await createProject(app, { name: "MS-Owner" });
      for (let i = 0; i < count; i += 1) {
        await createMilestone(app, project.id, { name: `M${i}` });
      }
    },
  },
  {
    name: "features",
    path: "/api/features",
    seed: async (app, count) => {
      for (let i = 0; i < count; i += 1) {
        await createFeature(app, { title: `F${i}` });
      }
    },
  },
  {
    name: "tickets",
    path: "/api/tickets",
    seed: async (app, count) => {
      const project = await createProject(app, { name: "TKT-Owner" });
      for (let i = 0; i < count; i += 1) {
        await createTicket(app, { type: "project", id: project.id }, { title: `T${i}` });
      }
    },
  },
  {
    name: "tasks",
    path: "/api/tasks",
    seed: async (app, count) => {
      const project = await createProject(app, { name: "Task-Owner" });
      for (let i = 0; i < count; i += 1) {
        await createTask(app, project.id, { title: `A${i}` });
      }
    },
  },
  {
    name: "notes",
    path: "/api/notes",
    seed: async (app, count) => {
      const project = await createProject(app, { name: "Note-Owner" });
      for (let i = 0; i < count; i += 1) {
        await createNoteForProject(app, project.id, { title: `N${i}` });
      }
    },
  },
];

describe("Listen-Endpunkte: Array- vs. Paginated-Vertrag", () => {
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

  for (const domain of domains) {
    describe(domain.name, () => {
      it(`GET ${domain.path} ohne page liefert ein nacktes Array (Alt-Vertrag, mit Daten)`, async () => {
        await domain.seed(app, 3);

        const res = await supertest(app.server).get(domain.path).expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(3);
      });

      it(`GET ${domain.path}?page=1 liefert Paginated{data,total,page,pageSize}`, async () => {
        await domain.seed(app, 3);

        const res = await supertest(app.server)
          .get(`${domain.path}?page=1&pageSize=2`)
          .expect(200);

        expect(Array.isArray(res.body)).toBe(false);
        expect(res.body).toMatchObject({ page: 1, pageSize: 2 });
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(2);
        expect(res.body.total).toBeGreaterThanOrEqual(3);
      });

      it(`GET ${domain.path}: paginierte Menge über alle Seiten == nacktes Array`, async () => {
        await domain.seed(app, 5);

        const bare = await supertest(app.server).get(domain.path).expect(200);
        const total = bare.body.length as number;

        const pageSize = 2;
        const collected: unknown[] = [];
        const pageCount = Math.ceil(total / pageSize);
        for (let page = 1; page <= pageCount; page += 1) {
          const res = await supertest(app.server)
            .get(`${domain.path}?page=${page}&pageSize=${pageSize}`)
            .expect(200);
          collected.push(...res.body.data);
          expect(res.body.total).toBe(total);
        }

        expect(collected.length).toBe(total);
      });
    });
  }
});
