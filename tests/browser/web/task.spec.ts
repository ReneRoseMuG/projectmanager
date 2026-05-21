import { expect, test, type Page } from "@playwright/test";
import {
  authenticatedGoto,
  apiBaseUrl,
  clickItemAction,
  createProject,
  createTask,
  cleanupTasksByTitle,
  deleteProject,
  deleteTask,
  expectRichText,
  fillRichText,
  formPage,
  itemCard,
  uniqueTitle,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Aufgaben werden aus Owner-Tabs heraus über `/tasks/new` erstellt, schließen nach Speichern zurück und werden über `/tasks/:id` bearbeitet.
 * - Einfacher Klick und Bearbeiten-Button im Aufgaben-Board und in der Liste navigieren auf dieselbe Detailformular-Seite.
 * - Das Aufgabenformular zeigt echte geladene Daten inklusive Beschreibung und Fälligkeitsdatum vollständig an.
 *
 * Fehlerfälle:
 * - Das alte Task-Overlay darf bei Klick oder Bearbeiten nicht mehr der Zielzustand sein.
 *
 * Ziel:
 * Aufgaben-Detailnavigation und Aufgaben-Tab-Flows im Browser absichern.
 */

async function openProjectTasks(page: Page, projectId: number) {
  await authenticatedGoto(page, `/projects/${projectId}`);
  const projectForm = formPage(page, "Projekt bearbeiten");
  await expect(projectForm).toBeVisible();
  await projectForm.getByRole("button", { name: /Aufgaben/ }).click();
  await expect(
    projectForm.getByRole("button", { name: "Neue Aufgabe", exact: true }),
  ).toBeVisible();
  return projectForm;
}

async function expectTaskFormData(
  page: Page,
  task: { title: string },
  descriptionText = "E2E Aufgabenbeschreibung vollständig",
) {
  const form = formPage(page, "Aufgabe bearbeiten");
  await expect(form).toBeVisible();
  await expect(form.locator("input[required]").first()).toHaveValue(task.title);
  await expectRichText(form, descriptionText);
  await expect(form.locator('input[type="date"]').first()).toHaveValue(
    "2026-05-29",
  );
}

test.describe("Task-Routen und Detailformular", () => {
  test("Task erstellen: Neue Aufgabe im Projekt-Tab navigiert über Create-Route und Speichern schließt", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Task Create Project");
    const taskTitle = uniqueTitle("E2E Task Create Route");
    let taskId: number | null = null;

    try {
      const projectForm = await openProjectTasks(page, project.id);
      await projectForm
        .getByRole("button", { name: "Neue Aufgabe" })
        .first()
        .click();

      await expect(page).toHaveURL(/\/tasks\/new\?/);
      const taskForm = formPage(page, "Aufgabe anlegen");
      await taskForm.locator("input[required]").first().fill(taskTitle);
      await fillRichText(
        taskForm,
        "task-description",
        "E2E neue Aufgabenbeschreibung vollständig",
      );
      await taskForm.locator('input[type="date"]').first().fill("2026-05-29");
      const taskResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/projects/${project.id}/tasks`) &&
          response.request().method() === "POST",
      );
      await taskForm.getByRole("button", { name: "Aufgabe anlegen" }).click();
      const createdTask = (await (await taskResponsePromise).json()) as {
        id: number;
      };
      taskId = createdTask.id;

      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
      const reopenedProjectForm = await openProjectTasks(page, project.id);
      await expect(itemCard(reopenedProjectForm, taskTitle)).toBeVisible();
      await itemCard(reopenedProjectForm, taskTitle).click();
      await expect(page).toHaveURL(new RegExp(`/tasks/${taskId}`));
      await expectTaskFormData(
        page,
        { title: taskTitle },
        "E2E neue Aufgabenbeschreibung vollständig",
      );
    } finally {
      await deleteProject(request, project.id);
      await deleteTask(request, taskId);
    }
  });

  test("Task öffnen: Klick und Bearbeiten-Button zeigen dieselbe vollständige Formularseite", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Task Open Project");
    const task = await createTask(
      request,
      { type: "project", id: project.id },
      "E2E Task Open Route",
    );

    try {
      let projectForm = await openProjectTasks(page, project.id);
      await itemCard(projectForm, task.title).click();
      await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}`));
      await expectTaskFormData(page, task);

      projectForm = await openProjectTasks(page, project.id);
      await clickItemAction(projectForm, task.title, "Bearbeiten");
      await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}`));
      await expectTaskFormData(page, task);

      projectForm = await openProjectTasks(page, project.id);
      await projectForm
        .getByRole("button", { name: "Liste", exact: true })
        .first()
        .click();
      await clickItemAction(projectForm, task.title, "Bearbeiten");
      await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}`));
      await expectTaskFormData(page, task);
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("Task bearbeiten: Speichern schließt auf die Rücksprung-Route und aktualisiert die Owner-Karte", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Task Edit Project");
    const task = await createTask(
      request,
      { type: "project", id: project.id },
      "E2E Task Edit Route",
    );
    const updatedTitle = uniqueTitle("E2E Task Updated Route");

    try {
      await authenticatedGoto(
        page,
        `/tasks/${task.id}?returnTo=${encodeURIComponent(`/projects/${project.id}`)}`,
      );
      const taskForm = formPage(page, "Aufgabe bearbeiten");
      await expectTaskFormData(page, task);

      await taskForm.locator("input[required]").first().fill(updatedTitle);
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes(`/api/tasks/${task.id}`) &&
            response.request().method() === "PATCH",
        ),
        taskForm.getByRole("button", { name: "Speichern" }).click(),
      ]);

      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
      const projectForm = await openProjectTasks(page, project.id);
      await expect(itemCard(projectForm, updatedTitle)).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("Task-Zuordnung entfernen: Delete-Icon entfernt nur die Owner-Relation", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Task Remove Project");
    const task = await createTask(
      request,
      { type: "project", id: project.id },
      "E2E Task Remove Route",
    );

    try {
      const projectForm = await openProjectTasks(page, project.id);
      await clickItemAction(projectForm, task.title, "Löschen");
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response
              .url()
              .includes(`/api/projects/${project.id}/tasks/${task.id}`) &&
            response.request().method() === "DELETE",
        ),
        page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Entfernen" })
          .click(),
      ]);

      await expect(itemCard(projectForm, task.title)).toHaveCount(0);
      const detail = await request.get(`${apiBaseUrl}/tasks/${task.id}`);
      expect(detail.ok()).toBeTruthy();
    } finally {
      await deleteProject(request, project.id);
      await deleteTask(request, task.id);
    }
  });

  test("Task-Kommentare funktionieren auf der Detailseite statt im Overlay", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Task Comment Project");
    const task = await createTask(
      request,
      { type: "project", id: project.id },
      "E2E Task Comment Route",
    );

    try {
      await authenticatedGoto(
        page,
        `/tasks/${task.id}?returnTo=${encodeURIComponent(`/projects/${project.id}`)}`,
      );
      const taskForm = formPage(page, "Aufgabe bearbeiten");
      await taskForm.getByRole("button", { name: /Kommentare/ }).click();
      await fillRichText(
        taskForm,
        "comment-thread-body",
        "E2E Kommentar Route",
      );
      await taskForm
        .getByRole("button", { name: "Kommentar", exact: true })
        .click();

      await expect(
        taskForm.getByText("E2E Kommentar Route", { exact: true }),
      ).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("Task-Board und Task-Liste zeigen echte Daten im Projekt-Tab", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Task Toggle Project");
    const task = await createTask(
      request,
      { type: "project", id: project.id },
      "E2E Task Toggle Route",
    );

    try {
      const projectForm = await openProjectTasks(page, project.id);
      await projectForm.getByRole("button", { name: "Kanban" }).click();
      await expect(
        projectForm.getByRole("heading", { name: "Aktiv" }).first(),
      ).toBeVisible();
      await expect(itemCard(projectForm, task.title)).toBeVisible();

      await projectForm
        .getByRole("button", { name: "Liste", exact: true })
        .first()
        .click();
      await expect(itemCard(projectForm, task.title)).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
      await cleanupTasksByTitle(request, [task.title]);
    }
  });
});
