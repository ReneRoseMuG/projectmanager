import { expect, test, type Locator, type Page } from "./fixtures";
import {
  authenticatedGoto,
  apiBaseUrl,
  clickItemAction,
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
  expectToast,
  fillRichText,
  formPage,
  itemCard,
  pathWithOptionalQuery,
  uniqueTitle,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Tickets werden global und aus Owner-Tabs über `/tickets/new` erstellt, schließen nach Speichern zurück und werden über `/tickets/:id` bearbeitet.
 * - Doppelklick und Bearbeiten-Button in Ticket-Boards und Listen navigieren auf dieselbe Detailformular-Seite.
 * - Projekt-, Aufgaben-, Feature- und Use-Case-Ticket-Tabs öffnen echte Ticketdaten per Route.
 * - Im Ticketformular eingefügtes Markdown wird als HTML gespeichert.
 *
 * Fehlerfälle:
 * - Ticket-Detail darf weder leer bleiben noch in einem alten Detail-/Formular-Overlay landen.
 * - Markdown darf nicht als Rohtext in der Ticketbeschreibung gespeichert werden.
 *
 * Ziel:
 * Ticket-Detailnavigation und Owner-Ticket-Boards mit echten Daten im Browser absichern.
 */

async function openTicketList(page: Page) {
  await authenticatedGoto(page, "/tickets");
  await expect(
    page.getByRole("heading", { name: "Tickets", exact: true }),
  ).toBeVisible();
}

async function expectTicketFormData(
  page: Page,
  ticket: { title: string },
  descriptionText = "E2E Ticketbeschreibung vollständig",
) {
  const form = formPage(page, "Ticket bearbeiten");
  await expect(form).toBeVisible();
  await expect(form.locator("input[required]").first()).toHaveValue(
    ticket.title,
  );
  await expectRichText(form, descriptionText);
  await expect(form.locator("select").nth(0)).not.toHaveValue("");
  await expect(form.locator("select").nth(1)).not.toHaveValue("");
  await expect(form.locator('input[type="date"]').first()).toHaveValue(
    "2026-05-30",
  );
}

async function openProjectTickets(page: Page, projectId: number) {
  await authenticatedGoto(page, `/projects/${projectId}`);
  const form = formPage(page, "Projekt bearbeiten");
  await form.getByRole("button", { name: /Tickets/ }).click();
  await expect(
    form.getByRole("button", { name: "Neues Ticket" }),
  ).toBeVisible();
  return form;
}

async function openTaskTickets(page: Page, taskId: number, projectId: number) {
  await authenticatedGoto(
    page,
    `/tasks/${taskId}?returnTo=${encodeURIComponent(`/projects/${projectId}`)}`,
  );
  const form = formPage(page, "Aufgabe bearbeiten");
  await form.getByRole("button", { name: /Tickets/ }).click();
  await expect(
    form.getByRole("button", { name: "Neues Ticket" }),
  ).toBeVisible();
  return form;
}

async function openFeatureTickets(page: Page, featureId: number) {
  await authenticatedGoto(page, `/features/${featureId}`);
  const form = formPage(page, "Feature bearbeiten");
  await form.getByRole("button", { name: /Tickets/ }).click();
  await expect(
    form.getByRole("button", { name: "Neues Ticket" }),
  ).toBeVisible();
  return form;
}

async function openUseCaseTickets(
  page: Page,
  useCaseId: number,
  featureId: number,
) {
  await authenticatedGoto(
    page,
    `/use-cases/${useCaseId}?returnTo=${encodeURIComponent(`/features/${featureId}`)}`,
  );
  const form = formPage(page, "Use Case bearbeiten");
  await form.getByRole("button", { name: /Tickets/ }).click();
  await expect(
    form.getByRole("button", { name: "Neues Ticket" }),
  ).toBeVisible();
  return form;
}

async function expectTicketNavigationFromScope(
  page: Page,
  scope: Locator,
  title: string,
  ticketId: number,
) {
  await itemCard(scope, title).dblclick();
  await expect(page).toHaveURL(new RegExp(`/tickets/${ticketId}`));
  await expectTicketFormData(page, { title });
}

async function pasteRichText(form: Locator, testIdPrefix: string, text: string) {
  await form.locator(`[data-testid="${testIdPrefix}-view"]`).click();
  const editor = form.locator(
    `[data-testid="${testIdPrefix}-editor"] [contenteditable="true"]`,
  );
  await expect(editor).toBeVisible();
  await editor.evaluate((node, pastedText) => {
    const data = new DataTransfer();
    data.setData("text/plain", pastedText);
    node.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  }, text);
  await expect(editor).toContainText("Markdown Ticket");
  await editor.blur();
}

test.describe("Ticket-Routen und Detailformular", () => {
  test("Ticket erstellen: Plus-Button navigiert auf Create-Detailseite und Speichern schließt", async ({
    page,
    request,
  }) => {
    const ticketTitle = uniqueTitle("E2E Ticket Create Route");
    let ticketId: number | null = null;

    try {
      await openTicketList(page);
      await page.getByRole("button", { name: "Neues Ticket" }).click();

      await expect(page).toHaveURL(pathWithOptionalQuery("/tickets/new"));
      const form = formPage(page, "Ticket");
      await form.locator("input[required]").first().fill(ticketTitle);
      await fillRichText(
        form,
        "ticket-description",
        "E2E neues Ticket vollständig",
      );
      await form.locator('input[type="date"]').first().fill("2026-05-30");
      const ticketResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/tickets") &&
          response.request().method() === "POST",
      );
      await form.getByRole("button", { name: "Ticket anlegen" }).click();
      const createdTicket = (await (await ticketResponsePromise).json()) as {
        id: number;
      };
      ticketId = createdTicket.id;

      await expect(page).toHaveURL(/\/tickets$/);
      await expect(itemCard(page, ticketTitle)).toBeVisible();
    } finally {
      await deleteTicket(request, ticketId);
    }
  });

  test("Ticket erstellen: eingefügtes Markdown wird als HTML gespeichert", async ({
    page,
    request,
  }) => {
    const ticketTitle = uniqueTitle("E2E Ticket Markdown Paste");
    let ticketId: number | null = null;

    try {
      await openTicketList(page);
      await page.getByRole("button", { name: "Neues Ticket" }).click();

      const form = formPage(page, "Ticket");
      await form.locator("input[required]").first().fill(ticketTitle);
      await pasteRichText(
        form,
        "ticket-description",
        "# Markdown Ticket\n\n- erster Punkt\n- zweiter Punkt\n\n**fett**",
      );
      await expect(
        form.locator('[data-testid="ticket-description-view"] h1'),
      ).toHaveText("Markdown Ticket");

      const ticketResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/tickets") &&
          response.request().method() === "POST",
      );
      await form.getByRole("button", { name: "Ticket anlegen" }).click();
      const createdTicket = (await (await ticketResponsePromise).json()) as {
        id: number;
        description: string;
      };
      ticketId = createdTicket.id;

      expect(createdTicket.description).toContain("<h1>Markdown Ticket</h1>");
      expect(createdTicket.description).toContain("<li");
      expect(createdTicket.description).toContain("<strong>fett</strong>");
    } finally {
      await deleteTicket(request, ticketId);
    }
  });

  test("Ticket öffnen: Doppelklick und Bearbeiten-Button zeigen dieselbe vollständige Formularseite", async ({
    page,
    request,
  }) => {
    const ticket = await createTicket(request, null, "E2E Ticket Open Route");

    try {
      await openTicketList(page);
      await itemCard(page, ticket.title).dblclick();
      await expect(page).toHaveURL(
        pathWithOptionalQuery(`/tickets/${ticket.id}`),
      );
      await expectTicketFormData(page, ticket);

      await openTicketList(page);
      await clickItemAction(page, ticket.title, "Bearbeiten");
      await expect(page).toHaveURL(
        pathWithOptionalQuery(`/tickets/${ticket.id}`),
      );
      await expectTicketFormData(page, ticket);

      await openTicketList(page);
      await page.getByRole("button", { name: "Liste", exact: true }).click();
      await clickItemAction(page, ticket.title, "Bearbeiten");
      await expect(page).toHaveURL(
        pathWithOptionalQuery(`/tickets/${ticket.id}`),
      );
      await expectTicketFormData(page, ticket);
    } finally {
      await deleteTicket(request, ticket.id);
    }
  });

  test("Ticket bearbeiten: Speichern schließt auf die Rücksprung-Route und aktualisiert die Übersicht", async ({
    page,
    request,
  }) => {
    const ticket = await createTicket(request, null, "E2E Ticket Edit Route");
    const updatedTitle = uniqueTitle("E2E Ticket Updated Route");

    try {
      await authenticatedGoto(page, `/tickets/${ticket.id}`);
      const form = formPage(page, "Ticket bearbeiten");
      await expectTicketFormData(page, ticket);

      await form.locator("input[required]").first().fill(updatedTitle);
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes(`/api/tickets/${ticket.id}`) &&
            response.request().method() === "PATCH",
        ),
        form.getByRole("button", { name: "Speichern" }).click(),
      ]);

      await expect(page).toHaveURL(/\/tickets$/);
      await expect(itemCard(page, updatedTitle)).toBeVisible();
    } finally {
      await deleteTicket(request, ticket.id);
    }
  });

  test("Projekt-Tickets-Tab: Neu, Doppelklick und Bearbeiten navigieren auf Ticket-Detailformular", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Ticket Project Owner");
    const existingTicket = await createTicket(
      request,
      { type: "project", id: project.id },
      "E2E Ticket Project Existing",
    );
    const createdTitle = uniqueTitle("E2E Ticket Project Created");
    let createdTicketId: number | null = null;

    try {
      let scope = await openProjectTickets(page, project.id);
      await scope.getByRole("button", { name: "Neues Ticket" }).first().click();
      await expect(page).toHaveURL(/\/tickets\/new\?/);
      const createForm = formPage(page, "Ticket");
      await createForm.locator("input[required]").first().fill(createdTitle);
      const createdTicketResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/projects/${project.id}/tickets`) &&
          response.request().method() === "POST",
      );
      await createForm.getByRole("button", { name: "Ticket anlegen" }).click();
      const createdTicket = (await (
        await createdTicketResponsePromise
      ).json()) as { id: number };
      createdTicketId = createdTicket.id;
      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}\\?tab=tickets$`));
      scope = await openProjectTickets(page, project.id);
      await expect(itemCard(scope, createdTitle)).toBeVisible();

      scope = await openProjectTickets(page, project.id);
      await expectTicketNavigationFromScope(
        page,
        scope,
        existingTicket.title,
        existingTicket.id,
      );

      scope = await openProjectTickets(page, project.id);
      await clickItemAction(scope, existingTicket.title, "Bearbeiten");
      await expect(page).toHaveURL(new RegExp(`/tickets/${existingTicket.id}`));
      await expectTicketFormData(page, existingTicket);
    } finally {
      await deleteProject(request, project.id);
      await cleanupTicketsByTitle(request, [
        createdTitle,
        existingTicket.title,
      ]);
      await deleteTicket(request, createdTicketId);
    }
  });

  test("Aufgaben-, Feature- und Use-Case-Ticket-Tabs öffnen verknüpfte Tickets per Klick", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Ticket Mixed Project");
    const task = await createTask(
      request,
      { type: "project", id: project.id },
      "E2E Ticket Mixed Task",
    );
    const feature = await createFeature(request, "E2E Ticket Mixed Feature");
    const useCase = await createUseCase(
      request,
      feature.id,
      "E2E Ticket Mixed UseCase",
    );
    const taskTicket = await createTicket(
      request,
      { type: "task", id: task.id },
      "E2E Ticket Task Tab",
    );
    const featureTicket = await createTicket(
      request,
      { type: "feature", id: feature.id },
      "E2E Ticket Feature Tab",
    );
    const useCaseTicket = await createTicket(
      request,
      { type: "useCase", id: useCase.id },
      "E2E Ticket UseCase Tab",
    );

    try {
      let scope = await openTaskTickets(page, task.id, project.id);
      await expectTicketNavigationFromScope(
        page,
        scope,
        taskTicket.title,
        taskTicket.id,
      );

      scope = await openFeatureTickets(page, feature.id);
      await expectTicketNavigationFromScope(
        page,
        scope,
        featureTicket.title,
        featureTicket.id,
      );

      scope = await openUseCaseTickets(page, useCase.id, feature.id);
      await expectTicketNavigationFromScope(
        page,
        scope,
        useCaseTicket.title,
        useCaseTicket.id,
      );
    } finally {
      await deleteProject(request, project.id);
      await deleteFeature(request, feature.id);
      await cleanupTicketsByTitle(request, [
        taskTicket.title,
        featureTicket.title,
        useCaseTicket.title,
      ]);
    }
  });

  test("Ticket-Zuordnung entfernen: Entfernen löscht nur die Owner-Relation", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Ticket Remove Project");
    const ticket = await createTicket(
      request,
      { type: "project", id: project.id },
      "E2E Ticket Remove Route",
    );

    try {
      const scope = await openProjectTickets(page, project.id);
      await clickItemAction(scope, ticket.title, "Löschen");
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Entfernen" })
        .click();

      await expect(itemCard(scope, ticket.title)).toHaveCount(0);
      const detail = await request.get(`${apiBaseUrl}/tickets/${ticket.id}`);
      expect(detail.ok()).toBeTruthy();
    } finally {
      await deleteProject(request, project.id);
      await deleteTicket(request, ticket.id);
    }
  });

  test("Globales Ticket-Löschen zeigt Meldung, wenn noch Owner-Beziehungen bestehen", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Ticket Delete Block");
    const ticket = await createTicket(
      request,
      { type: "project", id: project.id },
      "E2E Ticket Blocked Delete",
    );

    try {
      await openTicketList(page);
      await clickItemAction(page, ticket.title, "Löschen");
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Löschen" })
        .click();

      await expectToast(page, "Ticket konnte nicht gelöscht werden");
      await expectToast(page, "Beziehungen");
      await expect(itemCard(page, ticket.title)).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
      await deleteTicket(request, ticket.id);
    }
  });
});
