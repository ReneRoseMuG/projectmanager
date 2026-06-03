import { expect, test } from "@playwright/test";
import {
  apiBaseUrl,
  authenticatedGoto,
  clickItemAction,
  createProject,
  createTask,
  deleteNote,
  deleteProject,
  deleteTask,
  ensureApiAuth,
  formPage,
  getDayPlan,
  itemCard,
  uniqueTitle,
  type NoteFixture,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Browser/E2E
 *
 * Realitätsgrad:
 * - Echter Browser, echte API, echte NoteList in Project-, Task- und DayPlan-Kontext.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Playwright-Testinstanz mit API-Testdaten; Cleanup über API.
 *
 * Abgedeckte Regeln:
 * - Eine via API angelegte Notiz erscheint im Notizen-Tab des jeweiligen Owners (Project, Task, DayPlan).
 * - Eine Notiz kann über das Löschen-Menü entfernt werden und verschwindet aus der Liste.
 * - Gegenbeispiel: Nach dem Löschen einer Notiz bleibt der Owner erhalten.
 *
 * Fehlerfälle:
 * - Notiz erscheint nach API-Anlage nicht in der UI.
 * - Notiz-Löschung entfernt den Owner oder andere Notizen.
 *
 * Ziel:
 * Note-CRUD in den drei häufigsten Kontexten (Project, Task, DayPlan) gegen echte API absichern.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createNoteForOwner(
  request: Parameters<typeof createProject>[0],
  ownerPath: string,
  title: string,
): Promise<NoteFixture> {
  await ensureApiAuth(request);
  const res = await request.post(`${apiBaseUrl}/${ownerPath}/notes`, {
    data: { title, contentJson: { type: "doc", content: [] } },
  });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<NoteFixture>;
}

// ─── Project ──────────────────────────────────────────────────────────────────

test("Notiz im Projekt-Kontext anlegen und löschen", async ({ page, request }) => {
  const project = await createProject(request, "E2E Note Project Context");
  const noteTitle = uniqueTitle("E2E Project Notiz");
  let noteId: number | null = null;

  try {
    const note = await createNoteForOwner(request, `projects/${project.id}`, noteTitle);
    noteId = note.id;

    await authenticatedGoto(page, `/projects/${project.id}?tab=notes`);
    const form = formPage(page, "Projekt bearbeiten");
    await expect(form).toBeVisible();
    await expect(form.getByRole("button", { name: /Notizen/ })).toBeVisible();
    await expect(itemCard(form, noteTitle)).toBeVisible();

    const [deleteResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes(`/api/notes/${noteId}`) && r.request().method() === "DELETE",
      ),
      clickItemAction(form, noteTitle, "Löschen"),
    ]);
    expect(deleteResponse.ok()).toBeTruthy();
    noteId = null;

    await expect(form.getByText(noteTitle)).not.toBeVisible();

    const projectStillExists = await request.get(`${apiBaseUrl}/projects/${project.id}`);
    expect(projectStillExists.ok()).toBeTruthy();
  } finally {
    await deleteNote(request, noteId);
    await deleteProject(request, project.id);
  }
});

test("Neue Notiz im Projekt-Tab über UI anlegen", async ({ page, request }) => {
  const project = await createProject(request, "E2E Note Project UI");
  const noteTitle = uniqueTitle("E2E Project UI Notiz");
  let noteId: number | null = null;

  try {
    await authenticatedGoto(page, `/projects/${project.id}?tab=notes`);
    const form = formPage(page, "Projekt bearbeiten");
    await expect(form).toBeVisible();

    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes(`/api/projects/${project.id}/notes`) && r.request().method() === "POST",
      ),
      form.getByRole("button", { name: "Neue Notiz", exact: true }).click(),
    ]);
    expect(response.ok()).toBeTruthy();
    noteId = ((await response.json()) as { id: number }).id;

    await expect(form.getByText("Neue Notiz")).toBeVisible();
  } finally {
    await deleteNote(request, noteId);
    await deleteProject(request, project.id);
  }
});

// ─── Task ─────────────────────────────────────────────────────────────────────

test("Notiz im Aufgaben-Kontext anlegen und löschen", async ({ page, request }) => {
  const project = await createProject(request, "E2E Note Task Context Project");
  const task = await createTask(request, { type: "project", id: project.id }, "E2E Note Task Context");
  const noteTitle = uniqueTitle("E2E Task Notiz");
  let noteId: number | null = null;

  try {
    const note = await createNoteForOwner(request, `tasks/${task.id}`, noteTitle);
    noteId = note.id;

    await authenticatedGoto(page, `/tasks/${task.id}?tab=notes`);
    const form = formPage(page, "Aufgabe bearbeiten");
    await expect(form).toBeVisible();
    await expect(form.getByRole("button", { name: /Notizen/ })).toBeVisible();
    await expect(itemCard(form, noteTitle)).toBeVisible();

    const [deleteResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes(`/api/notes/${noteId}`) && r.request().method() === "DELETE",
      ),
      clickItemAction(form, noteTitle, "Löschen"),
    ]);
    expect(deleteResponse.ok()).toBeTruthy();
    noteId = null;

    await expect(form.getByText(noteTitle)).not.toBeVisible();

    const taskStillExists = await request.get(`${apiBaseUrl}/tasks/${task.id}`);
    expect(taskStillExists.ok()).toBeTruthy();
  } finally {
    await deleteNote(request, noteId);
    await deleteTask(request, task.id);
    await deleteProject(request, project.id);
  }
});

// ─── DayPlan ─────────────────────────────────────────────────────────────────

test("Notiz im DayPlan-Kontext anlegen und löschen", async ({ page, request }) => {
  const today = new Date().toISOString().slice(0, 10);
  const dayPlan = await getDayPlan(request, today);
  const noteTitle = uniqueTitle("E2E DayPlan Notiz Context");
  let noteId: number | null = null;

  try {
    await ensureApiAuth(request);
    const noteRes = await request.post(`${apiBaseUrl}/day-plans/${dayPlan.id}/notes`, {
      data: { title: noteTitle, contentJson: { type: "doc", content: [] } },
    });
    expect(noteRes.ok()).toBeTruthy();
    noteId = ((await noteRes.json()) as { id: number }).id;

    await authenticatedGoto(page, "/day-plan");
    await expect(page.getByRole("heading", { name: "Persönliche Planung" })).toBeVisible();
    await page.getByRole("button", { name: "Notizen", exact: true }).click();

    await expect(page.getByText(noteTitle)).toBeVisible();

    const card = page.locator("article:visible").filter({ hasText: noteTitle }).first();
    const [deleteResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes(`/api/notes/${noteId}`) && r.request().method() === "DELETE",
      ),
      card.getByRole("button", { name: "Löschen" }).first().click(),
    ]);
    expect(deleteResponse.ok()).toBeTruthy();
    noteId = null;

    await expect(page.getByText(noteTitle)).not.toBeVisible();
  } finally {
    await deleteNote(request, noteId);
  }
});
