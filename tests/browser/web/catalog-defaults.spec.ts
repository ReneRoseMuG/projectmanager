import { expect, test, type APIRequestContext } from "@playwright/test";
import type { CatalogEntry, CatalogKind } from "@taskmanager/shared-types";
import { apiBaseUrl, authenticatedGoto, deleteFeature, deleteMilestone, deleteProject, deleteTask, deleteTicket, ensureApiAuth, fillRichText, formPage, slugify, uniqueTitle } from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Create-Formulare verwenden keine gelöschten Legacy-Katalogwerte als Pflicht-Defaults.
 * - Projekt, Meilenstein, Feature, Use Case, Aufgabe, Ticket und Backlog erstellen mit echten API-Daten nach gekürzten Katalogen.
 *
 * Fehlerfälle:
 * - Entfernte Keys wie `todo`, `open`, `draft`, `medium`, `high` oder `urgent` dürfen keine 400-Antwort im Browser-Create-Flow auslösen.
 *
 * Ziel:
 * Katalogabhängige Create-Workflows gegen echte Browser- und API-Daten absichern.
 */

async function trimCatalog(request: APIRequestContext, kind: CatalogKind, keepKeys: string[]): Promise<CatalogEntry[]> {
  await ensureApiAuth(request);
  const response = await request.get(`${apiBaseUrl}/catalogs/${kind}`);
  expect(response.ok()).toBeTruthy();
  const entries = (await response.json()) as CatalogEntry[];
  const removed = entries.filter((entry) => !keepKeys.includes(entry.key));
  for (const entry of removed) {
    const deleteResponse = await request.delete(`${apiBaseUrl}/catalogs/${kind}/${entry.id}`);
    expect(deleteResponse.ok()).toBeTruthy();
  }
  return removed;
}

async function restoreCatalogEntries(request: APIRequestContext, entries: CatalogEntry[]) {
  await ensureApiAuth(request);
  for (const entry of entries.sort((left, right) => left.sortOrder - right.sortOrder)) {
    const currentResponse = await request.get(`${apiBaseUrl}/catalogs/${entry.kind}`);
    expect(currentResponse.ok()).toBeTruthy();
    const current = (await currentResponse.json()) as CatalogEntry[];
    if (current.some((candidate) => candidate.key === entry.key)) {
      continue;
    }
    const restoreResponse = await request.post(`${apiBaseUrl}/catalogs/${entry.kind}`, {
      data: { key: entry.key, label: entry.label, sortOrder: entry.sortOrder, isClosed: entry.isClosed }
    });
    expect(restoreResponse.ok()).toBeTruthy();
  }
}

