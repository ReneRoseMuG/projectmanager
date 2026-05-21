import { expect, test } from "@playwright/test";
import { authenticatedGoto, apiBaseUrl, createMilestone, createProject, createTask, deleteProject, deleteTask, formPage, itemCard, uniqueTitle } from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Der KI-Agent-Execute-Pfad kann bestätigte Aktionen über die echte API ausführen.
 * - Der KI-Bearbeiten-Button an RichTextInlineField übernimmt eine KI-Textantwort in das Feld.
 *
 * Fehlerfälle:
 * - Agent-Aktionen ohne sichtbares UI-Ergebnis im betroffenen Board.
 * - KI-Textantworten, die nicht in den anschließenden Editierzustand übernommen werden.
 *
 * Ziel:
 * Die KI-Workflows browsernah gegen echte App-Navigation und Formularzustände absichern.
 */

test.describe("KI-Workflows", () => {
  test("Agent legt Aufgabe an und sie erscheint im Meilenstein-Board", async ({ page, request }) => {
    const project = await createProject(request, "E2E AI Agent Project");
    const milestone = await createMilestone(request, project.id, "E2E AI Agent Milestone");
    const taskTitle = uniqueTitle("E2E AI Agent Task");
    let taskId: number | null = null;

    try {
      const executeResponse = await request.post(`${apiBaseUrl}/ai/agent/execute`, {
        data: {
          actions: [
            {
              type: "createTask",
              label: "Aufgabe anlegen",
              description: "Aufgabe per KI-Agent anlegen",
              payload: {
                ownerType: "milestone",
                ownerId: milestone.id,
                title: taskTitle,
                description: "<p>E2E Agent Beschreibung</p>"
              },
              requiresConfirmation: true
            }
          ]
        }
      });
      expect(executeResponse.ok()).toBeTruthy();
      const executeBody = (await executeResponse.json()) as { results: Array<{ success: boolean; entityId: number | null }> };
      expect(executeBody.results[0]).toMatchObject({ success: true });
      taskId = executeBody.results[0].entityId;
      expect(taskId).toEqual(expect.any(Number));

      await authenticatedGoto(page, `/milestones/${milestone.id}`);
      const milestoneForm = formPage(page, "Meilenstein bearbeiten");
      await milestoneForm.getByRole("button", { name: /Aufgaben/ }).click();

      await expect(itemCard(milestoneForm, taskTitle)).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
      await deleteTask(request, taskId);
    }
  });

  test("Mit KI bearbeiten übernimmt eine Textantwort ins Beschreibungsfeld", async ({ page, request }) => {
    const project = await createProject(request, "E2E AI Field Project");
    const task = await createTask(request, { type: "project", id: project.id }, "E2E AI Field Task", { description: "<p>Alte Beschreibung</p>" });

    try {
      await page.route("**/api/ai/text", async (route) => {
        const body = route.request().postDataJSON() as { html: string; operation: string; instruction: string };
        expect(body).toMatchObject({
          html: "<p>Alte Beschreibung</p>",
          operation: "rewrite",
          instruction: "Formuliere präziser"
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ model: "playwright", html: "<p>E2E KI Ergebnis</p>" })
        });
      });

      await authenticatedGoto(page, `/tasks/${task.id}?returnTo=${encodeURIComponent(`/projects/${project.id}`)}`);
      const taskForm = formPage(page, "Aufgabe bearbeiten");

      await taskForm.getByRole("button", { name: "Mit KI bearbeiten" }).click();
      await page.getByLabel("Anweisung").fill("Formuliere präziser");
      await page.getByRole("button", { name: "Generieren" }).click();

      const editor = taskForm.locator('[data-testid="task-description-editor"] [contenteditable="true"]');
      await expect(editor).toBeVisible();
      await expect(editor).toContainText("E2E KI Ergebnis");
    } finally {
      await deleteProject(request, project.id);
      await deleteTask(request, task.id);
    }
  });
});
