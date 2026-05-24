import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  authenticatedGoto,
  createProject,
  createTask,
  createTicket,
  deleteProject,
  deleteTask,
  deleteTicket,
  formPage,
  itemCard,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Aufgaben-Karten lassen sich im echten Browser per Pointer-Drag zwischen Statusspalten verschieben.
 * - Ticket-Karten lassen sich im echten Browser per Pointer-Drag zwischen Statusspalten verschieben.
 * - Der Drop auf eine fremde bekannte Statusspalte löst eine persistente Statusänderung aus.
 *
 * Fehlerfälle:
 * - Ein nur gemockter DnD-Callback-Test reicht nicht als Abnahme für funktionierendes Drag & Drop.
 *
 * Ziel:
 * Die reale `@dnd-kit`-Pointer-Interaktion im Task-Board gegen Regressionen absichern.
 */

async function openProjectTasksBoard(page: Page, projectId: number) {
  await authenticatedGoto(page, `/projects/${projectId}`);
  const projectForm = formPage(page, "Projekt bearbeiten");
  await expect(projectForm).toBeVisible();
  await projectForm.getByRole("button", { name: /Aufgaben/ }).click();
  await expect(
    projectForm.getByRole("button", { name: "Neue Aufgabe", exact: true }),
  ).toBeVisible();
  await projectForm.getByRole("button", { name: "Kanban", exact: true }).click();
  await expect(projectForm.locator("[data-dnd-enabled='true']")).toBeVisible();
  return projectForm;
}

async function openProjectTasksList(page: Page, projectId: number) {
  await authenticatedGoto(page, `/projects/${projectId}`);
  const projectForm = formPage(page, "Projekt bearbeiten");
  await expect(projectForm).toBeVisible();
  await projectForm.getByRole("button", { name: /Aufgaben/ }).click();
  await expect(
    projectForm.getByRole("button", { name: "Neue Aufgabe", exact: true }),
  ).toBeVisible();
  await projectForm.getByRole("button", { name: "Liste", exact: true }).click();
  await expect(projectForm.locator("[data-list-board-layout='list']")).toBeVisible();
  return projectForm;
}

async function dragItemToStatus(
  page: Page,
  scope: Locator,
  title: string,
  status: string,
  beforeDrop?: (target: Locator) => Promise<void>,
) {
  const source = itemCard(scope, title);
  const target = scope.locator(`section[data-status-column="${status}"]`);
  await expect(source).toBeVisible();
  await expect(target).toBeVisible();
  await source.scrollIntoViewIfNeeded();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  if (!sourceBox || !targetBox) {
    return;
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + Math.min(sourceBox.height / 2, 36),
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + Math.min(targetBox.height - 20, 96),
    { steps: 12 },
  );
  await beforeDrop?.(target);
  await page.mouse.up();
}

test.describe("Task Board Drag & Drop", () => {
  test("verschiebt eine Aufgabe per echtem Pointer-Drag in eine andere Statusspalte", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Task DnD Project");
    const task = await createTask(
      request,
      { type: "project", id: project.id },
      "E2E Task DnD",
      { status: "active" },
    );

    try {
      const projectForm = await openProjectTasksBoard(page, project.id);
      await expect(
        projectForm
          .locator('section[data-status-column="active"]')
          .filter({ hasText: task.title }),
      ).toBeVisible();
      const onHoldColumn = projectForm.locator('section[data-status-column="on_hold"]');
      await expect(onHoldColumn).toHaveAttribute("data-status-collapsed", "true");
      await expect(onHoldColumn).toHaveCSS("width", "48px");

      const updateResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/tasks/${task.id}`) &&
          response.request().method() === "PATCH",
      );
      await dragItemToStatus(page, projectForm, task.title, "on_hold", async (target) => {
        await expect(target).toHaveClass(/ring-2/);
      });
      const updated = (await (await updateResponse).json()) as {
        status: string;
      };

      expect(updated.status).toBe("on_hold");
      await expect(
        projectForm
          .locator('section[data-status-column="on_hold"]')
          .filter({ hasText: task.title }),
      ).toBeVisible();
      await expect(onHoldColumn).not.toHaveAttribute("data-status-collapsed", "true");
      await expect(
        projectForm
          .locator('section[data-status-column="active"]')
          .filter({ hasText: task.title }),
      ).toHaveCount(0);
    } finally {
      await deleteProject(request, project.id);
      await deleteTask(request, task.id);
    }
  });

  test("verschiebt ein Ticket per echtem Pointer-Drag in eine andere Statusspalte", async ({
    page,
    request,
  }) => {
    const ticket = await createTicket(request, null, "E2E Ticket DnD", {
      status: "open",
    });

    try {
      await authenticatedGoto(page, "/tickets");
      await page.getByRole("button", { name: "Kanban", exact: true }).click();
      await expect(page.locator("[data-dnd-enabled='true']")).toBeVisible();
      await expect(
        page
          .locator('section[data-status-column="open"]')
          .filter({ hasText: ticket.title }),
      ).toBeVisible();

      const updateResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/tickets/${ticket.id}`) &&
          response.request().method() === "PATCH",
      );
      await dragItemToStatus(page, page.locator("body"), ticket.title, "in_progress");
      const updated = (await (await updateResponse).json()) as {
        status: string;
      };

      expect(updated.status).toBe("in_progress");
      await expect(
        page
          .locator('section[data-status-column="in_progress"]')
          .filter({ hasText: ticket.title }),
      ).toBeVisible();
      await expect(
        page
          .locator('section[data-status-column="open"]')
          .filter({ hasText: ticket.title }),
      ).toHaveCount(0);
    } finally {
      await deleteTicket(request, ticket.id);
    }
  });

  test("kollabierte Listen-Gruppe öffnet den Aufgabendialog mit vorgewähltem Status", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Collapsed List Project");

    try {
      const projectForm = await openProjectTasksList(page, project.id);
      const onHoldGroup = projectForm.locator('section[data-status-column="on_hold"]');
      await expect(onHoldGroup).toHaveAttribute("data-status-collapsed", "true");
      await expect(onHoldGroup).toHaveClass(/h-12/);

      await onHoldGroup.getByRole("button", { name: "Pausiert hinzufügen" }).click();

      const taskForm = formPage(page, "Aufgabe anlegen");
      await expect(taskForm).toBeVisible();
      await expect(
        taskForm.getByRole("button", { name: "Pausiert", exact: true }),
      ).toHaveAttribute("data-active", "true");
    } finally {
      await deleteProject(request, project.id);
    }
  });
});
