import { expect, test, type Locator, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";
import { apiBaseUrl, createFeature, createProject, deleteFeature, deleteProject, formPage, itemCard, slugify, uniqueTitle } from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Projekt-Detail-Tabs aktualisieren sich nach Collection-, Relations- und Dateiänderungen mit echten API-Daten.
 * - Child-Objekte nutzen ihre eigenen Detailrouten; Parent-Tabs zeigen danach wieder den aktuellen Datenstand.
 * - Backlog-Filter zählen die vollständige Collection, auch wenn ein Filter aktiv ist.
 *
 * Fehlerfälle:
 * - Stale Tab-Counter, stale Listen, stale Boards oder stale Relationstabellen nach Create, Update oder Delete werden sichtbar.
 *
 * Ziel:
 * Die globale Query-Synchronisierung aus Nutzersicht gegen Aktualitätsprobleme in Projekt-Detail-Flows absichern.
 */

interface IdFixture {
  id: number;
}

interface NoteFixture extends IdFixture {
  title: string;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function activeModal(page: Page) {
  return page.locator(".fixed.inset-0").last();
}

function projectForm(page: Page) {
  return formPage(page, "Projekt bearbeiten");
}

function featureForm(page: Page) {
  return formPage(page, "Feature bearbeiten");
}

function visibleArticle(scope: Page | Locator, text: string) {
  return itemCard(scope, text);
}

function tabWithCount(scope: Page | Locator, label: string, count: number) {
  return scope.getByRole("button", { name: new RegExp(`^${escapeRegExp(label)}\\s+${count}$`) });
}

function tabByLabel(scope: Page | Locator, label: string) {
  return scope.getByRole("button", { name: new RegExp(`^${escapeRegExp(label)}(?:\\s+\\d+)?$`) });
}

async function expectTabCount(scope: Page | Locator, label: string, count: number) {
  await expect(tabWithCount(scope, label, count)).toBeVisible();
}

async function openTab(scope: Page | Locator, label: string) {
  await tabByLabel(scope, label).click();
}

async function openProjectDetail(page: Page, projectId: number) {
  await page.goto(`/projects/${projectId}`);
  await expect(projectForm(page)).toBeVisible();
}

async function discardUnsavedNoteChangesIfNeeded(page: Page) {
  const discardDialog = page.getByRole("alertdialog");
  const visible = await discardDialog.isVisible({ timeout: 1_000 }).catch(() => false);
  if (visible) {
    await discardDialog.getByRole("button", { name: "Verwerfen" }).click();
    await expect(discardDialog).not.toBeVisible();
  }
}

test.describe("Globale UI-Aktualität", () => {
  test("Task-Collection: Create/Delete aktualisiert Liste und Board im Projekt-Tab", async ({ page, request }) => {
    const project = await createProject(request, "E2E Fresh Tasks");
    const taskTitle = uniqueTitle("E2E Fresh Task");

    try {
      await openProjectDetail(page, project.id);
      await openTab(projectForm(page), "Aufgaben");
      await expect(projectForm(page).getByRole("heading", { name: "Keine Aufgaben" })).toBeVisible();

      await projectForm(page).getByRole("button", { name: "Neue Aufgabe" }).click();
      await expect(page).toHaveURL(/\/tasks\/new\?/);
      const taskForm = formPage(page, "Aufgabe anlegen");
      await taskForm.locator("input[required]").first().fill(taskTitle);
      const createResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${project.id}/tasks`) && response.request().method() === "POST"
      );
      await taskForm.getByRole("button", { name: "Aufgabe anlegen" }).click();
      const createdTask = (await (await createResponsePromise).json()) as IdFixture;

      await openProjectDetail(page, project.id);
      await openTab(projectForm(page), "Aufgaben");
      await expect(visibleArticle(projectForm(page), taskTitle)).toBeVisible();
      await projectForm(page).getByRole("button", { name: "Kanban" }).click();
      await expect(projectForm(page).getByRole("heading", { name: "Offen" })).toBeVisible();
      await expect(visibleArticle(projectForm(page), taskTitle)).toBeVisible();

      await visibleArticle(projectForm(page), taskTitle).getByRole("button", { name: "Löschen", exact: true }).click();
      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/api/projects/${project.id}/tasks/${createdTask.id}`) && response.request().method() === "DELETE"),
        page.getByRole("alertdialog").getByRole("button", { name: "Entfernen" }).click()
      ]);

      await openTab(projectForm(page), "Aufgaben");
      await expect(projectForm(page).locator("article:visible").filter({ hasText: taskTitle })).toHaveCount(0);
      await expect(projectForm(page).getByRole("heading", { name: "Keine Aufgaben" })).toBeVisible();
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("Projekt-Feature-Relation: Join-Änderung aktualisiert Counter, Liste und Board", async ({ page, request }) => {
    const project = await createProject(request, "E2E Fresh Relation Project");
    const feature = await createFeature(request, "E2E Fresh Relation Feature");

    try {
      await openProjectDetail(page, project.id);
      await expectTabCount(projectForm(page), "Features", 0);

      await page.goto(`/features/${feature.id}`);
      await featureForm(page).getByRole("button", { name: /Projekte/ }).click();
      await featureForm(page).getByRole("button", { name: "Projekt hinzufügen" }).click();
      await activeModal(page).getByRole("combobox").selectOption({ label: project.name });
      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/api/projects/${project.id}/features`) && response.request().method() === "PUT"),
        activeModal(page).getByRole("button", { name: "Hinzufügen" }).click()
      ]);

      await openProjectDetail(page, project.id);
      await expectTabCount(projectForm(page), "Features", 1);
      await tabWithCount(projectForm(page), "Features", 1).click();
      await expect(projectForm(page).getByText(feature.title)).toBeVisible();
      await projectForm(page).getByRole("button", { name: "Kanban" }).click();
      await expect(visibleArticle(projectForm(page), feature.title)).toBeVisible();

      await page.goto(`/features/${feature.id}`);
      await featureForm(page).getByRole("button", { name: /Projekte/ }).click();
      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/api/projects/${project.id}/features`) && response.request().method() === "PUT"),
        visibleArticle(featureForm(page), project.name).getByRole("button", { name: "Entfernen" }).click()
      ]);

      await openProjectDetail(page, project.id);
      await expectTabCount(projectForm(page), "Features", 0);
      await tabWithCount(projectForm(page), "Features", 0).click();
      await expect(projectForm(page).getByText(feature.title)).toHaveCount(0);
    } finally {
      await deleteProject(request, project.id);
      await deleteFeature(request, feature.id);
    }
  });

  test("Backlog-Collection: Create/Update/Delete aktualisiert Counter, Filter, Liste und Board", async ({ page, request }) => {
    const project = await createProject(request, "E2E Fresh Backlog");
    const backlogTitle = uniqueTitle("E2E Fresh Backlog Item");

    try {
      await openProjectDetail(page, project.id);
      await expectTabCount(projectForm(page), "Backlog", 0);
      await tabWithCount(projectForm(page), "Backlog", 0).click();
      await expect(projectForm(page).getByRole("heading", { name: "Keine Backlog-Items" })).toBeVisible();

      await projectForm(page).getByRole("button", { name: "Neues Backlog-Item" }).click();
      await expect(page).toHaveURL(/\/backlog\/new\?/);
      const createForm = formPage(page, "Backlog-Item anlegen");
      await createForm.locator("input[required]").first().fill(backlogTitle);
      const createResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${project.id}/backlog`) && response.request().method() === "POST"
      );
      await createForm.getByRole("button", { name: "Speichern" }).click();
      const createdBacklogItem = (await (await createResponsePromise).json()) as IdFixture;

      await openProjectDetail(page, project.id);
      await expectTabCount(projectForm(page), "Backlog", 1);
      await tabWithCount(projectForm(page), "Backlog", 1).click();
      await expect(projectForm(page).getByRole("button", { name: /^Alle\s+1$/ })).toBeVisible();
      await expect(projectForm(page).getByRole("button", { name: /^Offen\s+1$/ })).toBeVisible();
      await expect(visibleArticle(projectForm(page), backlogTitle)).toBeVisible();

      await projectForm(page).getByRole("button", { name: "Kanban" }).click();
      await expect(visibleArticle(projectForm(page), backlogTitle)).toBeVisible();
      await projectForm(page).getByRole("button", { name: "Liste", exact: true }).click();

      await visibleArticle(projectForm(page), backlogTitle).getByRole("button", { name: "Bearbeiten" }).click();
      const editForm = formPage(page, "Backlog-Item bearbeiten");
      await editForm.getByRole("button", { name: "In Arbeit" }).click();
      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/api/backlog/${createdBacklogItem.id}`) && response.request().method() === "PATCH"),
        editForm.getByRole("button", { name: "Speichern" }).click()
      ]);

      await openProjectDetail(page, project.id);
      await tabWithCount(projectForm(page), "Backlog", 1).click();
      await expect(projectForm(page).getByRole("button", { name: /^Alle\s+1$/ })).toBeVisible();
      await expect(projectForm(page).getByRole("button", { name: /^Offen\s+0$/ })).toBeVisible();
      await expect(projectForm(page).getByRole("button", { name: /^In Arbeit\s+1$/ })).toBeVisible();
      await projectForm(page).getByRole("button", { name: /^In Arbeit\s+1$/ }).click();
      await expect(visibleArticle(projectForm(page), backlogTitle)).toBeVisible();
      await projectForm(page).getByRole("button", { name: /^Offen\s+0$/ }).click();
      await expect(projectForm(page).locator("article:visible").filter({ hasText: backlogTitle })).toHaveCount(0);
      await projectForm(page).getByRole("button", { name: /^Alle\s+1$/ }).click();

      await visibleArticle(projectForm(page), backlogTitle).getByRole("button", { name: "Löschen" }).click();
      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/api/backlog/${createdBacklogItem.id}`) && response.request().method() === "DELETE"),
        page.getByRole("alertdialog").getByRole("button", { name: "Löschen" }).click()
      ]);

      await expectTabCount(projectForm(page), "Backlog", 0);
      await expect(projectForm(page).getByRole("button", { name: /^Alle\s+0$/ })).toBeVisible();
      await expect(projectForm(page).locator("article:visible").filter({ hasText: backlogTitle })).toHaveCount(0);
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("Neben-Collections: Kommentare, Notizen und Dateien aktualisieren Tab-Counter nach Create/Delete", async ({ page, request }) => {
    const project = await createProject(request, "E2E Fresh Side Collections");
    const commentText = uniqueTitle("E2E Fresh Kommentar");
    const attachmentName = `${slugify(uniqueTitle("fresh attachment"))}.txt`;

    try {
      await openProjectDetail(page, project.id);

      await expectTabCount(projectForm(page), "Kommentare", 0);
      await tabWithCount(projectForm(page), "Kommentare", 0).click();
      await expect(projectForm(page).getByRole("heading", { name: "Noch keine Kommentare" })).toBeVisible();
      const commentEditor = projectForm(page).locator('[contenteditable="true"]').last();
      await commentEditor.fill(commentText);
      await expect(commentEditor).toContainText(commentText);
      const createCommentResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${project.id}/comments`) && response.request().method() === "POST"
      );
      await projectForm(page).getByRole("button", { name: "Kommentar", exact: true }).click();
      const createdComment = (await (await createCommentResponsePromise).json()) as IdFixture;
      await expectTabCount(projectForm(page), "Kommentare", 1);
      await expect(projectForm(page).getByText(commentText, { exact: true })).toBeVisible();

      await Promise.all([
        page.waitForResponse(
          (response) => response.url().includes(`/api/projects/${project.id}/comments/${createdComment.id}`) && response.request().method() === "DELETE"
        ),
        visibleArticle(projectForm(page), commentText).getByRole("button", { name: "Löschen" }).click()
      ]);
      await expectTabCount(projectForm(page), "Kommentare", 0);

      await expectTabCount(projectForm(page), "Notizen", 0);
      await tabWithCount(projectForm(page), "Notizen", 0).click();
      await projectForm(page).getByRole("button", { name: "Neue Notiz", exact: true }).click();
      await expect(activeModal(page).getByRole("heading", { name: "Ohne Titel" })).toBeVisible();
      await activeModal(page).getByRole("button", { name: "Schließen" }).first().click();
      await discardUnsavedNoteChangesIfNeeded(page);
      await expectTabCount(projectForm(page), "Notizen", 1);
      await expect(visibleArticle(projectForm(page), "Ohne Titel")).toBeVisible();
      const notesResponse = await request.get(`${apiBaseUrl}/projects/${project.id}/notes`);
      const createdNote = ((await notesResponse.json()) as NoteFixture[]).find((note) => note.title === "Ohne Titel");
      expect(createdNote).toBeTruthy();

      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/api/notes/${createdNote?.id}`) && response.request().method() === "DELETE"),
        visibleArticle(projectForm(page), "Ohne Titel").getByRole("button", { name: "Löschen" }).click()
      ]);
      await expectTabCount(projectForm(page), "Notizen", 0);

      await expectTabCount(projectForm(page), "Dateien", 0);
      await tabWithCount(projectForm(page), "Dateien", 0).click();
      const createAttachmentResponsePromise = page.waitForResponse(
        (response) => response.url().includes(`/api/projects/${project.id}/attachments`) && response.request().method() === "POST"
      );
      await projectForm(page).locator('input[type="file"]').setInputFiles({
        name: attachmentName,
        mimeType: "text/plain",
        buffer: Buffer.from("E2E attachment freshness")
      });
      const createdAttachment = (await (await createAttachmentResponsePromise).json()) as IdFixture;
      await expectTabCount(projectForm(page), "Dateien", 1);
      await expect(visibleArticle(projectForm(page), attachmentName)).toBeVisible();

      await Promise.all([
        page.waitForResponse((response) => response.url().includes(`/api/attachments/${createdAttachment.id}`) && response.request().method() === "DELETE"),
        visibleArticle(projectForm(page), attachmentName).getByRole("button", { name: "Löschen" }).click()
      ]);
      await expectTabCount(projectForm(page), "Dateien", 0);
    } finally {
      await deleteProject(request, project.id);
    }
  });
});
