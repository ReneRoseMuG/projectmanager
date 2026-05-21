import { test, expect } from "@playwright/test";
import { authenticatedGoto } from "./domain-test-utils";

test.describe("Settings preferences", () => {
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
});
