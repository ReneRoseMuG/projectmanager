/**
 * Test Scope:
 * PageHero- und Sidebar-Edge-Verhalten
 *
 * Test-Ebene:
 * - Browser/E2E
 *
 * Realitätsgrad:
 * - Echte App, echte API, echter Browser und echte Admin-Session.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; Authentifizierung und Routing laufen über die E2E-Testinstanz.
 *
 * Isolation:
 * - Playwright-Testinstanz mit `tests/.runtime` für DB- und Dateisystemdaten.
 *
 * Abgedeckte Regeln:
 * - Listenansicht und Detailansicht bleiben mit der neuen Edge-Sidebar sichtbar nutzbar.
 * - Der kollabierte Sidebar-Zustand bleibt bedienbar und entfernt das Suchfeld.
 *
 * Fehlerfälle:
 * - Die Sidebar darf nach dem Edge-Refactor nicht auf den alten Hero-Kopf angewiesen sein.
 *
 * Ziel:
 * Das Sidebar-/PageHero-Zusammenspiel nach MS-15 als beobachtbare Browser-Geometrie absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticatedGoto } from "./domain-test-utils";

async function expectEdgeSidebarWithHero(page: Page) {
  const sidebar = page.getByLabel("Hauptnavigation");
  const sidebarHeader = page.getByTestId("sidebar-header");
  const pageHero = page.getByTestId("page-hero").first();

  await expect(sidebar).toBeVisible();
  await expect(sidebarHeader).toBeVisible();
  await expect(pageHero).toBeVisible();

  const sidebarBox = await sidebar.boundingBox();
  const heroBox = await pageHero.boundingBox();

  expect(sidebarBox).not.toBeNull();
  expect(heroBox).not.toBeNull();
  expect(Math.round(sidebarBox!.width)).toBe(272);
  expect(heroBox!.width).toBeGreaterThan(400);
}

test("zeigt Listen- und Detail-Hero mit der Edge-Sidebar", async ({ page }) => {
  await authenticatedGoto(page, "/projects");
  await expect(page.getByRole("heading", { name: "Projekte" })).toBeVisible();
  await expectEdgeSidebarWithHero(page);

  await authenticatedGoto(page, "/projects/new");
  await expect(page.getByRole("heading", { name: "Projekt anlegen" })).toBeVisible();
  await expectEdgeSidebarWithHero(page);
});

test("behält den kollabierten Sidebar-Zustand bedienbar", async ({ page }) => {
  await authenticatedGoto(page, "/projects");

  await page.getByTitle("Navigation einklappen").click();

  await expect(page.getByTitle("Navigation aufklappen")).toBeVisible();
  await expect(page.getByPlaceholder("Navigation durchsuchen")).toHaveCount(0);
  await expect(page.getByTestId("page-hero")).toBeVisible();
});
