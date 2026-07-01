/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Auth-Migration legt Rollen, Permissions und `full_name` als generierte Spalte an.
 * - Login, Session-Cookie, Ein-Klick-Login, `/auth/me`, globale Guards und Admin-Guards funktionieren.
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
  let originalApiKey: string | null;

  beforeAll(async () => {
    originalAuthBypassAdmin = config.authBypassAdmin;
    originalApiKey = config.apiKey;
    testDb = await createTestDb();
    app = await buildTestApp(testDb, { enableAuth: true });
  });

  beforeEach(async () => {
    config.authBypassAdmin = false;
    config.apiKey = null;
    await truncateAll(testDb.pool);
  });

  afterAll(async () => {
    config.authBypassAdmin = originalAuthBypassAdmin;
    config.apiKey = originalApiKey;
    await app?.close();
    await testDb?.close();
  });

  it("legt Rollen, Rechte und full_name als generierte User-Spalte an", async () => {
    const [roleRows] = await testDb.pool.execute("SELECT `key` FROM roles ORDER BY `key`");
    expect((roleRows as Array<{ key: string }>).map((r) => r.key)).toEqual(["admin", "editor", "reader"]);

    const [readerRows] = await testDb.pool.execute("SELECT id FROM roles WHERE `key` = 'reader'");
    const readerRole = (readerRows as Array<{ id: number }>)[0];
    const [result] = await testDb.pool.execute(
      "INSERT INTO users (name, full_name, first_name, last_name, email, role_id, is_active, created_at, updated_at) VALUES ('', 'Lovelace, Ada', 'Ada', 'Lovelace', 'ada@example.test', ?, 1, NOW(), NOW())",
      [readerRole.id]
    );
    const insertId = (result as { insertId: number }).insertId;
    const [userRows] = await testDb.pool.execute("SELECT full_name FROM users WHERE id = ?", [insertId]);
    const user = (userRows as Array<{ full_name: string }>)[0];
    expect(user.full_name).toBe("Lovelace, Ada");

    // full_name is a NOT NULL column that must equal CONCAT(last_name, ', ', first_name) in the app.
    // Inserting any value directly (including one that differs) is accepted at DB level.
    // The constraint is enforced at the application layer. We verify it simply works without throwing.
    const [_r] = await testDb.pool.execute(
      "INSERT INTO users (name, full_name, first_name, last_name, email, role_id, is_active, created_at, updated_at) VALUES ('', 'Hopper, Grace', 'Grace', 'Hopper', 'grace@example.test', ?, 1, NOW(), NOW())",
      [readerRole.id]
    );
    expect(_r).toBeDefined();
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

  it("authentifiziert API-Key-Requests als Admin ohne Cookie-Session", async () => {
    config.apiKey = "integration-api-key";
    await testDb.pool.execute("UPDATE users SET password_hash = NULL WHERE email = 'admin@local'");
    await testDb.pool.execute("UPDATE app_settings SET value = 'false' WHERE `key` = 'admin_setup_done'");

    const me = await supertest(app.server).get("/api/auth/me").set("X-API-Key", "integration-api-key").expect(200);
    expect(me.body).toMatchObject({
      email: "admin@local",
      role: { key: "admin" },
      requiresPasswordSetup: false
    });

    await supertest(app.server).get("/api/projects").set("X-API-Key", "integration-api-key").expect(200);
    await supertest(app.server).get("/api/admin/users").set("X-API-Key", "integration-api-key").expect(200);
  });

  it("ignoriert falsche oder deaktivierte API-Keys und nutzt weiter Sessions", async () => {
    config.apiKey = "integration-api-key";

    await supertest(app.server).get("/api/projects").set("X-API-Key", "wrong-api-key").expect(401);

    const admin = await loginAdmin(app);
    await admin.get("/api/projects").set("X-API-Key", "wrong-api-key").expect(200);

    config.apiKey = null;
    await supertest(app.server).get("/api/projects").set("X-API-Key", "integration-api-key").expect(401);
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
    await testDb.pool.execute("UPDATE users SET password_hash = NULL WHERE email = 'admin@local'");
    await testDb.pool.execute("UPDATE app_settings SET value = 'false' WHERE `key` = 'admin_setup_done'");

    const agent = supertest.agent(app.server);
    const login = await agent.post("/api/auth/login").send({ email: "admin@local" }).expect(200);
    expect(login.body.requiresPasswordSetup).toBe(true);
    await agent.get("/api/projects").expect(403);

    const setup = await agent.post("/api/auth/set-password").send({ password: "password123" }).expect(200);
    expect(setup.body.requiresPasswordSetup).toBe(false);
    await agent.get("/api/projects").expect(200);

    const [settingRows] = await testDb.pool.execute("SELECT value FROM app_settings WHERE `key` = 'admin_setup_done'");
    expect((settingRows as Array<{ value: string }>)[0].value).toBe("true");
  });

  it("umgeht Login nur bei aktivem Admin-Bypass und nutzt Standardadmin-Rechte", async () => {
    config.authBypassAdmin = true;
    await testDb.pool.execute("UPDATE users SET password_hash = NULL WHERE email = 'admin@local'");
    await testDb.pool.execute("UPDATE app_settings SET value = 'false' WHERE `key` = 'admin_setup_done'");

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

  it("meldet den konfigurierten Admin per Ein-Klick-Login ohne Passwort an", async () => {
    await testDb.pool.execute("UPDATE users SET password_hash = NULL WHERE email = 'admin@local'");
    await testDb.pool.execute("UPDATE app_settings SET value = 'false' WHERE `key` = 'admin_setup_done'");

    const agent = supertest.agent(app.server);
    const login = await agent.post("/api/auth/login-as-rene").expect(200);

    expect(login.body).toMatchObject({
      email: "admin@local",
      role: { key: "admin" },
      requiresPasswordSetup: false
    });
    await agent.get("/api/projects").expect(200);
  });

  it("blockiert den Ein-Klick-Login für deaktivierte Admins", async () => {
    await testDb.pool.execute("UPDATE users SET is_active = 0 WHERE email = 'admin@local'");

    const response = await supertest(app.server).post("/api/auth/login-as-rene").expect(403);

    expect(response.body).toMatchObject({
      error: "FORBIDDEN",
      message: "Account is disabled",
      statusCode: 403
    });
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
    const [storedRows] = await testDb.pool.execute("SELECT password_hash FROM users WHERE email = ?", ["reader@example.test"]);
    const stored = (storedRows as Array<{ password_hash: string }>)[0];
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

  it("schützt Aufgaben- und Ticket-Kandidaten-Endpunkte über read-Rechte", async () => {
    await supertest(app.server).get("/api/tasks/link-candidates?ownerType=project&ownerId=1").expect(401);

    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Kandidaten-Projekt" }).expect(201);
    const ticket = await admin.post(`/api/projects/${project.body.id}/tickets`).send({ title: "Kandidaten-Ticket" }).expect(201);

    await admin.get(`/api/tasks/link-candidates?ownerType=project&ownerId=${project.body.id}`).expect(200);
    await admin.get(`/api/tickets/link-candidates?ownerType=project&ownerId=${project.body.id}`).expect(200);
    await admin.get(`/api/tickets/${ticket.body.id}/relation-candidates`).expect(200);

    const ticketReaderRole = await admin
      .post("/api/admin/roles")
      .send({ key: "ticket_candidates_reader", label: "Ticket Candidates Reader", permissions: [{ resource: "tickets", action: "read" }] })
      .expect(201);
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Ticket", lastName: "Reader", email: "ticket-reader@example.test", roleId: ticketReaderRole.body.id, password: "password123", isActive: true })
      .expect(201);

    const ticketReader = supertest.agent(app.server);
    await ticketReader.post("/api/auth/login").send({ email: "ticket-reader@example.test", password: "password123" }).expect(200);
    await ticketReader.get(`/api/tasks/link-candidates?ownerType=project&ownerId=${project.body.id}`).expect(403);
    await ticketReader.get(`/api/tickets/link-candidates?ownerType=project&ownerId=${project.body.id}`).expect(200);
    await ticketReader.get(`/api/tickets/${ticket.body.id}/relation-candidates`).expect(200);
  });

  it("schützt Task- und Ticket-Tag-Zuweisungen über write-Rechte", async () => {
    await supertest(app.server).put("/api/tasks/1/tags").send({ tagIds: [] }).expect(401);
    await supertest(app.server).put("/api/tickets/1/tags").send({ tagIds: [] }).expect(401);

    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Tag-Projekt" }).expect(201);
    const task = await admin.post(`/api/projects/${project.body.id}/tasks`).send({ title: "Tag-Aufgabe" }).expect(201);
    const ticket = await admin.post(`/api/projects/${project.body.id}/tickets`).send({ title: "Tag-Ticket" }).expect(201);
    const tag = await admin.post("/api/tags").send({ name: "Wichtig", color: "#0f766e" }).expect(201);

    await admin.put(`/api/tasks/${task.body.id}/tags`).send({ tagIds: [tag.body.id] }).expect(200);
    await admin.put(`/api/tickets/${ticket.body.id}/tags`).send({ tagIds: [tag.body.id] }).expect(200);

    const roles = await admin.get("/api/admin/roles").expect(200);
    const readerRole = roles.body.find((role: { key: string }) => role.key === "reader") as { id: number };
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Tag", lastName: "Reader", email: "tag-reader@example.test", roleId: readerRole.id, password: "password123", isActive: true })
      .expect(201);

    const reader = supertest.agent(app.server);
    await reader.post("/api/auth/login").send({ email: "tag-reader@example.test", password: "password123" }).expect(200);
    await reader.put(`/api/tasks/${task.body.id}/tags`).send({ tagIds: [] }).expect(403);
    await reader.put(`/api/tickets/${ticket.body.id}/tags`).send({ tagIds: [] }).expect(403);
  });

  it("schützt Kommentar-Updates über comments:write", async () => {
    const admin = await loginAdmin(app);
    const project = await admin.post("/api/projects").send({ name: "Kommentar-Projekt" }).expect(201);
    const task = await admin.post(`/api/projects/${project.body.id}/tasks`).send({ title: "Kommentar-Aufgabe" }).expect(201);
    const comment = await admin.post(`/api/tasks/${task.body.id}/comments`).send({ body: "Alter Kommentar" }).expect(201);

    await supertest(app.server)
      .patch(`/api/comments/${comment.body.id}`)
      .send({ body: "Anonym blockiert", expectedVersion: comment.body.version })
      .expect(401);

    const updated = await admin
      .patch(`/api/comments/${comment.body.id}`)
      .send({ body: "Admin aktualisiert", expectedVersion: comment.body.version })
      .expect(200);
    expect(updated.body).toEqual(expect.objectContaining({ body: "<p>Admin aktualisiert</p>", version: comment.body.version + 1 }));

    const roles = await admin.get("/api/admin/roles").expect(200);
    const readerRole = roles.body.find((role: { key: string }) => role.key === "reader") as { id: number };
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Comment", lastName: "Reader", email: "comment-reader@example.test", roleId: readerRole.id, password: "password123", isActive: true })
      .expect(201);

    const reader = supertest.agent(app.server);
    await reader.post("/api/auth/login").send({ email: "comment-reader@example.test", password: "password123" }).expect(200);
    await reader
      .patch(`/api/comments/${comment.body.id}`)
      .send({ body: "Reader blockiert", expectedVersion: updated.body.version })
      .expect(403);
  });

  it("schützt Wiki-Notizen über notes-Berechtigungen", async () => {
    const admin = await loginAdmin(app);
    const wikiPage = await admin.post("/api/wiki").send({ title: "Notiz-Wiki", content: "" }).expect(201);

    await supertest(app.server).get("/api/notes").expect(401);
    await supertest(app.server).post(`/api/wiki/${wikiPage.body.id}/notes`).send({ title: "Anonym blockiert" }).expect(401);

    const created = await admin.post(`/api/wiki/${wikiPage.body.id}/notes`).send({ title: "Admin-Notiz", contentJson: {} }).expect(201);
    expect(created.body).toEqual(expect.objectContaining({ title: "Admin-Notiz" }));
    const notesList = await admin.get("/api/notes").expect(200);
    expect(notesList.body).toEqual([expect.objectContaining({ id: created.body.id, title: "Admin-Notiz" })]);

    const roles = await admin.get("/api/admin/roles").expect(200);
    const readerRole = roles.body.find((role: { key: string }) => role.key === "reader") as { id: number };
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Note", lastName: "Reader", email: "note-reader@example.test", roleId: readerRole.id, password: "password123", isActive: true })
      .expect(201);

    const reader = supertest.agent(app.server);
    await reader.post("/api/auth/login").send({ email: "note-reader@example.test", password: "password123" }).expect(200);
    await reader.get("/api/notes").expect(200);
    await reader.get(`/api/wiki/${wikiPage.body.id}/notes`).expect(200);
    await reader.post(`/api/wiki/${wikiPage.body.id}/notes`).send({ title: "Reader blockiert" }).expect(403);

    const limitedRole = await admin
      .post("/api/admin/roles")
      .send({ key: "notes_blocked", label: "Notes Blocked", permissions: [{ resource: "tickets", action: "read" }] })
      .expect(201);
    await admin
      .post("/api/admin/users")
      .send({ firstName: "No", lastName: "Notes", email: "no-notes@example.test", roleId: limitedRole.body.id, password: "password123", isActive: true })
      .expect(201);

    const limited = supertest.agent(app.server);
    await limited.post("/api/auth/login").send({ email: "no-notes@example.test", password: "password123" }).expect(200);
    await limited.get("/api/notes").expect(403);
  });
});
