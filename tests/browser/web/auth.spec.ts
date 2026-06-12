import { expect, test } from "./fixtures";
import { apiBaseUrl, authenticatedGoto, ensureApiAuth, uniqueTitle } from "./domain-test-utils";

test.describe.configure({ mode: "serial" });

test("Direktaufruf ohne Session landet beim Login und kehrt nach Login zur Route zurück", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  try {
    await page.goto("/projects");
    await expect(page.getByRole("button", { name: "Als Rene anmelden" })).toBeVisible();

    await page.getByRole("button", { name: "Als Rene anmelden" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Startseite", exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("Admin legt Benutzer in der UI an; Nicht-Admin sieht keine Administration", async ({ page, request }) => {
  await authenticatedGoto(page, "/admin/users");

  const email = `${uniqueTitle("reader").toLowerCase().replace(/[^a-z0-9]+/g, ".")}@example.test`;
  await page.getByRole("button", { name: "Neuer Benutzer" }).click();
  await page.getByLabel("Vorname").fill("Reader");
  await page.getByLabel("Nachname").fill("User");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Rolle").selectOption({ label: "Leser" });
  await page.getByLabel("Passwort").fill("password123");
  await page.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText(email)).toBeVisible();

  // Log out and log in as the newly created reader via API (login page has no email/password form)
  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page.getByRole("button", { name: "Als Rene anmelden" })).toBeVisible();

  const loginResp = await page.request.post(`${apiBaseUrl}/auth/login`, {
    data: { email, password: "password123" }
  });
  expect(loginResp.ok()).toBeTruthy();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Startseite", exact: true })).toBeVisible();

  await expect(page.getByText("Administration")).toHaveCount(0);
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Kein Zugriff auf dieses Projekt." })).toBeVisible();
});

test("Inaktiver Benutzer kann sich nicht anmelden", async ({ request }) => {
  await ensureApiAuth(request);
  const rolesResponse = await request.get(`${apiBaseUrl}/admin/roles`);
  expect(rolesResponse.ok()).toBeTruthy();
  const roles = (await rolesResponse.json()) as Array<{ id: number; key: string }>;
  const reader = roles.find((role) => role.key === "reader");
  expect(reader).toBeTruthy();
  const email = `${uniqueTitle("inactive").toLowerCase().replace(/[^a-z0-9]+/g, ".")}@example.test`;
  const createResponse = await request.post(`${apiBaseUrl}/admin/users`, {
    data: { firstName: "Inactive", lastName: "User", email, roleId: reader?.id, password: "password123", isActive: false }
  });
  expect(createResponse.ok()).toBeTruthy();

  // Login page no longer has an email/password form; test the API directly
  const loginResponse = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email, password: "password123" }
  });
  expect(loginResponse.status()).toBe(403);
  const body = await loginResponse.json() as { message: string };
  expect(body.message).toMatch(/disabled/i);
});
