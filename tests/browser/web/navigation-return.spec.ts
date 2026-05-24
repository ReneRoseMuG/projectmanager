import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  authenticatedGoto,
  apiBaseUrl,
  createBacklogItem,
  createFeature,
  createMilestone,
  createProject,
  createTask,
  createTicket,
  createUseCase,
  deleteFeature,
  deleteProject,
  deleteTask,
  deleteTicket,
  formPage,
  itemCard,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Browser/E2E
 *
 * Realitätsgrad:
 * - Echte Browserinteraktion, echte Detailrouten, echte API-Antworten und echte Testdaten.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Playwright-E2E-Runtime mit isolierter Testdatenbank unter tests/.runtime/e2e.
 *
 * Abgedeckte Regeln:
 * - Parent-Tabs werden als URL-State geführt und automatisch in returnTo übernommen.
 * - Navigation zu untergeordneten Detailseiten kehrt nach Abbrechen und Speichern auf den Ausgangs-Tab zurück.
 *
 * Fehlerfälle:
 * - Rückkehr auf den Default-Tab, verlorene returnTo-Parameter oder falsche Parent-Seiten.
 *
 * Ziel:
 * Das gewünschte Navigationsverhalten für alle Parent-Tab-Pfade mit Detailseiten absichern.
 */

interface NavigationCase {
  parentPath: string;
  parentHeading: string;
  tabName: RegExp;
  tabParam: string;
  childTitle: string;
  childPath: string;
  childHeading: string;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parentUrlPattern(parentPath: string, tabParam: string) {
  return new RegExp(`${escapeRegex(parentPath)}\\?tab=${tabParam}$`);
}

function childUrlPattern(childPath: string, tabParam: string) {
  return new RegExp(
    `${escapeRegex(childPath)}\\?returnTo=.*tab%3D${tabParam}`,
  );
}

async function openParentTab(page: Page, item: NavigationCase) {
  await authenticatedGoto(page, item.parentPath);
  const parentForm = formPage(page, item.parentHeading);
  await expect(parentForm).toBeVisible();
  await parentForm.getByRole("button", { name: item.tabName }).click();
  await expect(page).toHaveURL(parentUrlPattern(item.parentPath, item.tabParam));
  await expect(itemCard(parentForm, item.childTitle)).toBeVisible();
  return parentForm;
}

async function expectDetailRoundTrip(page: Page, item: NavigationCase) {
  let parentForm = await openParentTab(page, item);
  await itemCard(parentForm, item.childTitle).dblclick();
  await expect(page).toHaveURL(childUrlPattern(item.childPath, item.tabParam));

  let childForm = formPage(page, item.childHeading);
  await expect(childForm).toBeVisible();
  await childForm.getByRole("button", { name: "Abbrechen" }).click();
  await expect(page).toHaveURL(parentUrlPattern(item.parentPath, item.tabParam));
  await expect(itemCard(formPage(page, item.parentHeading), item.childTitle)).toBeVisible();

  parentForm = formPage(page, item.parentHeading);
  await itemCard(parentForm, item.childTitle).dblclick();
  await expect(page).toHaveURL(childUrlPattern(item.childPath, item.tabParam));

  childForm = formPage(page, item.childHeading);
  await expect(childForm).toBeVisible();
  await childForm.getByRole("button", { name: "Speichern" }).click();
  await expect(page).toHaveURL(parentUrlPattern(item.parentPath, item.tabParam));
  await expect(itemCard(formPage(page, item.parentHeading), item.childTitle)).toBeVisible();
}

async function linkMilestoneFeature(
  request: APIRequestContext,
  milestoneId: number,
  featureId: number,
) {
  const response = await request.put(
    `${apiBaseUrl}/milestones/${milestoneId}/features`,
    { data: { featureIds: [featureId] } },
  );
  expect(response.ok()).toBeTruthy();
}

test.describe("Detailnavigation aus Parent-Tabs", () => {
  test("Feature-Detail: Aufgabenstatus und Datum behalten den aktiven Aufgaben-Tab", async ({
    page,
    request,
  }) => {
    const feature = await createFeature(request, "E2E Navigation Mutation Feature");
    const task = await createTask(
      request,
      { type: "feature", id: feature.id },
      "E2E Navigation Mutation Task",
      { status: "active", dueDate: "2026-05-29" },
    );

    try {
      const parentPath = `/features/${feature.id}`;
      let featureForm = await openParentTab(page, {
        parentPath,
        parentHeading: "Feature bearbeiten",
        tabName: /Aufgaben/,
        tabParam: "tasks",
        childTitle: task.title,
        childPath: `/tasks/${task.id}`,
        childHeading: "Aufgabe bearbeiten",
      });

      await itemCard(featureForm, task.title)
        .getByRole("button", { name: "29.05.26" })
        .click();
      const dateUpdate = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/tasks/${task.id}`) &&
          response.request().method() === "PATCH",
      );
      await page.getByLabel(/Datum/).fill("2026-06-01");
      await dateUpdate;
      await expect(page).toHaveURL(parentUrlPattern(parentPath, "tasks"));
      featureForm = formPage(page, "Feature bearbeiten");
      await expect(itemCard(featureForm, task.title)).toBeVisible();

      await itemCard(featureForm, task.title)
        .getByRole("button", { name: "Aktiv" })
        .click();
      const statusUpdate = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/tasks/${task.id}`) &&
          response.request().method() === "PATCH",
      );
      await page.getByRole("menuitem", { name: "Geschlossen", exact: true }).click();
      await statusUpdate;
      await expect(page).toHaveURL(parentUrlPattern(parentPath, "tasks"));
      await expect(itemCard(formPage(page, "Feature bearbeiten"), task.title)).toBeVisible();
    } finally {
      await deleteTask(request, task.id);
      await deleteFeature(request, feature.id);
    }
  });

