/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekte, Features und Use Cases verwalten Aufgaben ausschließlich über Owner-Join-Endpunkte.
 * - Create erzeugt Aufgabe plus Join, Link erzeugt nur den Join, Remove entfernt nur den Join.
 * - Board-Änderungen speichern globale Task-Statuswerte und owner-spezifische Positionen getrennt.
 * - Direktes Löschen einer Aufgabe ist blockiert, solange Owner-Beziehungen bestehen.
 *
 * Fehlerfälle:
 * - Unbekannte Owner, unbekannte Aufgaben, fehlende Links und Subtask-Links werden abgewiesen.
 * - Eine Aufgabe mit mehreren Owner-Beziehungen bleibt blockiert, bis alle Links entfernt sind.
 *
 * Ziel:
 * Die owner-basierten Aufgabenbeziehungen für alle aufgabenfähigen Domänenobjekte absichern.
 */

import type { Task, TaskBoardItem } from "@taskmanager/shared-types";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createFeature, createProject, createSubtask, createTask, createTestDb, createUseCase, truncateAll, type TestDb } from "../../fixtures/api/index.js";

type OwnerKind = "project" | "feature" | "useCase";

interface OwnerCase {
  kind: OwnerKind;
  label: string;
  unknownPath: string;
}

interface OwnerFixture extends OwnerCase {
  id: number;
  path: string;
}

const ownerCases: OwnerCase[] = [
  { kind: "project", label: "Projekt", unknownPath: "/api/projects/9999/tasks" },
  { kind: "feature", label: "Feature", unknownPath: "/api/features/9999/tasks" },
  { kind: "useCase", label: "Use Case", unknownPath: "/api/use-cases/9999/tasks" }
];

function taskLinkPath(owner: OwnerFixture, taskId: number): string {
  return `${owner.path}/${taskId}`;
}

async function createOwner(app: FastifyInstance, ownerCase: OwnerCase): Promise<OwnerFixture> {
  if (ownerCase.kind === "project") {
    const project = await createProject(app, { name: `${ownerCase.label} Owner` });
    return { ...ownerCase, id: project.id, path: `/api/projects/${project.id}/tasks` };
  }

  if (ownerCase.kind === "feature") {
    const feature = await createFeature(app, { title: `${ownerCase.label} Owner` });
    return { ...ownerCase, id: feature.id, path: `/api/features/${feature.id}/tasks` };
  }

  const feature = await createFeature(app, { title: "Use-Case Feature Owner" });
  const useCase = await createUseCase(app, feature.id, { title: `${ownerCase.label} Owner` });
  return { ...ownerCase, id: useCase.id, path: `/api/use-cases/${useCase.id}/tasks` };
}

async function createUnlinkedTask(app: FastifyInstance, title = "Unverknüpfte Aufgabe"): Promise<Pick<Task, "id" | "title" | "version">> {
  const project = await createProject(app, { name: "Temporärer Aufgaben-Owner" });
  const task = await createTask(app, project.id, { title });
  await supertest(app.server).delete(`/api/projects/${project.id}/tasks/${task.id}`).expect(204);
  return task;
}

