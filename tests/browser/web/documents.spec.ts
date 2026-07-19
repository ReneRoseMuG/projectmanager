import { Buffer } from "node:buffer";
import { expect, test } from "./fixtures";
import {
  authenticatedGoto,
  apiBaseUrl,
  safeFilename,
  uniqueTitle,
} from "./domain-test-utils";

/**
 * Test Scope:
 * MS-80 / TASK-503 und TASK-505: DMS-Hauptnavigation, Filter, Karten/Details und rollenabhängige Bedienung.
 *
 * Test-Ebene:
 * - Browser/E2E
 *
 * Realitätsgrad:
 * - Echte Web-App, echte API, reale Authentifizierung sowie echte Sammlungs-, Tag- und Attachment-Daten.
 *
 * Mock-Entscheidung:
 * - Keine Fachmocks; Testdaten werden über die öffentlichen API-Verträge angelegt und entfernt.
 *
 * Isolation:
 * - Eindeutige Namen pro Lauf; vollständiger Cleanup in finally.
 *
 * Abgedeckte Regeln:
 * - Eine Elternsammlung zeigt das Dokument einer Untersammlung und erklärt die Unterbaum-Semantik.
 * - Mehrere Tags sind in der Hauptnavigation kombinierbar, einzeln entfernbar und URL-stabil.
 * - Reload sowie Browser-Zurück stellen Auswahl und Treffer wieder her.
 * - Karten zeigen höchstens drei Tags und lösen weitere Namen zugänglich auf.
 * - Karte öffnet die Detailansicht; schmale Ansichten behalten Sammlung, Tags, Suche und Typfilter.
 * - Eine Custom Role mit attachments:read kann Dokumente lesen, aber keine schreibenden oder löschenden Aktionen bedienen.
 *
 * Fehlerfälle:
 * - Kategorien dürfen in Navigation, Filter und Karte nicht mehr erscheinen.
 *
 * Ziel:
 * Den freigegebenen DMS-Kernweg aus Benutzersicht vollständig absichern.
 */

