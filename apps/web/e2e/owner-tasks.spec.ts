import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekt-, Feature- und Use-Case-Detailansichten besitzen einen Aufgaben-Tab.
 * - In jedem Aufgaben-Tab erzeugt `+` eine neue Aufgabe und verknüpft sie mit dem aktuellen Owner.
 * - `Verknüpfen` öffnet einen Suchdialog ohne Checkboxliste und ohne separaten Speichern-Button.
 * - Entfernen löscht nur die Owner-Zuordnung und lässt die Aufgabe global bestehen.
 *
 * Fehlerfälle:
 * - Link-Dialoge dürfen keine alten Checkbox-/Speichern-Flows anzeigen.
 * - Remove darf die Aufgabe nicht aus `/api/tasks/:id` löschen.
 *
 * Ziel:
 * Die vereinheitlichten OwnerTaskBoard-Flows in allen aufgabenfähigen Domänenformularen im Browser absichern.
 */

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101/api";

interface ProjectFixture {
  id: number;
  name: string;
}

interface TaskFixture {
  id: number;
  title: string;
}

interface FeatureFixture {
  id: number;
  title: string;
}

interface UseCaseFixture {
  id: number;
  title: string;
}

function uniqueTitle(prefix: string) {
  return `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`;
}

function slugify(value: string) {
  return value.toLocaleLowerCase("de-DE").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function createProject(request: APIRequestContext, titlePrefix: string): Promise<ProjectFixture> {
  const name = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/projects`, {
    data: { name, description: "E2E Aufgaben-Projekt", status: "active", color: "#4682B4" }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createFeature(request: APIRequestContext, titlePrefix: string): Promise<FeatureFixture> {
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/features`, {
    data: { title, slug: slugify(title), status: "active", description: "E2E Aufgaben-Feature", content: "", sortOrder: 0 }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createUseCase(request: APIRequestContext, featureId: number, titlePrefix: string): Promise<UseCaseFixture> {
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/features/${featureId}/use-cases`, {
    data: { title, slug: slugify(title), status: "active", description: "E2E Aufgaben-Use-Case", content: "", sortOrder: 0 }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createUnlinkedTask(request: APIRequestContext, titlePrefix: string): Promise<TaskFixture> {
  const project = await createProject(request, "E2E Temporary Task Owner");
  const title = uniqueTitle(titlePrefix);
  const created = await request.post(`${apiBaseUrl}/projects/${project.id}/tasks`, {
    data: { title, status: "todo", priority: "medium" }
  });
  expect(created.ok()).toBeTruthy();
  const task = (await created.json()) as TaskFixture;
  const removed = await request.delete(`${apiBaseUrl}/projects/${project.id}/tasks/${task.id}`);
  expect(removed.ok()).toBeTruthy();
  return task;
}

async function deleteProject(request: APIRequestContext, projectId: number | null | undefined) {
  if (projectId) {
    await request.delete(`${apiBaseUrl}/projects/${projectId}`);
  }
}

async function deleteFeature(request: APIRequestContext, featureId: number | null | undefined) {
  if (featureId) {
    await request.delete(`${apiBaseUrl}/features/${featureId}`);
  }
}

async function cleanupTasksByTitle(request: APIRequestContext, titles: string[]) {
  const response = await request.get(`${apiBaseUrl}/tasks`);
  if (!response.ok()) {
    return;
  }
  const tasks = (await response.json()) as TaskFixture[];
  for (const task of tasks.filter((item) => titles.includes(item.title))) {
    await request.delete(`${apiBaseUrl}/tasks/${task.id}`);
  }
}

function activeModal(page: Page) {
  return page.locator(".fixed.inset-0").last();
}

function taskCard(scope: Page | Locator, title: string) {
  return scope.locator("article:visible").filter({ hasText: title }).first();
}

async function expectTaskStillExists(request: APIRequestContext, taskTitle: string) {
  const response = await request.get(`${apiBaseUrl}/tasks`);
  expect(response.ok()).toBeTruthy();
  const tasks = (await response.json()) as TaskFixture[];
  expect(tasks.some((task) => task.title === taskTitle)).toBe(true);
}

async function createTaskInBoard(page: Page, scope: () => Page | Locator, title: string) {
  await scope().getByRole("button", { name: "Neue Aufgabe" }).first().click();
  await activeModal(page).locator("input[required]").first().fill(title);
  await activeModal(page).getByRole("button", { name: "Aufgabe anlegen" }).click();
  await expect(page.getByRole("status")).toContainText("Aufgabe erstellt");
  await expect(taskCard(scope(), title)).toBeVisible();
}

async function linkTaskInBoard(page: Page, scope: () => Page | Locator, title: string) {
  await scope().getByRole("button", { name: "Verknüpfen" }).first().click();
  const dialog = activeModal(page);
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Speichern" })).toHaveCount(0);
  await dialog.getByPlaceholder("Aufgaben suchen").fill(title);
  await expect(dialog.getByText(title)).toBeVisible();
  await dialog.getByRole("button", { name: "Verknüpfen" }).last().click();
  await expect(page.getByRole("status")).toContainText("Aufgabe verknüpft");
  await dialog.getByRole("button", { name: "Schließen" }).click();
  await expect(taskCard(scope(), title)).toBeVisible();
}

async function removeTaskRelationInBoard(page: Page, request: APIRequestContext, scope: () => Page | Locator, title: string) {
  await taskCard(scope(), title).getByRole("button", { name: "Löschen", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Entfernen" }).click();
  await expect(page.getByRole("status")).toContainText("Aufgaben-Zuordnung entfernt");
  await expect(taskCard(scope(), title)).toHaveCount(0);
  await expectTaskStillExists(request, title);
}

async function openProjectTasks(page: Page, projectId: number) {
  await page.goto(`/projects/${projectId}`);
  await page.getByRole("button", { name: /Aufgaben/ }).click();
  await expect(page.getByRole("button", { name: "Neue Aufgabe" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Verknüpfen" })).toBeVisible();
}

async function openFeatureTasks(page: Page, featureId: number) {
  await page.goto(`/features/${featureId}`);
  await page.getByRole("tab", { name: /Aufgaben/ }).click();
  await expect(page.getByRole("button", { name: "Neue Aufgabe" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Verknüpfen" })).toBeVisible();
}

async function openUseCaseTasks(page: Page, featureId: number, useCaseTitle: string) {
  await page.goto(`/features/${featureId}`);
  await page.getByRole("tab", { name: /Use Cases/ }).click();
  await taskCard(page, useCaseTitle).dblclick();
  await activeModal(page).getByRole("button", { name: /Aufgaben/ }).click();
  await expect(activeModal(page).getByRole("button", { name: "Neue Aufgabe" })).toBeVisible();
  await expect(activeModal(page).getByRole("button", { name: "Verknüpfen" })).toBeVisible();
}

test.describe("Owner-Aufgaben-Flows", () => {
  test("Projekt-Detail: Aufgaben-Tab unterstützt Create, Link und Remove", async ({ page, request }) => {
    const project = await createProject(request, "E2E Owner Task Project");
    const linkedTask = await createUnlinkedTask(request, "E2E Owner Task Project Link");
    const createdTitle = uniqueTitle("E2E Owner Task Project Create");

    try {
      await openProjectTasks(page, project.id);
      await createTaskInBoard(page, () => page, createdTitle);
      await removeTaskRelationInBoard(page, request, () => page, createdTitle);
      await linkTaskInBoard(page, () => page, linkedTask.title);
      await removeTaskRelationInBoard(page, request, () => page, linkedTask.title);
    } finally {
      await deleteProject(request, project.id);
      await cleanupTasksByTitle(request, [createdTitle, linkedTask.title]);
    }
  });

  test("Feature-Detail: Aufgaben-Tab unterstützt Create, Link und Remove", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Owner Task Feature");
    const linkedTask = await createUnlinkedTask(request, "E2E Owner Task Feature Link");
    const createdTitle = uniqueTitle("E2E Owner Task Feature Create");

    try {
      await openFeatureTasks(page, feature.id);
      await createTaskInBoard(page, () => page, createdTitle);
      await removeTaskRelationInBoard(page, request, () => page, createdTitle);
      await linkTaskInBoard(page, () => page, linkedTask.title);
      await removeTaskRelationInBoard(page, request, () => page, linkedTask.title);
    } finally {
      await deleteFeature(request, feature.id);
      await cleanupTasksByTitle(request, [createdTitle, linkedTask.title]);
    }
  });

  test("Use-Case-Formular: Aufgaben-Tab unterstützt Create, Link und Remove", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Owner Task UseCase Feature");
    const useCase = await createUseCase(request, feature.id, "E2E Owner Task UseCase");
    const linkedTask = await createUnlinkedTask(request, "E2E Owner Task UseCase Link");
    const createdTitle = uniqueTitle("E2E Owner Task UseCase Create");

    try {
      await openUseCaseTasks(page, feature.id, useCase.title);
      await createTaskInBoard(page, () => activeModal(page), createdTitle);
      await removeTaskRelationInBoard(page, request, () => activeModal(page), createdTitle);
      await linkTaskInBoard(page, () => activeModal(page), linkedTask.title);
      await removeTaskRelationInBoard(page, request, () => activeModal(page), linkedTask.title);
    } finally {
      await deleteFeature(request, feature.id);
      await cleanupTasksByTitle(request, [createdTitle, linkedTask.title]);
    }
  });
});
