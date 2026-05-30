import { expect, test, type Locator, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";
import {
  authenticatedGoto,
  apiBaseUrl,
  createTicket,
  deleteTicket,
  fillRichText,
  formPage,
  itemCard,
  safeFilename,
  uniqueTitle,
  type TicketFixture,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ticket-Detailseiten rendern Tabs für Sub-Tickets, Relationen, Kommentare, Notizen und Dateien.
 * - Tabs zeigen echte API-Daten und aktualisieren Kommentar-Zähler nach UI-Create ohne Reload.
 *
 * Fehlerfälle:
 * - Fehlende Tabs, stale Zähler oder nicht geladene Neben-Collections werden sichtbar.
 *
 * Ziel:
 * Die tabfähige Ticket-Detailseite mit realen Browser- und API-Daten absichern.
 */

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ticketForm(page: Page) {
  return formPage(page, "Ticket bearbeiten");
}

function tabByLabel(scope: Page | Locator, label: string) {
  return scope.getByRole("button", {
    name: new RegExp(`^${escapeRegExp(label)}(?:\\s+\\d+)?$`),
  });
}

function tabWithCount(scope: Page | Locator, label: string, count: number) {
  if (count === 0) {
    return tabByLabel(scope, label);
  }
  return scope.getByRole("button", {
    name: new RegExp(`^${escapeRegExp(label)}\\s+${count}$`),
  });
}

async function openTab(scope: Page | Locator, label: string) {
  await tabByLabel(scope, label).click();
}

test("Ticket-Detailformular zeigt Tabs und echte Neben-Collections", async ({ page, request }) => {
  const ticket = await createTicket(request, null, "E2E Ticket Detail Tabs");
  const relatedTicket = await createTicket(request, null, "E2E Ticket Relation Target");
  const subTicketTitle = uniqueTitle("E2E Ticket Sub");
  const noteTitle = uniqueTitle("E2E Ticket Note");
  const initialComment = uniqueTitle("E2E Ticket Kommentar");
  const liveComment = uniqueTitle("E2E Ticket Live Kommentar");
  const attachmentName = `${safeFilename(uniqueTitle("ticket attachment"))}.txt`;
  let subTicket: TicketFixture | null = null;

  try {
    const subTicketResponse = await request.post(`${apiBaseUrl}/tickets/${ticket.id}/sub-tickets`, {
      data: {
        title: subTicketTitle,
        type: "bug",
        status: "open",
        priority: "medium",
      },
    });
    expect(subTicketResponse.ok()).toBeTruthy();
    subTicket = (await subTicketResponse.json()) as TicketFixture;

    const relationResponse = await request.post(`${apiBaseUrl}/tickets/${ticket.id}/relations`, {
      data: { targetTicketId: relatedTicket.id, relationType: "related" },
    });
    expect(relationResponse.ok()).toBeTruthy();

    const commentResponse = await request.post(`${apiBaseUrl}/tickets/${ticket.id}/comments`, {
      data: { body: initialComment },
    });
    expect(commentResponse.ok()).toBeTruthy();

    const noteResponse = await request.post(`${apiBaseUrl}/tickets/${ticket.id}/notes`, {
      data: { title: noteTitle, contentJson: { type: "doc" } },
    });
    expect(noteResponse.ok()).toBeTruthy();

    const attachmentResponse = await request.post(`${apiBaseUrl}/tickets/${ticket.id}/attachments`, {
      multipart: {
        file: {
          name: attachmentName,
          mimeType: "text/plain",
          buffer: Buffer.from("E2E ticket attachment"),
        },
      },
    });
    expect(attachmentResponse.ok()).toBeTruthy();

    await authenticatedGoto(page, `/tickets/${ticket.id}`);
    const form = ticketForm(page);
    await expect(form).toBeVisible();

    await expect(form.getByRole("button", { name: /Sub-Tickets\s+1/ })).toBeVisible();
    await expect(form.getByRole("button", { name: /Relationen\s+1/ })).toBeVisible();
    await expect(form.getByRole("button", { name: /Kommentare\s+1/ })).toBeVisible();
    await expect(form.getByRole("button", { name: /Notizen\s+1/ })).toBeVisible();
    await expect(form.getByRole("button", { name: /Dateien\s+1/ })).toBeVisible();

    await openTab(form, "Sub-Tickets");
    await expect(itemCard(form, subTicketTitle)).toBeVisible();
    await openTab(form, "Relationen");
    await expect(itemCard(form, relatedTicket.title)).toBeVisible();
    await openTab(form, "Kommentare");
    await expect(form).toContainText(initialComment);
    await openTab(form, "Notizen");
    await expect(form).toContainText(noteTitle);
    await openTab(form, "Dateien");
    await expect(form).toContainText(attachmentName);

    await openTab(form, "Kommentare");
    await form.getByRole("button", { name: "Kommentar anlegen" }).click();
    const commentModal = formPage(page, "Kommentar anlegen");
    await fillRichText(commentModal, "comment-thread-create-editor", liveComment);
    await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/tickets/${ticket.id}/comments`) && response.request().method() === "POST"),
      commentModal.getByRole("button", { name: "Anlegen" }).click(),
    ]);
    await expect(tabWithCount(form, "Kommentare", 2)).toBeVisible();
    await expect(form).toContainText(liveComment);
  } finally {
    await request.delete(`${apiBaseUrl}/tickets/${ticket.id}/relations`, {
      data: { targetTicketId: relatedTicket.id, relationType: "related" },
    });
    await deleteTicket(request, subTicket?.id);
    await deleteTicket(request, ticket.id);
    await deleteTicket(request, relatedTicket.id);
  }
});
