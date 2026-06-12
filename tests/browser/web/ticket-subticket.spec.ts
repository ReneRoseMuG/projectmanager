import { expect, test } from "./fixtures";
import {
  apiBaseUrl,
  authenticatedGoto,
  clickItemAction,
  createProject,
  createTicket,
  deleteProject,
  deleteTicket,
  formPage,
  itemCard,
  uniqueTitle,
  type TicketFixture,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Browser/E2E
 *
 * Realitätsgrad:
 * - Echter Browser, echte API, echtes TicketForm mit Sub-Ticket-Tab.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Playwright-Testinstanz mit API-Testdaten; Cleanup über API.
 *
 * Abgedeckte Regeln:
 * - Sub-Ticket kann über den "Neu"-Button im Sub-Tickets-Tab erstellt werden.
 * - Erstelltes Sub-Ticket erscheint sofort in der Sub-Ticket-Liste ohne Reload.
 * - Sub-Ticket kann über das Löschen-Menü entfernt werden und verschwindet aus der Liste.
 * - Parent-Ticket bleibt nach Sub-Ticket-Löschung erhalten.
 *
 * Fehlerfälle:
 * - Sub-Ticket erscheint nach Anlegen nicht in der Liste.
 * - Parent-Ticket wird nach Sub-Ticket-Löschung ebenfalls gelöscht.
 *
 * Ziel:
 * Den Sub-Ticket-Create-Delete-Zyklus im Browser gegen echte API absichern.
 */

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tabByLabel(scope: Parameters<typeof itemCard>[0], label: string) {
  return scope.getByRole("button", {
    name: new RegExp(`^${escapeRegExp(label)}(?:\\s+\\d+)?$`),
  });
}

test("Sub-Ticket anlegen und löschen", async ({ page, request }) => {
  const project = await createProject(request, "E2E SubTicket Project");
  const ticket = await createTicket(request, { type: "project", id: project.id }, "E2E Parent Ticket");
  const subTicketTitle = uniqueTitle("E2E Sub-Ticket Neu");

  try {
    await authenticatedGoto(page, `/tickets/${ticket.id}`);
    const form = formPage(page, "Ticket bearbeiten");
    await expect(form).toBeVisible();

    // Sub-Tickets-Tab öffnen
    await tabByLabel(form, "Sub-Tickets").click();
    await expect(form.getByRole("button", { name: "Neu" })).toBeVisible();

    // Sub-Ticket-Dialog öffnen
    await form.getByRole("button", { name: "Neu" }).click();
    const dialog = formPage(page, "Sub-Ticket vormerken");
    await expect(dialog).toBeVisible();

    await dialog.locator("input[required]").first().fill(subTicketTitle);

    // POST abwarten und Anlegen bestätigen
    const [subTicketResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes(`/api/tickets/${ticket.id}/sub-tickets`) && r.request().method() === "POST",
      ),
      dialog.getByRole("button", { name: "Vormerken" }).click(),
    ]);
    expect(subTicketResponse.ok()).toBeTruthy();
    const subTicket = (await subTicketResponse.json()) as TicketFixture;

    // Sub-Ticket in Liste sichtbar
    await expect(itemCard(form, subTicketTitle)).toBeVisible();
    await expect(tabByLabel(form, "Sub-Tickets")).toContainText("1");

    // Sub-Ticket löschen
    const [deleteResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes(`/api/tickets/${subTicket.id}`) && r.request().method() === "DELETE",
      ),
      clickItemAction(form, subTicketTitle, "Löschen"),
    ]);
    expect(deleteResponse.ok()).toBeTruthy();

    // Sub-Ticket verschwunden, Parent-Ticket noch erhalten
    await expect(itemCard(form, subTicketTitle)).not.toBeVisible();
    const parentCheck = await request.get(`${apiBaseUrl}/tickets/${ticket.id}`);
    expect(parentCheck.ok()).toBeTruthy();
  } finally {
    await deleteTicket(request, ticket.id);
    await deleteProject(request, project.id);
  }
});

test("Sub-Ticket via API erstellt und im Tab sichtbar", async ({ page, request }) => {
  const project = await createProject(request, "E2E SubTicket API Project");
  const ticket = await createTicket(request, { type: "project", id: project.id }, "E2E Ticket for API Sub");
  const subTicketTitle = uniqueTitle("E2E API Sub-Ticket");
  let subTicketId: number | null = null;

  try {
    const subTicketRes = await request.post(`${apiBaseUrl}/tickets/${ticket.id}/sub-tickets`, {
      data: { title: subTicketTitle, type: "bug", status: "open", priority: "medium" },
    });
    expect(subTicketRes.ok()).toBeTruthy();
    subTicketId = ((await subTicketRes.json()) as { id: number }).id;

    await authenticatedGoto(page, `/tickets/${ticket.id}`);
    const form = formPage(page, "Ticket bearbeiten");
    await expect(form).toBeVisible();

    await expect(tabByLabel(form, "Sub-Tickets")).toContainText("1");
    await tabByLabel(form, "Sub-Tickets").click();
    await expect(itemCard(form, subTicketTitle)).toBeVisible();
  } finally {
    if (subTicketId) await deleteTicket(request, subTicketId);
    await deleteTicket(request, ticket.id);
    await deleteProject(request, project.id);
  }
});