describe("Owner task relation API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;

  beforeAll(async () => {
    testDb = createTestDb();
    app = await buildTestApp(testDb);
  });

  beforeEach(() => truncateAll(testDb.sqlite));

  afterAll(async () => {
    await app.close();
    testDb.sqlite.close();
  });

  for (const ownerCase of ownerCases) {
    describe(`${ownerCase.label}-Aufgaben`, () => {
      it("Create erzeugt Aufgabe plus Owner-Join", async () => {
        const owner = await createOwner(app, ownerCase);

        const created = await supertest(app.server)
          .post(owner.path)
          .send({ title: `${ownerCase.label} Create`, status: "todo", priority: "high" })
          .expect(201);

        expect(created.body).toMatchObject({ title: `${ownerCase.label} Create`, status: "todo", priority: "high" });
        expect(created.body.boardPosition).toBeGreaterThan(0);

        const ownerTasks = await supertest(app.server).get(owner.path).expect(200);
        expect(ownerTasks.body.map((task: TaskBoardItem) => task.id)).toEqual([created.body.id]);

        const globalTask = await supertest(app.server).get(`/api/tasks/${created.body.id}`).expect(200);
        expect(globalTask.body).not.toHaveProperty("projectId");
        expect(globalTask.body).not.toHaveProperty("position");
      });

      it("Link verknüpft eine bestehende Aufgabe idempotent ohne neue Aufgabe", async () => {
        const owner = await createOwner(app, ownerCase);
        const existingTask = await createUnlinkedTask(app, `${ownerCase.label} Link`);

        const firstLink = await supertest(app.server).post(taskLinkPath(owner, existingTask.id)).expect(200);
        const secondLink = await supertest(app.server).post(taskLinkPath(owner, existingTask.id)).expect(200);

        expect(firstLink.body.id).toBe(existingTask.id);
        expect(secondLink.body.id).toBe(existingTask.id);

        const ownerTasks = await supertest(app.server).get(owner.path).expect(200);
        expect(ownerTasks.body.map((task: TaskBoardItem) => task.id)).toEqual([existingTask.id]);

        const allTasks = await supertest(app.server).get("/api/tasks").expect(200);
        expect(allTasks.body.filter((task: Task) => task.id === existingTask.id)).toHaveLength(1);
      });

      it("Remove entfernt nur den Owner-Join und lässt die Aufgabe bestehen", async () => {
        const owner = await createOwner(app, ownerCase);
        const existingTask = await createUnlinkedTask(app, `${ownerCase.label} Remove`);
        await supertest(app.server).post(taskLinkPath(owner, existingTask.id)).expect(200);

        await supertest(app.server).delete(taskLinkPath(owner, existingTask.id)).expect(204);

        await supertest(app.server).get(`/api/tasks/${existingTask.id}`).expect(200);
        const ownerTasks = await supertest(app.server).get(owner.path).expect(200);
        expect(ownerTasks.body).toEqual([]);
      });

      it("Randfälle werden mit passenden Fehlern beantwortet", async () => {
        const owner = await createOwner(app, ownerCase);
        const existingTask = await createUnlinkedTask(app, `${ownerCase.label} Edge`);
        const project = await createProject(app, { name: `${ownerCase.label} Subtask Owner` });
        const parentTask = await createTask(app, project.id, { title: `${ownerCase.label} Parent` });
        const subtask = await createSubtask(app, parentTask.id, { title: `${ownerCase.label} Subtask` });

        await supertest(app.server).get(ownerCase.unknownPath).expect(404);
        await supertest(app.server).post(ownerCase.unknownPath).send({ title: "Unknown owner" }).expect(404);
        await supertest(app.server).post(`${ownerCase.unknownPath}/${existingTask.id}`).expect(404);
        await supertest(app.server).post(taskLinkPath(owner, 9999)).expect(404);
        await supertest(app.server).post(taskLinkPath(owner, subtask.id)).expect(400);
        await supertest(app.server).delete(taskLinkPath(owner, existingTask.id)).expect(404);
        await supertest(app.server)
          .patch(`${taskLinkPath(owner, existingTask.id)}/board`)
          .send({ status: "done", position: 1, expectedVersion: existingTask.version })
          .expect(404);
      });

      it("Direktes Löschen ist blockiert, bis der Owner-Join entfernt wurde", async () => {
        const owner = await createOwner(app, ownerCase);
        const created = await supertest(app.server).post(owner.path).send({ title: `${ownerCase.label} Delete Block`, status: "todo" }).expect(201);

        const blocked = await supertest(app.server).delete(`/api/tasks/${created.body.id}`).expect(409);
        expect(blocked.body).toMatchObject({ error: "CONFLICT", statusCode: 409 });
        expect(blocked.body.message).toContain("Beziehungen");

        await supertest(app.server).get(`/api/tasks/${created.body.id}`).expect(200);
        await supertest(app.server).delete(taskLinkPath(owner, created.body.id)).expect(204);
        await supertest(app.server).delete(`/api/tasks/${created.body.id}`).expect(204);
        await supertest(app.server).get(`/api/tasks/${created.body.id}`).expect(404);
      });
    });
  }

  it("Board-Move ändert globalen Status, aber nur die Position des aktuellen Owner-Boards", async () => {
    const projectOwner = await createOwner(app, ownerCases[0]);
    const featureOwner = await createOwner(app, ownerCases[1]);
    const task = await supertest(app.server).post(projectOwner.path).send({ title: "Board Move", status: "todo" }).expect(201);
    await supertest(app.server).post(taskLinkPath(featureOwner, task.body.id)).expect(200);

    await supertest(app.server)
      .patch(`${taskLinkPath(projectOwner, task.body.id)}/board`)
      .send({ status: "done", position: 4096, expectedVersion: task.body.version })
      .expect(200);

    const projectTasks = await supertest(app.server).get(projectOwner.path).expect(200);
    const featureTasks = await supertest(app.server).get(featureOwner.path).expect(200);

    expect(projectTasks.body[0]).toMatchObject({ id: task.body.id, status: "done", boardPosition: 4096 });
    expect(featureTasks.body[0]).toMatchObject({ id: task.body.id, status: "done" });
    expect(featureTasks.body[0].boardPosition).not.toBe(4096);
  });

  it("Owner-Boards bleiben zwischen zwei Ownern desselben Typs isoliert", async () => {
    const firstProjectOwner = await createOwner(app, ownerCases[0]);
    const secondProjectOwner = await createOwner(app, ownerCases[0]);
    const task = await supertest(app.server).post(firstProjectOwner.path).send({ title: "Isolierte Owner-Aufgabe", status: "todo" }).expect(201);

    const firstTasks = await supertest(app.server).get(firstProjectOwner.path).expect(200);
    const secondTasksBeforeLink = await supertest(app.server).get(secondProjectOwner.path).expect(200);

    expect(firstTasks.body.map((item: TaskBoardItem) => item.id)).toEqual([task.body.id]);
    expect(secondTasksBeforeLink.body).toEqual([]);

    await supertest(app.server).post(taskLinkPath(secondProjectOwner, task.body.id)).expect(200);
    await supertest(app.server).delete(taskLinkPath(firstProjectOwner, task.body.id)).expect(204);

    const firstTasksAfterUnlink = await supertest(app.server).get(firstProjectOwner.path).expect(200);
    const secondTasksAfterUnlink = await supertest(app.server).get(secondProjectOwner.path).expect(200);

    expect(firstTasksAfterUnlink.body).toEqual([]);
    expect(secondTasksAfterUnlink.body.map((item: TaskBoardItem) => item.id)).toEqual([task.body.id]);
  });

  it("Mehrfach verknüpfte Aufgaben bleiben blockiert, bis alle Owner-Links entfernt sind", async () => {
    const projectOwner = await createOwner(app, ownerCases[0]);
    const featureOwner = await createOwner(app, ownerCases[1]);
    const task = await supertest(app.server).post(projectOwner.path).send({ title: "Mehrfach verknüpft", status: "todo" }).expect(201);
    await supertest(app.server).post(taskLinkPath(featureOwner, task.body.id)).expect(200);

    await supertest(app.server).delete(taskLinkPath(projectOwner, task.body.id)).expect(204);
    const blocked = await supertest(app.server).delete(`/api/tasks/${task.body.id}`).expect(409);
    expect(blocked.body.message).toContain("Feature");

    await supertest(app.server).delete(taskLinkPath(featureOwner, task.body.id)).expect(204);
    await supertest(app.server).delete(`/api/tasks/${task.body.id}`).expect(204);
  });
});
