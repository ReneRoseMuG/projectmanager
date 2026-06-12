import { expect, test } from "./fixtures";
import { authenticatedGoto, apiBaseUrl, createProject, deleteProject, formPage } from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Das globale Journal ist über die Navigation erreichbar und zeigt konkrete Änderungsaussagen.
 * - Objekt-Detailseiten bieten ein objektbezogenes Journal mit denselben fachlichen Einträgen.
 *
 * Fehlerfälle:
 * - Eine generische oder fehlende Änderungsaussage darf nicht als sichtbarer Journal-Eintrag gelten.
 *
 * Ziel:
 * Den Anwenderpfad vom globalen Journal bis zum Objekt-Journal im Browser absichern.
 */

test.describe("Journal", () => {
  test("zeigt globale und projektbezogene Änderungen nachvollziehbar an", async ({ page, request }) => {
    const project = await createProject(request, "E2E Journal Project", { dueDate: "2026-05-31" });

    try {
      const detailResponse = await request.get(`${apiBaseUrl}/projects/${project.id}`);
      expect(detailResponse.ok()).toBeTruthy();
      const detail = (await detailResponse.json()) as { version: number };

      const updateResponse = await request.patch(`${apiBaseUrl}/projects/${project.id}`, {
        data: { dueDate: "2026-06-15", expectedVersion: detail.version }
      });
      expect(updateResponse.ok()).toBeTruthy();

      await authenticatedGoto(page, "/journal");
      await expect(page.getByRole("heading", { name: "Journal", exact: true })).toBeVisible();
      await expect(page.getByText(`Projekt "${project.name}" hat ein neues Enddatum`, { exact: false })).toBeVisible();

      await page.locator("select").first().selectOption("project");
      await expect(page.getByText("Enddatum", { exact: true })).toBeVisible();
      await expect(page.getByText("15.06.26").first()).toBeVisible();

      await authenticatedGoto(page, `/projects/${project.id}`);
      const projectForm = formPage(page, "Projekt bearbeiten");
      await projectForm.getByRole("button", { name: "Journal" }).click();
      await expect(projectForm.getByText(`Projekt "${project.name}" hat ein neues Enddatum`, { exact: false })).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
    }
  });
});