test("DMS kombiniert Sammlung und Tags URL-stabil und öffnet die Dokumentdetails", async ({ page, request }) => {
  const suffix = safeFilename(uniqueTitle("dms browser"));
  const filename = `${suffix}.txt`;
  const tagNames = Array.from({ length: 5 }, (_, index) => uniqueTitle(`DMS Filter ${index + 1}`));
  const tagIds: number[] = [];
  let parentFolder: { id: number; version: number } | null = null;
  let childFolder: { id: number; version: number } | null = null;
  let attachment: { id: number; version: number } | null = null;

  try {
    const parentResponse = await request.post(`${apiBaseUrl}/attachment-folders`, { data: { name: uniqueTitle("DMS Sauna") } });
    expect(parentResponse.ok()).toBeTruthy();
    parentFolder = await parentResponse.json() as { id: number; version: number };
    const childResponse = await request.post(`${apiBaseUrl}/attachment-folders`, {
      data: { name: uniqueTitle("DMS Oval Sauna"), parentId: parentFolder.id },
    });
    expect(childResponse.ok()).toBeTruthy();
    childFolder = await childResponse.json() as { id: number; version: number };

    for (const name of tagNames) {
      const tagResponse = await request.post(`${apiBaseUrl}/tags`, { data: { name, domain: "dms", color: "#64748b" } });
      expect(tagResponse.ok()).toBeTruthy();
      tagIds.push(((await tagResponse.json()) as { id: number }).id);
    }

    const uploadResponse = await request.post(`${apiBaseUrl}/documents`, {
      multipart: {
        file: { name: filename, mimeType: "text/plain", buffer: Buffer.from("DMS browser acceptance") },
      },
    });
    expect(uploadResponse.ok()).toBeTruthy();
    attachment = await uploadResponse.json() as { id: number; version: number };

    const folderResponse = await request.put(`${apiBaseUrl}/documents/${attachment.id}/folder`, {
      data: { folderId: childFolder.id, expectedVersion: attachment.version },
    });
    expect(folderResponse.ok()).toBeTruthy();
    attachment = await folderResponse.json() as { id: number; version: number };
    const tagResponse = await request.put(`${apiBaseUrl}/documents/${attachment.id}/tags`, { data: { tagIds, expectedVersion: attachment.version } });
    expect(tagResponse.ok()).toBeTruthy();
    attachment = await tagResponse.json() as { id: number; version: number };

    const initialPath = `/documents?folder=${parentFolder.id}&tags=${tagIds[0]},${tagIds[1]}&q=${encodeURIComponent(suffix)}`;
    await authenticatedGoto(page, initialPath);
    await expect(page.getByText(suffix, { exact: true })).toBeVisible();
    await expect(page.getByText("Die Auswahl enthält auch Dokumente aus allen Untersammlungen.")).toBeVisible();
    await expect(page.getByLabel("2 weitere Tags: " + tagNames.slice(3).join(", "))).toBeVisible();
    await expect(page.getByText("Kategorien", { exact: true })).toHaveCount(0);

    const secondTagButton = page.getByRole("button", { name: new RegExp(`Dokumente mit Tag ${tagNames[1]}`) });
    await expect(secondTagButton).toHaveAttribute("aria-pressed", "true");
    await secondTagButton.click();
    await expect(page).toHaveURL(new RegExp(`tags=${tagIds[0]}(?:&|$)`));
    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.get("tags")).toBe(`${tagIds[0]},${tagIds[1]}`);
    await expect(page.getByRole("button", { name: new RegExp(`Dokumente mit Tag ${tagNames[1]}`) })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.getByText(suffix, { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText("Sammlungen", { exact: true })).toBeVisible();
    await expect(page.getByText("Tags", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Dokumente durchsuchen…")).toBeVisible();
    await expect(page.getByRole("combobox")).toBeVisible();

    await page.getByText(suffix, { exact: true }).click();
    await expect(page.getByText(`Originaldatei: ${filename}`)).toBeVisible();
  } finally {
    if (attachment) {
      await request.delete(`${apiBaseUrl}/attachments/${attachment.id}?expectedVersion=${attachment.version}`);
    }
    for (const tagId of tagIds) {
      await request.delete(`${apiBaseUrl}/tags/${tagId}`);
    }
    if (childFolder) {
      await request.delete(`${apiBaseUrl}/attachment-folders/${childFolder.id}?expectedVersion=${childFolder.version}`);
    }
    if (parentFolder) {
      await request.delete(`${apiBaseUrl}/attachment-folders/${parentFolder.id}?expectedVersion=${parentFolder.version}`);
    }
  }
});

test("DMS-Leser sieht Dokumente, aber keine Scan-, Schreib- oder Löschaktionen", async ({ page, request }) => {
  const suffix = safeFilename(uniqueTitle("dms reader"));
  const email = `${suffix}@example.test`;
  let role: { id: number } | null = null;
  let user: { id: number } | null = null;
  let attachment: { id: number; version: number } | null = null;

  try {
    const roleResponse = await request.post(`${apiBaseUrl}/admin/roles`, {
      data: {
        key: suffix.replace(/-/g, "_"),
        label: uniqueTitle("DMS Leser"),
        permissions: [{ resource: "attachments", action: "read" }],
      },
    });
    expect(roleResponse.ok()).toBeTruthy();
    role = await roleResponse.json() as { id: number };

    const userResponse = await request.post(`${apiBaseUrl}/admin/users`, {
      data: {
        firstName: "DMS",
        lastName: "Leser",
        email,
        roleId: role.id,
        password: "password123",
      },
    });
    expect(userResponse.ok()).toBeTruthy();
    user = await userResponse.json() as { id: number };

    const uploadResponse = await request.post(`${apiBaseUrl}/documents`, {
      multipart: {
        file: { name: `${suffix}.txt`, mimeType: "text/plain", buffer: Buffer.from("DMS reader acceptance") },
      },
    });
    expect(uploadResponse.ok()).toBeTruthy();
    attachment = await uploadResponse.json() as { id: number; version: number };

    await page.getByRole("button", { name: "Abmelden" }).click();
    const loginResponse = await page.request.post(`${apiBaseUrl}/auth/login`, {
      data: { email, password: "password123" },
    });
    expect(loginResponse.ok()).toBeTruthy();

    await page.goto(`/documents?q=${encodeURIComponent(suffix)}`);
    await expect(page.getByRole("heading", { name: "Dokumente" })).toBeVisible();
    await expect(page.getByText(suffix, { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Neue Sammlung…")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Duplikate suchen" })).toHaveCount(0);
    await expect(page.getByLabel("Aus der Dokumentenbibliothek entfernen")).toHaveCount(0);
    await expect(page.getByTitle("Endgültig löschen")).toHaveCount(0);
    await expect(page.getByTitle("Herunterladen")).toBeVisible();
  } finally {
    if (user) {
      await request.delete(`${apiBaseUrl}/admin/users/${user.id}`);
    }
    if (attachment) {
      await request.delete(`${apiBaseUrl}/attachments/${attachment.id}?expectedVersion=${attachment.version}`);
    }
    if (role) {
      await request.delete(`${apiBaseUrl}/admin/roles/${role.id}`);
    }
  }
});
