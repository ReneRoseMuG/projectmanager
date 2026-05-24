import { expect, test } from "@playwright/test";
import {
  apiBaseUrl,
  authenticatedGoto,
  createEvent,
  deleteEvent,
  ensureApiAuth,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Die Root-Route zeigt eine echte Startseite mit Home-Dashboard und Kalender-Vorschau.
 * - Der Dashboard-Editor kann auf das Startseiten-Dashboard umschalten.
 * - Ein persönliches Startseiten-Dashboard wird über den echten API-Pfad mit context home gespeichert.
 *
 * Fehlerfälle:
 * - Redirect von / nach /projects, fehlender Home-Kontext im Editor und falsch gespeicherter Dashboard-Kontext.
 *
 * Ziel:
 * Den neuen App-Einstieg und die Bearbeitung des Startseiten-Dashboards im Browser absichern.
 */

test.describe("Startseite", () => {
  test("zeigt Home-Dashboard und kompakte Kalender-Vorschau auf /", async ({ page, request }) => {
    const event = await createEvent(request, "E2E Startseite Termin", {
      startTime: "2099-06-01T10:00:00",
      endTime: "2099-06-01T11:00:00",
    });

    try {
      await authenticatedGoto(page, "/");

      await expect(page.getByRole("heading", { name: "Startseite", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Kalender", exact: true })).toBeVisible();
      await expect(page.getByTestId("dashboard-view-home")).toBeVisible();
      await expect(page.getByText("Startseiten-Dashboard")).toHaveCount(0);
      await expect(page.getByText("Kommende Termine und fällige Aufgaben.")).toHaveCount(0);
      await expect(page.getByTestId("start-calendar-preview")).toContainText(event.title);
    } finally {
      await deleteEvent(request, event.id);
    }
  });

  test("speichert im Dashboard-Editor ein persönliches Startseiten-Dashboard", async ({ page, request }) => {
    let createdDashboardId: number | null = null;

    try {
      await authenticatedGoto(page, "/dashboard");

      await page.getByRole("button", { name: "Startseite", exact: true }).click();
      await expect(page.getByTestId("dashboard-view-home")).toBeVisible();
      await page.getByRole("button", { name: "Neues Dashboard" }).click();
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
