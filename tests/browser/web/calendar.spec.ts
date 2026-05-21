import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";
import {
  authenticatedGoto,
  apiBaseUrl,
  createEvent,
  createProject,
  createTask,
  deleteEvent,
  deleteProject,
  deleteTask,
  formPage,
  todayIsoDate,
  uniqueTitle,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Calendar-Events können global oder mit Projekt-/Aufgaben-Ownern im Browser erstellt werden.
 * - Ownerbasierte Events können im Browser auf mehrere Owner erweitert werden.
 * - Gelöschte Events verschwinden ohne Reload aus Kalender und Terminliste.
 *
 * Fehlerfälle:
 * - Die UI darf keine direkten Event-Felder `projectId` oder `taskId` voraussetzen.
 *
 * Ziel:
 * Den ownerbasierten Calendar-Event-Flow Ende-zu-Ende absichern.
 */

async function openCalendar(page: Page) {
  await authenticatedGoto(page, "/calendar");
  await expect(page.getByRole("heading", { name: "Kalender" })).toBeVisible();
}

function eventByTitle(page: Page, title: string) {
  return page.getByText(title, { exact: true }).first();
}

async function fillEventBase(
  form: Locator,
  title: string,
  day = todayIsoDate(),
) {
  await form.locator("input[required]").first().fill(title);
  await form
    .locator('input[type="datetime-local"]')
    .nth(0)
    .fill(`${day}T09:00`);
  await form
    .locator('input[type="datetime-local"]')
    .nth(1)
    .fill(`${day}T10:00`);
}

async function createEventViaUi(
  page: Page,
  title: string,
  options: { projectName?: string; taskTitle?: string } = {},
) {
  await page.getByRole("button", { name: "Neuer Termin" }).click();
  const form = formPage(page, "Termin anlegen");
  await expect(form).toBeVisible();
  await fillEventBase(form, title);
  if (options.projectName) {
    await form.getByLabel(options.projectName).check();
  }
  if (options.taskTitle) {
    await form.getByLabel(options.taskTitle).check();
  }

  const [response] = await Promise.all([
    page.waitForResponse(
      (item) =>
        item.url().includes(`${apiBaseUrl}/events`) &&
        item.request().method() === "POST",
    ),
    form.getByRole("button", { name: "Speichern" }).click(),
  ]);
  expect(response.ok()).toBeTruthy();
  await expect(eventByTitle(page, title)).toBeVisible();
  return (await response.json()) as {
    id: number;
    owners: Array<{ type: "project" | "task"; id: number }>;
  };
}

async function deleteEventsByTitle(request: APIRequestContext, title: string) {
  const response = await request.get(`${apiBaseUrl}/events`);
  if (!response.ok()) {
    return;
  }
  const events = (await response.json()) as Array<{
    id: number;
    title: string;
  }>;
  for (const event of events.filter((item) => item.title === title)) {
    await deleteEvent(request, event.id);
  }
}

test.describe("Kalender-Events", () => {
  test("globalen Termin ohne Owner erstellen", async ({ page, request }) => {
    const title = uniqueTitle("E2E Calendar Global");
    let eventId: number | null = null;

    try {
      await openCalendar(page);
      const event = await createEventViaUi(page, title);
      eventId = event.id;
      expect(event.owners).toEqual([]);
    } finally {
      await deleteEvent(request, eventId);
      await deleteEventsByTitle(request, title);
    }
  });

  test("Termin mit Projekt-Owner erstellen", async ({ page, request }) => {
    const project = await createProject(request, "E2E Calendar Project");
    const title = uniqueTitle("E2E Calendar Project Event");
    let eventId: number | null = null;

    try {
      await openCalendar(page);
      const event = await createEventViaUi(page, title, {
        projectName: project.name,
      });
      eventId = event.id;
      expect(event.owners).toEqual([{ type: "project", id: project.id }]);
    } finally {
      await deleteEvent(request, eventId);
      await deleteEventsByTitle(request, title);
      await deleteProject(request, project.id);
    }
  });

  test("Termin mit Aufgaben-Owner erstellen", async ({ page, request }) => {
    const project = await createProject(request, "E2E Calendar Task Project");
    const task = await createTask(
      request,
      { type: "project", id: project.id },
      "E2E Calendar Task",
    );
    const title = uniqueTitle("E2E Calendar Task Event");
    let eventId: number | null = null;

    try {
      await openCalendar(page);
      const event = await createEventViaUi(page, title, {
        taskTitle: task.title,
      });
      eventId = event.id;
      expect(event.owners).toEqual([{ type: "task", id: task.id }]);
    } finally {
      await deleteEvent(request, eventId);
      await deleteEventsByTitle(request, title);
      await deleteProject(request, project.id);
      await deleteTask(request, task.id);
    }
  });

  test("Termin mit mehreren Ownern bearbeiten", async ({ page, request }) => {
    const project = await createProject(request, "E2E Calendar Multi Project");
    const task = await createTask(
      request,
      { type: "project", id: project.id },
      "E2E Calendar Multi Task",
    );
    const event = await createEvent(request, "E2E Calendar Multi Event", {
      owners: [{ type: "project", id: project.id }],
    });

    try {
      await openCalendar(page);
      await eventByTitle(page, event.title).click();
      const form = formPage(page, "Termin bearbeiten");
      await expect(form.getByLabel(project.name)).toBeChecked();
      await form.getByLabel(task.title).check();

      const [response] = await Promise.all([
        page.waitForResponse(
          (item) =>
            item.url().includes(`${apiBaseUrl}/events/${event.id}`) &&
            item.request().method() === "PATCH",
        ),
        form.getByRole("button", { name: "Speichern" }).click(),
      ]);
      expect(response.ok()).toBeTruthy();
      expect((await response.json()).owners).toEqual([
        { type: "project", id: project.id },
        { type: "task", id: task.id },
      ]);
    } finally {
      await deleteEvent(request, event.id);
      await deleteProject(request, project.id);
      await deleteTask(request, task.id);
    }
  });

  test("Termin löschen und aus Kalender entfernen", async ({
    page,
    request,
  }) => {
    const event = await createEvent(request, "E2E Calendar Delete Event");

    try {
      await openCalendar(page);
      await eventByTitle(page, event.title).click();
      const form = formPage(page, "Termin bearbeiten");

      await Promise.all([
        page.waitForResponse(
          (item) =>
            item.url().includes(`${apiBaseUrl}/events/${event.id}`) &&
            item.request().method() === "DELETE",
        ),
        form.getByRole("button", { name: "Löschen" }).click(),
      ]);

      await expect(eventByTitle(page, event.title)).toHaveCount(0);
    } finally {
      await deleteEvent(request, event.id);
    }
  });
});
