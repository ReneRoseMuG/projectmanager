import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import {
  authenticatedGoto,
  apiBaseUrl,
  cleanupTasksByTitle,
  createFeature,
  createProject,
  createTask,
  createUseCase,
  deleteFeature,
  deleteProject,
  deleteTask,
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
 * - Projekt-, Feature- und Use-Case-Detailseiten besitzen einen Aufgaben-Tab.
 * - Neue Aufgaben aus Owner-Tabs navigieren auf `/tasks/new` und speichern als `/tasks/:id`.
 * - Doppelklick und Bearbeiten-Button öffnen verknüpfte Aufgaben als vollständige Detailformular-Seite.
 * - `Verknüpfen` und `Entfernen` bleiben relationale Aktionen und löschen Aufgaben nicht global.
 *
 * Fehlerfälle:
 * - Owner-Aufgaben dürfen nicht mehr als gestapelte Formulare in Parent-Overlays geöffnet werden.
 *
 * Ziel:
 * Die vereinheitlichten OwnerTaskBoard-Flows in allen aufgabenfähigen Domänenformularen im Browser absichern.
 */

type ScopeFactory = () => Promise<Locator>;

async function createUnlinkedTask(request: APIRequestContext, titlePrefix: string) {
  const temporaryProject = await createProject(request, "E2E Temporary Task Owner");
  const task = await createTask(request, { type: "project", id: temporaryProject.id }, titlePrefix);
  const removed = await request.delete(`${apiBaseUrl}/projects/${temporaryProject.id}/tasks/${task.id}`);
  expect(removed.ok()).toBeTruthy();
  await deleteProject(request, temporaryProject.id);
  return task;
}

async function expectTaskStillExists(request: APIRequestContext, taskTitle: string) {
  const response = await request.get(`${apiBaseUrl}/tasks`);
  expect(response.ok()).toBeTruthy();
  const tasks = (await response.json()) as Array<{ title: string }>;
  expect(tasks.some((task) => task.title === taskTitle)).toBe(true);
}

async function openProjectTasks(page: Page, projectId: number) {
  await authenticatedGoto(page, `/projects/${projectId}`);
  const form = formPage(page, "Projekt bearbeiten");
  await form.getByRole("button", { name: /Aufgaben/ }).click();
  await expect(form.getByRole("button", { name: "Neue Aufgabe" })).toBeVisible();
  await expect(form.getByRole("button", { name: "Verknüpfen" })).toBeVisible();
  return form;
}

async function openFeatureTasks(page: Page, featureId: number) {
  await authenticatedGoto(page, `/features/${featureId}`);
  const form = formPage(page, "Feature bearbeiten");
  await form.getByRole("button", { name: /Aufgaben/ }).click();
  await expect(form.getByRole("button", { name: "Neue Aufgabe" })).toBeVisible();
  await expect(form.getByRole("button", { name: "Verknüpfen" })).toBeVisible();
  return form;
}

async function openUseCaseTasks(page: Page, useCaseId: number, featureId: number) {
  await authenticatedGoto(page, `/use-cases/${useCaseId}?returnTo=${encodeURIComponent(`/features/${featureId}`)}`);
  const form = formPage(page, "Use Case bearbeiten");
  await form.getByRole("button", { name: /Aufgaben/ }).click();
  await expect(form.getByRole("button", { name: "Neue Aufgabe" })).toBeVisible();
  await expect(form.getByRole("button", { name: "Verknüpfen" })).toBeVisible();
  return form;
}

async function createTaskInBoard(page: Page, reopenScope: ScopeFactory, title: string) {
  const scope = await reopenScope();
  await scope.getByRole("button", { name: "Neue Aufgabe" }).first().click();
  await expect(page).toHaveURL(/\/tasks\/new\?/);

  const taskForm = formPage(page, "Aufgabe anlegen");
  await taskForm.locator("input[required]").first().fill(title);
  await fillRichText(taskForm, "task-description", "E2E Owner-Aufgabe vollständig");
  await taskForm.getByRole("button", { name: "Aufgabe anlegen" }).click();

  await expect(page).toHaveURL(/\/tasks\/\d+\?/);
  const createdTaskId = Number(new URL(page.url()).pathname.split("/").pop());
  const detailForm = formPage(page, "Aufgabe bearbeiten");
  await expect(detailForm.locator("input[required]").first()).toHaveValue(title);
  await expectRichText(detailForm, "E2E Owner-Aufgabe vollständig");

  const reopened = await reopenScope();
  await expect(itemCard(reopened, title)).toBeVisible();
  return createdTaskId;
}

async function linkTaskInBoard(page: Page, reopenScope: ScopeFactory, title: string) {
  const scope = await reopenScope();
  await scope.getByRole("button", { name: "Verknüpfen" }).first().click();
  const dialog = page.locator(".fixed.inset-0").filter({ has: page.getByRole("heading", { name: "Aufgabe verknüpfen" }) }).last();
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Speichern" })).toHaveCount(0);
  await dialog.getByPlaceholder("Aufgaben suchen").fill(title);
  await expect(dialog.getByText(title)).toBeVisible();
  await dialog.getByRole("button", { name: "Verknüpfen" }).last().click();
  await expect(page.getByRole("status")).toContainText("Aufgabe verknüpft");

  const closeButton = dialog.getByRole("button", { name: "Schließen" });
  if (await closeButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await closeButton.click();
  }
  const reopened = await reopenScope();
  await expect(itemCard(reopened, title)).toBeVisible();
}

async function removeTaskRelationInBoard(page: Page, request: APIRequestContext, reopenScope: ScopeFactory, title: string) {
  const scope = await reopenScope();
  await itemCard(scope, title).getByRole("button", { name: "Löschen", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Entfernen" }).click();
  await expect(page.getByRole("status")).toContainText("Zuordnung entfernt");
  await expect(itemCard(scope, title)).toHaveCount(0);
  await expectTaskStillExists(request, title);
}

async function expectTaskNavigation(page: Page, reopenScope: ScopeFactory, title: string, taskId: number) {
  let scope = await reopenScope();
  await itemCard(scope, title).dblclick();
  await expect(page).toHaveURL(new RegExp(`/tasks/${taskId}`));
  await expect(formPage(page, "Aufgabe bearbeiten").locator("input[required]").first()).toHaveValue(title);

  scope = await reopenScope();
  await itemCard(scope, title).getByRole("button", { name: "Bearbeiten" }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${taskId}`));
  await expect(formPage(page, "Aufgabe bearbeiten").locator("input[required]").first()).toHaveValue(title);
}

test.describe("Owner-Aufgaben-Flows", () => {
  test("Projekt-Detail: Aufgaben-Tab unterstützt Create, Link, Navigation und Remove", async ({ page, request }) => {
    const project = await createProject(request, "E2E Owner Task Project");
    const linkedTask = await createUnlinkedTask(request, "E2E Owner Task Project Link");
    const createdTitle = uniqueTitle("E2E Owner Task Project Create");
    let createdTaskId: number | null = null;

    try {
      const reopen = () => openProjectTasks(page, project.id);
      createdTaskId = await createTaskInBoard(page, reopen, createdTitle);
      await expectTaskNavigation(page, reopen, createdTitle, createdTaskId);
      await removeTaskRelationInBoard(page, request, reopen, createdTitle);
      await linkTaskInBoard(page, reopen, linkedTask.title);
      await expectTaskNavigation(page, reopen, linkedTask.title, linkedTask.id);
      await removeTaskRelationInBoard(page, request, reopen, linkedTask.title);
    } finally {
      await deleteProject(request, project.id);
      await cleanupTasksByTitle(request, [createdTitle, linkedTask.title]);
      await deleteTask(request, createdTaskId);
    }
  });

  test("Feature-Detail: Aufgaben-Tab unterstützt Create, Link, Navigation und Remove", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Owner Task Feature");
    const linkedTask = await createUnlinkedTask(request, "E2E Owner Task Feature Link");
    const createdTitle = uniqueTitle("E2E Owner Task Feature Create");
    let createdTaskId: number | null = null;

    try {
      const reopen = () => openFeatureTasks(page, feature.id);
      createdTaskId = await createTaskInBoard(page, reopen, createdTitle);
      await expectTaskNavigation(page, reopen, createdTitle, createdTaskId);
      await removeTaskRelationInBoard(page, request, reopen, createdTitle);
      await linkTaskInBoard(page, reopen, linkedTask.title);
      await expectTaskNavigation(page, reopen, linkedTask.title, linkedTask.id);
      await removeTaskRelationInBoard(page, request, reopen, linkedTask.title);
    } finally {
      await deleteFeature(request, feature.id);
      await cleanupTasksByTitle(request, [createdTitle, linkedTask.title]);
      await deleteTask(request, createdTaskId);
    }
  });

  test("Use-Case-Detail: Aufgaben-Tab unterstützt Create, Link, Navigation und Remove", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Owner Task UseCase Feature");
    const useCase = await createUseCase(request, feature.id, "E2E Owner Task UseCase");
    const linkedTask = await createUnlinkedTask(request, "E2E Owner Task UseCase Link");
    const createdTitle = uniqueTitle("E2E Owner Task UseCase Create");
    let createdTaskId: number | null = null;

    try {
      const reopen = () => openUseCaseTasks(page, useCase.id, feature.id);
      createdTaskId = await createTaskInBoard(page, reopen, createdTitle);
      await expectTaskNavigation(page, reopen, createdTitle, createdTaskId);
      await removeTaskRelationInBoard(page, request, reopen, createdTitle);
      await linkTaskInBoard(page, reopen, linkedTask.title);
      await expectTaskNavigation(page, reopen, linkedTask.title, linkedTask.id);
      await removeTaskRelationInBoard(page, request, reopen, linkedTask.title);
    } finally {
      await deleteFeature(request, feature.id);
      await cleanupTasksByTitle(request, [createdTitle, linkedTask.title]);
      await deleteTask(request, createdTaskId);
    }
  });
});
