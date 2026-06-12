import { expect, test, type Page } from "./fixtures";
import {
  authenticatedGoto,
  apiBaseUrl,
  clickItemAction,
  createBacklogItem,
  createFeature,
  createProject,
  createTask,
  deleteTask,
  deleteFeature,
  deleteProject,
  expectRichText,
  fillRichText,
  formPage,
  itemCard,
  linkProjectFeature,
  pathWithOptionalQuery,
  uniqueTitle,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekt-Create läuft über `/projects/new` und schließt nach Speichern zurück zur Übersicht.
 * - Projekt-Edit läuft über die kanonische Route `/projects/:id`.
 * - Doppelklick und Bearbeiten-Button in Board- und Listenansicht navigieren auf dieselbe Detailformular-Seite.
 * - Projekt-Tab-Views öffnen verknüpfte Domänenobjekte per Route statt per Overlay.
 *
 * Fehlerfälle:
 * - Eine fast leere Detailroute oder ein modales Zweitformular darf nicht als erfolgreicher Öffnen-Flow gelten.
 *
 * Ziel:
 * Nachweisen, dass Projekt-Detailseiten das vollständige Projektformular mit echten geladenen Daten hosten.
 */

async function openProjectList(page: Page) {
  await authenticatedGoto(page, "/projects");
  await expect(
    page.getByRole("heading", { name: "Projekte", exact: true }),
  ).toBeVisible();
}

async function expectProjectFormData(
  page: Page,
  project: { name: string },
  descriptionText = "E2E Projektbeschreibung vollständig",
) {
  const form = formPage(page, "Projekt bearbeiten");
  await expect(form).toBeVisible();
  await expect(form.locator("input[required]").first()).toHaveValue(
    project.name,
  );
  await expectRichText(form, descriptionText);
  await expect(form.locator('input[type="date"]').nth(0)).toHaveValue(
    "2026-05-01",
  );
  await expect(form.locator('input[type="date"]').nth(1)).toHaveValue(
    "2026-05-31",
  );
}

test.describe("Projekt-Routen und Detailformular", () => {
  test("Projekt erstellen: Plus-Button navigiert auf Create-Detailseite und Speichern schließt", async ({
    page,
    request,
  }) => {
    let projectId: number | null = null;
    const name = uniqueTitle("E2E Project Create Route");

    try {
      await openProjectList(page);
      await page.getByRole("button", { name: "Neues Projekt" }).click();

      await expect(page).toHaveURL(pathWithOptionalQuery("/projects/new"));
      const form = formPage(page, "Projekt anlegen");
      await expect(form).toBeVisible();
      await form.locator("input[required]").first().fill(name);
      await fillRichText(
        form,
        "project-description",
        "E2E neu angelegte Projektbeschreibung vollständig",
      );
      await form.locator('input[type="date"]').nth(0).fill("2026-05-01");
      await form.locator('input[type="date"]').nth(1).fill("2026-05-31");
      const projectResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/projects") &&
          response.request().method() === "POST",
      );
      await form.getByRole("button", { name: "Projekt anlegen" }).click();
      const createdProject = (await (await projectResponsePromise).json()) as {
        id: number;
      };
      projectId = createdProject.id;

      await expect(page).toHaveURL(/\/projects$/);
      await expect(itemCard(page, name)).toBeVisible();
    } finally {
      await deleteProject(request, projectId);
    }
  });

  test("Projekt öffnen: Doppelklick und Bearbeiten-Button zeigen dieselbe vollständige Formularseite", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Project Open Route");

    try {
      await openProjectList(page);
      await itemCard(page, project.name).dblclick();
      await expect(page).toHaveURL(
        pathWithOptionalQuery(`/projects/${project.id}`),
      );
      await expectProjectFormData(page, project);

      await openProjectList(page);
      await clickItemAction(page, project.name, "Bearbeiten");
      await expect(page).toHaveURL(
        pathWithOptionalQuery(`/projects/${project.id}`),
      );
      await expectProjectFormData(page, project);

      await openProjectList(page);
      await page.getByRole("button", { name: "Liste", exact: true }).click();
      await clickItemAction(page, project.name, "Bearbeiten");
      await expect(page).toHaveURL(
        pathWithOptionalQuery(`/projects/${project.id}`),
      );
      await expectProjectFormData(page, project);
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("Projektformular hält Tab Bar und Footer im Content-Scrollcontainer sichtbar", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Project Sticky Shell");

    try {
      await page.setViewportSize({ width: 1280, height: 720 });
      await authenticatedGoto(page, `/projects/${project.id}`);

      const main = page.locator("main").first();
      const form = formPage(page, "Projekt bearbeiten");
      const header = form.locator(":scope > header");
      const tabBar = form.locator(":scope > div").first();
      const body = form.getByTestId("form-page-body");
      const footer = form.locator(":scope > footer");
      const mainBox = await main.boundingBox();

      if (!mainBox) {
        throw new Error("Main scroll container is not visible.");
      }

      await expect(tabBar).toBeVisible();
      await expect(footer).toBeVisible();

      await body.evaluate((element) => {
        element.scrollTop = 360;
      });

      await expect
        .poll(
          async () =>
            (await header.boundingBox())?.y ?? Number.POSITIVE_INFINITY,
        )
        .toBeLessThan(mainBox.y + 2);
      await expect
        .poll(
          async () =>
            (await tabBar.boundingBox())?.y ?? Number.POSITIVE_INFINITY,
        )
        .toBeGreaterThan((await header.boundingBox())?.bottom ?? mainBox.y);
      await expect
        .poll(
          async () =>
            await body.evaluate(
              (element) => element.getBoundingClientRect().bottom,
            ),
        )
        .toBeLessThanOrEqual((await footer.boundingBox())?.y ?? mainBox.y + mainBox.height);
      await expect
        .poll(async () => {
          const box = await footer.boundingBox();
          return box ? box.y + box.height : 0;
        })
        .toBeGreaterThan(mainBox.y + mainBox.height - 4);
      await expect
        .poll(async () => {
          const box = await footer.boundingBox();
          return box ? box.y + box.height : Number.POSITIVE_INFINITY;
        })
        .toBeLessThan(mainBox.y + mainBox.height + 2);

      const featuresTab = form.getByRole("button", { name: /Features/ });
      await featuresTab.click();
      await expect(featuresTab).toHaveClass(/text-steel-700/);
      const listBoardView = form.getByTestId("list-board-view");
      await expect(listBoardView).toBeVisible();
      await expect
        .poll(async () => {
          const boardBox = await listBoardView.boundingBox();
          const footerBox = await footer.boundingBox();
          return boardBox && footerBox
            ? boardBox.y + boardBox.height - footerBox.y
            : Number.POSITIVE_INFINITY;
        })
        .toBeLessThan(40);
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("Projekt bearbeiten: Speichern schließt auf die Rücksprung-Route und aktualisiert die Übersicht", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Project Edit Route");
    const updatedName = uniqueTitle("E2E Project Updated Route");

    try {
      await authenticatedGoto(page, `/projects/${project.id}`);
      const form = formPage(page, "Projekt bearbeiten");
      await expectProjectFormData(page, project);

      await form.locator("input[required]").first().fill(updatedName);
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes(`/api/projects/${project.id}`) &&
            response.request().method() === "PATCH",
        ),
        form.getByRole("button", { name: "Speichern" }).click(),
      ]);

      await expect(page).toHaveURL(/\/projects$/);
      await expect(itemCard(page, updatedName)).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("Projekt-Features-Tab: Doppelklick und Bearbeiten öffnen das Feature-Detailformular per Route", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Project Feature Tab");
    const feature = await createFeature(request, "E2E Project Tab Feature");

    try {
      await linkProjectFeature(request, project.id, feature.id);

      await authenticatedGoto(page, `/projects/${project.id}`);
      const projectForm = formPage(page, "Projekt bearbeiten");
      await projectForm.getByRole("button", { name: /Features/ }).click();
      await expect(itemCard(projectForm, feature.title)).toBeVisible();

      await itemCard(projectForm, feature.title).dblclick();
      await expect(page).toHaveURL(new RegExp(`/features/${feature.id}`));
      const featureForm = formPage(page, "Feature bearbeiten");
      await expect(featureForm.locator("input[required]").nth(0)).toHaveValue(
        feature.title,
      );
      await expect(featureForm.locator('[data-testid="feature-form-description-view"]')).toHaveCount(0);
      await expectRichText(featureForm, "E2E Feature-Inhalt vollständig", 0);

      await authenticatedGoto(page, `/projects/${project.id}`);
      await formPage(page, "Projekt bearbeiten")
        .getByRole("button", { name: /Features/ })
        .click();
      await clickItemAction(
        formPage(page, "Projekt bearbeiten"),
        feature.title,
        "Bearbeiten",
      );
      await expect(page).toHaveURL(new RegExp(`/features/${feature.id}`));
      await expect(
        formPage(page, "Feature bearbeiten").locator("input[required]").nth(0),
      ).toHaveValue(feature.title);
    } finally {
      await deleteProject(request, project.id);
      await deleteFeature(request, feature.id);
    }
  });

  test("Projekt-Tabs: Aufgaben und Backlog öffnen ihre Detailformular-Seiten mit geladenen Daten", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Project Tabs");
    const task = await createTask(
      request,
      { type: "project", id: project.id },
      "E2E Project Tab Task",
    );
    const backlogItem = await createBacklogItem(
      request,
      project.id,
      "E2E Project Tab Backlog",
    );

    try {
      await authenticatedGoto(page, `/projects/${project.id}`);
      const projectForm = formPage(page, "Projekt bearbeiten");

      await projectForm.getByRole("button", { name: /Aufgaben/ }).click();
      await itemCard(projectForm, task.title).dblclick();
      await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}`));
      const taskForm = formPage(page, "Aufgabe bearbeiten");
      await expect(taskForm.locator("input[required]").first()).toHaveValue(
        task.title,
      );
      await expectRichText(taskForm, "E2E Aufgabenbeschreibung vollständig");

      await authenticatedGoto(page, `/projects/${project.id}`);
      await formPage(page, "Projekt bearbeiten")
        .getByRole("button", { name: /Backlog/ })
        .click();
      await itemCard(
        formPage(page, "Projekt bearbeiten"),
        backlogItem.title,
      ).dblclick();
      await expect(page).toHaveURL(new RegExp(`/backlog/${backlogItem.id}`));
      let backlogForm = formPage(page, "Backlog-Item bearbeiten");
      await expect(backlogForm.locator("input[required]").first()).toHaveValue(
        backlogItem.title,
      );
      await expectRichText(backlogForm, "E2E Backlog-Beschreibung vollständig");

      await authenticatedGoto(page, `/projects/${project.id}`);
      await formPage(page, "Projekt bearbeiten")
        .getByRole("button", { name: /Backlog/ })
        .click();
      await clickItemAction(
        formPage(page, "Projekt bearbeiten"),
        backlogItem.title,
        "Bearbeiten",
      );
      await expect(page).toHaveURL(new RegExp(`/backlog/${backlogItem.id}`));
      backlogForm = formPage(page, "Backlog-Item bearbeiten");
      await expect(backlogForm.locator("input[required]").first()).toHaveValue(
        backlogItem.title,
      );
      await expectRichText(backlogForm, "E2E Backlog-Beschreibung vollständig");
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("Projekt löschen: Delete und Confirm entfernen die Karte aus der Übersicht", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Project Delete Route");

    await openProjectList(page);
    await clickItemAction(page, project.name, "Löschen");
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Löschen" })
      .click();

    await expect(itemCard(page, project.name)).not.toBeVisible();
    await deleteProject(request, project.id);
  });

  test("Board- und Listenansicht zeigen echte Projektdaten", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Project Toggle Route");

    try {
      await openProjectList(page);
      await page.getByRole("button", { name: "Liste", exact: true }).click();
      await expect(itemCard(page, project.name)).toBeVisible();

      await page.getByRole("button", { name: "Kanban" }).click();
      await expect(page.getByRole("heading", { name: "Aktiv" })).toBeVisible();
      await expect(itemCard(page, project.name)).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("Projekt-Menü erstellt Aufgabe im Modal und Abbrechen bleibt ohne Mutation", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Project Menu Create");
    const cancelTitle = uniqueTitle("E2E Project Menu Cancel Task");
    const taskTitle = uniqueTitle("E2E Project Menu Task");
    let taskId: number | null = null;

    try {
      await openProjectList(page);
      let projectCard = itemCard(page, project.name);
      await projectCard.getByRole("button", { name: "Aktionen" }).click();
      await projectCard.getByRole("menuitem", { name: "Neue Aufgabe" }).click();

      const cancelForm = formPage(page, "Aufgabe anlegen");
      await expect(cancelForm).toBeVisible();
      await cancelForm.locator("input[required]").first().fill(cancelTitle);
      await cancelForm.getByRole("button", { name: "Abbrechen" }).click();
      await expect(cancelForm).not.toBeVisible();

      const tasksAfterCancelResponse = await request.get(`${apiBaseUrl}/projects/${project.id}/tasks`);
      expect(tasksAfterCancelResponse.ok()).toBeTruthy();
      const tasksAfterCancel = (await tasksAfterCancelResponse.json()) as Array<{ title: string }>;
      expect(tasksAfterCancel.some((task) => task.title === cancelTitle)).toBe(false);

      projectCard = itemCard(page, project.name);
      await projectCard.getByRole("button", { name: "Aktionen" }).click();
      await projectCard.getByRole("menuitem", { name: "Neue Aufgabe" }).click();

      const taskForm = formPage(page, "Aufgabe anlegen");
      await taskForm.locator("input[required]").first().fill(taskTitle);
      await fillRichText(taskForm, "task-description", "E2E Aufgabenbeschreibung aus Projektmenü");
      const taskResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/projects/${project.id}/tasks`) &&
          response.request().method() === "POST",
      );
      await taskForm.getByRole("button", { name: "Aufgabe anlegen" }).click();
      const createdTask = (await (await taskResponsePromise).json()) as { id: number };
      taskId = createdTask.id;

      await expect(taskForm).not.toBeVisible();
      await expect(itemCard(page, project.name)).toContainText("1 offen");
    } finally {
      await deleteTask(request, taskId);
      await deleteProject(request, project.id);
    }
  });

  test("Feature erstellen aus Projekt-Tab nutzt die Feature-Create-Route, schließt und verknüpft echte Daten", async ({
    page,
    request,
  }) => {
    const project = await createProject(
      request,
      "E2E Project Feature Create Route",
    );
    let featureId: number | null = null;
    const featureTitle = uniqueTitle("E2E Project Created Feature Route");

    try {
      await authenticatedGoto(page, `/projects/${project.id}`);
      const projectForm = formPage(page, "Projekt bearbeiten");
      await projectForm.getByRole("button", { name: /Features/ }).click();
      await projectForm.getByRole("button", { name: "Neues Feature" }).click();

      await expect(page).toHaveURL(/\/features\/new\?/);
      const featureForm = formPage(page, "Neues Feature");
      await featureForm.locator("input[required]").nth(0).fill(featureTitle);
      await fillRichText(
        featureForm,
        "feature-form-content",
        "E2E verknüpfter Inhalt vollständig",
      );
      const featureResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/features") &&
          response.request().method() === "POST",
      );
      await featureForm
        .getByRole("button", { name: "Feature anlegen" })
        .click();
      const createdFeature = (await (await featureResponsePromise).json()) as {
        id: number;
      };
      featureId = createdFeature.id;

      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}\\?tab=features$`));
      const refreshedProjectForm = formPage(page, "Projekt bearbeiten");
      await refreshedProjectForm
        .getByRole("button", { name: /Features/ })
        .click();
      await expect(itemCard(refreshedProjectForm, featureTitle)).toBeVisible();

      const linkedResponse = await request.get(
        `${apiBaseUrl}/projects/${project.id}/features`,
      );
      const linked = (await linkedResponse.json()) as Array<{ id: number }>;
      expect(linked.some((feature) => feature.id === featureId)).toBe(true);
    } finally {
      await deleteProject(request, project.id);
      await deleteFeature(request, featureId);
    }
  });
});
