import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101/api";

interface ProjectFixture {
  id: number;
  name: string;
}

interface TaskFixture {
  id: number;
  title: string;
}

async function createProject(request: APIRequestContext, title: string): Promise<ProjectFixture> {
  const name = `${title} ${Date.now()}`;
  const response = await request.post(`${apiBaseUrl}/projects`, {
    data: { name, description: "E2E", status: "active", color: "#4682B4" }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createTask(request: APIRequestContext, projectId: number, title: string): Promise<TaskFixture> {
  const response = await request.post(`${apiBaseUrl}/projects/${projectId}/tasks`, {
    data: { title, status: "todo", priority: "medium" }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openProject(page: Page, projectId: number) {
  await page.goto(`/projects/${projectId}`);
  await page.getByRole("button", { name: /Aufgaben/ }).click();
  await expect(page.getByRole("button", { name: "Neue Aufgabe" })).toBeVisible();
}

async function fillTaskTitle(page: Page, title: string) {
  await activeModal(page).locator("input[required]").first().fill(title);
}

async function openTaskDetail(page: Page, title: string) {
  await taskCard(page, title).dblclick();
}

function taskCard(page: Page, title: string) {
  return page.locator("article:visible").filter({ hasText: title }).first();
}

function activeModal(page: Page) {
  return page.locator(".fixed.inset-0").last();
}

test.describe("Task CRUD", () => {
  test("Task erstellen: + Button → Form → Speichern → Task erscheint in Liste", async ({ page, request }) => {
    const project = await createProject(request, "E2E Task Create");
    await openProject(page, project.id);

    await page.getByRole("button", { name: "Neue Aufgabe" }).click();
    await fillTaskTitle(page, "E2E Neue Aufgabe");
    await page.getByRole("button", { name: "Aufgabe anlegen" }).click();

    await expect(taskCard(page, "E2E Neue Aufgabe")).toBeVisible();
  });

  test("Task erstellen mit Tags → Tags erscheinen auf TaskCard", async ({ page, request }) => {
    const project = await createProject(request, "E2E Task Tags");
    const tagName = `E2E Tag ${Date.now()}`;
    await request.post(`${apiBaseUrl}/tags`, { data: { name: tagName, color: "#4682B4" } });
    await openProject(page, project.id);

    await page.getByRole("button", { name: "Neue Aufgabe" }).click();
    await fillTaskTitle(page, "E2E Tag Aufgabe");
    await page.getByRole("button", { name: tagName }).click();
    await page.getByRole("button", { name: "Aufgabe anlegen" }).click();

    await expect(page.getByText(tagName)).toBeVisible();
  });

  test("Task öffnen: Doppelklick → TaskDetail Modal öffnet sich", async ({ page, request }) => {
    const project = await createProject(request, "E2E Task Open");
    await createTask(request, project.id, "E2E Öffnen");
    await openProject(page, project.id);

    await openTaskDetail(page, "E2E Öffnen");

    await expect(activeModal(page).locator("h2", { hasText: "E2E Öffnen" })).toBeVisible();
  });

  test("Task bearbeiten: Titel ändern → Speichern → neuer Titel auf TaskCard", async ({ page, request }) => {
    const project = await createProject(request, "E2E Task Edit");
    const task = await createTask(request, project.id, "E2E Alter Titel");
    await openProject(page, project.id);

    await openTaskDetail(page, "E2E Alter Titel");
    await fillTaskTitle(page, "E2E Neuer Titel");
    await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/tasks/${task.id}`) && response.request().method() === "PATCH"),
      page.getByRole("button", { name: "Speichern" }).click()
    ]);

    await expect(taskCard(page, "E2E Neuer Titel")).toBeVisible();
  });

  test("Task-Zuordnung entfernen: Delete-Icon → ConfirmDialog → Task bleibt global erhalten", async ({ page, request }) => {
    const project = await createProject(request, "E2E Task Delete");
    const task = await createTask(request, project.id, "E2E Löschen");
    await openProject(page, project.id);

    await page.locator("article").filter({ hasText: "E2E Löschen" }).getByRole("button", { name: "Löschen", exact: true }).click();
    await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/projects/${project.id}/tasks/${task.id}`) && response.request().method() === "DELETE"),
      page.getByRole("alertdialog").getByRole("button", { name: "Entfernen" }).click()
    ]);

    await expect(page.locator("article").filter({ hasText: "E2E Löschen" })).toHaveCount(0);
    const detail = await request.get(`${apiBaseUrl}/tasks/${task.id}`);
    expect(detail.ok()).toBeTruthy();
  });

  test("View Toggle: Board-Modus zeigt Kanban-Spalten", async ({ page, request }) => {
    const project = await createProject(request, "E2E Board");
    await createTask(request, project.id, "E2E Board Task");
    await openProject(page, project.id);

    await page.getByRole("button", { name: "Kanban" }).click();

    await expect(page.getByRole("heading", { name: "Offen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "In Arbeit" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Erledigt" })).toBeVisible();
  });

  test("View Toggle: Listen-Modus zeigt Zeilen-Layout", async ({ page, request }) => {
    const project = await createProject(request, "E2E List");
    await createTask(request, project.id, "E2E Liste Task");
    await openProject(page, project.id);

    await page.getByRole("button", { name: "Liste", exact: true }).first().click();

    await expect(taskCard(page, "E2E Liste Task")).toBeVisible();
  });

  test("Kommentar erstellen → erscheint im Kommentare-Tab", async ({ page, request }) => {
    const project = await createProject(request, "E2E Comment Create");
    await createTask(request, project.id, "E2E Kommentar Task");
    await openProject(page, project.id);

    await openTaskDetail(page, "E2E Kommentar Task");
    await activeModal(page).getByRole("button", { name: /Kommentare/ }).click();
    await activeModal(page).locator('[contenteditable="true"]').fill("E2E Kommentar");
    await activeModal(page).getByRole("button", { name: "Kommentar", exact: true }).click();

    await expect(activeModal(page).getByText("E2E Kommentar", { exact: true })).toBeVisible();
  });

  test("Kommentar löschen → verschwindet", async ({ page, request }) => {
    const project = await createProject(request, "E2E Comment Delete");
    const task = await createTask(request, project.id, "E2E Kommentar Löschen");
    await request.post(`${apiBaseUrl}/tasks/${task.id}/comments`, { data: { body: "E2E Weg" } });
    await openProject(page, project.id);

    await openTaskDetail(page, "E2E Kommentar Löschen");
    await activeModal(page).getByRole("button", { name: /Kommentare/ }).click();
    await activeModal(page).locator("article").filter({ hasText: "E2E Weg" }).getByRole("button", { name: "Löschen" }).click();

    await expect(page.getByText("E2E Weg")).not.toBeVisible();
  });

});
