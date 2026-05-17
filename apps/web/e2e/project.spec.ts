import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekt-CRUD läuft als echter Browser-Flow über ListBoardView, FormModal und ProjectDetailPage.
 * - Projektfarbe, Feature-Verknüpfung, Aufgaben-Tab und Board/List-Toggle sind aus Nutzersicht prüfbar.
 *
 * Fehlerfälle:
 * - Leere oder geskipte Platzhaltertests zählen nicht als E2E-Abdeckung.
 *
 * Ziel:
 * Die im Design-System-Auftrag geforderten Projekt-CRUD-Flows mit ausführbaren Playwright-Tests absichern.
 */

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101/api";

interface ProjectFixture {
  id: number;
  name: string;
}

interface FeatureFixture {
  id: number;
  title: string;
}

function uniqueTitle(prefix: string) {
  return `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`;
}

function slugify(value: string) {
  return value.toLocaleLowerCase("de-DE").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function createProject(request: APIRequestContext, titlePrefix: string, color = "#4682B4"): Promise<ProjectFixture> {
  const name = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/projects`, {
    data: { name, description: "E2E Projekt", status: "active", color }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createFeature(request: APIRequestContext, titlePrefix: string): Promise<FeatureFixture> {
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/features`, {
    data: { title, slug: slugify(title), status: "active", description: "E2E Feature", content: "", sortOrder: 0 }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function deleteProject(request: APIRequestContext, projectId: number | null) {
  if (projectId) {
    await request.delete(`${apiBaseUrl}/projects/${projectId}`);
  }
}

async function deleteFeature(request: APIRequestContext, featureId: number | null) {
  if (featureId) {
    await request.delete(`${apiBaseUrl}/features/${featureId}`);
  }
}

function activeModal(page: Page) {
  return page.locator(".fixed.inset-0").last();
}

function projectCard(page: Page, name: string) {
  return page.locator("article:visible").filter({ hasText: name }).first();
}

function relationPanel(page: Page, title: string) {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: title }) }).first();
}

async function openProjectList(page: Page) {
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Projekte" })).toBeVisible();
}

async function fillProjectForm(page: Page, name: string) {
  await activeModal(page).locator("input[required]").first().fill(name);
}

async function openProjectDetailFromList(page: Page, name: string) {
  await projectCard(page, name).dblclick();
  await expect(page).toHaveURL(/\/projects\/\d+$/);
}

test.describe("Projekt CRUD", () => {
  test("Projekt erstellen: + Button → Form → Speichern → erscheint in Liste", async ({ page, request }) => {
    let projectId: number | null = null;
    const name = uniqueTitle("E2E Project Create");

    try {
      await openProjectList(page);
      await page.getByRole("button", { name: "Neues Projekt" }).click();
      await fillProjectForm(page, name);
      await page.getByRole("button", { name: "Projekt anlegen" }).click();
      await expect(projectCard(page, name)).toBeVisible();

      const projectsResponse = await request.get(`${apiBaseUrl}/projects`);
      const projects = (await projectsResponse.json()) as ProjectFixture[];
      projectId = projects.find((project) => project.name === name)?.id ?? null;
    } finally {
      await deleteProject(request, projectId);
    }
  });

  test("Farbe wählen → Accent-Bar in korrekter Farbe", async ({ page, request }) => {
    let projectId: number | null = null;
    const name = uniqueTitle("E2E Project Color");

    try {
      await openProjectList(page);
      await page.getByRole("button", { name: "Neues Projekt" }).click();
      await fillProjectForm(page, name);
      await activeModal(page).locator('input[type="color"]').fill("#ff0000");
      await page.getByRole("button", { name: "Projekt anlegen" }).click();

      const accent = projectCard(page, name).locator("span[style]").first();
      await expect(accent).toHaveCSS("background-color", "rgb(255, 0, 0)");

      const projectsResponse = await request.get(`${apiBaseUrl}/projects`);
      const projects = (await projectsResponse.json()) as ProjectFixture[];
      projectId = projects.find((project) => project.name === name)?.id ?? null;
    } finally {
      await deleteProject(request, projectId);
    }
  });

  test("Projekt öffnen: Doppelklick → navigiert zu /projects/:id", async ({ page, request }) => {
    const project = await createProject(request, "E2E Project Open");
    try {
      await openProjectList(page);
      await openProjectDetailFromList(page, project.name);

      await expect(page.getByRole("heading", { name: project.name })).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("Projekt bearbeiten: Name → Speichern → neuer Name sichtbar", async ({ page, request }) => {
    const project = await createProject(request, "E2E Project Edit");
    const updatedName = uniqueTitle("E2E Project Updated");

    try {
      await page.goto(`/projects/${project.id}`);
      await expect(page.getByRole("heading", { name: project.name })).toBeVisible();
      await page.locator("form").first().locator("input[required]").first().fill(updatedName);
      await page.locator("form").first().getByRole("button", { name: "Speichern" }).click();

      await expect(page.getByRole("heading", { name: updatedName })).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("Projekt löschen: Delete → Confirm → verschwindet", async ({ page, request }) => {
    const project = await createProject(request, "E2E Project Delete");

    await openProjectList(page);
    await projectCard(page, project.name).getByRole("button", { name: "Löschen" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Löschen" }).click();

    await expect(projectCard(page, project.name)).not.toBeVisible();
    await deleteProject(request, project.id);
  });

  test("Feature verknüpfen im Features-Tab", async ({ page, request }) => {
    const project = await createProject(request, "E2E Project Feature Link");
    const feature = await createFeature(request, "E2E Project Linked Feature");

    try {
      await page.goto(`/projects/${project.id}`);
      await page.getByRole("button", { name: /Features/ }).click();
      await page.getByRole("checkbox", { name: new RegExp(feature.title) }).check({ force: true });
      await relationPanel(page, "Features").getByRole("button", { name: "Speichern" }).click();

      await page.reload();
      await page.getByRole("button", { name: /Features/ }).click();
      await expect(page.getByRole("checkbox", { name: new RegExp(feature.title) })).toBeChecked();
    } finally {
      await deleteProject(request, project.id);
      await deleteFeature(request, feature.id);
    }
  });

  test("Aufgabe erstellen im Aufgaben-Tab (+ Button)", async ({ page, request }) => {
    const project = await createProject(request, "E2E Project Task Create");
    const taskTitle = uniqueTitle("E2E Project Task");

    try {
      await page.goto(`/projects/${project.id}`);
      await page.getByRole("button", { name: /Aufgaben/ }).click();
      await page.getByRole("button", { name: "Neue Aufgabe" }).first().click();
      await activeModal(page).locator("input[required]").first().fill(taskTitle);
      await activeModal(page).getByRole("button", { name: "Aufgabe anlegen" }).click();

      await expect(projectCard(page, taskTitle)).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("Board / Listen Toggle", async ({ page, request }) => {
    const project = await createProject(request, "E2E Project Toggle");
    try {
      await openProjectList(page);
      await page.getByRole("button", { name: "Liste", exact: true }).click();
      await expect(projectCard(page, project.name)).toBeVisible();

      await page.getByRole("button", { name: "Kanban" }).click();
      await expect(page.getByRole("heading", { name: "Aktiv" })).toBeVisible();
      await expect(projectCard(page, project.name)).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
    }
  });
});
