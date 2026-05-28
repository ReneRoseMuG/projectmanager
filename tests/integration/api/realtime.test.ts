/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - `/api/realtime/stream` ist geschützt und benötigt `realtime:read`.
 * - Erfolgreiche mutierende API-Requests veröffentlichen Realtime-Invalidierungen mit `sourceTabId`.
 * - Fehlgeschlagene Schreibversuche veröffentlichen kein Event.
 *
 * Fehlerfälle:
 * - Anonyme Requests erhalten 401, Rollen ohne `realtime:read` erhalten 403.
 *
 * Ziel:
 * Die Realtime-Sicherheitsgrenze und zentrale Event-Emission gegen Regressionen absichern.
 */

import type { FastifyInstance } from "fastify";
import http from "node:http";
import supertest from "supertest";
import type { Response } from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

async function loginAdmin(app: FastifyInstance) {
  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
  return agent;
}

function firstCookie(response: Response): string {
  const cookie = response.headers["set-cookie"] as unknown as string[] | undefined;
  if (!cookie?.[0]) {
    throw new Error("Login response did not set a cookie");
  }
  return cookie[0].split(";")[0];
}

async function readSseHandshake(baseUrl: string, cookie: string): Promise<{ chunk: string; contentType: string | undefined }> {
  return new Promise((resolve, reject) => {
    const request = http.get(`${baseUrl}/api/realtime/stream`, { headers: { Cookie: cookie } }, (response) => {
      const contentType = response.headers["content-type"];
      response.setEncoding("utf8");
      response.once("data", (chunk: string) => {
        request.destroy();
        resolve({ chunk, contentType });
      });
    });
    request.setTimeout(3000, () => {
      request.destroy();
      reject(new Error("Timed out waiting for SSE handshake"));
    });
    request.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code !== "ECONNRESET") {
        reject(error);
      }
    });
  });
}

async function readPublishedBackupProgress(baseUrl: string, cookie: string, publish: () => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = http.get(`${baseUrl}/api/realtime/stream`, { headers: { Cookie: cookie } }, (response) => {
      let published = false;
      let eventBuffer = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        if (!published && chunk.includes(": connected")) {
          published = true;
          publish();
          return;
        }
        eventBuffer += chunk;
        if (eventBuffer.includes("event: backup_progress") && eventBuffer.includes("\n\n")) {
          request.destroy();
          resolve(eventBuffer);
        }
      });
    });
    request.setTimeout(3000, () => {
      request.destroy();
      reject(new Error("Timed out waiting for backup progress SSE event"));
    });
    request.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code !== "ECONNRESET") {
        reject(error);
      }
    });
  });
}

describe("Realtime API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let originalAuthBypassAdmin: boolean;

  beforeEach(async () => {
    originalAuthBypassAdmin = config.authBypassAdmin;
    config.authBypassAdmin = false;
    testDb = createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
    truncateAll(testDb.sqlite);
  });

  afterEach(async () => {
    config.authBypassAdmin = originalAuthBypassAdmin;
    await app.close();
    testDb.sqlite.close();
  });

  it("schützt den SSE-Stream vor anonymen und nicht berechtigten Nutzern", async () => {
    await supertest(app.server).get("/api/realtime/stream").expect(401);

    const admin = await loginAdmin(app);
    const role = await admin
      .post("/api/admin/roles")
      .send({ key: "project_only", label: "Project Only", permissions: [{ resource: "projects", action: "read" }] })
      .expect(201);
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Project", lastName: "Only", email: "project-only@example.test", roleId: role.body.id, password: "password123", isActive: true })
      .expect(201);

    const limited = supertest.agent(app.server);
    await limited.post("/api/auth/login").send({ email: "project-only@example.test", password: "password123" }).expect(200);
    await limited.get("/api/realtime/stream").expect(403);
  });

  it("öffnet den autorisierten SSE-Stream mit Event-Stream-Headern", async () => {
    const login = await supertest(app.server).post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
    const baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });

    const handshake = await readSseHandshake(baseUrl, firstCookie(login));

    expect(handshake.contentType).toContain("text/event-stream");
    expect(handshake.chunk).toContain(": connected");
  });

  it("sendet Backup-Fortschritt als eigenes SSE-Event", async () => {
    const login = await supertest(app.server).post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
    const baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });

    const chunk = await readPublishedBackupProgress(baseUrl, firstCookie(login), () => {
      app.realtimeBus.publish({
        type: "backup_progress",
        operation: "full_backup",
        phase: "archive",
        current: 1,
        total: 3,
        detail: "uploads/example.txt"
      });
    });

    expect(chunk).toContain("event: backup_progress");
    expect(chunk).toContain("\"operation\":\"full_backup\"");
    expect(chunk).toContain("\"phase\":\"archive\"");
  });

  it("publiziert Events für erfolgreiche Mutationen und keine Events für Fehler", async () => {
    const admin = await loginAdmin(app);
    const events: Array<{ scope: string; sourceTabId: string | null }> = [];
    const unsubscribe = app.realtimeBus.subscribe((event) => {
      if (event.type === "invalidate") {
        events.push({ scope: event.scope, sourceTabId: event.sourceTabId });
      }
    });

    await admin.post("/api/projects").set("X-Client-Tab-Id", "tab-a").send({ name: "Realtime Project" }).expect(201);
    await admin.post("/api/projects").set("X-Client-Tab-Id", "tab-a").send({}).expect(400);

    unsubscribe();

    expect(events).toEqual([{ scope: "projects", sourceTabId: "tab-a" }]);
  });

  it("publiziert verschachtelte Kommentar-Mutationen als Kommentar-Invalidierung", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Realtime Comment Project" }).expect(201);
    const events: Array<{ scope: string; sourceTabId: string | null }> = [];
    const unsubscribe = app.realtimeBus.subscribe((event) => {
      if (event.type === "invalidate") {
        events.push({ scope: event.scope, sourceTabId: event.sourceTabId });
      }
    });

    await admin.post(`/api/projects/${project.body.id}/comments`).send({ body: "<p>Extern angelegter Kommentar</p>" }).expect(201);

    unsubscribe();

    expect(events).toEqual([{ scope: "comments", sourceTabId: null }]);
  });
});
