import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  authenticatedGoto,
  apiBaseUrl,
  createFeature,
  createProject,
  createTask,
  createTicket,
  createUseCase,
  cleanupTicketsByTitle,
  deleteFeature,
  deleteProject,
  deleteTicket,
  expectRichText,
  fillRichText,
  formPage,
  itemCard,
  uniqueTitle
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Tickets werden global und aus Owner-Tabs über `/tickets/new` erstellt und über `/tickets/:id` bearbeitet.
 * - Doppelklick und Bearbeiten-Button in Ticket-Boards und Listen navigieren auf dieselbe Detailformular-Seite.
 * - Projekt-, Aufgaben-, Feature- und Use-Case-Ticket-Tabs öffnen echte Ticketdaten per Route.
 *
 * Fehlerfälle:
 * - Ticket-Detail darf weder leer bleiben noch in einem alten Detail-/Formular-Overlay landen.
 *
 * Ziel:
 * Ticket-Detailnavigation und Owner-Ticket-Boards mit echten Daten im Browser absichern.
 */

async function openTicketList(page: Page) {
  await authenticatedGoto(page, "/tickets");
  await expect(page.getByRole("heading", { name: "Tickets", exact: true })).toBeVisible();
}

async function expectTicketFormData(page: Page, ticket: { title: string }, descriptionText = "E2E Ticketbeschreibung vollständig") {
  const form = formPage(page, "Ticket bearbeiten");
  await expect(form).toBeVisible();
  await expect(form.locator("input[required]").first()).toHaveValue(ticket.title);
  await expectRichText(form, descriptionText);
  await expect(form.locator("input").nth(1)).toHaveValue("Ada Lovelace");
  await expect(form.locator("input").nth(2)).toHaveValue("Grace Hopper");
  await expect(form.locator('input[type="date"]').first()).toHaveValue("2026-05-30");
  await expect(form.locator("input").nth(4)).toHaveValue("E2E Umgebung");
  await expect(form.locator("input").nth(5)).toHaveValue("v1.2.3");
}

async function openProjectTickets(page: Page, projectId: number) {
  await authenticatedGoto(page, `/projects/${projectId}`);
  const form = formPage(page, "Projekt bearbeiten");
  await form.getByRole("button", { name: /Tickets/ }).click();
  await expect(form.getByRole("button", { name: "Neues Ticket" })).toBeVisible();
  return form;
}

async function openTaskTickets(page: Page, taskId: number, projectId: number) {
  await authenticatedGoto(page, `/tasks/${taskId}?returnTo=${encodeURIComponent(`/projects/${projectId}`)}`);
  const form = formPage(page, "Aufgabe bearbeiten");
  await form.getByRole("button", { name: /Tickets/ }).click();
  await expect(form.getByRole("button", { name: "Neues Ticket" })).toBeVisible();
  return form;
}

async function openFeatureTickets(page: Page, featureId: number) {
  await authenticatedGoto(page, `/features/${featureId}`);
  const form = formPage(page, "Feature bearbeiten");
  await form.getByRole("button", { name: /Tickets/ }).click();
  await expect(form.getByRole("button", { name: "Neues Ticket" })).toBeVisible();
  return form;
}

async function openUseCaseTickets(page: Page, useCaseId: number, featureId: number) {
  await authenticatedGoto(page, `/use-cases/${useCaseId}?returnTo=${encodeURIComponent(`/features/${featureId}`)}`);
  const form = formPage(page, "Use Case bearbeiten");
  await form.getByRole("button", { name: /Tickets/ }).click();
  await expect(form.getByRole("button", { name: "Neues Ticket" })).toBeVisible();
  return form;
}

async function expectTicketNavigationFromScope(page: Page, scope: Locator, title: string, ticketId: number) {
  await itemCard(scope, title).dblclick();
  await expect(page).toHaveURL(new RegExp(`/tickets/${ticketId}`));
  await expectTicketFormData(page, { title });
}

