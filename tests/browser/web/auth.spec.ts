import { expect, test } from "@playwright/test";
import { apiBaseUrl, authenticatedGoto, ensureApiAuth, uniqueTitle } from "./domain-test-utils";

test("Direktaufruf ohne Session landet beim Login und kehrt nach Login zur Route zurück", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();

  await page.getByLabel("E-Mail").fill("admin@local");
  await page.getByLabel("Passwort").fill("password123");
  await page.getByRole("button", { name: "Anmelden" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Startseite", exact: true })).toBeVisible();
});

test("Admin legt Benutzer in der UI an; Nicht-Admin sieht keine Administration", async ({ page }) => {
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
  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill("password123");
  const readerLoginResponse = page.waitForResponse((response) => response.url().endsWith("/api/auth/login") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect((await readerLoginResponse).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Startseite", exact: true })).toBeVisible();

  await expect(page.getByText("Administration")).toHaveCount(0);
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Kein Zugriff auf dieses Projekt." })).toBeVisible();
});

test("Inaktiver Benutzer kann sich nicht anmelden", async ({ request, page }) => {
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

  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill("password123");
  await page.getByRole("button", { name: "Anmelden" }).click();

  await expect(page.getByText("Account is disabled")).toBeVisible();
});
