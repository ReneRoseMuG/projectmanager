/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Externe API-Schreibvorgänge aktualisieren offene Browserseiten per Realtime-Sync.
 * - Standalone-Listen zeigen keinen manuellen Refresh-Button mehr.
 *
 * Fehlerfälle:
 * - Ohne funktionierende SSE-Invalidierung bleibt die Projektliste nach externem Write veraltet.
 *
 * Ziel:
 * Den nutzerseitigen Realtime-Abnahmefluss im Browser absichern.
 */

import { test, expect } from "@playwright/test";
import { authenticatedGoto, createProject, deleteProject, itemCard } from "./domain-test-utils";

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

  test("zeigt in Standalone-Listen keinen manuellen Refresh-Button", async ({ page }) => {
    await authenticatedGoto(page, "/projects?standalone=1");

    await expect(page.getByRole("button", { name: "Aktualisieren" })).toHaveCount(0);
  });
});
