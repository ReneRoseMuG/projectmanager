/**
 * Test Scope:
 * - Wiki-Seitenbaum Anzeigezustand.
 *
 * Test-Ebene:
 * - Browser/E2E.
 *
 * Realitätsgrad:
 * - Echter Browser, echte API, echte isolierte E2E-Datenbank und echter USER-Setting-Write.
 *
 * Mock-Entscheidung:
 * - Keine Mocks.
 *
 * Isolation:
 * - Pro Playwright-Worker isolierte DB und Storage-Runtime.
 *
 * Abgedeckte Regeln:
 * - Eingeklappte Wiki-Seiten bleiben nach Reload sichtbar gleich.
 * - Derselbe Nutzer sieht den gespeicherten Tree-State auch in einer zweiten Browser-Session.
 *
 * Fehlerfälle:
 * - Der Tree darf nicht auf den Default-Zustand zurückfallen, sobald eine neue Session geöffnet wird.
 *
 * Ziel:
 * Den Büro-/Homeoffice-Fall für den benutzerbezogenen Wiki-Tree-State absichern.
 */
import { expect, type APIRequestContext } from "@playwright/test";
import { test } from "./fixtures";
import { apiBaseUrl, ensureApiAuth, uniqueTitle } from "./domain-test-utils";

interface WikiPageFixture {
  id: number;
  title: string;
  version: number;
}

async function createWikiPage(
  request: APIRequestContext,
  titlePrefix: string,
  input: Partial<{ parentId: number; sortOrder: number }> = {},
): Promise<WikiPageFixture> {
  await ensureApiAuth(request);
  const title = uniqueTitle(titlePrefix);
  const response = await request.post(`${apiBaseUrl}/wiki`, {
    data: {
      title,
      content: `<p>${title}</p>`,
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<WikiPageFixture>;
}

async function deleteWikiPage(request: APIRequestContext, pageId: number): Promise<void> {
  await ensureApiAuth(request);
  await request.delete(`${apiBaseUrl}/wiki/${pageId}`);
}

async function expectCollapsedPageSaved(request: APIRequestContext, pageId: number): Promise<void> {
  await ensureApiAuth(request);
  await expect.poll(async () => {
    const response = await request.get(`${apiBaseUrl}/settings/resolved`);
    const body = await response.json() as {
      settings: Array<{ key: string; resolvedValue: unknown }>;
    };
    const treeState = body.settings.find((setting) => setting.key === "wiki.treeState")?.resolvedValue as
      | { collapsedPageIds?: unknown }
      | undefined;
    return Array.isArray(treeState?.collapsedPageIds) && treeState.collapsedPageIds.includes(pageId);
  }).toBe(true);
}

test("persistiert eingeklappte Wiki-Seiten für denselben Nutzer über Sessions", async ({ page, request, browser, workerIsolation }) => {
  const root = await createWikiPage(request, "E2E Wiki Tree Root");
  const child = await createWikiPage(request, "E2E Wiki Tree Child", { parentId: root.id });

  try {
    await page.goto(`/wiki/${child.id}`);
    await expect(page.getByRole("link", { name: child.title })).toBeVisible();

    const rootRow = page.locator(".wiki-tree-nav-row").filter({ has: page.getByRole("link", { name: root.title }) });
    await rootRow.getByRole("button", { name: "Einklappen" }).click();
    await expect(page.getByRole("link", { name: child.title })).toHaveCount(0);
    await expectCollapsedPageSaved(request, root.id);

    await page.reload();
    await expect(page.getByRole("link", { name: root.title })).toBeVisible();
    await expect(page.getByRole("link", { name: child.title })).toHaveCount(0);

    const secondContext = await browser.newContext({
      baseURL: workerIsolation.servers.webBaseUrl,
      storageState: workerIsolation.authFile,
    });
    const secondPage = await secondContext.newPage();
    try {
      await secondPage.goto(`/wiki/${root.id}`);
      await expect(secondPage.getByRole("link", { name: root.title })).toBeVisible();
      await expect(secondPage.getByRole("link", { name: child.title })).toHaveCount(0);
    } finally {
      await secondContext.close();
    }
  } finally {
    await deleteWikiPage(request, child.id);
    await deleteWikiPage(request, root.id);
  }
});
