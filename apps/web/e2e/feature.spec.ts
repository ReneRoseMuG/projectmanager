import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Feature-CRUD läuft als echter Browser-Flow über ListBoardView, FormModal und FeatureDetailPage.
 * - Feature-Relationen zu Projekten und Use Cases bleiben nach dem Speichern sichtbar.
 *
 * Fehlerfälle:
 * - Leere oder geskipte Platzhaltertests zählen nicht als E2E-Abdeckung.
 *
 * Ziel:
 * Die im Design-System-Auftrag geforderten Feature-CRUD-Flows mit ausführbaren Playwright-Tests absichern.
 */

const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3101/api";

interface FeatureFixture {
  id: number;
  title: string;
  slug: string;
}

interface ProjectFixture {
  id: number;
  name: string;
}

function uniqueTitle(prefix: string) {
  return `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`;
}

function slugify(value: string) {
  return value.toLocaleLowerCase("de-DE").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function createFeature(request: APIRequestContext, titlePrefix: string): Promise<FeatureFixture> {
  const title = uniqueTitle(titlePrefix);
  const slug = slugify(title);
  const response = await request.post(`${apiBaseUrl}/features`, {
    data: { title, slug, status: "active", description: "E2E Feature", content: "E2E Inhalt", sortOrder: 0 }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createProject(request: APIRequestContext, titlePrefix: string): Promise<ProjectFixture> {
  const name = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/projects`, {
    data: { name, description: "E2E Projekt", status: "active", color: "#4682B4" }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function deleteFeature(request: APIRequestContext, featureId: number | null) {
  if (featureId) {
    await request.delete(`${apiBaseUrl}/features/${featureId}`);
  }
}

async function deleteProject(request: APIRequestContext, projectId: number | null) {
  if (projectId) {
    await request.delete(`${apiBaseUrl}/projects/${projectId}`);
  }
}

function activeModal(page: Page) {
  return page.locator(".fixed.inset-0").last();
}

function featureCard(page: Page, title: string) {
  return page.locator("article:visible").filter({ hasText: title }).first();
}

async function openFeatureList(page: Page) {
  await page.goto("/features");
  await expect(page.getByRole("heading", { name: "Features", exact: true })).toBeVisible();
}

async function fillFeatureForm(page: Page, title: string, slug: string, description = "E2E Beschreibung", content = "E2E Inhalt") {
  const modal = activeModal(page);
  await modal.locator("input[required]").nth(0).fill(title);
  await modal.locator("input[required]").nth(1).fill(slug);
  await modal.locator('[contenteditable="true"]').nth(0).fill(description);
  await modal.locator('[contenteditable="true"]').nth(1).fill(content);
}

async function openFeatureDetailFromList(page: Page, title: string) {
  await featureCard(page, title).dblclick();
  await expect(page).toHaveURL(/\/features\/\d+$/);
}

test.describe("Feature CRUD", () => {
  test("Feature erstellen: + Button → Form → Speichern → erscheint in Liste", async ({ page, request }) => {
    let featureId: number | null = null;
    const title = uniqueTitle("E2E Feature Create");
    const slug = slugify(title);

    try {
      await openFeatureList(page);
      await page.getByRole("button", { name: "Neues Feature" }).click();
      await fillFeatureForm(page, title, slug);
      await page.getByRole("button", { name: "Feature anlegen" }).click();
      await expect(page).toHaveURL(/\/features\/\d+$/);
      featureId = Number(page.url().split("/").pop());

      await openFeatureList(page);
      await expect(featureCard(page, title)).toBeVisible();
    } finally {
      await deleteFeature(request, featureId);
    }
  });

  test("Feature öffnen: Doppelklick → navigiert zu /features/:id", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Feature Open");
    try {
      await openFeatureList(page);
      await openFeatureDetailFromList(page, feature.title);

      await expect(page.getByRole("heading", { name: feature.title })).toBeVisible();
    } finally {
      await deleteFeature(request, feature.id);
    }
  });

  test("Feature bearbeiten: Titel + RTF-Inhalt → Speichern → Änderung sichtbar", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Feature Edit");
    const updatedTitle = uniqueTitle("E2E Feature Updated");

    try {
      await page.goto(`/features/${feature.id}`);
      await expect(page.getByRole("heading", { name: feature.title })).toBeVisible();
      await page.locator("#feature-detail-form input[required]").nth(0).fill(updatedTitle);
      await page.locator("#feature-detail-form").locator('[contenteditable="true"]').nth(1).fill("E2E aktualisierter Inhalt");
      await page.locator("#feature-detail-form").getByRole("button", { name: "Speichern" }).click();

      await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
      await expect(page.getByText("E2E aktualisierter Inhalt")).toBeVisible();
    } finally {
      await deleteFeature(request, feature.id);
    }
  });

  test("Feature löschen: Delete → Confirm → verschwindet", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Feature Delete");

    await openFeatureList(page);
    await featureCard(page, feature.title).getByRole("button", { name: "Löschen" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Löschen" }).click();

    await expect(featureCard(page, feature.title)).not.toBeVisible();
    await deleteFeature(request, feature.id);
  });

  test("Projekt im Projekte-Tab hinzufügen und entfernen", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Feature Project Link");
    const project = await createProject(request, "E2E Linked Project");

    try {
      await page.goto(`/features/${feature.id}`);
      await page.getByRole("tab", { name: /Projekte/ }).click();
      await page.getByRole("button", { name: "Projekt hinzufügen" }).click();
      await activeModal(page).getByRole("combobox").selectOption({ label: project.name });
      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/api/projects/${project.id}/features`) && response.request().method() === "PUT"),
        activeModal(page).getByRole("button", { name: "Hinzufügen" }).click()
      ]);
      await expect(featureCard(page, project.name)).toBeVisible();

      await page.reload();
      await page.getByRole("tab", { name: /Projekte/ }).click();
      await expect(featureCard(page, project.name)).toBeVisible();

      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/api/projects/${project.id}/features`) && response.request().method() === "PUT"),
        featureCard(page, project.name).getByRole("button", { name: "Entfernen" }).click()
      ]);
      await expect(featureCard(page, project.name)).not.toBeVisible();
    } finally {
      await deleteFeature(request, feature.id);
      await deleteProject(request, project.id);
    }
  });

  test("Use Case erstellen im UC-Tab → erscheint in UC-Liste", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Feature Use Case");
    const useCaseTitle = uniqueTitle("E2E Use Case Create");

    try {
      await page.goto(`/features/${feature.id}`);
      await page.getByRole("tab", { name: /Use Cases/ }).click();
      await page.getByRole("button", { name: "Neuer Use Case" }).click();
      await activeModal(page).locator("input[required]").nth(0).fill(useCaseTitle);
      await activeModal(page).locator("input[required]").nth(1).fill(slugify(useCaseTitle));
      await activeModal(page).getByRole("button", { name: "Speichern" }).click();

      await expect(page.getByText(useCaseTitle)).toBeVisible();
    } finally {
      await deleteFeature(request, feature.id);
    }
  });

  test("Board / Listen Toggle in Feature-Übersicht", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Feature Toggle");
    try {
      await openFeatureList(page);
      await page.getByRole("button", { name: "Liste", exact: true }).click();
      await expect(featureCard(page, feature.title)).toBeVisible();

      await page.getByRole("button", { name: "Kanban" }).click();
      await expect(page.getByRole("heading", { name: "Aktiv" })).toBeVisible();
      await expect(featureCard(page, feature.title)).toBeVisible();
    } finally {
      await deleteFeature(request, feature.id);
    }
  });
});
