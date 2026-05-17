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

interface FeatureFixture {
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

async function createFeature(request: APIRequestContext, title: string): Promise<FeatureFixture> {
  const uniqueTitle = `${title} ${Date.now()}`;
  const slug = uniqueTitle.toLocaleLowerCase("de-DE").replaceAll(" ", "-");
  const response = await request.post(`${apiBaseUrl}/features`, {
    data: { title: uniqueTitle, slug, status: "active", description: "E2E Feature", content: "", sortOrder: 0 }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createUseCase(request: APIRequestContext, featureId: number, title: string) {
  const slug = `${title.toLocaleLowerCase("de-DE").replaceAll(" ", "-")}-${Date.now()}`;
  const response = await request.post(`${apiBaseUrl}/features/${featureId}/use-cases`, {
    data: { title, slug, status: "active", description: "E2E Use Case", content: "", sortOrder: 0 }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openProject(page: Page, projectId: number) {
  await page.goto(`/projects/${projectId}`);
  await expect(page.getByRole("button", { name: /Aufgaben/ })).toBeVisible();
}

async function fillTaskTitle(page: Page, title: string) {
  await page.locator(".fixed").last().locator("input[required]").fill(title);
}

async function openTaskDetail(page: Page, title: string) {
  await page.getByRole("button", { name: new RegExp(title) }).first().dblclick();
}

function taskButton(page: Page, title: string) {
  return page.getByRole("button", { name: new RegExp(title) }).first();
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

    await expect(taskButton(page, "E2E Neue Aufgabe")).toBeVisible();
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

  test("Task erstellen mit Feature-Relation → Feature im Features-Tab sichtbar", async ({ page, request }) => {
    const project = await createProject(request, "E2E Task Feature");
    const feature = await createFeature(request, "E2E Verknüpftes Feature");
    await openProject(page, project.id);

    await page.getByRole("button", { name: "Neue Aufgabe" }).click();
    await fillTaskTitle(page, "E2E Feature Aufgabe");
    await page.getByRole("checkbox", { name: new RegExp(feature.title) }).check({ force: true });
    await page.getByRole("button", { name: "Aufgabe anlegen" }).click();
    await openTaskDetail(page, "E2E Feature Aufgabe");
    await activeModal(page).getByRole("button", { name: /Features/ }).click();

    await expect(page.getByText(feature.title)).toBeVisible();
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
    await createTask(request, project.id, "E2E Alter Titel");
    await openProject(page, project.id);

    await openTaskDetail(page, "E2E Alter Titel");
    await fillTaskTitle(page, "E2E Neuer Titel");
    await page.getByRole("button", { name: "Speichern" }).click();

    await expect(page.getByText("E2E Neuer Titel")).toBeVisible();
  });

  test("Task löschen: Delete-Icon → ConfirmDialog → Task verschwindet aus Liste", async ({ page, request }) => {
    const project = await createProject(request, "E2E Task Delete");
    await createTask(request, project.id, "E2E Löschen");
    await openProject(page, project.id);

    await page.locator("article").filter({ hasText: "E2E Löschen" }).getByRole("button", { name: "Löschen" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Löschen" }).click();

    await expect(page.getByText("E2E Löschen")).not.toBeVisible();
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

    await expect(taskButton(page, "E2E Liste Task")).toBeVisible();
  });

  test("Kommentar erstellen → erscheint im Kommentare-Tab", async ({ page, request }) => {
    const project = await createProject(request, "E2E Comment Create");
    await createTask(request, project.id, "E2E Kommentar Task");
    await openProject(page, project.id);

    await openTaskDetail(page, "E2E Kommentar Task");
    await activeModal(page).getByRole("button", { name: /Kommentare/ }).click();
    await activeModal(page).locator('[contenteditable="true"]').fill("E2E Kommentar");
    await page.getByRole("button", { name: "Kommentar speichern" }).click();

    await expect(page.getByText("E2E Kommentar")).toBeVisible();
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

  test("Feature verknüpfen im Features-Tab → Speichern → bleibt verknüpft", async ({ page, request }) => {
    const project = await createProject(request, "E2E Feature Persist");
    const task = await createTask(request, project.id, "E2E Persist Task");
    const feature = await createFeature(request, "E2E Persist Feature");
    await openProject(page, project.id);

    await openTaskDetail(page, "E2E Persist Task");
    await activeModal(page).getByRole("button", { name: /Features/ }).click();
    await page.getByRole("checkbox", { name: new RegExp(feature.title) }).check({ force: true });
    await activeModal(page).getByRole("button", { name: "Speichern" }).click();
    await page.reload();
    await page.goto(`/projects/${project.id}`);
    await openTaskDetail(page, "E2E Persist Task");
    await activeModal(page).getByRole("button", { name: /Features/ }).click();

    await expect(page.getByRole("checkbox", { name: new RegExp(feature.title) })).toBeChecked();
  });
});
