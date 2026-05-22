import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  apiBaseUrl,
  authenticatedGoto,
  createMilestone,
  createProject,
  createTask,
  createTicket,
  deleteProject,
  ensureApiAuth,
} from "./domain-test-utils";

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
  test("zeigt Projekt-Dashboard mit echten Meilenstein-, Aufgaben- und Ticketdaten", async ({ page, request }) => {
    const project = await createProject(request, "E2E Dashboard Project");
    const milestone = await createMilestone(request, project.id, "E2E Dashboard Milestone");
    const task = await createTask(request, { type: "project", id: project.id }, "E2E Dashboard Task", { status: "todo" });
    const ticket = await createTicket(request, { type: "project", id: project.id }, "E2E Dashboard Ticket", { status: "open" });

    try {
      await authenticatedGoto(page, `/projects/${project.id}`);

      await expect(page.getByRole("button", { name: "Übersicht" })).toBeVisible();
      await page.getByRole("button", { name: "Übersicht" }).click();
      await expect(page.getByRole("heading", { name: "Projektübersicht" })).toBeVisible();
      await expect(page.getByTestId("dashboard-widget-milestoneProgress")).toContainText(milestone.name);
      await expect(page.getByTestId("dashboard-widget-taskJournal")).toContainText(task.title);
      await expect(page.getByTestId("dashboard-widget-ticketJournal")).toContainText(ticket.title);
      await expect(page.getByTestId("dashboard-widget-taskStatusReport")).toContainText("Offen");
      await expect(page.getByTestId("dashboard-widget-ticketStatusReport")).toContainText("Offen");
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("speichert ein per Drag sortiertes persönliches Dashboard", async ({ page, request }) => {
    await authenticatedGoto(page, "/dashboard");

    await page.getByRole("button", { name: "Neues Dashboard" }).click();
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
