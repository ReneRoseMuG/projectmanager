/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Externe API-Schreibvorgänge aktualisieren offene Browserseiten per Realtime-Sync.
 * - Extern angelegte Kommentare aktualisieren offene Detail-Formulare ohne erneutes Öffnen.
 * - Standalone-Listen zeigen keinen manuellen Refresh-Button mehr.
 *
 * Fehlerfälle:
 * - Ohne funktionierende SSE-Invalidierung bleibt die Projektliste nach externem Write veraltet.
 * - Ohne Kommentar-Invalidierung bleibt ein offener Kommentar-Tab nach MCP-Write veraltet.
 *
 * Ziel:
 * Den nutzerseitigen Realtime-Abnahmefluss im Browser absichern.
 */

import { test, expect, type Page } from "./fixtures";
import {
  authenticatedGoto,
  apiBaseUrl,
  createProject,
  createTicket,
  deleteProject,
  deleteTicket,
  formPage,
  itemCard,
  uniqueTitle,
} from "./domain-test-utils";

function projectForm(page: Page) {
  return formPage(page, "Projekt bearbeiten");
}

test.describe("Realtime-Synchronisation", () => {
  test("zeigt externe Projektanlage ohne manuellen Reload", async ({ page, request }) => {
    await authenticatedGoto(page, "/projects");

    const project = await createProject(request, "E2E Realtime Project");

    try {
      await expect(itemCard(page, project.name)).toBeVisible({ timeout: 8000 });
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("zeigt extern angelegte Projekt-Kommentare ohne Formular-Neuöffnung", async ({ page, request }) => {
    const project = await createProject(request, "E2E Realtime Comment Project");
    const commentText = uniqueTitle("E2E Realtime Kommentar");

    try {
      await authenticatedGoto(page, `/projects/${project.id}`);
      const form = projectForm(page);
      await expect(form).toBeVisible();
      await form.getByRole("button", { name: /^Kommentare(?:\s+\d+)?$/ }).click();
      await expect(form.getByRole("heading", { name: "Noch keine Kommentare" })).toBeVisible();

      const response = await request.post(`${apiBaseUrl}/projects/${project.id}/comments`, {
        data: { body: `<p>${commentText}</p>` }
      });
      expect(response.ok()).toBeTruthy();

      await expect(form.getByText(commentText, { exact: true })).toBeVisible({ timeout: 8000 });
      await expect(form.getByRole("button", { name: /^Kommentare\s+1$/ })).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("zeigt extern angelegte Ticket-Kommentare ohne Formular-Neuöffnung", async ({ page, request }) => {
    const ticket = await createTicket(request, null, "E2E Realtime Ticket Kommentar");
    const commentText = uniqueTitle("E2E Realtime Ticket Kommentar");

    try {
      await authenticatedGoto(page, `/tickets/${ticket.id}`);
      const form = formPage(page, "Ticket bearbeiten");
      await expect(form).toBeVisible();
      await form.getByRole("button", { name: /^Kommentare(?:\s+\d+)?$/ }).click();
      await expect(form.getByRole("heading", { name: "Noch keine Kommentare" })).toBeVisible();

      const response = await request.post(`${apiBaseUrl}/tickets/${ticket.id}/comments`, {
        data: { body: `<p>${commentText}</p>` }
      });
      expect(response.ok()).toBeTruthy();

      await expect(form.getByText(commentText, { exact: true })).toBeVisible({ timeout: 8000 });
      await expect(form.getByRole("button", { name: /^Kommentare\s+1$/ })).toBeVisible();
    } finally {
      await deleteTicket(request, ticket.id);
    }
  });

  test("zeigt in Standalone-Listen keinen manuellen Refresh-Button", async ({ page }) => {
    await authenticatedGoto(page, "/projects?standalone=1");

    await expect(page.getByRole("button", { name: "Aktualisieren" })).toHaveCount(0);
  });
});
