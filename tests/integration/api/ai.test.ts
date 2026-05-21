/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - AI-Endpunkte nutzen einen lokalen Modell-Client und erlauben keine freie Aktionsausführung.
 * - Agent-Pläne lösen vorhandene Zielobjekte eindeutig auf und blockieren mehrdeutige Ziele.
 * - Bestätigte Agent-Aktionen laufen über die vorhandenen fachlichen Services.
 *
 * Fehlerfälle:
 * - Nicht erreichbarer Modell-Client.
 * - Ungültige KI-Antwort.
 * - Nicht erlaubte Agent-Aktion.
 *
 * Ziel:
 * Die lokale KI-API ohne echtes Ollama gegen Vertrags- und Sicherheitsregressionen absichern.
 */

import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AiChatMessage, AiLocalModelClient } from "../../../apps/api/src/services/ai-ollama.service.js";
import { buildTestApp, createProject, createTask, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

class MockAiClient implements AiLocalModelClient {
  public failModels = false;
  public jsonResponse: unknown = { html: "<p>Neu</p>" };

  public async listModels() {
    if (this.failModels) {
      throw new Error("offline");
    }
    return [{ name: "llama3.2:1b", sizeBytes: 123, modifiedAt: "2026-05-20T00:00:00Z", digest: "digest" }];
  }

  public async chatText(_model: string, _messages: AiChatMessage[]) {
    return "Text";
  }

  public async chatJson(_model: string, _messages: AiChatMessage[]) {
    return this.jsonResponse;
  }
}

describe("AI API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let aiClient: MockAiClient;

  beforeAll(async () => {
    testDb = createTestDb();
    aiClient = new MockAiClient();
    app = await buildTestApp(testDb, { aiClient });
  });

  beforeEach(() => {
    truncateAll(testDb.sqlite);
    aiClient.failModels = false;
    aiClient.jsonResponse = { html: "<p>Neu</p>" };
  });

  afterAll(async () => {
    await app.close();
    testDb.sqlite.close();
  });

  it("GET /api/ai/models liefert lokale Modelle", async () => {
    const res = await supertest(app.server).get("/api/ai/models").expect(200);

    expect(res.body).toMatchObject({
      provider: "ollama",
      available: true,
      defaultModel: "llama3.2:1b"
    });
    expect(res.body.models).toHaveLength(1);
  });

  it("GET /api/ai/models meldet nicht erreichbares Ollama als Offline-Zustand", async () => {
    aiClient.failModels = true;

    const res = await supertest(app.server).get("/api/ai/models").expect(200);

    expect(res.body.available).toBe(false);
    expect(res.body.models).toEqual([]);
  });

  it("POST /api/ai/text übernimmt HTML aus strukturierter KI-Antwort", async () => {
    aiClient.jsonResponse = { html: "<p>Formulierter Text</p>" };

    const res = await supertest(app.server).post("/api/ai/text").send({ html: "<p>Alt</p>", operation: "rewrite" }).expect(200);

    expect(res.body).toMatchObject({ model: "llama3.2:1b", html: "<p>Formulierter Text</p>" });
  });

  it("POST /api/ai/text gibt 500 bei ungültiger KI-Antwort zurück", async () => {
    aiClient.jsonResponse = { text: "ohne html" };

    const res = await supertest(app.server).post("/api/ai/text").send({ html: "<p>Alt</p>", operation: "rewrite" }).expect(500);

    expect(res.body.error).toBe("INTERNAL_ERROR");
  });

  it("POST /api/ai/agent/plan löst Projektname für Aufgabenanlage auf", async () => {
    const project = await createProject(app, { name: "Test" });
    aiClient.jsonResponse = {
      message: "Bereit",
      blockers: [],
      actions: [
        {
          type: "createTask",
          label: "Aufgabe anlegen",
          description: "Aufgabe in Projekt Test anlegen",
          payload: { projectName: "Test", title: "Aufgabe 1" }
        }
      ]
    };

    const res = await supertest(app.server).post("/api/ai/agent/plan").send({ prompt: "Erstelle Aufgabe" }).expect(200);

    expect(res.body.status).toBe("ready");
    expect(res.body.actions[0].payload).toMatchObject({ ownerType: "project", ownerId: project.id, title: "Aufgabe 1" });
  });

  it("POST /api/ai/agent/plan blockiert mehrdeutige Zielobjekte", async () => {
    await createProject(app, { name: "Test Alpha" });
    await createProject(app, { name: "Test Beta" });
    aiClient.jsonResponse = {
      message: "Klärung nötig",
      blockers: [],
      actions: [
        {
          type: "createTask",
          label: "Aufgabe anlegen",
          description: "Aufgabe in Projekt Test anlegen",
          payload: { projectName: "Test", title: "Aufgabe 1" }
        }
      ]
    };

    const res = await supertest(app.server).post("/api/ai/agent/plan").send({ prompt: "Erstelle Aufgabe" }).expect(200);

    expect(res.body.status).toBe("blocked");
    expect(res.body.actions).toEqual([]);
    expect(res.body.blockers[0]).toContain("mehrdeutig");
  });

  it("POST /api/ai/agent/execute führt bestätigte Aufgabenanlage aus", async () => {
    const project = await createProject(app, { name: "Test" });

    const res = await supertest(app.server)
      .post("/api/ai/agent/execute")
      .send({
        actions: [
          {
            type: "createTask",
            label: "Aufgabe anlegen",
            description: "Aufgabe in Projekt Test anlegen",
            payload: { ownerType: "project", ownerId: project.id, title: "Aufgabe 1" },
            requiresConfirmation: true
          }
        ]
      })
      .expect(200);

    expect(res.body.results[0]).toMatchObject({ success: true, entityType: "task" });

    const tasks = await supertest(app.server).get(`/api/projects/${project.id}/tasks`).expect(200);
    expect(tasks.body[0].title).toBe("Aufgabe 1");
  });

  it("POST /api/ai/agent/plan blockiert nicht erlaubte Aktionen", async () => {
    aiClient.jsonResponse = {
      message: "Nicht erlaubt",
      blockers: [],
      actions: [{ type: "deleteProject", label: "Projekt löschen", description: "Nicht erlaubt", payload: { projectName: "Test" } }]
    };

    const res = await supertest(app.server).post("/api/ai/agent/plan").send({ prompt: "Lösche Projekt" }).expect(200);

    expect(res.body.status).toBe("blocked");
    expect(res.body.blockers[0]).toContain("Nicht erlaubte Aktion");
  });

  it("POST /api/ai/agent/execute lehnt nicht bestätigte Aktionen ab", async () => {
    const project = await createProject(app);
    const task = await createTask(app, project.id);

    await supertest(app.server)
      .post("/api/ai/agent/execute")
      .send({
        actions: [
          {
            type: "linkOwnerTask",
            label: "Verknüpfen",
            description: "Nicht bestätigt",
            payload: { ownerType: "project", ownerId: project.id, taskId: task.id },
            requiresConfirmation: false
          }
        ]
      })
      .expect(400);
  });
});
