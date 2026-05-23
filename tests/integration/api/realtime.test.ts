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

  it("publiziert Events für erfolgreiche Mutationen und keine Events für Fehler", async () => {
    const admin = await loginAdmin(app);
    const events: Array<{ scope: string; sourceTabId: string | null }> = [];
    const unsubscribe = app.realtimeBus.subscribe((event) => {
      events.push({ scope: event.scope, sourceTabId: event.sourceTabId });
    });

    await admin.post("/api/projects").set("X-Client-Tab-Id", "tab-a").send({ name: "Realtime Project" }).expect(201);
    await admin.post("/api/projects").set("X-Client-Tab-Id", "tab-a").send({}).expect(400);

    unsubscribe();

    expect(events).toEqual([{ scope: "projects", sourceTabId: "tab-a" }]);
  });
});
