import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ticket-Boards in Projekt-, Aufgaben-, Feature- und Use-Case-Details unterstützen Create, Link und Remove als Browser-Flow.
 * - Bestehende Tickets können verknüpft und Ticket-Zuordnungen über den Item-Delete-Button entfernt werden.
 * - Direktes Löschen eines noch verknüpften Tickets wird mit sichtbarer Fehlermeldung blockiert.
 *
 * Fehlerfälle:
 * - Verknüpfte Tickets dürfen nicht stillschweigend gelöscht werden.
 * - Entfernen einer Owner-Relation darf das Ticket selbst nicht löschen.
 *
 * Ziel:
 * Die owner-basierten Ticket-Flows inklusive Benachrichtigungen über Playwright absichern.
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

interface TicketFixture {
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
    data: { name, description: "E2E Projekt", status: "active", color: "#4682B4" }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createTask(request: APIRequestContext, projectId: number, titlePrefix: string): Promise<TaskFixture> {
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/projects/${projectId}/tasks`, {
    data: { title, status: "todo", priority: "medium" }
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

async function createUseCase(request: APIRequestContext, featureId: number, titlePrefix: string): Promise<UseCaseFixture> {
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/features/${featureId}/use-cases`, {
    data: { title, slug: slugify(title), status: "active", description: "E2E Use Case", content: "", sortOrder: 0 }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createTicket(request: APIRequestContext, titlePrefix: string): Promise<TicketFixture> {
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/tickets`, {
    data: { title, type: "bug", status: "open", priority: "medium" }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function createProjectTicket(request: APIRequestContext, projectId: number, titlePrefix: string): Promise<TicketFixture> {
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/projects/${projectId}/tickets`, {
    data: { title, type: "bug", status: "open", priority: "medium" }
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function cleanupTicket(request: APIRequestContext, ticketId: number | null | undefined) {
  if (ticketId) {
    await request.delete(`${apiBaseUrl}/tickets/${ticketId}`);
  }
}

async function cleanupProject(request: APIRequestContext, projectId: number | null | undefined) {
  if (projectId) {
    await request.delete(`${apiBaseUrl}/projects/${projectId}`);
  }
}

async function cleanupFeature(request: APIRequestContext, featureId: number | null | undefined) {
  if (featureId) {
    await request.delete(`${apiBaseUrl}/features/${featureId}`);
  }
}

async function cleanupTicketsByTitle(request: APIRequestContext, titles: string[]) {
  const response = await request.get(`${apiBaseUrl}/tickets`);
  const tickets = (await response.json()) as TicketFixture[];
  for (const ticket of tickets.filter((item) => titles.includes(item.title))) {
    await cleanupTicket(request, ticket.id);
  }
}

function activeModal(page: Page) {
  return page.locator(".fixed.inset-0").last();
}

function ticketCard(scope: Page | Locator, title: string) {
  return scope.locator("article:visible").filter({ hasText: title }).first();
}

async function createTicketInBoard(page: Page, scope: Page | Locator, title: string) {
  await scope.getByRole("button", { name: "Neues Ticket" }).first().click();
  await activeModal(page).locator("input[required]").first().fill(title);
  await activeModal(page).getByRole("button", { name: "Ticket anlegen" }).click();
  await expect(page.getByRole("status")).toContainText("Ticket erstellt");
  await expect(ticketCard(scope, title)).toBeVisible();
}

async function linkTicketInBoard(page: Page, scope: Page | Locator, title: string) {
  await scope.getByRole("button", { name: "Verknüpfen" }).first().click();
  await activeModal(page).getByPlaceholder("Tickets suchen").fill(title);
  await expect(activeModal(page).getByText(title)).toBeVisible();
  await activeModal(page).getByRole("button", { name: "Verknüpfen" }).last().click();
  await expect(page.getByRole("status")).toContainText("Ticket verknüpft");
  await activeModal(page).getByRole("button", { name: "Schließen" }).click();
  await expect(ticketCard(scope, title)).toBeVisible();
}

async function removeTicketRelationInBoard(page: Page, scope: Page | Locator, title: string) {
  await ticketCard(scope, title).getByRole("button", { name: "Löschen", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Entfernen" }).click();
  await expect(page.getByRole("status")).toContainText("Ticket-Zuordnung entfernt");
  await expect(ticketCard(scope, title)).toHaveCount(0);
}

async function openProjectTickets(page: Page, projectId: number) {
  await page.goto(`/projects/${projectId}`);
  await page.getByRole("button", { name: /Tickets/ }).click();
  await expect(page.getByRole("button", { name: "Neues Ticket" })).toBeVisible();
}

async function openFeatureTickets(page: Page, featureId: number) {
  await page.goto(`/features/${featureId}`);
  await page.getByRole("tab", { name: /Tickets/ }).click();
  await expect(page.getByRole("button", { name: "Neues Ticket" })).toBeVisible();
}

async function openTaskTickets(page: Page, projectId: number, taskTitle: string) {
  await page.goto(`/projects/${projectId}`);
  await page.getByRole("button", { name: /Aufgaben/ }).click();
  await ticketCard(page, taskTitle).dblclick();
  await activeModal(page).getByRole("button", { name: /Tickets/ }).click();
  await expect(activeModal(page).getByRole("button", { name: "Neues Ticket" })).toBeVisible();
}

async function openUseCaseTickets(page: Page, featureId: number, useCaseTitle: string) {
  await page.goto(`/features/${featureId}`);
  await page.getByRole("tab", { name: /Use Cases/ }).click();
  await ticketCard(page, useCaseTitle).dblclick();
  await activeModal(page).getByRole("button", { name: /Tickets/ }).click();
  await expect(activeModal(page).getByRole("button", { name: "Neues Ticket" })).toBeVisible();
}

test.describe("Owner-Ticket-Flows", () => {
  test("Projekt-Tickets: Add, Link, Remove und Toasts", async ({ page, request }) => {
    const project = await createProject(request, "E2E Ticket Project");
    const existingTicket = await createTicket(request, "E2E Ticket Project Link");
    const createdTitle = uniqueTitle("E2E Ticket Project Create");

    try {
      await openProjectTickets(page, project.id);
      await createTicketInBoard(page, page, createdTitle);
      await linkTicketInBoard(page, page, existingTicket.title);
      await removeTicketRelationInBoard(page, page, existingTicket.title);
    } finally {
      await cleanupProject(request, project.id);
      await cleanupTicketsByTitle(request, [createdTitle, existingTicket.title]);
    }
  });

  test("Aufgaben-Tickets: Add, Link, Remove im Tickets-Tab", async ({ page, request }) => {
    const project = await createProject(request, "E2E Ticket Task Project");
    const task = await createTask(request, project.id, "E2E Ticket Task");
    const existingTicket = await createTicket(request, "E2E Ticket Task Link");
    const createdTitle = uniqueTitle("E2E Ticket Task Create");

    try {
      await openTaskTickets(page, project.id, task.title);
      await createTicketInBoard(page, activeModal(page), createdTitle);
      await linkTicketInBoard(page, activeModal(page), existingTicket.title);
      await removeTicketRelationInBoard(page, activeModal(page), existingTicket.title);
    } finally {
      await cleanupProject(request, project.id);
      await cleanupTicketsByTitle(request, [createdTitle, existingTicket.title]);
    }
  });

  test("Feature-Tickets: Add, Link, Remove im Tickets-Tab", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Ticket Feature");
    const existingTicket = await createTicket(request, "E2E Ticket Feature Link");
    const createdTitle = uniqueTitle("E2E Ticket Feature Create");

    try {
      await openFeatureTickets(page, feature.id);
      await createTicketInBoard(page, page, createdTitle);
      await linkTicketInBoard(page, page, existingTicket.title);
      await removeTicketRelationInBoard(page, page, existingTicket.title);
    } finally {
      await cleanupFeature(request, feature.id);
      await cleanupTicketsByTitle(request, [createdTitle, existingTicket.title]);
    }
  });

  test("Use-Case-Tickets: Add, Link, Remove im Tickets-Tab", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Ticket UseCase Feature");
    const useCase = await createUseCase(request, feature.id, "E2E Ticket UseCase");
    const existingTicket = await createTicket(request, "E2E Ticket UseCase Link");
    const createdTitle = uniqueTitle("E2E Ticket UseCase Create");

    try {
      await openUseCaseTickets(page, feature.id, useCase.title);
      await createTicketInBoard(page, activeModal(page), createdTitle);
      await linkTicketInBoard(page, activeModal(page), existingTicket.title);
      await removeTicketRelationInBoard(page, activeModal(page), existingTicket.title);
    } finally {
      await cleanupFeature(request, feature.id);
      await cleanupTicketsByTitle(request, [createdTitle, existingTicket.title]);
    }
  });

  test("Globales Ticket-Löschen zeigt Meldung, wenn noch Owner-Beziehungen bestehen", async ({ page, request }) => {
    const project = await createProject(request, "E2E Ticket Delete Block");
    const ticket = await createProjectTicket(request, project.id, "E2E Ticket Blocked Delete");

    try {
      await page.goto("/tickets");
      await ticketCard(page, ticket.title).getByRole("button", { name: "Löschen", exact: true }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Löschen" }).click();

      await expect(page.getByRole("status")).toContainText("Ticket konnte nicht gelöscht werden");
      await expect(page.getByRole("status")).toContainText("Beziehungen");
      await expect(ticketCard(page, ticket.title)).toBeVisible();
    } finally {
      await cleanupProject(request, project.id);
      await cleanupTicket(request, ticket.id);
    }
  });
});
