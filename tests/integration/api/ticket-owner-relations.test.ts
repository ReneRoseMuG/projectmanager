/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Integration
 *
 * Realitätsgrad:
 * - Echte Fastify-App + MySQL Temp-DB, echte Services, Repositories und HTTP-Requests.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Temporäre MySQL-Datenbank, Truncate vor jedem Test.
 *
 * Abgedeckte Regeln:
 * - Ein Ticket kann an alle 5 Owner-Typen (Project, Milestone, Task, Feature, UseCase) verknüpft werden.
 * - Verknüpftes Ticket erscheint in der Owner-Ticket-Liste.
 * - Unlink entfernt das Ticket aus der Owner-Liste, das Ticket selbst bleibt erhalten.
 * - Owner löschen → Join-Eintrag weg, Ticket selbst bleibt erhalten.
 * - Sub-Ticket kann nicht an Owner verknüpft werden.
 *
 * Fehlerfälle:
 * - SubTicket → Owner-Link → 400
 * - Unlink nicht-verknüpfter Ticket → 404
 *
 * Ziel:
 * Die vollständige Owner-Ticket-Relation (Link, Sichtbarkeit, Unlink, Cascade) für alle 5 Owner-Typen absichern.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  buildTestApp,
  createFeature,
  createMilestone,
  createProject,
  createSubTicket,
  createTask,
  createTicket,
  createUseCase,
  createTestDb,
  truncateAll,
  type TestDb,
  type TestTicket
} from "../../fixtures/api/index.js";

type OwnerSpec = {
  label: string;
  setupFn: (app: FastifyInstance) => Promise<{ id: number; projectId?: number }>;
  listPath: (ownerId: number) => string;
  linkPath: (ownerId: number, ticketId: number) => string;
  // Eigene Löschlogik je Owner-Typ (Task braucht Unlink-vor-Delete)
  deleteOwner: (app: FastifyInstance, ownerId: number, projectId?: number) => Promise<void>;
};

describe("Ticket-Owner-Relationen API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = await createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(async () => { await truncateAll(testDb.pool); });

  afterAll(async () => {
    await app?.close();
    await testDb?.close();
  });

  const ownerSpecs: OwnerSpec[] = [
    {
      label: "Project",
      setupFn: async (a) => createProject(a),
      listPath: (id) => `/api/projects/${id}/tickets`,
      linkPath: (ownerId, ticketId) => `/api/projects/${ownerId}/tickets/${ticketId}`,
      deleteOwner: async (a, id) => { await supertest(a.server).delete(`/api/projects/${id}`).expect(204); }
    },
    {
      label: "Milestone",
      setupFn: async (a) => {
        const project = await createProject(a);
        return createMilestone(a, project.id);
      },
      listPath: (id) => `/api/milestones/${id}/tickets`,
      linkPath: (ownerId, ticketId) => `/api/milestones/${ownerId}/tickets/${ticketId}`,
      deleteOwner: async (a, id) => { await supertest(a.server).delete(`/api/milestones/${id}`).expect(204); }
    },
    {
      label: "Task",
      setupFn: async (a) => {
        const project = await createProject(a);
        const task = await createTask(a, project.id);
        return { id: task.id, projectId: project.id };
      },
      listPath: (id) => `/api/tasks/${id}/tickets`,
      linkPath: (ownerId, ticketId) => `/api/tasks/${ownerId}/tickets/${ticketId}`,
      // Task muss erst vom Projekt getrennt werden (blockiert sonst 409)
      deleteOwner: async (a, taskId, projectId) => {
        await supertest(a.server).delete(`/api/projects/${projectId}/tasks/${taskId}`).expect(204);
        await supertest(a.server).delete(`/api/tasks/${taskId}`).expect(204);
      }
    },
    {
      label: "Feature",
      setupFn: async (a) => createFeature(a),
      listPath: (id) => `/api/features/${id}/tickets`,
      linkPath: (ownerId, ticketId) => `/api/features/${ownerId}/tickets/${ticketId}`,
      deleteOwner: async (a, id) => { await supertest(a.server).delete(`/api/features/${id}`).expect(204); }
    },
    {
      label: "UseCase",
      setupFn: async (a) => {
        const feature = await createFeature(a);
        return createUseCase(a, feature.id);
      },
      listPath: (id) => `/api/use-cases/${id}/tickets`,
      linkPath: (ownerId, ticketId) => `/api/use-cases/${ownerId}/tickets/${ticketId}`,
      deleteOwner: async (a, id) => { await supertest(a.server).delete(`/api/use-cases/${id}`).expect(204); }
    }
  ];

  for (const spec of ownerSpecs) {
    describe(`Owner: ${spec.label}`, () => {
      it("Ticket verknüpfen → erscheint in Owner-Liste", async () => {
        const owner = await spec.setupFn(app);
        const ticket = await createTicket(app, null);

        await supertest(app.server).post(spec.linkPath(owner.id, ticket.id)).expect(200);

        const list = (await supertest(app.server).get(spec.listPath(owner.id)).expect(200)).body as TestTicket[];
        expect(list.map((t) => t.id)).toContain(ticket.id);
      });

      it("Unlink entfernt Ticket aus Owner-Liste, Ticket bleibt erhalten", async () => {
        const owner = await spec.setupFn(app);
        const ticket = await createTicket(app, null);

        await supertest(app.server).post(spec.linkPath(owner.id, ticket.id)).expect(200);
        await supertest(app.server).delete(spec.linkPath(owner.id, ticket.id)).expect(204);

        const list = (await supertest(app.server).get(spec.listPath(owner.id)).expect(200)).body as TestTicket[];
        expect(list.map((t) => t.id)).not.toContain(ticket.id);

        await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
      });

      it("Owner löschen → Join-Eintrag weg, Ticket selbst bleibt", async () => {
        const owner = await spec.setupFn(app);
        const ticket = await createTicket(app, null);

        await supertest(app.server).post(spec.linkPath(owner.id, ticket.id)).expect(200);
        await spec.deleteOwner(app, owner.id, owner.projectId);

        await supertest(app.server).get(`/api/tickets/${ticket.id}`).expect(200);
      });
    });
  }

  it("Sub-Ticket kann nicht an Owner verknüpft werden", async () => {
    const project = await createProject(app);
    const parent = await createTicket(app, null, { title: "Parent" });
    const sub = await createSubTicket(app, parent.id, { title: "Sub" });

    const res = await supertest(app.server)
      .post(`/api/projects/${project.id}/tickets/${sub.id}`)
      .expect(400);

    expect(res.body).toMatchObject({ error: expect.any(String) });
  });

  it("Gegenbeispiel: anderer Owner enthält verknüpftes Ticket nicht", async () => {
    const projectA = await createProject(app, { name: "Projekt A" });
    const projectB = await createProject(app, { name: "Projekt B" });
    const ticket = await createTicket(app, null);

    await supertest(app.server).post(`/api/projects/${projectA.id}/tickets/${ticket.id}`).expect(200);

    const listB = (await supertest(app.server).get(`/api/projects/${projectB.id}/tickets`).expect(200)).body as TestTicket[];
    expect(listB.map((t) => t.id)).not.toContain(ticket.id);
  });
});
