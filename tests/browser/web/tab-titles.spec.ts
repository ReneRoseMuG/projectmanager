import { expect, test } from "./fixtures";
import {
  authenticatedGoto,
  createBacklogItem,
  createFeature,
  createMilestone,
  createProject,
  createTask,
  createTicket,
  createUseCase,
  deleteFeature,
  deleteMilestone,
  deleteProject,
  deleteTask,
  deleteTicket,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Detail-Pages setzen den Browser-Tab-Titel im Format „[Shortcode] Name | Projekt Manager".
 * - Jeder Objekttyp hat einen eigenen Shortcode: [Pro.], [Mei.], [Auf.], [Tkt.], [Feat.], [UC], [Bl.].
 *
 * Fehlerfälle:
 * - Fehlendes oder falsches Shortcode-Präfix wird als Regression erkannt.
 *
 * Ziel:
 * Die Tab-Beschriftung für alle sieben Objekttypen mit realem Browser und API absichern.
 */

const APP_TITLE = "Projekt Manager";

test("Ticket-Detailseite zeigt [Tkt.] Präfix im Tab-Titel", async ({ page, request }) => {
  const ticket = await createTicket(request, null, "E2E Tab Titel Ticket");
  try {
    await authenticatedGoto(page, `/tickets/${ticket.id}`);
    await expect(page).toHaveTitle(`[Tkt.] ${ticket.title} | ${APP_TITLE}`);
  } finally {
    await deleteTicket(request, ticket.id);
  }
});

test("Aufgaben-Detailseite zeigt [Auf.] Präfix im Tab-Titel", async ({ page, request }) => {
  const project = await createProject(request, "E2E Tab Titel Auf Proj");
  const task = await createTask(request, { type: "project", id: project.id }, "E2E Tab Titel Aufgabe");
  try {
    await authenticatedGoto(page, `/tasks/${task.id}`);
    await expect(page).toHaveTitle(`[Auf.] ${task.title} | ${APP_TITLE}`);
  } finally {
    await deleteTask(request, task.id);
    await deleteProject(request, project.id);
  }
});

test("Meilenstein-Detailseite zeigt [Mei.] Präfix im Tab-Titel", async ({ page, request }) => {
  const project = await createProject(request, "E2E Tab Titel Mei Proj");
  const milestone = await createMilestone(request, project.id, "E2E Tab Titel Meilenstein");
  try {
    await authenticatedGoto(page, `/milestones/${milestone.id}`);
    await expect(page).toHaveTitle(`[Mei.] ${milestone.name} | ${APP_TITLE}`);
  } finally {
    await deleteMilestone(request, milestone.id);
    await deleteProject(request, project.id);
  }
});

test("Projekt-Detailseite zeigt [Pro.] Präfix im Tab-Titel", async ({ page, request }) => {
  const project = await createProject(request, "E2E Tab Titel Projekt");
  try {
    await authenticatedGoto(page, `/projects/${project.id}`);
    await expect(page).toHaveTitle(`[Pro.] ${project.name} | ${APP_TITLE}`);
  } finally {
    await deleteProject(request, project.id);
  }
});

test("Feature-Detailseite zeigt [Feat.] Präfix im Tab-Titel", async ({ page, request }) => {
  const feature = await createFeature(request, "E2E Tab Titel Feature");
  try {
    await authenticatedGoto(page, `/features/${feature.id}`);
    await expect(page).toHaveTitle(`[Feat.] ${feature.title} | ${APP_TITLE}`);
  } finally {
    await deleteFeature(request, feature.id);
  }
});

test("Use-Case-Detailseite zeigt [UC] Präfix im Tab-Titel", async ({ page, request }) => {
  const feature = await createFeature(request, "E2E Tab Titel UC Feature");
  const useCase = await createUseCase(request, feature.id, "E2E Tab Titel Use Case");
  try {
    await authenticatedGoto(page, `/use-cases/${useCase.id}`);
    await expect(page).toHaveTitle(`[UC] ${useCase.title} | ${APP_TITLE}`);
  } finally {
    await deleteFeature(request, feature.id);
  }
});

test("Backlog-Item-Detailseite zeigt [Bl.] Präfix im Tab-Titel", async ({ page, request }) => {
  const project = await createProject(request, "E2E Tab Titel Bl Proj");
  const item = await createBacklogItem(request, project.id, "E2E Tab Titel Backlog Item");
  try {
    await authenticatedGoto(page, `/backlog/${item.id}`);
    await expect(page).toHaveTitle(`[Bl.] ${item.title} | ${APP_TITLE}`);
  } finally {
    await deleteProject(request, project.id);
  }
});