test.describe("Kataloggekürzte Create-Flows", () => {
  test("alle katalogabhängigen Create-Formulare speichern mit echten Daten", async ({ page, request }) => {
    const removedEntries: CatalogEntry[] = [];
    const createdIds: Partial<Record<"project" | "milestone" | "feature" | "useCase" | "task" | "ticket" | "backlog", number>> = {};

    try {
      removedEntries.push(...(await trimCatalog(request, "workStatus", ["active"])));
      removedEntries.push(...(await trimCatalog(request, "featureStatus", ["active"])));
      removedEntries.push(...(await trimCatalog(request, "priority", ["low"])));

      const projectName = uniqueTitle("E2E Trimmed Catalog Project");
      await authenticatedGoto(page, "/projects");
      await page.getByRole("button", { name: "Neues Projekt" }).click();
      const projectForm = formPage(page, "Projekt anlegen");
      await projectForm.locator("input[required]").first().fill(projectName);
      await fillRichText(projectForm, "project-description", "E2E Projekt mit gekürzten Katalogen");
      const projectResponsePromise = page.waitForResponse((response) => response.url().includes("/api/projects") && response.request().method() === "POST");
      await projectForm.getByRole("button", { name: "Projekt anlegen" }).click();
      const project = (await (await projectResponsePromise).json()) as { id: number; status: string };
      createdIds.project = project.id;
      expect(project.status).toBe("active");

      const milestoneName = uniqueTitle("E2E Trimmed Catalog Milestone");
      await authenticatedGoto(page, `/milestones/new?projectId=${project.id}&returnTo=${encodeURIComponent(`/projects/${project.id}`)}`);
      const milestoneForm = formPage(page, "Meilenstein anlegen");
      await milestoneForm.locator("input[required]").first().fill(milestoneName);
      const milestoneResponsePromise = page.waitForResponse((response) => response.url().includes("/api/milestones") && response.request().method() === "POST");
      await milestoneForm.getByRole("button", { name: "Meilenstein anlegen" }).click();
      const milestone = (await (await milestoneResponsePromise).json()) as { id: number; status: string };
      createdIds.milestone = milestone.id;
      expect(milestone.status).toBe("active");

      const featureTitle = uniqueTitle("E2E Trimmed Catalog Feature");
      await authenticatedGoto(page, "/features/new");
      const featureForm = formPage(page, "Neues Feature");
      await featureForm.locator("input[required]").nth(0).fill(featureTitle);
      await featureForm.locator("input[required]").nth(1).fill(slugify(featureTitle));
      const featureResponsePromise = page.waitForResponse((response) => response.url().includes("/api/features") && response.request().method() === "POST");
      await featureForm.getByRole("button", { name: "Feature anlegen" }).click();
      const feature = (await (await featureResponsePromise).json()) as { id: number; status: string };
      createdIds.feature = feature.id;
      expect(feature.status).toBe("active");

      const useCaseTitle = uniqueTitle("E2E Trimmed Catalog Use Case");
      await authenticatedGoto(page, `/use-cases/new?featureId=${feature.id}&returnTo=${encodeURIComponent(`/features/${feature.id}`)}`);
      const useCaseForm = formPage(page, "Use Case anlegen");
      await useCaseForm.locator("input[required]").nth(0).fill(useCaseTitle);
      await useCaseForm.locator("input[required]").nth(1).fill(slugify(useCaseTitle));
      const useCaseResponsePromise = page.waitForResponse((response) => response.url().includes(`/api/features/${feature.id}/use-cases`) && response.request().method() === "POST");
      await useCaseForm.getByRole("button", { name: "Speichern" }).click();
      const useCase = (await (await useCaseResponsePromise).json()) as { id: number; status: string };
      createdIds.useCase = useCase.id;
      expect(useCase.status).toBe("active");

      const taskTitle = uniqueTitle("E2E Trimmed Catalog Task");
      await authenticatedGoto(page, `/tasks/new?ownerType=project&ownerId=${project.id}&returnTo=${encodeURIComponent(`/projects/${project.id}`)}`);
      const taskForm = formPage(page, "Aufgabe anlegen");
      await taskForm.locator("input[required]").first().fill(taskTitle);
      const taskResponsePromise = page.waitForResponse((response) => response.url().includes(`/api/projects/${project.id}/tasks`) && response.request().method() === "POST");
      await taskForm.getByRole("button", { name: "Aufgabe anlegen" }).click();
      const task = (await (await taskResponsePromise).json()) as { id: number; status: string; priority: string };
      createdIds.task = task.id;
      expect(task.status).toBe("active");
      expect(task.priority).toBe("low");

      const ticketTitle = uniqueTitle("E2E Trimmed Catalog Ticket");
      await authenticatedGoto(page, `/tickets/new?ownerType=project&ownerId=${project.id}&returnTo=${encodeURIComponent(`/projects/${project.id}`)}`);
      const ticketForm = formPage(page, "Ticket");
      await ticketForm.locator("input[required]").first().fill(ticketTitle);
      const ticketResponsePromise = page.waitForResponse((response) => response.url().includes(`/api/projects/${project.id}/tickets`) && response.request().method() === "POST");
      await ticketForm.getByRole("button", { name: "Ticket anlegen" }).click();
      const ticket = (await (await ticketResponsePromise).json()) as { id: number; status: string; priority: string };
      createdIds.ticket = ticket.id;
      expect(ticket.status).toBe("active");
      expect(ticket.priority).toBe("low");

      const backlogTitle = uniqueTitle("E2E Trimmed Catalog Backlog");
      await authenticatedGoto(page, `/backlog/new?projectId=${project.id}&returnTo=${encodeURIComponent(`/projects/${project.id}`)}`);
      const backlogForm = formPage(page, "Backlog-Item anlegen");
      await backlogForm.locator("input[required]").first().fill(backlogTitle);
      const backlogResponsePromise = page.waitForResponse((response) => response.url().includes(`/api/projects/${project.id}/backlog`) && response.request().method() === "POST");
      await backlogForm.getByRole("button", { name: "Speichern" }).click();
      const backlog = (await (await backlogResponsePromise).json()) as { id: number; status: string };
      createdIds.backlog = backlog.id;
      expect(backlog.status).toBe("active");
    } finally {
      if (createdIds.backlog) {
        await request.delete(`${apiBaseUrl}/backlog/${createdIds.backlog}`);
      }
      if (createdIds.useCase) {
        await request.delete(`${apiBaseUrl}/use-cases/${createdIds.useCase}`);
      }
      await deleteFeature(request, createdIds.feature);
      await deleteMilestone(request, createdIds.milestone);
      await deleteProject(request, createdIds.project);
      await deleteTicket(request, createdIds.ticket);
      await deleteTask(request, createdIds.task);
      await restoreCatalogEntries(request, removedEntries);
    }
  });
});