  test("Projekt-Detail: alle Tab-Pfade kehren nach Abbrechen und Speichern sauber zurück", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Navigation Project");
    const milestone = await createMilestone(
      request,
      project.id,
      "E2E Navigation Project Milestone",
    );
    const feature = await createFeature(request, "E2E Navigation Project Feature");
    const task = await createTask(
      request,
      { type: "project", id: project.id },
      "E2E Navigation Project Task",
    );
    const ticket = await createTicket(
      request,
      { type: "project", id: project.id },
      "E2E Navigation Project Ticket",
    );
    const backlogItem = await createBacklogItem(
      request,
      project.id,
      "E2E Navigation Project Backlog",
    );

    try {
      const linkResponse = await request.put(
        `${apiBaseUrl}/projects/${project.id}/features`,
        { data: { featureIds: [feature.id] } },
      );
      expect(linkResponse.ok()).toBeTruthy();

      for (const item of [
        {
          parentPath: `/projects/${project.id}`,
          parentHeading: "Projekt bearbeiten",
          tabName: /Meilensteine/,
          tabParam: "milestones",
          childTitle: milestone.name,
          childPath: `/milestones/${milestone.id}`,
          childHeading: "Meilenstein bearbeiten",
        },
        {
          parentPath: `/projects/${project.id}`,
          parentHeading: "Projekt bearbeiten",
          tabName: /Features/,
          tabParam: "features",
          childTitle: feature.title,
          childPath: `/features/${feature.id}`,
          childHeading: "Feature bearbeiten",
        },
        {
          parentPath: `/projects/${project.id}`,
          parentHeading: "Projekt bearbeiten",
          tabName: /Aufgaben/,
          tabParam: "tasks",
          childTitle: task.title,
          childPath: `/tasks/${task.id}`,
          childHeading: "Aufgabe bearbeiten",
        },
        {
          parentPath: `/projects/${project.id}`,
          parentHeading: "Projekt bearbeiten",
          tabName: /Tickets/,
          tabParam: "tickets",
          childTitle: ticket.title,
          childPath: `/tickets/${ticket.id}`,
          childHeading: "Ticket bearbeiten",
        },
        {
          parentPath: `/projects/${project.id}`,
          parentHeading: "Projekt bearbeiten",
          tabName: /Backlog/,
          tabParam: "backlog",
          childTitle: backlogItem.title,
          childPath: `/backlog/${backlogItem.id}`,
          childHeading: "Backlog-Item bearbeiten",
        },
      ] satisfies NavigationCase[]) {
        await expectDetailRoundTrip(page, item);
      }
    } finally {
      await request.delete(`${apiBaseUrl}/backlog/${backlogItem.id}`);
      await deleteTask(request, task.id);
      await deleteTicket(request, ticket.id);
      await deleteFeature(request, feature.id);
      await deleteProject(request, project.id);
    }
  });

  test("Feature-Detail: alle Tab-Pfade kehren nach Abbrechen und Speichern sauber zurück", async ({
    page,
    request,
  }) => {
    const feature = await createFeature(request, "E2E Navigation Feature");
    const useCase = await createUseCase(
      request,
      feature.id,
      "E2E Navigation Feature UseCase",
    );
    const task = await createTask(
      request,
      { type: "feature", id: feature.id },
      "E2E Navigation Feature Task",
    );
    const ticket = await createTicket(
      request,
      { type: "feature", id: feature.id },
      "E2E Navigation Feature Ticket",
    );
    const project = await createProject(request, "E2E Navigation Feature Project");

    try {
      const linkResponse = await request.put(
        `${apiBaseUrl}/projects/${project.id}/features`,
        { data: { featureIds: [feature.id] } },
      );
      expect(linkResponse.ok()).toBeTruthy();

      for (const item of [
        {
          parentPath: `/features/${feature.id}`,
          parentHeading: "Feature bearbeiten",
          tabName: /Use Cases/,
          tabParam: "useCases",
          childTitle: useCase.title,
          childPath: `/use-cases/${useCase.id}`,
          childHeading: "Use Case bearbeiten",
        },
        {
          parentPath: `/features/${feature.id}`,
          parentHeading: "Feature bearbeiten",
          tabName: /Aufgaben/,
          tabParam: "tasks",
          childTitle: task.title,
          childPath: `/tasks/${task.id}`,
          childHeading: "Aufgabe bearbeiten",
        },
        {
          parentPath: `/features/${feature.id}`,
          parentHeading: "Feature bearbeiten",
          tabName: /Tickets/,
          tabParam: "tickets",
          childTitle: ticket.title,
          childPath: `/tickets/${ticket.id}`,
          childHeading: "Ticket bearbeiten",
        },
        {
          parentPath: `/features/${feature.id}`,
          parentHeading: "Feature bearbeiten",
          tabName: /Projekte/,
          tabParam: "projects",
          childTitle: project.name,
          childPath: `/projects/${project.id}`,
          childHeading: "Projekt bearbeiten",
        },
      ] satisfies NavigationCase[]) {
        await expectDetailRoundTrip(page, item);
      }
    } finally {
      await deleteTask(request, task.id);
      await deleteTicket(request, ticket.id);
      await deleteProject(request, project.id);
      await deleteFeature(request, feature.id);
    }
  });

  test("Meilenstein-Detail: alle Tab-Pfade kehren nach Abbrechen und Speichern sauber zurück", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Navigation Milestone Project");
    const milestone = await createMilestone(
      request,
      project.id,
      "E2E Navigation Milestone",
    );
    const feature = await createFeature(request, "E2E Navigation Milestone Feature");
    const task = await createTask(
      request,
      { type: "milestone", id: milestone.id },
      "E2E Navigation Milestone Task",
    );
    const ticket = await createTicket(
      request,
      { type: "milestone", id: milestone.id },
      "E2E Navigation Milestone Ticket",
    );

    try {
      await linkMilestoneFeature(request, milestone.id, feature.id);

      for (const item of [
        {
          parentPath: `/milestones/${milestone.id}`,
          parentHeading: "Meilenstein bearbeiten",
          tabName: /Features/,
          tabParam: "features",
          childTitle: feature.title,
          childPath: `/features/${feature.id}`,
          childHeading: "Feature bearbeiten",
        },
        {
          parentPath: `/milestones/${milestone.id}`,
          parentHeading: "Meilenstein bearbeiten",
          tabName: /Aufgaben/,
          tabParam: "tasks",
          childTitle: task.title,
          childPath: `/tasks/${task.id}`,
          childHeading: "Aufgabe bearbeiten",
        },
        {
          parentPath: `/milestones/${milestone.id}`,
          parentHeading: "Meilenstein bearbeiten",
          tabName: /Tickets/,
          tabParam: "tickets",
          childTitle: ticket.title,
          childPath: `/tickets/${ticket.id}`,
          childHeading: "Ticket bearbeiten",
        },
      ] satisfies NavigationCase[]) {
        await expectDetailRoundTrip(page, item);
      }
    } finally {
      await deleteTask(request, task.id);
      await deleteTicket(request, ticket.id);
      await deleteFeature(request, feature.id);
      await deleteProject(request, project.id);
    }
  });

  test("Use-Case-Detail: alle Tab-Pfade kehren nach Abbrechen und Speichern sauber zurück", async ({
    page,
    request,
  }) => {
    const feature = await createFeature(request, "E2E Navigation UseCase Feature");
    const useCase = await createUseCase(
      request,
      feature.id,
      "E2E Navigation UseCase",
    );
    const task = await createTask(
      request,
      { type: "useCase", id: useCase.id },
      "E2E Navigation UseCase Task",
    );
    const ticket = await createTicket(
      request,
      { type: "useCase", id: useCase.id },
      "E2E Navigation UseCase Ticket",
    );

    try {
      for (const item of [
        {
          parentPath: `/use-cases/${useCase.id}`,
          parentHeading: "Use Case bearbeiten",
          tabName: /Aufgaben/,
          tabParam: "tasks",
          childTitle: task.title,
          childPath: `/tasks/${task.id}`,
          childHeading: "Aufgabe bearbeiten",
        },
        {
          parentPath: `/use-cases/${useCase.id}`,
          parentHeading: "Use Case bearbeiten",
          tabName: /Tickets/,
          tabParam: "tickets",
          childTitle: ticket.title,
          childPath: `/tickets/${ticket.id}`,
          childHeading: "Ticket bearbeiten",
        },
      ] satisfies NavigationCase[]) {
        await expectDetailRoundTrip(page, item);
      }
    } finally {
      await deleteTask(request, task.id);
      await deleteTicket(request, ticket.id);
      await deleteFeature(request, feature.id);
    }
  });
});
