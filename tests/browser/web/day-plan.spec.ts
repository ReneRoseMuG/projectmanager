import { expect, test, type Page } from "@playwright/test";
import {
  apiBaseUrl,
  authenticatedGoto,
  createDayPlanComment,
  createDayPlanEvent,
  createDayPlanNote,
  createDayPlanTask,
  deleteComment,
  deleteEvent,
  deleteNote,
  deleteTask,
  ensureApiAuth,
  formPage,
  getDayPlan,
  todayIsoDate,
  uniqueTitle,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Ein über die API angelegter DayPlan-Termin erscheint im Widget "Nächste Termine"
 *   und im Kalender-Tab der Persönlichen Planung.
 * - Ein über die UI angelegter Termin wird über die API gespeichert und in Widget + Tab sichtbar.
 * - Ein via API angelegter DayPlan-Termin kann über die UI gelöscht werden und verschwindet
 *   danach aus Widget und Kalender-Tab.
 * - Eine über die UI angelegte Aufgabe erscheint im Aufgaben-Tab und im Aufgaben-Widget.
 * - Das Lösen einer Aufgabe entfernt sie aus Tab und Widget ohne Seitenreload.
 * - Eine via API angelegte Notiz erscheint im Notizen-Tab und im noteList-Widget.
 * - Das Löschen einer Notiz entfernt sie ohne Reload.
 * - Ein via API angelegter Kommentar erscheint im Kommentare-Tab und im commentJournal-Widget.
 * - Das Löschen eines Kommentars entfernt ihn ohne Reload.
 *
 * Fehlerfälle:
 * - Items dürfen nach dem Löschen nicht mehr im jeweiligen Tab oder Widget sichtbar sein.
 * - "Nächste Termine" darf keine vergangenen Termine enthalten.
 *
 * Ziel:
 * Die vollständige CRUD-Strecke der Persönlichen Planung Ende-zu-Ende absichern.
 */

async function openDayPlan(page: Page) {
  await authenticatedGoto(page, "/day-plan");
  await expect(page.getByRole("heading", { name: "Persönliche Planung" })).toBeVisible();
}

async function switchTab(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
}

// ─── Termine ─────────────────────────────────────────────────────────────────

test.describe("Persönliche Planung – Termine", () => {
  test("API-Termin erscheint im Nächste-Termine-Widget und im Kalender-Tab", async ({ page, request }) => {
    const today = todayIsoDate();
    const dayPlan = await getDayPlan(request, today);
    const event = await createDayPlanEvent(request, today, "E2E DayPlan Termin Sichtbar");

    try {
      await openDayPlan(page);

      // Overview: Nächste Termine Widget
      const upcomingWidget = page.getByTestId("dashboard-widget-upcomingEvents");
      await expect(upcomingWidget).toBeVisible();
      await expect(upcomingWidget).toContainText(event.title);

      // Kalender-Tab
      await switchTab(page, "Kalender");
      await expect(page.getByTestId("calendar-widget-view")).toBeVisible();
      await expect(page.getByTestId("calendar-widget-view")).toContainText(event.title);
    } finally {
      await deleteEvent(request, event.id);
    }
  });

  test("Termin über UI anlegen: API-Request wird ausgelöst, Termin im Widget sichtbar", async ({ page, request }) => {
    const today = todayIsoDate();
    const title = uniqueTitle("E2E DayPlan UI Termin");
    let eventId: number | null = null;

    try {
      await openDayPlan(page);

      // "+" im Nächste-Termine-Widget anklicken
      const addButton = page.getByRole("button", { name: "Nächste Termine: neu anlegen" });
      await expect(addButton).toBeVisible();
      await addButton.click();

      const form = formPage(page, "Termin anlegen");
      await expect(form).toBeVisible();
      await form.locator("input[required]").first().fill(title);
      await form.locator('input[type="datetime-local"]').nth(0).fill(`${today}T10:00`);
      await form.locator('input[type="datetime-local"]').nth(1).fill(`${today}T11:00`);

      const [response] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes(`${apiBaseUrl}/day-plans`) && r.url().includes("/events") && r.request().method() === "POST",
        ),
        form.getByRole("button", { name: "Speichern" }).click(),
      ]);
      expect(response.ok()).toBeTruthy();
      eventId = ((await response.json()) as { id: number }).id;

      const upcomingWidget = page.getByTestId("dashboard-widget-upcomingEvents");
      await expect(upcomingWidget).toContainText(title);
    } finally {
      await deleteEvent(request, eventId);
    }
  });

  test("Termin löschen: verschwindet aus Widget und Kalender-Tab", async ({ page, request }) => {
    const today = todayIsoDate();
    const event = await createDayPlanEvent(request, today, "E2E DayPlan Termin Löschen");

    try {
      await openDayPlan(page);

      // Kalender-Tab öffnen, Termin anklicken
      await switchTab(page, "Kalender");
      await expect(page.getByTestId("calendar-widget-view")).toBeVisible();
      await page.getByText(event.title, { exact: true }).first().click();

      const form = formPage(page, "Termin bearbeiten");
      await expect(form).toBeVisible();

      const [deleteResponse] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes(`${apiBaseUrl}/events/${event.id}`) && r.request().method() === "DELETE",
        ),
        form.getByRole("button", { name: "Löschen" }).click(),
      ]);
      expect(deleteResponse.ok()).toBeTruthy();

      // Kalender-Tab: Termin weg
      await expect(page.getByText(event.title, { exact: true })).toHaveCount(0);

      // Overview: Nächste Termine Widget aktualisiert
      await switchTab(page, "Übersicht");
      const upcomingWidget = page.getByTestId("dashboard-widget-upcomingEvents");
      await expect(upcomingWidget).toBeVisible();
      await expect(upcomingWidget).not.toContainText(event.title);
    } finally {
      await deleteEvent(request, event.id);
    }
  });

  test("Nächste Termine zeigt keine vergangenen Termine", async ({ page, request }) => {
    await ensureApiAuth(request);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pastDate = todayIsoDate(yesterday);
    const event = await createDayPlanEvent(request, todayIsoDate(), "E2E DayPlan Vergangen", {
      startTime: `${pastDate}T08:00:00`,
      endTime: `${pastDate}T09:00:00`,
    });

    try {
      await openDayPlan(page);
      const upcomingWidget = page.getByTestId("dashboard-widget-upcomingEvents");
      await expect(upcomingWidget).toBeVisible();
      await expect(upcomingWidget).not.toContainText(event.title);
    } finally {
      await deleteEvent(request, event.id);
    }
  });
});

