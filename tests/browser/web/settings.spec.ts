import { test, expect, type APIRequestContext } from "@playwright/test";
import type { ResolvedSetting, SettingsResolvedResponse } from "@taskmanager/shared-types";
import { apiBaseUrl, authenticatedGoto, ensureApiAuth, expectToast } from "./domain-test-utils";

function settingByKey(settings: ResolvedSetting[], key: ResolvedSetting["key"]): ResolvedSetting {
  const setting = settings.find((entry) => entry.key === key);
  if (!setting) {
    throw new Error(`Setting ${key} not found`);
  }
  return setting;
}

async function resetToastPosition(request: APIRequestContext) {
  await ensureApiAuth(request);
  const response = await request.get(`${apiBaseUrl}/settings/resolved`);
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as SettingsResolvedResponse;
  const toastSetting = settingByKey(body.settings, "ui.toastPosition");
  const globalVersion = toastSetting.values.GLOBAL?.version;

  if (globalVersion !== undefined) {
    const resetResponse = await request.delete(`${apiBaseUrl}/settings/values`, {
      data: {
        key: "ui.toastPosition",
        scopeType: "GLOBAL",
        expectedVersion: globalVersion
      }
    });
    expect(resetResponse.ok()).toBeTruthy();
  }
}

test.describe("Settings preferences", () => {
  test.afterEach(async ({ request }) => {
    await resetToastPosition(request);
  });

  test("speichert persönliche Board-Präferenzen und lädt sie nach Reload wieder", async ({ page }) => {
    await authenticatedGoto(page, "/settings/preferences");
    await expect(page.getByRole("heading", { name: "Präferenzen" })).toBeVisible();

    const firstSelect = page.getByRole("combobox").first();
    await expect(firstSelect).toBeVisible();
    const currentValue = await firstSelect.inputValue();
    const nextValue = currentValue === "kanban" ? "list" : "kanban";

    await firstSelect.selectOption(nextValue);
    await page.getByRole("button", { name: "Speichern" }).first().click();
    await expect(page.getByText("Einstellung gespeichert")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Präferenzen" })).toBeVisible();
    await expect(page.getByRole("combobox").first()).toHaveValue(nextValue);
  });

  test("positioniert Toasts nach globaler Admin-Einstellung unten links", async ({ page, request }) => {
    await resetToastPosition(request);
    await authenticatedGoto(page, "/settings/preferences");
    await expect(page.getByRole("heading", { name: "Globale Defaults" })).toBeVisible();

    await page.getByRole("combobox").last().selectOption("bottom-left");
    await page.getByRole("button", { name: "Speichern" }).last().click();
    await expectToast(page, "Einstellung gespeichert");

    const toastRegion = page.locator('[role="status"][aria-live="polite"]');
    const box = await toastRegion.boundingBox();
    const viewport = page.viewportSize();

    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.x).toBeLessThan(80);
    expect(viewport!.height - (box!.y + box!.height)).toBeLessThan(80);
  });
});
