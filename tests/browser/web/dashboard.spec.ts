import { expect, type Locator, type Page } from "./fixtures";
import {
  apiBaseUrl,
  authenticatedGoto,
  createEvent,
  createProject,
  createTask,
  deleteEvent,
  deleteProject,
  ensureApiAuth,
  todayIsoDate,
} from "./domain-test-utils";
import { test } from "./fixtures";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Dashboardseiten und Übersicht-Tabs zeigen echte Aufgaben-, Ticket- und Meilenstein-Daten.
 * - Der Dashboard-Editor speichert ein persönliches Dashboard über den echten API-Pfad.
 * - Widget-Reihenfolge kann im Browser per Pointer-Drag geändert werden.
 *
 * Fehlerfälle:
 * - Sichtbare, aber fachlich leere Widgets; nicht persistierende Editor-Speicherung; defekte Drag-&-Drop-Verdrahtung.
 *
 * Ziel:
 * Die vollständige Dashboard-Nutzerstrecke mit echten Daten im Browser absichern.
 */

async function dragBuilderWidget(page: Page, source: Locator, target: Locator) {
  await expect(source).toBeVisible();
  await expect(target).toBeVisible();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  if (!sourceBox || !targetBox) {
    return;
  }
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 8, { steps: 14 });
  await page.mouse.up();
}

test.describe("Dashboards", () => {
  test("zeigt upcomingEvents-Widget mit einem bevorstehenden Termin auf der Startseite", async ({ page, request }) => {
    // Zukünftigen Termin anlegen
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    const event = await createEvent(request, "E2E Nächster Termin", {
      startTime: `${dateStr}T09:00:00`,
      endTime: `${dateStr}T10:00:00`,
    });

    try {
      await authenticatedGoto(page, "/");

      // upcomingEvents-Widget muss den Termin enthalten
      const widget = page.getByTestId("dashboard-widget-upcomingEvents");
      await expect(widget).toBeVisible();
      await expect(widget).toContainText(event.title);
    } finally {
      await deleteEvent(request, event.id);
    }
  });

  test("zeigt DayPlan-Dashboard mit noteList und overdueTasks", async ({ page, request }) => {
    // Überfälligen Task anlegen und heute in den DayPlan hängen
    await ensureApiAuth(request);
    const project = await createProject(request, "E2E DayPlan Projekt");
    const task = await createTask(
      request,
      { type: "project", id: project.id },
      "E2E DayPlan Überfällig",
      { dueDate: "2026-01-01", status: "todo" }
    );
    const today = todayIsoDate();
    // Task in den heutigen DayPlan einbinden
    const dayPlanRes = await request.get(`${apiBaseUrl}/day-plans/${today}`);
    expect(dayPlanRes.ok()).toBeTruthy();
    const dayPlan = await dayPlanRes.json() as { id: number };
    await request.post(`${apiBaseUrl}/day-plans/${today}/tasks/${task.id}`);

    try {
      await authenticatedGoto(page, "/day-plan");

      // noteList-Widget muss sichtbar sein
      await expect(page.getByTestId("dashboard-widget-noteList")).toBeVisible();

      // overdueTasks-Widget muss den überfälligen Task anzeigen
      const overdueWidget = page.getByTestId("dashboard-widget-overdueTasks");
      await expect(overdueWidget).toBeVisible();
      await expect(overdueWidget).toContainText(task.title);
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("zeigt Meilenstein-Dashboard mit gefilterten Tasks und Tickets", async ({ page, milestoneWithTaskAndTicket }) => {
    const { milestone, task, ticket } = milestoneWithTaskAndTicket;

    await authenticatedGoto(page, `/milestones/${milestone.id}`);

    await expect(page.getByRole("button", { name: "Übersicht" })).toBeVisible();
    await page.getByRole("button", { name: "Übersicht" }).click();

    // taskJournal und ticketJournal sollen Task/Ticket des Meilensteins zeigen
    await expect(page.getByTestId("dashboard-widget-taskJournal")).toContainText(task.title);
    await expect(page.getByTestId("dashboard-widget-ticketJournal")).toContainText(ticket.title);

    // taskStatusReport und ticketStatusReport müssen angezeigt werden
    await expect(page.getByTestId("dashboard-widget-taskStatusReport")).toBeVisible();
    await expect(page.getByTestId("dashboard-widget-ticketStatusReport")).toBeVisible();
  });

  test("zeigt Projekt-Dashboard mit echten Meilenstein-, Aufgaben- und Ticketdaten", async ({ page, projectWithDashboardItems }) => {
    const { project, milestone, task, ticket } = projectWithDashboardItems;

    await authenticatedGoto(page, `/projects/${project.id}`);

    await expect(page.getByRole("button", { name: "Übersicht" })).toBeVisible();
    await page.getByRole("button", { name: "Übersicht" }).click();
    await expect(page.getByRole("button", { name: "Neue Ansicht" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Projektübersicht" })).toHaveCount(0);
    await expect(page.getByTestId("dashboard-widget-milestoneProgress")).toContainText(milestone.name);
    await expect(page.getByTestId("dashboard-widget-taskJournal")).toContainText(task.title);
    await expect(page.getByTestId("dashboard-widget-ticketJournal")).toContainText(ticket.title);
    await expect(page.getByTestId("dashboard-widget-taskStatusReport")).toContainText("Offen");
    await expect(page.getByTestId("dashboard-widget-ticketStatusReport")).toContainText("Offen");
  });

  test("speichert ein per Drag sortiertes persönliches Dashboard", async ({ page, request }) => {
    await authenticatedGoto(page, "/");

    await page.getByRole("button", { name: "Neue Ansicht" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard-Editor" })).toBeVisible();

    await dragBuilderWidget(
      page,
      page.getByRole("button", { name: "Tickets nach Status verschieben" }),
      page.getByTestId("dashboard-builder-widget-taskStatusReport"),
    );

    const saveResponse = page.waitForResponse((response) => response.url().includes("/api/dashboards") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Als eigenes Dashboard speichern" }).click();
    const created = (await (await saveResponse).json()) as { id: number };

    try {
      const widgetHeadings = page.locator("[data-testid^='dashboard-widget-'] h3");
      await expect(widgetHeadings.first()).toHaveText("Tickets nach Status");
      await expect(widgetHeadings.nth(1)).toHaveText("Aufgaben nach Status");
    } finally {
      await ensureApiAuth(request);
      await request.delete(`${apiBaseUrl}/dashboards/${created.id}`);
    }
  });
});
