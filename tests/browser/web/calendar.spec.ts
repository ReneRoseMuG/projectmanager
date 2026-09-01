import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
} from "./fixtures";
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
 * - Aufgaben erscheinen in Wochen- und Monatsansicht, öffnen die Detailseite und speichern Due-Date-Änderungen per Drag & Drop.
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
  await expect(page.getByTestId("dashboard-view-calendar")).toBeVisible();
}

function eventByTitle(page: Page, title: string) {
  return page.getByText(title, { exact: true }).first();
}

function adjacentDateInCurrentIsoWeek() {
  const date = new Date();
  date.setDate(date.getDate() + (date.getDay() === 0 ? -1 : 1));
  return todayIsoDate(date);
}

async function dragCalendarTaskToDate(page: Page, taskId: number, targetDate: string) {
  const source = page.getByTestId(`week-task-${taskId}`);
  const target = page.getByTestId(`week-day-${targetDate}`);
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

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + Math.min(sourceBox.height / 2, 48));
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + Math.min(targetBox.height - 24, 120), { steps: 12 });
  await page.mouse.up();
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
      const tile = page.getByTestId(`week-event-${event.id}`);
      await expect(tile).toContainText(task.title);
      expect(await tile.evaluate((element) => element.getAttribute("style") ?? "")).toContain("--event-accent: var(--color-teal)");
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

  test("öffnet Terminformular über Event-Deep-Link", async ({ page, request }) => {
    const event = await createEvent(request, "E2E Calendar Push Target");

    try {
      await authenticatedGoto(page, `/calendar?eventId=${event.id}`);
      const form = formPage(page, "Termin bearbeiten");
      await expect(form).toBeVisible();
      await expect(form.locator("input[required]").first()).toHaveValue(event.title);
    } finally {
      await deleteEvent(request, event.id);
    }
  });

  test("zeigt Aufgaben in Woche und Monat, öffnet Details und speichert Due-Date per Drag & Drop", async ({ page, request }) => {
    const project = await createProject(request, "E2E Calendar Task Due Project");
    const sourceDate = todayIsoDate();
    const targetDate = adjacentDateInCurrentIsoWeek();
    const task = await createTask(
      request,
      { type: "project", id: project.id },
      "E2E Calendar Due Task",
      { status: "in_progress", dueDate: sourceDate },
    );

    try {
      await openCalendar(page);
      await expect(page.getByTestId(`week-task-${task.id}`)).toContainText(task.title);

      await page.getByTestId(`week-task-${task.id}`).click();
      await expect(formPage(page, "Aufgabe bearbeiten")).toBeVisible();

      await authenticatedGoto(page, "/calendar");
      await page.getByRole("button", { name: "Monat", exact: true }).click();
      await expect(page.getByTestId(`month-task-${task.id}`)).toContainText(task.title);

      await page.getByRole("button", { name: "Woche", exact: true }).click();
      const updateResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/tasks/${task.id}`) &&
          response.request().method() === "PATCH",
      );
      await dragCalendarTaskToDate(page, task.id, targetDate);
      const updated = (await (await updateResponse).json()) as { dueDate: string | null };
      expect(updated.dueDate).toBe(targetDate);
      await expect(page.getByTestId(`week-day-${targetDate}`)).toContainText(task.title);
    } finally {
      await deleteProject(request, project.id);
      await deleteTask(request, task.id);
    }
  });
});
