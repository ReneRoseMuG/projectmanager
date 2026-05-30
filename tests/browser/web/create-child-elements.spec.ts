import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";
import {
  authenticatedGoto,
  apiBaseUrl,
  createFeature,
  createMilestone,
  createProject,
  deleteFeature,
  deleteMilestone,
  deleteProject,
  deleteTask,
  deleteTicket,
  ensureApiAuth,
  fillRichText,
  formPage,
  itemCard,
  safeFilename,
  uniqueTitle,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Create-Flows legen vorgemerkte Attachments, Notizen und Kommentare nach dem Hauptobjekt an.
 * - Die Detailseiten laden die erzeugten Kindobjekte über echte API-Listen.
 * - Item-Card-Menüs mit Modal-Create verarbeiten dieselben vorgemerkten Kindobjekte.
 *
 * Fehlerfälle:
 * - Hauptobjekt erstellt, Kindobjekt aber nicht angelegt oder nicht mit dem Owner verknüpft.
 *
 * Ziel:
 * Die Post-Create-Verknüpfung von Attachments, Notizen und Kommentaren im Browser gegen echte API und Temp-Runtime absichern.
 */

interface PendingChildren {
  comment?: string;
  note?: string;
  filename?: string;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function apiPath(responseUrl: string) {
  return new URL(responseUrl).pathname;
}

function waitForApiPost(page: Page, path: string) {
  return page.waitForResponse(
    (response) =>
      apiPath(response.url()) === path &&
      response.request().method() === "POST",
  );
}

function tabButton(scope: Locator, label: string) {
  return scope.getByRole("button", {
    name: new RegExp(`^${escapeRegExp(label)}(?:\\s+\\d+)?$`),
  });
}

async function openFormTab(form: Locator, label: string) {
  await tabButton(form, label).click();
}

async function addPendingComment(page: Page, scope: Locator, text: string) {
  await scope.getByRole("button", { name: "Kommentar vormerken" }).click();
  // Modal portals outside scope — use page to find it
  const modal = formPage(page, "Kommentar vormerken");
  await fillRichText(modal, "pending-comment-create-editor", text);
  await modal.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(scope).toContainText("Vorgemerkter Kommentar");
}

async function addPendingNote(page: Page, form: Locator, title: string) {
  await openFormTab(form, "Notizen");
  await form.getByRole("button", { name: "Neue Notiz" }).click();
  const noteForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Hinzufügen" }) })
    .last();
  await noteForm.getByLabel("Titel").fill(title);
  await noteForm.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(form).toContainText(title);
}

async function addPendingFile(form: Locator, filename: string) {
  await openFormTab(form, "Dateien");
  await form.locator('input[type="file"]').last().setInputFiles({
    name: filename,
    mimeType: "text/plain",
    buffer: Buffer.from(`E2E attachment ${filename}`),
  });
  await expect(form).toContainText(filename);
}

async function addPendingChildren(page: Page, form: Locator, children: PendingChildren) {
  if (children.comment) {
    await openFormTab(form, "Kommentare");
    await addPendingComment(page, form, children.comment);
  }
  if (children.note) {
    await addPendingNote(page, form, children.note);
  }
  if (children.filename) {
    await addPendingFile(form, children.filename);
  }
}

async function expectDetailChildren(form: Locator, children: PendingChildren) {
  if (children.comment) {
    await openFormTab(form, "Kommentare");
    await expect(form).toContainText(children.comment);
  }
  if (children.note) {
    await openFormTab(form, "Notizen");
    await expect(form).toContainText(children.note);
  }
  if (children.filename) {
    await openFormTab(form, "Dateien");
    await expect(form).toContainText(children.filename);
  }
}

function createChildren(prefix: string, attachments = true, notes = true): PendingChildren {
  const token = safeFilename(uniqueTitle(prefix));
  return {
    comment: `Kommentar ${token}`,
    ...(notes ? { note: `Notiz ${token}` } : {}),
    ...(attachments ? { filename: `${token}.txt` } : {}),
  };
}

async function deleteBacklogItem(request: APIRequestContext, itemId: number | null) {
  await ensureApiAuth(request);
  if (itemId) {
    await request.delete(`${apiBaseUrl}/backlog/${itemId}`);
  }
}

async function deleteUseCase(request: APIRequestContext, useCaseId: number | null) {
  await ensureApiAuth(request);
  if (useCaseId) {
    await request.delete(`${apiBaseUrl}/use-cases/${useCaseId}`);
  }
}

async function deleteWikiPage(request: APIRequestContext, pageId: number | null) {
  await ensureApiAuth(request);
  if (pageId) {
    await request.delete(`${apiBaseUrl}/wiki/${pageId}`);
  }
}

async function openProjectCardMenu(page: Page, projectName: string, itemLabel: string) {
  const card = itemCard(page, projectName);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Aktionen" }).click();
  const item = page.getByRole("menuitem", { name: itemLabel });
  await expect(item).toBeVisible();
  await item.click();
}

async function openMilestoneCardMenu(page: Page, milestoneName: string, itemLabel: string) {
  const card = itemCard(page, milestoneName);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Aktionen" }).click();
  const item = page.getByRole("menuitem", { name: itemLabel });
  await expect(item).toBeVisible();
  await item.click();
}

test.describe("Create-Flows verknüpfen vorgemerkte Kindobjekte", () => {
  test("Projekt-Create zeigt Attachment, Notiz und Kommentar auf der Detailseite", async ({
    page,
    request,
  }) => {
    const projectName = uniqueTitle("E2E Create Children Project");
    const children = createChildren("project child");
    let projectId: number | null = null;

    try {
      await authenticatedGoto(page, "/projects/new");
      const form = formPage(page, "Projekt anlegen");
      await form.locator("input[required]").first().fill(projectName);
      await addPendingChildren(page, form, children);

      const createResponsePromise = waitForApiPost(page, "/api/projects");
      await form.getByRole("button", { name: "Projekt anlegen" }).click();
      projectId = ((await (await createResponsePromise).json()) as { id: number }).id;
      await expect(page).toHaveURL(/\/projects$/);

      await authenticatedGoto(page, `/projects/${projectId}`);
      await expectDetailChildren(formPage(page, "Projekt bearbeiten"), children);
    } finally {
      await deleteProject(request, projectId);
    }
  });

  test("Meilenstein-Create zeigt Attachment, Notiz und Kommentar auf der Detailseite", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Create Children Milestone Project");
    const milestoneName = uniqueTitle("E2E Create Children Milestone");
    const children = createChildren("milestone child");
    let milestoneId: number | null = null;

    try {
      const milestoneParams = new URLSearchParams({
        projectId: String(project.id),
        returnTo: "/milestones",
      });
      await authenticatedGoto(page, `/milestones/new?${milestoneParams.toString()}`);
      const form = formPage(page, "Meilenstein anlegen");
      await form.locator("input[required]").first().fill(milestoneName);
      await addPendingChildren(page, form, children);

      const createResponsePromise = waitForApiPost(page, "/api/milestones");
      await form.getByRole("button", { name: "Meilenstein anlegen" }).click();
      milestoneId = ((await (await createResponsePromise).json()) as { id: number }).id;
      await expect(page).toHaveURL(/\/milestones$/);

      await authenticatedGoto(page, `/milestones/${milestoneId}`);
      await expectDetailChildren(formPage(page, "Meilenstein bearbeiten"), children);
    } finally {
      await deleteMilestone(request, milestoneId);
      await deleteProject(request, project.id);
    }
  });

  test("Aufgabe-Create zeigt Attachment, Notiz und Kommentar auf der Detailseite", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Create Children Task Project");
    const taskTitle = uniqueTitle("E2E Create Children Task");
    const children = createChildren("task child");
    let taskId: number | null = null;

    try {
      await authenticatedGoto(page, `/tasks/new?ownerType=project&ownerId=${project.id}`);
      const form = formPage(page, "Aufgabe anlegen");
      await form.locator("input[required]").first().fill(taskTitle);
      await addPendingChildren(page, form, children);

      const createResponsePromise = waitForApiPost(page, `/api/projects/${project.id}/tasks`);
      await form.getByRole("button", { name: "Aufgabe anlegen" }).click();
      taskId = ((await (await createResponsePromise).json()) as { id: number }).id;
      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}`));

      await authenticatedGoto(page, `/tasks/${taskId}`);
      await expectDetailChildren(formPage(page, "Aufgabe bearbeiten"), children);
    } finally {
      await deleteTask(request, taskId);
      await deleteProject(request, project.id);
    }
  });

  test("Ticket-Create zeigt Attachment, Notiz und Kommentar auf der Detailseite", async ({
    page,
    request,
  }) => {
    const ticketTitle = uniqueTitle("E2E Create Children Ticket");
    const children = createChildren("ticket child");
    let ticketId: number | null = null;

    try {
      await authenticatedGoto(page, "/tickets/new");
      const form = formPage(page, "Ticket");
      await form.locator("input[required]").first().fill(ticketTitle);
      await addPendingChildren(page, form, children);

      const createResponsePromise = waitForApiPost(page, "/api/tickets");
      await form.getByRole("button", { name: "Ticket anlegen" }).click();
      ticketId = ((await (await createResponsePromise).json()) as { id: number }).id;
      await expect(page).toHaveURL(/\/tickets$/);

      await authenticatedGoto(page, `/tickets/${ticketId}`);
      await expectDetailChildren(formPage(page, "Ticket bearbeiten"), children);
    } finally {
      await deleteTicket(request, ticketId);
    }
  });

  test("Feature-Create zeigt Attachment und Kommentar auf der Detailseite", async ({
    page,
    request,
  }) => {
    const featureTitle = uniqueTitle("E2E Create Children Feature");
    const children = createChildren("feature child", true, false);
    let featureId: number | null = null;

    try {
      await authenticatedGoto(page, "/features/new");
      const form = formPage(page, "Neues Feature");
      await form.locator("input[required]").first().fill(featureTitle);
      await addPendingChildren(page, form, children);

      const createResponsePromise = waitForApiPost(page, "/api/features");
      await form.getByRole("button", { name: "Feature anlegen" }).click();
      featureId = ((await (await createResponsePromise).json()) as { id: number }).id;
      await expect(page).toHaveURL(/\/features$/);

      await authenticatedGoto(page, `/features/${featureId}`);
      await expectDetailChildren(formPage(page, "Feature bearbeiten"), children);
    } finally {
      await deleteFeature(request, featureId);
    }
  });

  test("Use-Case-Create zeigt Kommentar auf der Detailseite", async ({
    page,
    request,
  }) => {
    const feature = await createFeature(request, "E2E Create Children Use Case Feature");
    const useCaseTitle = uniqueTitle("E2E Create Children Use Case");
    const children = createChildren("use-case child", false, false);
    let useCaseId: number | null = null;

    try {
      const useCaseParams = new URLSearchParams({
        featureId: String(feature.id),
        returnTo: `/features/${feature.id}`,
      });
      await authenticatedGoto(page, `/use-cases/new?${useCaseParams.toString()}`);
      const form = formPage(page, "Use Case anlegen");
      await form.locator("input[required]").first().fill(useCaseTitle);
      await addPendingChildren(page, form, children);

      const createResponsePromise = waitForApiPost(page, `/api/features/${feature.id}/use-cases`);
      await form.getByRole("button", { name: "Speichern" }).click();
      useCaseId = ((await (await createResponsePromise).json()) as { id: number }).id;
      await expect(page).toHaveURL(new RegExp(`/features/${feature.id}`));

      await authenticatedGoto(page, `/use-cases/${useCaseId}`);
      await expectDetailChildren(formPage(page, "Use Case bearbeiten"), children);
    } finally {
      await deleteUseCase(request, useCaseId);
      await deleteFeature(request, feature.id);
    }
  });

  test("Backlog-Create zeigt Kommentar auf der Detailseite", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Create Children Backlog Project");
    const backlogTitle = uniqueTitle("E2E Create Children Backlog");
    const children = createChildren("backlog child", false, false);
    let itemId: number | null = null;

    try {
      await authenticatedGoto(page, `/backlog/new?projectId=${project.id}`);
      const form = formPage(page, "Backlog-Item anlegen");
      await form.locator("input[required]").first().fill(backlogTitle);
      await addPendingComment(page, form, children.comment ?? "");

      const createResponsePromise = waitForApiPost(page, `/api/projects/${project.id}/backlog`);
      await form.getByRole("button", { name: "Speichern" }).click();
      itemId = ((await (await createResponsePromise).json()) as { id: number }).id;
      await expect(page).toHaveURL(new RegExp(`/projects/${project.id}`));

      await authenticatedGoto(page, `/backlog/${itemId}`);
      await expect(formPage(page, "Backlog-Item bearbeiten")).toContainText(children.comment ?? "");
    } finally {
      await deleteBacklogItem(request, itemId);
      await deleteProject(request, project.id);
    }
  });

  test("Wiki-Create zeigt Kommentar auf der Detailseite", async ({ page, request }) => {
    const pageTitle = uniqueTitle("E2E Create Children Wiki");
    const children = createChildren("wiki child", false, false);
    let wikiPageId: number | null = null;

    try {
      await authenticatedGoto(page, "/wiki");
      await page.getByRole("button", { name: "Neue Seite" }).first().click();
      const form = formPage(page, "Wiki-Seite anlegen");
      await form.locator("input[required]").first().fill(pageTitle);
      const titledForm = formPage(page, pageTitle);
      await openFormTab(titledForm, "Kommentare");
      await addPendingComment(page, titledForm, children.comment ?? "");

      const createResponsePromise = waitForApiPost(page, "/api/wiki");
      await titledForm.getByRole("button", { name: "Veröffentlichen" }).click();
      wikiPageId = ((await (await createResponsePromise).json()) as { id: number }).id;
      await expect(page).toHaveURL(new RegExp(`/wiki/${wikiPageId}`));

      const detail = page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: pageTitle }) })
        .first();
      await tabButton(detail, "Kommentare").click();
      await expect(detail).toContainText(children.comment ?? "");
    } finally {
      await deleteWikiPage(request, wikiPageId);
    }
  });

  test("Projektkarten-Menü erstellt Meilenstein mit vorgemerkten Kindern", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Project Card Milestone Children");
    const milestoneChildren = createChildren("project-card milestone");
    let milestoneId: number | null = null;

    try {
      await authenticatedGoto(page, "/projects");
      await openProjectCardMenu(page, project.name, "Neuer Meilenstein");
      const form = formPage(page, "Meilenstein anlegen");
      await form.locator("input[required]").first().fill(uniqueTitle("E2E Project Card Milestone"));
      await addPendingChildren(page, form, milestoneChildren);
      const responsePromise = waitForApiPost(page, `/api/projects/${project.id}/milestones`);
      await form.getByRole("button", { name: "Meilenstein anlegen" }).click();
      milestoneId = ((await (await responsePromise).json()) as { id: number }).id;
      await expect(form).not.toBeVisible();

      await authenticatedGoto(page, `/milestones/${milestoneId}`);
      await expectDetailChildren(formPage(page, "Meilenstein bearbeiten"), milestoneChildren);
    } finally {
      await deleteMilestone(request, milestoneId);
      await deleteProject(request, project.id);
    }
  });

  test("Projektkarten-Menü erstellt Aufgabe mit vorgemerkten Kindern", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Project Card Task Children");
    const taskChildren = createChildren("project-card task");
    let taskId: number | null = null;

    try {
      await authenticatedGoto(page, "/projects");
      await openProjectCardMenu(page, project.name, "Neue Aufgabe");
      const form = formPage(page, "Aufgabe anlegen");
      await form.locator("input[required]").first().fill(uniqueTitle("E2E Project Card Task"));
      await addPendingChildren(page, form, taskChildren);
      const responsePromise = waitForApiPost(page, `/api/projects/${project.id}/tasks`);
      await form.getByRole("button", { name: "Aufgabe anlegen" }).click();
      taskId = ((await (await responsePromise).json()) as { id: number }).id;
      await expect(form).not.toBeVisible();

      await authenticatedGoto(page, `/tasks/${taskId}`);
      await expectDetailChildren(formPage(page, "Aufgabe bearbeiten"), taskChildren);
    } finally {
      await deleteTask(request, taskId);
      await deleteProject(request, project.id);
    }
  });

  test("Projektkarten-Menü erstellt Ticket mit vorgemerkten Kindern", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Project Card Ticket Children");
    const ticketChildren = createChildren("project-card ticket");
    let ticketId: number | null = null;

    try {
      await authenticatedGoto(page, "/projects");
      await openProjectCardMenu(page, project.name, "Neues Ticket");
      const form = formPage(page, "Ticket");
      await form.locator("input[required]").first().fill(uniqueTitle("E2E Project Card Ticket"));
      await addPendingChildren(page, form, ticketChildren);
      const responsePromise = waitForApiPost(page, `/api/projects/${project.id}/tickets`);
      await form.getByRole("button", { name: "Ticket anlegen" }).click();
      ticketId = ((await (await responsePromise).json()) as { id: number }).id;
      await expect(form).not.toBeVisible();

      await authenticatedGoto(page, `/tickets/${ticketId}`);
      await expectDetailChildren(formPage(page, "Ticket bearbeiten"), ticketChildren);
    } finally {
      await deleteTicket(request, ticketId);
      await deleteProject(request, project.id);
    }
  });

  test("Meilensteinkarten-Menü erstellt Aufgabe mit vorgemerkten Kindern", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Milestone Card Task Children Project");
    const milestone = await createMilestone(request, project.id, "E2E Milestone Card Task Children");
    const taskChildren = createChildren("milestone-card task");
    let taskId: number | null = null;

    try {
      await authenticatedGoto(page, "/milestones");
      await openMilestoneCardMenu(page, milestone.name, "Neue Aufgabe");
      const form = formPage(page, "Aufgabe anlegen");
      await form.locator("input[required]").first().fill(uniqueTitle("E2E Milestone Card Task"));
      await addPendingChildren(page, form, taskChildren);
      const responsePromise = waitForApiPost(page, `/api/milestones/${milestone.id}/tasks`);
      await form.getByRole("button", { name: "Aufgabe anlegen" }).click();
      taskId = ((await (await responsePromise).json()) as { id: number }).id;
      await expect(form).not.toBeVisible();

      await authenticatedGoto(page, `/tasks/${taskId}`);
      await expectDetailChildren(formPage(page, "Aufgabe bearbeiten"), taskChildren);
    } finally {
      await deleteTask(request, taskId);
      await deleteProject(request, project.id);
    }
  });

  test("Meilensteinkarten-Menü erstellt Ticket mit vorgemerkten Kindern", async ({
    page,
    request,
  }) => {
    const project = await createProject(request, "E2E Milestone Card Ticket Children Project");
    const milestone = await createMilestone(request, project.id, "E2E Milestone Card Ticket Children");
    const ticketChildren = createChildren("milestone-card ticket");
    let ticketId: number | null = null;

    try {
      await authenticatedGoto(page, "/milestones");
      await openMilestoneCardMenu(page, milestone.name, "Neues Ticket");
      const form = formPage(page, "Ticket");
      await form.locator("input[required]").first().fill(uniqueTitle("E2E Milestone Card Ticket"));
      await addPendingChildren(page, form, ticketChildren);
      const responsePromise = waitForApiPost(page, `/api/milestones/${milestone.id}/tickets`);
      await form.getByRole("button", { name: "Ticket anlegen" }).click();
      ticketId = ((await (await responsePromise).json()) as { id: number }).id;
      await expect(form).not.toBeVisible();

      await authenticatedGoto(page, `/tickets/${ticketId}`);
      await expectDetailChildren(formPage(page, "Ticket bearbeiten"), ticketChildren);
    } finally {
      await deleteTicket(request, ticketId);
      await deleteProject(request, project.id);
    }
  });
});