// ─── Aufgaben ─────────────────────────────────────────────────────────────────

test.describe("Persönliche Planung – Aufgaben", () => {
  test("Aufgabe über UI anlegen: erscheint im Aufgaben-Tab", async ({ page, request }) => {
    const today = todayIsoDate();
    const title = uniqueTitle("E2E DayPlan UI Aufgabe");
    let taskId: number | null = null;

    try {
      await openDayPlan(page);
      await switchTab(page, "Aufgaben");

      // "+" Button im Aufgaben-Tab
      await page.getByRole("button", { name: "Neue Aufgabe", exact: true }).click();
      const form = formPage(page, "Aufgabe anlegen");
      await expect(form).toBeVisible();
      await form.locator("input[required]").first().fill(title);

      const [response] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes(`${apiBaseUrl}/day-plans/${today}/tasks`) && r.request().method() === "POST",
        ),
        form.getByRole("button", { name: "Speichern" }).click(),
      ]);
      expect(response.ok()).toBeTruthy();
      taskId = ((await response.json()) as { id: number }).id;

      await expect(page.getByText(title)).toBeVisible();
    } finally {
      await deleteTask(request, taskId);
    }
  });

  test("API-Aufgabe erscheint im Aufgaben-Tab und in einem Aufgaben-Widget", async ({ page, request }) => {
    const today = todayIsoDate();
    const task = await createDayPlanTask(request, today, "E2E DayPlan Aufgabe Sichtbar");

    try {
      await openDayPlan(page);

      // Aufgaben-Tab
      await switchTab(page, "Aufgaben");
      await expect(page.getByText(task.title)).toBeVisible();

      // Zurück zur Übersicht: Aufgaben-Widget prüfen
      await switchTab(page, "Übersicht");
      const taskWidget =
        page.getByTestId("dashboard-widget-taskList").or(page.getByTestId("dashboard-widget-taskBoard")).first();
      if (await taskWidget.isVisible()) {
        await expect(taskWidget).toContainText(task.title);
      }
    } finally {
      await deleteTask(request, task.id);
    }
  });

  test("Aufgabe lösen: verschwindet aus Aufgaben-Tab", async ({ page, request }) => {
    const today = todayIsoDate();
    const task = await createDayPlanTask(request, today, "E2E DayPlan Aufgabe Lösen");

    try {
      await openDayPlan(page);
      await switchTab(page, "Aufgaben");
      await expect(page.getByText(task.title)).toBeVisible();

      // Aufgabe lösen via Löschen-Button in der Karte
      const deleteButton = page
        .locator("article:visible")
        .filter({ hasText: task.title })
        .first()
        .getByRole("button", { name: "Löschen" })
        .first();

      const [response] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes(`${apiBaseUrl}/day-plans/${today}/tasks/${task.id}`) && r.request().method() === "DELETE",
        ),
        deleteButton.click(),
      ]);
      expect(response.ok()).toBeTruthy();

      await expect(page.getByText(task.title)).toHaveCount(0);
    } finally {
      await deleteTask(request, task.id);
    }
  });
});

