import { expect, test } from "@playwright/test";
import {
  apiBaseUrl,
  authenticatedGoto,
  ensureApiAuth,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Root-Route zeigt eine echte Startseite mit Home-Dashboard.
 * - Ein persönliches Startseiten-Dashboard wird über den echten API-Pfad mit context home gespeichert.
 * - Die alte hardcodierte Kalender-Vorschau ist entfernt.
 *
 * Fehlerfälle:
 * - Redirect von / nach /projects, falsch gespeicherter Dashboard-Kontext und alter Kalenderbereich.
 *
 * Ziel:
 * Den neuen App-Einstieg und die Bearbeitung des Startseiten-Dashboards im Browser absichern.
 */

test.describe("Startseite", () => {
  test("zeigt Home-Dashboard ohne alte Kalender-Vorschau auf /", async ({ page }) => {
    await authenticatedGoto(page, "/");

    await expect(page.getByRole("heading", { name: "Startseite", exact: true })).toBeVisible();
    await expect(page.getByTestId("dashboard-view-home")).toBeVisible();
    await expect(page.getByText("Startseiten-Dashboard")).toHaveCount(0);
    await expect(page.getByTestId("start-calendar-preview")).toHaveCount(0);
    await expect(page.getByTestId("start-dashboard-section")).toHaveCount(0);
  });

  test("speichert über den Toggle ein persönliches Startseiten-Dashboard", async ({ page, request }) => {
    let createdDashboardId: number | null = null;

    try {
      await authenticatedGoto(page, "/");

      await expect(page.getByTestId("dashboard-view-home")).toBeVisible();
      await page.getByRole("button", { name: "Neue Ansicht" }).click();
      await expect(page.getByRole("heading", { name: "Dashboard-Editor" })).toBeVisible();

      const saveResponse = page.waitForResponse((response) => response.url().includes("/api/dashboards") && response.request().method() === "POST");
      await page.getByRole("button", { name: "Als eigenes Dashboard speichern" }).click();
      const created = (await (await saveResponse).json()) as { id: number; context: string };
      createdDashboardId = created.id;

      expect(created.context).toBe("home");
    } finally {
      if (createdDashboardId) {
        await ensureApiAuth(request);
        await request.delete(`${apiBaseUrl}/dashboards/${createdDashboardId}`);
      }
    }
  });
});
