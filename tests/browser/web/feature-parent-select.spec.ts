import { test, expect } from "./fixtures";
import {
  apiBaseUrl,
  authenticatedGoto,
  createFeature,
  createProject,
  deleteFeature,
  deleteProject,
  formPage,
  itemCard,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Browser/E2E
 *
 * Realitätsgrad:
 * - Echte Browserinteraktion, echte API-Antworten und isolierte E2E-DB.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Playwright-Testserver mit tests/.runtime/e2e.
 *
 * Abgedeckte Regeln:
 * - Feature-Details verknüpfen ein Parent-Projekt über SelectParent.
 *
 * Fehlerfälle:
 * - Reload nach bestehender Relation muss die Projektkarte erneut anzeigen.
 *
 * Ziel:
 * Den sichtbaren Details-Tab-Flow von Auswahl bis Persistenz absichern.
 */
test.describe("Feature Parent-Projekt", () => {
  test("wählt ein Parent-Projekt und zeigt es nach Reload als Karte", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Feature Parent Project");
    const feature = await createFeature(request, "E2E Feature Parent Select");

    try {
      await authenticatedGoto(page, `/features/${feature.id}`);
      let form = formPage(page, "Feature bearbeiten");

      await form.getByRole("button", { name: /Projekt wählen/ }).click();
      await form.getByPlaceholder("Projekt suchen").fill(project.name);

      const linkResponse = page.waitForResponse(
        (response) =>
          response.url() === `${apiBaseUrl}/projects/${project.id}/features` &&
          response.request().method() === "PUT",
      );
      await form.getByRole("option", { name: new RegExp(project.name) }).click();
      await linkResponse;

      await expect(itemCard(form, project.name)).toBeVisible();

      const relationResponse = await request.get(
        `${apiBaseUrl}/projects/${project.id}/features`,
      );
      expect(relationResponse.ok()).toBeTruthy();
      const linkedFeatures = (await relationResponse.json()) as Array<{
        id: number;
      }>;
      expect(linkedFeatures.some((item) => item.id === feature.id)).toBeTruthy();

      await page.reload();
      form = formPage(page, "Feature bearbeiten");
      await expect(itemCard(form, project.name)).toBeVisible();
    } finally {
      await deleteFeature(request, feature.id);
      await deleteProject(request, project.id);
    }
  });
});
