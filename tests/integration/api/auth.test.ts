/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Auth-Migration legt Rollen, Permissions und `full_name` als generierte Spalte an.
 * - Login, Session-Cookie, `/auth/me`, globale Guards und Admin-Guards funktionieren.
 * - Admin-Benutzer und Rollen werden versioniert verwaltet und Passwörter gehasht.
 * - Die geschützte User-Auswahlliste liefert aktive Benutzer ohne Admin-Route.
 *
 * Fehlerfälle:
 * - Falsches Passwort, inaktiver Benutzer, fehlende Session, fehlende Rechte, Self-Delete, letzter aktiver Admin und fehlendes `users:read`.
 *
 * Ziel:
 * Das Auth-, Rollen- und Benutzerverwaltungssystem gegen zentrale Sicherheits- und Regressionsfälle absichern.
 */

import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config } from "../../../apps/api/src/config.js";
import { buildTestApp, createTestDb, truncateAll, type TestDb } from "../../fixtures/api/index.js";

async function loginAdmin(app: FastifyInstance) {
  const agent = supertest.agent(app.server);
  await agent.post("/api/auth/login").send({ email: "admin@local", password: "password123" }).expect(200);
  return agent;
}

describe("Auth API", () => {
  let testDb: TestDb;
  let app: FastifyInstance;
  let originalAuthBypassAdmin: boolean;

  beforeAll(async () => {
    originalAuthBypassAdmin = config.authBypassAdmin;
    testDb = createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(() => {
    config.authBypassAdmin = false;
    truncateAll(testDb.sqlite);
  });

  afterAll(async () => {
    config.authBypassAdmin = originalAuthBypassAdmin;
    await app.close();
    testDb.sqlite.close();
  });

  it("legt Rollen, Rechte und full_name als generierte User-Spalte an", () => {
    const roles = testDb.sqlite.prepare("SELECT key FROM roles ORDER BY key").all() as Array<{ key: string }>;
    expect(roles.map((role) => role.key)).toEqual(["admin", "editor", "reader"]);

    const readerRole = testDb.sqlite.prepare("SELECT id FROM roles WHERE key = 'reader'").get() as { id: number };
    const result = testDb.sqlite
      .prepare("INSERT INTO users (name, first_name, last_name, email, role_id, is_active) VALUES ('', 'Ada', 'Lovelace', 'ada@example.test', ?, 1)")
      .run(readerRole.id);
    const user = testDb.sqlite.prepare("SELECT full_name FROM users WHERE id = ?").get(result.lastInsertRowid) as { full_name: string };
    expect(user.full_name).toBe("Lovelace, Ada");

    expect(() =>
      testDb.sqlite
        .prepare("INSERT INTO users (name, first_name, last_name, full_name, email, role_id, is_active) VALUES ('', 'Grace', 'Hopper', 'manual', 'grace@example.test', ?, 1)")
        .run(readerRole.id)
    ).toThrow();
  });

  it("authentifiziert Admins per Cookie-Session und liefert /auth/me", async () => {
    const agent = await loginAdmin(app);

    const me = await agent.get("/api/auth/me").expect(200);

    expect(me.body).toMatchObject({
      email: "admin@local",
      role: { key: "admin" },
      requiresPasswordSetup: false
    });
    const renewedCookie = me.headers["set-cookie"] as unknown as string[] | undefined;
    if (renewedCookie) {
      expect(renewedCookie.join(";")).toContain("HttpOnly");
    }
  });

  it("blockiert falsches Passwort, inaktive Benutzer und anonyme Domain-Routen", async () => {
    await supertest(app.server).post("/api/auth/login").send({ email: "admin@local", password: "wrong-password" }).expect(401);
    await supertest(app.server).get("/api/projects").expect(401);

    const admin = await loginAdmin(app);
    const roles = await admin.get("/api/admin/roles").expect(200);
    const readerRole = roles.body.find((role: { key: string }) => role.key === "reader") as { id: number };
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Inactive", lastName: "User", email: "inactive@example.test", roleId: readerRole.id, password: "password123", isActive: false })
      .expect(201);

    await supertest(app.server).post("/api/auth/login").send({ email: "inactive@example.test", password: "password123" }).expect(403);
  });

  it("erzwingt den First-Login-Passwortflow bis zum Passwortsatz", async () => {
    testDb.sqlite.prepare("UPDATE users SET password_hash = NULL WHERE email = 'admin@local'").run();
    testDb.sqlite.prepare("UPDATE app_settings SET value = 'false' WHERE key = 'admin_setup_done'").run();

    const agent = supertest.agent(app.server);
    const login = await agent.post("/api/auth/login").send({ email: "admin@local" }).expect(200);
    expect(login.body.requiresPasswordSetup).toBe(true);
    await agent.get("/api/projects").expect(403);

    const setup = await agent.post("/api/auth/set-password").send({ password: "password123" }).expect(200);
    expect(setup.body.requiresPasswordSetup).toBe(false);
    await agent.get("/api/projects").expect(200);
    expect((testDb.sqlite.prepare("SELECT value FROM app_settings WHERE key = 'admin_setup_done'").get() as { value: string }).value).toBe("true");
  });

  it("umgeht Login nur bei aktivem Admin-Bypass und nutzt Standardadmin-Rechte", async () => {
    config.authBypassAdmin = true;
    testDb.sqlite.prepare("UPDATE users SET password_hash = NULL WHERE email = 'admin@local'").run();
    testDb.sqlite.prepare("UPDATE app_settings SET value = 'false' WHERE key = 'admin_setup_done'").run();

    const me = await supertest(app.server).get("/api/auth/me").expect(200);
    expect(me.body).toMatchObject({
      email: "admin@local",
      role: { key: "admin" },
      requiresPasswordSetup: false
    });

    await supertest(app.server).get("/api/projects").expect(200);
    await supertest(app.server).get("/api/admin/users").expect(200);

    config.authBypassAdmin = false;
    await supertest(app.server).get("/api/projects").expect(401);
  });

  it("legt Benutzer an, speichert Passwörter gehasht und schützt Admin-Routen vor Nicht-Admins", async () => {
    const admin = await loginAdmin(app);
    const roles = await admin.get("/api/admin/roles").expect(200);
    const readerRole = roles.body.find((role: { key: string }) => role.key === "reader") as { id: number };

    const created = await admin
      .post("/api/admin/users")
      .send({ firstName: "Read", lastName: "Only", email: "reader@example.test", roleId: readerRole.id, password: "password123", isActive: true })
      .expect(201);

    expect(created.body.passwordHash).toBeUndefined();
    const stored = testDb.sqlite.prepare("SELECT password_hash FROM users WHERE email = ?").get("reader@example.test") as { password_hash: string };
    expect(stored.password_hash).not.toBe("password123");
    expect(await bcrypt.compare("password123", stored.password_hash)).toBe(true);

    const reader = supertest.agent(app.server);
    await reader.post("/api/auth/login").send({ email: "reader@example.test", password: "password123" }).expect(200);
    await reader.get("/api/projects").expect(200);
    await reader.post("/api/projects").send({ name: "Nicht erlaubt" }).expect(403);
    await reader.get("/api/catalogs").expect(200);
    const ticketTypes = await admin.get("/api/catalogs/ticketType").expect(200);
    const bugType = ticketTypes.body.find((entry: { key: string }) => entry.key === "bug") as { id: number };
    await reader.post("/api/catalogs/ticketType").send({ key: "reader_blocked", label: "Reader Blocked" }).expect(403);
    await reader.delete(`/api/catalogs/ticketType/${bugType.id}`).expect(403);
    await reader.get("/api/admin/users").expect(403);
  });

  it("liefert aktive User-Auswahl für users:read und blockiert fehlende Rechte", async () => {
    const admin = await loginAdmin(app);
    const roles = await admin.get("/api/admin/roles").expect(200);
    const readerRole = roles.body.find((role: { key: string }) => role.key === "reader") as { id: number };

    await admin
      .post("/api/admin/users")
      .send({ firstName: "Active", lastName: "Person", email: "active@example.test", roleId: readerRole.id, password: "password123", isActive: true })
      .expect(201);
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Inactive", lastName: "Person", email: "inactive-user@example.test", roleId: readerRole.id, password: "password123", isActive: false })
      .expect(201);

    await supertest(app.server).get("/api/users").expect(401);

    const reader = supertest.agent(app.server);
    await reader.post("/api/auth/login").send({ email: "active@example.test", password: "password123" }).expect(200);
    const users = await reader.get("/api/users").expect(200);

    expect(users.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: "admin@local", fullName: "Admin, Test" }),
        expect.objectContaining({ email: "active@example.test", fullName: "Person, Active" })
      ])
    );
    expect(users.body.some((user: { email: string }) => user.email === "inactive-user@example.test")).toBe(false);
    expect(users.body[0]).not.toHaveProperty("role");
    expect(users.body[0]).not.toHaveProperty("address");

    const limitedRole = await admin
      .post("/api/admin/roles")
      .send({ key: "ticket_only", label: "Ticket Only", permissions: [{ resource: "tickets", action: "read" }] })
      .expect(201);
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Limited", lastName: "Person", email: "limited@example.test", roleId: limitedRole.body.id, password: "password123", isActive: true })
      .expect(201);

    const limited = supertest.agent(app.server);
    await limited.post("/api/auth/login").send({ email: "limited@example.test", password: "password123" }).expect(200);
    await limited.get("/api/users").expect(403);
  });

  it("verhindert Self-Delete und das Entfernen des letzten aktiven Admins", async () => {
    const admin = await loginAdmin(app);
    const users = await admin.get("/api/admin/users").expect(200);
    const currentAdmin = users.body.find((user: { email: string }) => user.email === "admin@local") as { id: number; version: number };

    await admin.delete(`/api/admin/users/${currentAdmin.id}`).expect(400);
    await admin.put(`/api/admin/users/${currentAdmin.id}`).send({ isActive: false, expectedVersion: currentAdmin.version }).expect(409);
  });

  it("verwaltet Rollen versioniert und wertet benutzerdefinierte Permissions aus", async () => {
    const admin = await loginAdmin(app);
    const catalog = await admin.get("/api/admin/permissions/catalog").expect(200);
    expect(catalog.body.resources).toContain("projects");
    expect(catalog.body.actions).toContain("read");

    const role = await admin
      .post("/api/admin/roles")
      .send({ key: "project_reader", label: "Project Reader", permissions: [{ resource: "projects", action: "read" }] })
      .expect(201);

    const updated = await admin
      .put(`/api/admin/roles/${role.body.id}`)
      .send({
        label: "Project Reader Plus",
        permissions: [
          { resource: "projects", action: "read" },
          { resource: "tickets", action: "read" }
        ],
        expectedVersion: role.body.version
      })
      .expect(200);
    expect(updated.body.version).toBe(role.body.version + 1);

    await admin
      .post("/api/admin/users")
      .send({ firstName: "Custom", lastName: "Role", email: "custom@example.test", roleId: updated.body.id, password: "password123", isActive: true })
      .expect(201);

    const custom = supertest.agent(app.server);
    await custom.post("/api/auth/login").send({ email: "custom@example.test", password: "password123" }).expect(200);
    await custom.get("/api/projects").expect(200);
    await custom.get("/api/tickets").expect(200);
    await custom.post("/api/projects").send({ name: "Nicht erlaubt" }).expect(403);
  });
});
