import { expect, test, type Page } from "./fixtures";
import {
  authenticatedGoto,
  createFeature,
  createMilestone,
  createProject,
  createTask,
  createTicket,
  deleteFeature,
  deleteProject,
  itemCard,
} from "./domain-test-utils";

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Browser/E2E (Playwright)
 *
 * Realitätsgrad:
 * - Echter Chromium, echte Vite-App, echte API + MySQL-Test-DB aus der worker-isolierten
 *   Instanz (worker-fixtures), echte Admin-Session, echte über die API angelegte Daten.
 *   Keine gestubbten Hooks/Clients.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Worker-eigene DB/Server/Session; angelegte Daten werden im finally wieder entfernt.
 *
 * Abgedeckte Regeln:
 * - Die Listen-/Board-Routen /projects, /milestones, /features rendern nach dem progressiven
 *   Umbau ohne Crash: die Error-Boundary ("Etwas ist im Interface abgestürzt.") erscheint NICHT,
 *   die erste echte Karte ist sichtbar, und es tritt kein ungefangener Laufzeitfehler auf.
 *
 * Fehlerfälle / reproduziertes Problem:
 * - `TypeError: … .filter is not a function` beim Render der Statuszähler-/Board-useMemos.
 *   Solange der Bug lebt, ist dieser Test ROT und liefert den echten Stacktrace als Diagnose;
 *   nach dem Fix ist er GRÜN und dient als Regressionsnetz.
 *
 * Ziel:
 * Reproduziert den akuten Listen-Crash im Browser und sichert das crashfreie Rendern ab.
 */

const CRASH_HEADING = "Etwas ist im Interface abgestürzt.";
const CRASH_BADGE = "Crash abgefangen";

// Wartet, bis entweder die echte Karte ODER die Error-Boundary erscheint, und schlägt mit
// dem im Dev-Build sichtbaren Stacktrace fehl, wenn es die Error-Boundary ist — statt mit
// einem nichtssagenden Timeout auf die Karte.
async function expectListRendersWithoutCrash(
  page: Page,
  itemTitle: string,
  pageErrors: Error[],
) {
  const crashBanner = page.getByText(CRASH_HEADING);
  const card = itemCard(page, itemTitle);

  await expect(crashBanner.or(card).first()).toBeVisible({ timeout: 20_000 });

  if (await crashBanner.isVisible()) {
    const stack = await page
      .locator("pre")
      .first()
      .innerText()
      .catch(() => "(kein Stacktrace im DOM — Prod-Build?)");
    const runtimeErrors = pageErrors.map((error) => error.stack ?? error.message).join("\n---\n");
    throw new Error(
      `Error-Boundary ("${CRASH_BADGE}") gerendert — Listen-Crash reproduziert.\n\n` +
        `DOM-Stacktrace:\n${stack}\n\n` +
        `pageerror(s):\n${runtimeErrors || "(keine)"}`,
    );
  }

  await expect(card).toBeVisible();
  expect(
    pageErrors,
    `Ungefangene Laufzeitfehler:\n${pageErrors.map((e) => e.stack ?? e.message).join("\n---\n")}`,
  ).toHaveLength(0);
}

function collectPageErrors(page: Page): Error[] {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  return pageErrors;
}

test.describe("Progressive Listen-/Board-Routen rendern ohne Crash", () => {
  test("/projects rendert die Liste ohne Error-Boundary", async ({ page, request }) => {
    const project = await createProject(request, "E2E Crash Repro Projekt");
    const pageErrors = collectPageErrors(page);
    try {
      await authenticatedGoto(page, "/projects");
      await expectListRendersWithoutCrash(page, project.name, pageErrors);
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("/milestones rendert die Liste ohne Error-Boundary", async ({ page, request }) => {
    const project = await createProject(request, "E2E Crash Repro MS-Projekt");
    const milestone = await createMilestone(request, project.id, "E2E Crash Repro Meilenstein");
    const pageErrors = collectPageErrors(page);
    try {
      await authenticatedGoto(page, "/milestones");
      await expectListRendersWithoutCrash(page, milestone.name, pageErrors);
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("/features rendert die Liste ohne Error-Boundary", async ({ page, request }) => {
    const feature = await createFeature(request, "E2E Crash Repro Feature");
    const pageErrors = collectPageErrors(page);
    try {
      await authenticatedGoto(page, "/features");
      await expectListRendersWithoutCrash(page, feature.title, pageErrors);
    } finally {
      await deleteFeature(request, feature.id);
    }
  });

  // /tickets crashte nicht, lud aber vor dem Fix LEER: dieselbe Cache-Kollision überschrieb den
  // InfiniteQuery-Cache mit einem Array, sodass useProgressiveList keine Items sammelte. Dass die
  // Karte sichtbar ist, beweist die zweite Symptomseite der behobenen Kollision.
  test("/tickets rendert die globale Liste und zeigt Einträge (nicht leer)", async ({ page, request }) => {
    const project = await createProject(request, "E2E Crash Repro TKT-Projekt");
    const ticket = await createTicket(request, { type: "project", id: project.id }, "E2E Crash Repro Ticket");
    const pageErrors = collectPageErrors(page);
    try {
      await authenticatedGoto(page, "/tickets");
      await expectListRendersWithoutCrash(page, ticket.title, pageErrors);
    } finally {
      await deleteProject(request, project.id);
    }
  });

  test("/tasks rendert die globale Board-Liste und zeigt Einträge (nicht leer)", async ({ page, request }) => {
    const project = await createProject(request, "E2E Crash Repro Task-Projekt");
    const task = await createTask(request, { type: "project", id: project.id }, "E2E Crash Repro Aufgabe");
    const pageErrors = collectPageErrors(page);
    try {
      await authenticatedGoto(page, "/tasks");
      await expectListRendersWithoutCrash(page, task.title, pageErrors);
    } finally {
      await deleteProject(request, project.id);
    }
  });
});
