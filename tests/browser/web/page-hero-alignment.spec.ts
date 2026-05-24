/**
 * Test Scope:
 * PageHero- und Sidebar-Alignment
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
 * - Listenansicht und Detailansicht nutzen denselben Hero-Höhenmechanismus wie der Sidebar-Kopf.
 * - Der kollabierte Sidebar-Zustand bleibt bedienbar und entfernt das Suchfeld.
 *
 * Fehlerfälle:
 * - Die Sidebar-Unterkante darf nicht sichtbar gegen die PageHero-Unterkante verrutschen.
 *
 * Ziel:
 * Das visuelle Fluchten aus TASK-47 als beobachtbare Browser-Geometrie absichern.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticatedGoto } from "./domain-test-utils";

async function expectHeroAlignment(page: Page) {
  const sidebarHero = page.getByTestId("sidebar-hero");
  const pageHero = page.getByTestId("page-hero").first();

  await expect(sidebarHero).toBeVisible();
  await expect(pageHero).toBeVisible();

  const sidebarBox = await sidebarHero.boundingBox();
  const heroBox = await pageHero.boundingBox();

  expect(sidebarBox).not.toBeNull();
  expect(heroBox).not.toBeNull();

  const sidebarBottom = sidebarBox!.y + sidebarBox!.height;
  const heroBottom = heroBox!.y + heroBox!.height;

  expect(Math.abs(sidebarBottom - heroBottom)).toBeLessThanOrEqual(1);
}

test("fluchtet Listen- und Detail-Hero mit dem Sidebar-Kopf", async ({ page }) => {
  await authenticatedGoto(page, "/projects");
  await expect(page.getByRole("heading", { name: "Projekte" })).toBeVisible();
  await expectHeroAlignment(page);

  await authenticatedGoto(page, "/projects/new");
  await expect(page.getByRole("heading", { name: "Projekt anlegen" })).toBeVisible();
  await expectHeroAlignment(page);
});

test("behält den kollabierten Sidebar-Zustand bedienbar", async ({ page }) => {
  await authenticatedGoto(page, "/projects");

  await page.getByTitle("Navigation einklappen").click();

  await expect(page.getByTitle("Navigation aufklappen")).toBeVisible();
  await expect(page.getByPlaceholder("Global suchen")).toHaveCount(0);
  await expect(page.getByTestId("page-hero")).toBeVisible();
});
