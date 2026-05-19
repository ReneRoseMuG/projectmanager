import { expect, test, type Page } from "@playwright/test";
import {
  createFeature,
  createProject,
  createUseCase,
  deleteFeature,
  deleteProject,
  expectRichText,
  fillRichText,
  formPage,
  itemCard,
  linkProjectFeature,
  slugify,
  uniqueTitle
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Feature-Create und Feature-Edit laufen über `/features/new` und `/features/:id`.
 * - Doppelklick und Bearbeiten-Button in Feature-Übersicht und Feature-Tab-Views navigieren korrekt.
 * - Feature-, Projekt- und Use-Case-Detailseiten zeigen ihre vollständigen Formulardaten.
 *
 * Fehlerfälle:
 * - Tab-Views dürfen keine leere Detailseite und kein altes Overlay-Formular öffnen.
 *
 * Ziel:
 * Die dokumentationsbezogenen Domänenobjekte über echte Browsernavigation und echte API-Daten absichern.
 */

async function openFeatureList(page: Page) {
  await page.goto("/features");
  await expect(page.getByRole("heading", { name: "Features", exact: true })).toBeVisible();
}

async function expectFeatureFormData(page: Page, feature: { title: string; slug: string }, descriptionText = "E2E Feature-Kurzbeschreibung vollständig", contentText = "E2E Feature-Inhalt vollständig") {
  const form = formPage(page, "Feature bearbeiten");
  await expect(form).toBeVisible();
  await expect(form.locator("input[required]").nth(0)).toHaveValue(feature.title);
  await expect(form.locator("input[required]").nth(1)).toHaveValue(feature.slug);
  await expect(form.locator('input[type="number"]').first()).toHaveValue("7");
  await expectRichText(form, descriptionText, 0);
  await expectRichText(form, contentText, 1);
}

test.describe("Feature-Routen und Detailformular", () => {
  test("Feature erstellen: Plus-Button navigiert auf Create-Detailseite und speichert als Detailroute", async ({ page, request }) => {
    let featureId: number | null = null;
    const title = uniqueTitle("E2E Feature Create Route");
    const slug = slugify(title);

    try {
      await openFeatureList(page);
      await page.getByRole("button", { name: "Neues Feature" }).click();

      await expect(page).toHaveURL(/\/features\/new$/);
      const form = formPage(page, "Neues Feature");
      await form.locator("input[required]").nth(0).fill(title);
      await form.locator("input[required]").nth(1).fill(slug);
      await form.locator('input[type="number"]').first().fill("7");
      await fillRichText(form, "feature-form-description", "E2E Feature-Neuanlage Beschreibung vollständig");
      await fillRichText(form, "feature-form-content", "E2E Feature-Neuanlage Inhalt vollständig");
      await form.getByRole("button", { name: "Feature anlegen" }).click();

      await expect(page).toHaveURL(/\/features\/\d+$/);
      featureId = Number(page.url().split("/").pop());
      await expectFeatureFormData(page, { title, slug }, "E2E Feature-Neuanlage Beschreibung vollständig", "E2E Feature-Neuanlage Inhalt vollständig");

      await openFeatureList(page);
      await expect(itemCard(page, title)).toBeVisible();
    } finally {
      await deleteFeature(request, featureId);
    }
  });

  test("Feature öffnen: Doppelklick und Bearbeiten-Button zeigen dieselbe vollständige Formularseite", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Feature Open Route");

    try {
      await openFeatureList(page);
      await itemCard(page, feature.title).dblclick();
      await expect(page).toHaveURL(new RegExp(`/features/${feature.id}$`));
      await expectFeatureFormData(page, feature);

      await openFeatureList(page);
      await itemCard(page, feature.title).getByRole("button", { name: "Bearbeiten" }).click();
      await expect(page).toHaveURL(new RegExp(`/features/${feature.id}$`));
      await expectFeatureFormData(page, feature);

      await openFeatureList(page);
      await page.getByRole("button", { name: "Liste", exact: true }).click();
      await itemCard(page, feature.title).getByRole("button", { name: "Bearbeiten" }).click();
      await expect(page).toHaveURL(new RegExp(`/features/${feature.id}$`));
      await expectFeatureFormData(page, feature);
    } finally {
      await deleteFeature(request, feature.id);
    }
  });

  test("Feature bearbeiten: Speichern hält die kanonische Detailformular-Seite aktuell", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Feature Edit Route");
    const updatedTitle = uniqueTitle("E2E Feature Updated Route");

    try {
      await page.goto(`/features/${feature.id}`);
      const form = formPage(page, "Feature bearbeiten");
      await expectFeatureFormData(page, feature);

      await form.locator("input[required]").nth(0).fill(updatedTitle);
      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/api/features/${feature.id}`) && response.request().method() === "PATCH"),
        form.getByRole("button", { name: "Speichern" }).click()
      ]);

      await expect(page).toHaveURL(new RegExp(`/features/${feature.id}$`));
      await expect(form.locator("input[required]").nth(0)).toHaveValue(updatedTitle);
    } finally {
      await deleteFeature(request, feature.id);
    }
  });

  test("Feature-Projekte-Tab: Doppelklick und Bearbeiten öffnen das Projekt-Detailformular per Route", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Feature Project Tab");
    const project = await createProject(request, "E2E Feature Tab Project");

    try {
      await linkProjectFeature(request, project.id, feature.id);

      await page.goto(`/features/${feature.id}`);
      const featureForm = formPage(page, "Feature bearbeiten");
      await featureForm.getByRole("button", { name: /Projekte/ }).click();
      await expect(itemCard(featureForm, project.name)).toBeVisible();

      await itemCard(featureForm, project.name).dblclick();
      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}`));
      const projectForm = formPage(page, "Projekt bearbeiten");
      await expect(projectForm.locator("input[required]").first()).toHaveValue(project.name);
      await expectRichText(projectForm, "E2E Projektbeschreibung vollständig");

      await page.goto(`/features/${feature.id}`);
      await formPage(page, "Feature bearbeiten").getByRole("button", { name: /Projekte/ }).click();
      await itemCard(formPage(page, "Feature bearbeiten"), project.name).getByRole("button", { name: "Bearbeiten" }).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}`));
      await expect(formPage(page, "Projekt bearbeiten").locator("input[required]").first()).toHaveValue(project.name);
    } finally {
      await deleteFeature(request, feature.id);
      await deleteProject(request, project.id);
    }
  });

  test("Feature-Use-Cases-Tab: Doppelklick und Bearbeiten öffnen das Use-Case-Detailformular per Route", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Feature UseCase Tab");
    const useCase = await createUseCase(request, feature.id, "E2E Feature Tab UseCase");

    try {
      await page.goto(`/features/${feature.id}`);
      const featureForm = formPage(page, "Feature bearbeiten");
      await featureForm.getByRole("button", { name: /Use Cases/ }).click();
      await expect(itemCard(featureForm, useCase.title)).toBeVisible();

      await itemCard(featureForm, useCase.title).dblclick();
      await expect(page).toHaveURL(new RegExp(`/use-cases/${useCase.id}`));
      const useCaseForm = formPage(page, "Use Case bearbeiten");
      await expect(useCaseForm.locator("input[required]").nth(0)).toHaveValue(useCase.title);
      await expect(useCaseForm.locator("input[required]").nth(1)).toHaveValue(useCase.slug);
      await expectRichText(useCaseForm, "E2E Use-Case-Beschreibung vollständig", 0);
      await expectRichText(useCaseForm, "E2E Use-Case-Inhalt vollständig", 1);

      await page.goto(`/features/${feature.id}`);
      await formPage(page, "Feature bearbeiten").getByRole("button", { name: /Use Cases/ }).click();
      await itemCard(formPage(page, "Feature bearbeiten"), useCase.title).getByRole("button", { name: "Bearbeiten" }).click();
      await expect(page).toHaveURL(new RegExp(`/use-cases/${useCase.id}`));
      await expect(formPage(page, "Use Case bearbeiten").locator("input[required]").nth(0)).toHaveValue(useCase.title);
    } finally {
      await deleteFeature(request, feature.id);
    }
  });

  test("Feature löschen: Delete und Confirm entfernen die Karte aus der Übersicht", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Feature Delete Route");

    await openFeatureList(page);
    await itemCard(page, feature.title).getByRole("button", { name: "Löschen" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Löschen" }).click();

    await expect(itemCard(page, feature.title)).not.toBeVisible();
    await deleteFeature(request, feature.id);
  });

  test("Board- und Listenansicht zeigen echte Feature-Daten", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Feature Toggle Route");

    try {
      await openFeatureList(page);
      await page.getByRole("button", { name: "Liste", exact: true }).click();
      await expect(itemCard(page, feature.title)).toBeVisible();

      await page.getByRole("button", { name: "Kanban" }).click();
      await expect(page.getByRole("heading", { name: "Aktiv" })).toBeVisible();
      await expect(itemCard(page, feature.title)).toBeVisible();
    } finally {
      await deleteFeature(request, feature.id);
    }
  });
});