test.describe("Ticket-Routen und Detailformular", () => {
  test("Ticket erstellen: Plus-Button navigiert auf Create-Detailseite und speichert als Detailroute", async ({ page, request }) => {
    const ticketTitle = uniqueTitle("E2E Ticket Create Route");
    let ticketId: number | null = null;

    try {
      await openTicketList(page);
      await page.getByRole("button", { name: "Neues Ticket" }).click();

      await expect(page).toHaveURL(/\/tickets\/new$/);
      const form = formPage(page, "Ticket");
      await form.locator("input[required]").first().fill(ticketTitle);
      await fillRichText(form, "ticket-description", "E2E neues Ticket vollständig");
      await form.locator("input").nth(1).fill("Ada Lovelace");
      await form.locator("input").nth(2).fill("Grace Hopper");
      await form.locator('input[type="date"]').first().fill("2026-05-30");
      await form.locator("input").nth(4).fill("E2E Umgebung");
      await form.locator("input").nth(5).fill("v1.2.3");
      await form.getByRole("button", { name: "Ticket anlegen" }).click();

      await expect(page).toHaveURL(/\/tickets\/\d+\?/);
      ticketId = Number(new URL(page.url()).pathname.split("/").pop());
      await expectTicketFormData(page, { title: ticketTitle }, "E2E neues Ticket vollständig");
    } finally {
      await deleteTicket(request, ticketId);
    }
  });

  test("Ticket öffnen: Doppelklick und Bearbeiten-Button zeigen dieselbe vollständige Formularseite", async ({ page, request }) => {
    const ticket = await createTicket(request, null, "E2E Ticket Open Route");

    try {
      await openTicketList(page);
      await itemCard(page, ticket.title).dblclick();
      await expect(page).toHaveURL(new RegExp(`/tickets/${ticket.id}$`));
      await expectTicketFormData(page, ticket);

      await openTicketList(page);
      await itemCard(page, ticket.title).getByRole("button", { name: "Bearbeiten" }).click();
      await expect(page).toHaveURL(new RegExp(`/tickets/${ticket.id}$`));
      await expectTicketFormData(page, ticket);

      await openTicketList(page);
      await page.getByRole("button", { name: "Liste", exact: true }).click();
      await itemCard(page, ticket.title).getByRole("button", { name: "Bearbeiten" }).click();
      await expect(page).toHaveURL(new RegExp(`/tickets/${ticket.id}$`));
      await expectTicketFormData(page, ticket);
    } finally {
      await deleteTicket(request, ticket.id);
    }
  });

  test("Ticket bearbeiten: Speichern hält die kanonische Detailformular-Seite aktuell", async ({ page, request }) => {
    const ticket = await createTicket(request, null, "E2E Ticket Edit Route");
    const updatedTitle = uniqueTitle("E2E Ticket Updated Route");

    try {
      await authenticatedGoto(page, `/tickets/${ticket.id}`);
      const form = formPage(page, "Ticket bearbeiten");
      await expectTicketFormData(page, ticket);

      await form.locator("input[required]").first().fill(updatedTitle);
      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/api/tickets/${ticket.id}`) && response.request().method() === "PATCH"),
        form.getByRole("button", { name: "Speichern" }).click()
      ]);

      await expect(page).toHaveURL(new RegExp(`/tickets/${ticket.id}$`));
      await expect(form.locator("input[required]").first()).toHaveValue(updatedTitle);
    } finally {
      await deleteTicket(request, ticket.id);
    }
  });

  test("Projekt-Tickets-Tab: Neu, Doppelklick und Bearbeiten navigieren auf Ticket-Detailformular", async ({ page, request }) => {
    const project = await createProject(request, "E2E Ticket Project Owner");
    const existingTicket = await createTicket(request, { type: "project", id: project.id }, "E2E Ticket Project Existing");
    const createdTitle = uniqueTitle("E2E Ticket Project Created");
    let createdTicketId: number | null = null;

    try {
      let scope = await openProjectTickets(page, project.id);
      await scope.getByRole("button", { name: "Neues Ticket" }).first().click();
      await expect(page).toHaveURL(/\/tickets\/new\?/);
      const createForm = formPage(page, "Ticket");
      await createForm.locator("input[required]").first().fill(createdTitle);
      await createForm.getByRole("button", { name: "Ticket anlegen" }).click();
      await expect(page).toHaveURL(/\/tickets\/\d+\?/);
      createdTicketId = Number(new URL(page.url()).pathname.split("/").pop());
      await expect(formPage(page, "Ticket bearbeiten").locator("input[required]").first()).toHaveValue(createdTitle);

      scope = await openProjectTickets(page, project.id);
      await expectTicketNavigationFromScope(page, scope, existingTicket.title, existingTicket.id);

      scope = await openProjectTickets(page, project.id);
      await itemCard(scope, existingTicket.title).getByRole("button", { name: "Bearbeiten" }).click();
      await expect(page).toHaveURL(new RegExp(`/tickets/${existingTicket.id}`));
      await expectTicketFormData(page, existingTicket);
    } finally {
      await deleteProject(request, project.id);
      await cleanupTicketsByTitle(request, [createdTitle, existingTicket.title]);
      await deleteTicket(request, createdTicketId);
    }
  });

  test("Aufgaben-, Feature- und Use-Case-Ticket-Tabs öffnen verknüpfte Tickets per Doppelklick", async ({ page, request }) => {
    const project = await createProject(request, "E2E Ticket Mixed Project");
    const task = await createTask(request, { type: "project", id: project.id }, "E2E Ticket Mixed Task");
    const feature = await createFeature(request, "E2E Ticket Mixed Feature");
    const useCase = await createUseCase(request, feature.id, "E2E Ticket Mixed UseCase");
    const taskTicket = await createTicket(request, { type: "task", id: task.id }, "E2E Ticket Task Tab");
    const featureTicket = await createTicket(request, { type: "feature", id: feature.id }, "E2E Ticket Feature Tab");
    const useCaseTicket = await createTicket(request, { type: "useCase", id: useCase.id }, "E2E Ticket UseCase Tab");

    try {
      let scope = await openTaskTickets(page, task.id, project.id);
      await expectTicketNavigationFromScope(page, scope, taskTicket.title, taskTicket.id);

      scope = await openFeatureTickets(page, feature.id);
      await expectTicketNavigationFromScope(page, scope, featureTicket.title, featureTicket.id);

      scope = await openUseCaseTickets(page, useCase.id, feature.id);
      await expectTicketNavigationFromScope(page, scope, useCaseTicket.title, useCaseTicket.id);
    } finally {
      await deleteProject(request, project.id);
      await deleteFeature(request, feature.id);
      await cleanupTicketsByTitle(request, [taskTicket.title, featureTicket.title, useCaseTicket.title]);
    }
  });

  test("Ticket-Zuordnung entfernen: Entfernen löscht nur die Owner-Relation", async ({ page, request }) => {
    const project = await createProject(request, "E2E Ticket Remove Project");
    const ticket = await createTicket(request, { type: "project", id: project.id }, "E2E Ticket Remove Route");

    try {
      const scope = await openProjectTickets(page, project.id);
      await itemCard(scope, ticket.title).getByRole("button", { name: "Löschen", exact: true }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Entfernen" }).click();

      await expect(itemCard(scope, ticket.title)).toHaveCount(0);
      const detail = await request.get(`${apiBaseUrl}/tickets/${ticket.id}`);
      expect(detail.ok()).toBeTruthy();
    } finally {
      await deleteProject(request, project.id);
      await deleteTicket(request, ticket.id);
    }
  });

  test("Globales Ticket-Löschen zeigt Meldung, wenn noch Owner-Beziehungen bestehen", async ({ page, request }) => {
    const project = await createProject(request, "E2E Ticket Delete Block");
    const ticket = await createTicket(request, { type: "project", id: project.id }, "E2E Ticket Blocked Delete");

    try {
      await openTicketList(page);
      await itemCard(page, ticket.title).getByRole("button", { name: "Löschen", exact: true }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Löschen" }).click();

      await expect(page.getByRole("status")).toContainText("Ticket konnte nicht gelöscht werden");
      await expect(page.getByRole("status")).toContainText("Beziehungen");
      await expect(itemCard(page, ticket.title)).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
      await deleteTicket(request, ticket.id);
    }
  });
});