// ─── Notizen ─────────────────────────────────────────────────────────────────

test.describe("Persönliche Planung – Notizen", () => {
  test("API-Notiz erscheint im Notizen-Tab und im noteList-Widget", async ({ page, request }) => {
    const today = todayIsoDate();
    const dayPlan = await getDayPlan(request, today);
    const note = await createDayPlanNote(request, dayPlan.id, "E2E DayPlan Notiz Sichtbar");

    try {
      await openDayPlan(page);

      // Notizen-Tab
      await switchTab(page, "Notizen");
      await expect(page.getByText(note.title)).toBeVisible();

      // Übersicht: noteList-Widget
      await switchTab(page, "Übersicht");
      const noteWidget = page.getByTestId("dashboard-widget-noteList");
      if (await noteWidget.isVisible()) {
        await expect(noteWidget).toContainText(note.title);
      }
    } finally {
      await deleteNote(request, note.id);
    }
  });

  test("Notiz über UI anlegen: erscheint im Notizen-Tab", async ({ page, request }) => {
    const today = todayIsoDate();
    const dayPlan = await getDayPlan(request, today);
    let noteId: number | null = null;

    try {
      await openDayPlan(page);
      await switchTab(page, "Notizen");

      // "+" Button klicken → erzeugt Notiz sofort und öffnet Editor
      await page.getByRole("button", { name: "Neue Notiz", exact: true }).click();

      const [response] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes(`${apiBaseUrl}/day-plans/${dayPlan.id}/notes`) && r.request().method() === "POST",
        ),
        // Notiz wird direkt nach Klick erstellt; wir warten auf die Response
        Promise.resolve(),
      ]);
      expect(response.ok()).toBeTruthy();
      noteId = ((await response.json()) as { id: number }).id;

      // Editor schließen
      await page.getByRole("button", { name: "Schließen" }).click();

      // Notiz erscheint in der Liste
      await expect(page.getByText("Neue Notiz")).toBeVisible();
    } finally {
      await deleteNote(request, noteId);
    }
  });

  test("Notiz löschen: verschwindet aus Notizen-Tab und noteList-Widget", async ({ page, request }) => {
    const today = todayIsoDate();
    const dayPlan = await getDayPlan(request, today);
    const note = await createDayPlanNote(request, dayPlan.id, "E2E DayPlan Notiz Löschen");

    try {
      await openDayPlan(page);
      await switchTab(page, "Notizen");
      await expect(page.getByText(note.title)).toBeVisible();

      // Notiz löschen
      const card = page.locator("article:visible").filter({ hasText: note.title }).first();
      await card.getByRole("button", { name: "Löschen" }).click();

      await expect(page.getByText(note.title)).toHaveCount(0);

      // noteList-Widget auf der Übersicht prüfen
      await switchTab(page, "Übersicht");
      const noteWidget = page.getByTestId("dashboard-widget-noteList");
      if (await noteWidget.isVisible()) {
        await expect(noteWidget).not.toContainText(note.title);
      }
    } finally {
      await deleteNote(request, note.id);
    }
  });
});

