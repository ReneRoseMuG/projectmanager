import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  apiBaseUrl,
  authenticatedGoto,
  createProject,
  deleteProject,
  ensureApiAuth,
  formPage,
  itemCard,
  uniqueTitle,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Browser/E2E
 *
 * Realitätsgrad:
 * - Echter Browser, echte API, echte Project-Detailseite und echte Notiz-Mutation.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Playwright-Testinstanz mit API-Testdaten; Cleanup über API.
 *
 * Abgedeckte Regeln:
 * - Notizen öffnen im Parent-Detail aus der Board/List-Ansicht als Modal.
 * - Speichern im Notizmodal führt zurück in den Notizen-Tab desselben Parents.
 *
 * Fehlerfälle:
 * - Save im Notizmodal löst die Parent-Form aus und navigiert mehrere Ebenen höher.
 *
 * Ziel:
 * Den realen Projekt-Notizen-Modalfluss gegen Navigationsregressionen absichern.
 */

interface NoteFixture {
  id: number;
  title: string;
}

async function createProjectNote(request: APIRequestContext, projectId: number, title: string) {
  await ensureApiAuth(request);
  const response = await request.post(`${apiBaseUrl}/projects/${projectId}/notes`, {
    data: {
      title,
      contentJson: { html: "<p>E2E Notizinhalt</p>" },
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<NoteFixture>;
}

async function deleteNote(request: APIRequestContext, noteId: number | null) {
  await ensureApiAuth(request);
  if (noteId) {
    await request.delete(`${apiBaseUrl}/notes/${noteId}`);
  }
}

test("Notizmodal speichert ohne Rücksprung aus dem Projekt-Notizen-Tab", async ({ page, request }) => {
  const project = await createProject(request, "E2E Notes Modal Project");
  const noteTitle = uniqueTitle("E2E Notiz Modal");
  const updatedTitle = `${noteTitle} aktualisiert`;
  let noteId: number | null = null;

  try {
    const note = await createProjectNote(request, project.id, noteTitle);
    noteId = note.id;

    await authenticatedGoto(page, `/projects/${project.id}?tab=notes`);
    const projectForm = formPage(page, "Projekt bearbeiten");
    await expect(projectForm).toBeVisible();
    await expect(projectForm.getByRole("button", { name: /^Notizen/ })).toBeVisible();

    await itemCard(projectForm, noteTitle).dblclick();
    const noteForm = formPage(page, noteTitle);
    const noteEditorContent = page.getByTestId("note-editor-content-view");
    await expect(noteForm).toBeVisible();
    await expect(noteEditorContent).toBeVisible();

    await noteForm.getByLabel("Titel").fill(updatedTitle);
    await noteForm.getByRole("button", { name: "Speichern" }).click();

    await expect(noteEditorContent).not.toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}\\?tab=notes`));
    await expect(formPage(page, "Projekt bearbeiten")).toContainText(updatedTitle);
  } finally {
    await deleteNote(request, noteId);
    await deleteProject(request, project.id);
  }
});
