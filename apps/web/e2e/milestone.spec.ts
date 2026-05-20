import { expect, test } from "@playwright/test";
import {
  authenticatedGoto,
  apiBaseUrl,
  createEvent,
  createFeature,
  createMilestone,
  createProject,
  createTask,
  createTicket,
  deleteEvent,
  deleteFeature,
  deleteProject,
  deleteTask,
  deleteTicket,
  expectRichText,
  fillRichText,
  formPage,
  itemCard,
  uniqueTitle
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Meilensteine sind als Tab im Projektformular sichtbar und öffnen die kanonischen Routen `/milestones/new` und `/milestones/:id`.
 * - Das Meilensteinformular zeigt Stammdaten inklusive Projektzuordnung und alle Subviews mit echten API-Daten.
 * - Subviews reagieren auf Datenänderungen ohne Browser-Reload, insbesondere Kommentar-Counts nach Mutation.
 *
 * Fehlerfälle:
 * - Fehlende Projektvorbelegung, leere Subviews trotz API-Daten oder ausbleibende Query-Invalidierung nach Mutation.
 *
 * Ziel:
 * Den Milestone-UI-Workflow im Browser gegen echte API-Daten absichern.
 */

function milestoneIdFromUrl(url: string): number {
  const id = Number(new URL(url).pathname.split("/").pop());
  expect(Number.isFinite(id)).toBeTruthy();
  return id;
}

test.describe("Meilenstein-Formular und Projekt-Tab", () => {
  test("Projektformular erstellt Meilensteine über den neuen Tab und aktualisiert die Menge", async ({ page, request }) => {
    const project = await createProject(request, "E2E Milestone Project Tab");
    const milestoneName = uniqueTitle("E2E Milestone From Project");
    let milestoneId: number | null = null;

    try {
      await authenticatedGoto(page, `/projects/${project.id}`);
      const projectForm = formPage(page, "Projekt bearbeiten");
      await projectForm.getByRole("button", { name: /Meilensteine/ }).click();
      await expect(projectForm.getByRole("button", { name: "Neuer Meilenstein" })).toBeVisible();

      await projectForm.getByRole("button", { name: "Neuer Meilenstein" }).click();
      await expect(page).toHaveURL(/\/milestones\/new/);
      const milestoneForm = formPage(page, "Meilenstein anlegen");
      await expect(milestoneForm.locator("select[required]")).toHaveValue(String(project.id));
      await milestoneForm.locator("input[required]").first().fill(milestoneName);
      await fillRichText(milestoneForm, "milestone-description", "E2E Meilensteinbeschreibung vollständig");
      await milestoneForm.locator('input[type="date"]').nth(0).fill("2026-06-01");
      await milestoneForm.locator('input[type="date"]').nth(1).fill("2026-06-30");
      await milestoneForm.getByRole("button", { name: "Meilenstein anlegen" }).click();

      await expect(page).toHaveURL(/\/milestones\/\d+/);
      milestoneId = milestoneIdFromUrl(page.url());

      await authenticatedGoto(page, `/projects/${project.id}`);
      const refreshedProjectForm = formPage(page, "Projekt bearbeiten");
      await expect(refreshedProjectForm.getByRole("button", { name: /Meilensteine\s+1/ })).toBeVisible();
      await refreshedProjectForm.getByRole("button", { name: /Meilensteine/ }).click();
      await expect(itemCard(refreshedProjectForm, milestoneName)).toBeVisible();
    } finally {
      if (milestoneId) {
        await request.delete(`${apiBaseUrl}/milestones/${milestoneId}`);
      }
      await deleteProject(request, project.id);
    }
  });

  test("Meilensteinformular zeigt Stammdaten und aktualisierte Subview-Mengen", async ({ page, request }) => {
    const project = await createProject(request, "E2E Milestone Detail Project");
    const milestone = await createMilestone(request, project.id, "E2E Milestone Detail");
    const feature = await createFeature(request, "E2E Milestone Feature");
    const task = await createTask(request, { type: "milestone", id: milestone.id }, "E2E Milestone Task");
    const ticket = await createTicket(request, { type: "milestone", id: milestone.id }, "E2E Milestone Ticket");
    const event = await createEvent(request, "E2E Milestone Event", { owners: [{ type: "milestone", id: milestone.id }] });

    const featureResponse = await request.put(`${apiBaseUrl}/milestones/${milestone.id}/features`, { data: { featureIds: [feature.id] } });
    expect(featureResponse.ok()).toBeTruthy();
    const noteResponse = await request.post(`${apiBaseUrl}/milestones/${milestone.id}/notes`, { data: { title: "E2E Milestone Note", contentJson: { type: "doc" } } });
    expect(noteResponse.ok()).toBeTruthy();
    const commentResponse = await request.post(`${apiBaseUrl}/milestones/${milestone.id}/comments`, { data: { body: "E2E Milestone Comment" } });
    expect(commentResponse.ok()).toBeTruthy();
    const attachmentResponse = await request.post(`${apiBaseUrl}/milestones/${milestone.id}/attachments`, {
      multipart: {
        file: {
          name: "e2e-milestone.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("E2E milestone attachment")
        }
      }
    });
    expect(attachmentResponse.ok()).toBeTruthy();

    try {
      await authenticatedGoto(page, `/milestones/${milestone.id}`);
      const milestoneForm = formPage(page, "Meilenstein bearbeiten");
      await expect(milestoneForm.locator("input[required]").first()).toHaveValue(milestone.name);
      await expect(milestoneForm.locator("select[required]")).toHaveValue(String(project.id));
      await expectRichText(milestoneForm, "E2E Meilensteinbeschreibung vollständig");

      await expect(milestoneForm.getByRole("button", { name: /Features\s+1/ })).toBeVisible();
      await expect(milestoneForm.getByRole("button", { name: /Aufgaben\s+1/ })).toBeVisible();
      await expect(milestoneForm.getByRole("button", { name: /Tickets\s+1/ })).toBeVisible();
      await expect(milestoneForm.getByRole("button", { name: /Kommentare\s+1/ })).toBeVisible();
      await expect(milestoneForm.getByRole("button", { name: /Notizen\s+1/ })).toBeVisible();
      await expect(milestoneForm.getByRole("button", { name: /Dateien\s+1/ })).toBeVisible();
      await expect(milestoneForm.getByRole("button", { name: /Events\s+1/ })).toBeVisible();

      await milestoneForm.getByRole("button", { name: /Features/ }).click();
      await expect(itemCard(milestoneForm, feature.title)).toBeVisible();
      await milestoneForm.getByRole("button", { name: /Aufgaben/ }).click();
      await expect(itemCard(milestoneForm, task.title)).toBeVisible();
      await milestoneForm.getByRole("button", { name: /Tickets/ }).click();
      await expect(itemCard(milestoneForm, ticket.title)).toBeVisible();
      await milestoneForm.getByRole("button", { name: /Notizen/ }).click();
      await expect(milestoneForm).toContainText("E2E Milestone Note");
      await milestoneForm.getByRole("button", { name: /Dateien/ }).click();
      await expect(milestoneForm).toContainText("e2e-milestone.txt");
      await milestoneForm.getByRole("button", { name: /Events/ }).click();
      await expect(itemCard(milestoneForm, event.title)).toBeVisible();

      await milestoneForm.getByRole("button", { name: /Kommentare/ }).click();
      await fillRichText(milestoneForm, "comment-thread-body", "E2E Live Kommentar");
      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/api/milestones/${milestone.id}/comments`) && response.request().method() === "POST"),
        milestoneForm.getByRole("button", { name: "Kommentar", exact: true }).click()
      ]);
      await expect(milestoneForm.getByRole("button", { name: /Kommentare\s+2/ })).toBeVisible();
      await expect(milestoneForm).toContainText("E2E Live Kommentar");
    } finally {
      await deleteEvent(request, event.id);
      await deleteProject(request, project.id);
      await deleteTask(request, task.id);
      await deleteTicket(request, ticket.id);
      await deleteFeature(request, feature.id);
    }
  });
});