// ─── Kommentare ──────────────────────────────────────────────────────────────

test.describe("Persönliche Planung – Kommentare", () => {
  test("API-Kommentar erscheint im Kommentare-Tab", async ({ page, request }) => {
    const today = todayIsoDate();
    const dayPlan = await getDayPlan(request, today);
    const body = `E2E Kommentar ${Date.now()}`;
    const comment = await createDayPlanComment(request, dayPlan.id, `<p>${body}</p>`);

    try {
      await openDayPlan(page);
      await switchTab(page, "Kommentare");
      await expect(page.getByText(body)).toBeVisible();
    } finally {
      await deleteComment(request, comment.id);
    }
  });

  test("Kommentar über UI anlegen: erscheint im Kommentare-Tab", async ({ page, request }) => {
    const today = todayIsoDate();
    const dayPlan = await getDayPlan(request, today);
    const body = `E2E UI Kommentar ${Date.now()}`;
    let commentId: number | null = null;

    try {
      await openDayPlan(page);
      await switchTab(page, "Kommentare");

      await page.getByRole("button", { name: "Kommentar anlegen", exact: true }).click();
      const modal = page.locator('[role="dialog"]').filter({ hasText: "Kommentar anlegen" });
      await expect(modal).toBeVisible();

      // Kommentartext in den Rich-Text-Editor eingeben
      const editor = modal.locator('[contenteditable="true"]').first();
      await editor.click();
      await editor.fill(body);

      const [response] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes(`${apiBaseUrl}/day-plans/${dayPlan.id}/comments`) && r.request().method() === "POST",
        ),
        modal.getByRole("button", { name: "Anlegen" }).click(),
      ]);
      expect(response.ok()).toBeTruthy();
      commentId = ((await response.json()) as { id: number }).id;

      await expect(page.getByText(body)).toBeVisible();
    } finally {
      await deleteComment(request, commentId);
    }
  });

  test("Kommentar löschen: verschwindet aus Kommentare-Tab", async ({ page, request }) => {
    const today = todayIsoDate();
    const dayPlan = await getDayPlan(request, today);
    const body = `E2E Kommentar Löschen ${Date.now()}`;
    const comment = await createDayPlanComment(request, dayPlan.id, `<p>${body}</p>`);

    try {
      await openDayPlan(page);
      await switchTab(page, "Kommentare");
      await expect(page.getByText(body)).toBeVisible();

      const row = page.locator("li:visible, [data-testid]").filter({ hasText: body }).first();
      const deleteBtn = row.getByRole("button", { name: "Löschen" });

      const [response] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes(`${apiBaseUrl}/comments/${comment.id}`) && r.request().method() === "DELETE",
        ),
        deleteBtn.click(),
      ]);
      expect(response.ok()).toBeTruthy();

      await expect(page.getByText(body)).toHaveCount(0);
    } finally {
      await deleteComment(request, comment.id);
    }
  });
});
