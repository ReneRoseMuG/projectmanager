/**
 * Test Scope:
 * Parent-Dateiansicht, globales DMS und lokale Windows-Ordner als getrennte Browser-Workflows.
 *
 * Test-Ebene:
 * - Browser/E2E
 *
 * Realitätsgrad:
 * - Echter Chromium-Browser, echte Web-App, echte Fastify-Routen, isolierte MySQL-DB und echtes Temp-Dateisystem.
 *
 * Mock-Entscheidung:
 * - Keine Mocks oder gestubbten Hooks; alle Daten entstehen über UI beziehungsweise echte API-Aufrufe.
 *
 * Isolation:
 * - Worker-eigene Testdatenbank/API/Web-Server sowie eindeutiger Betriebssystem-Temp-Root.
 *
 * Abgedeckte Regeln:
 * - Parent-Uploads erscheinen nur am Parent und niemals automatisch im globalen DMS.
 * - Root-/Unterordner der Parent-Dateiansicht erzeugen keine DMS-Sammlungen.
 * - DMS-Dokumente werden ohne Kopie verknüpft, parentlokal verschoben und relationserhaltend entkoppelt.
 * - Lokale Ordner bleiben navigierbare Quellen und werden beim Lösen nicht verändert.
 * - documents:read steuert Navigation, Route und DMS-Picker unabhängig von attachments-Rechten.
 *
 * Fehlerfälle:
 * - Ohne documents:read sind DMS-Navigation, DMS-Route und Picker gesperrt, Parent-Uploads bleiben erlaubt.
 *
 * Ziel:
 * Die vom Nutzer beobachtbare Trennung aller drei Dateiarten in einem realen Browser nachweisen.
 */

import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test, type Page } from "./fixtures";
import {
  apiBaseUrl,
  authenticatedGoto,
  createProject,
  deleteProject,
  formPage,
  safeFilename,
  uniqueTitle
} from "./domain-test-utils";

async function openProjectFiles(page: Page, projectId: number) {
  await authenticatedGoto(page, `/projects/${projectId}`);
  const form = formPage(page, "Projekt bearbeiten");
  await expect(form).toBeVisible();
  await form.getByRole("button", { name: /^Dateien(?:\s+\d+)?$/ }).click();
  await expect(form.getByText(/ausschließlich als Anhänge dieses Elements/)).toBeVisible();
  return form;
}

test("Parent-Anhang, Parent-Ordner und DMS-Link bleiben fachlich getrennt", async ({ page, request }) => {
  const project = await createProject(request, "E2E Parent Dateien");
  const parentFileName = `${safeFilename(uniqueTitle("parent upload"))}.txt`;
  const documentLabel = safeFilename(uniqueTitle("dms linked"));
  const documentFileName = `${documentLabel}.txt`;
  const rootName = uniqueTitle("Parent Root");
  const childName = uniqueTitle("Parent Unterordner");
  const collectionName = uniqueTitle("Bestehende DMS Sammlung");
  let document: { id: number; version: number } | null = null;
  let collection: { id: number; version: number } | null = null;

  try {
    const collectionResponse = await request.post(`${apiBaseUrl}/attachment-folders`, {
      data: { name: collectionName }
    });
    expect(collectionResponse.ok()).toBeTruthy();
    collection = await collectionResponse.json() as { id: number; version: number };

    const documentResponse = await request.post(`${apiBaseUrl}/documents`, {
      multipart: {
        file: {
          name: documentFileName,
          mimeType: "text/plain",
          buffer: Buffer.from("Verknüpftes DMS-Dokument")
        }
      }
    });
    expect(documentResponse.ok()).toBeTruthy();
    document = await documentResponse.json() as { id: number; version: number };

    const form = await openProjectFiles(page, project.id);
    const uploadResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/projects/${project.id}/attachments`) && response.request().method() === "POST"
    );
    await form.locator('input[type="file"]').setInputFiles({
      name: parentFileName,
      mimeType: "text/plain",
      buffer: Buffer.from("Exklusiver Parent-Anhang")
    });
    expect((await uploadResponse).ok()).toBeTruthy();
    await expect(form.getByText(parentFileName, { exact: true })).toBeVisible();

    const documentsAfterUpload = await request.get(`${apiBaseUrl}/documents?q=${encodeURIComponent(parentFileName)}`);
    expect(documentsAfterUpload.ok()).toBeTruthy();
    expect(await documentsAfterUpload.json()).toEqual([]);

    await form.getByRole("button", { name: "Virtuellen Ordner anlegen" }).click();
    await form.getByLabel("Name des virtuellen Ordners").fill(rootName);
    await form.getByRole("button", { name: "Anlegen" }).click();
    await expect(form.getByLabel("Ablage")).toHaveValue(/folder:/);

    await form.getByRole("button", { name: "Virtuellen Ordner anlegen" }).click();
    await form.getByLabel("Name des virtuellen Ordners").fill(childName);
    await form.getByRole("button", { name: "Anlegen" }).click();

    const collectionsAfterParentFolders = await request.get(`${apiBaseUrl}/attachment-folders`);
    expect(collectionsAfterParentFolders.ok()).toBeTruthy();
    const collections = await collectionsAfterParentFolders.json() as Array<{ id: number; name: string }>;
    expect(collections).toEqual([expect.objectContaining({ id: collection.id, name: collectionName })]);

    await form.getByLabel("Ablage").selectOption({ label: "Alle Parent-Dateien" });
    await form.getByRole("checkbox", { name: `${parentFileName} auswählen` }).check();
    await form.getByLabel("In Ordner verschieben").selectOption({ label: `${rootName} / ${childName}` });
    await form.getByLabel("Ablage").selectOption({ label: `${rootName} / ${childName}` });
    await expect(form.getByText(parentFileName, { exact: true })).toBeVisible();

    await form.getByLabel("Ablage").selectOption({ label: "Alle Parent-Dateien" });
    await form.getByRole("button", { name: "DMS-Dokument verknüpfen" }).click();
    await form.getByLabel("DMS-Dokument suchen").fill(documentLabel);
    await form.getByRole("button", { name: "Verknüpfen" }).click();
    await expect(form.getByText(documentFileName, { exact: true })).toBeVisible();
    await expect(form.getByText("DMS", { exact: true })).toBeVisible();

    await form.getByRole("button", { name: "Liste" }).click();
    await form.getByLabel(`${documentFileName} in Parent-Ordner verschieben`).selectOption({
      label: `${rootName} / ${childName}`
    });
    await form.getByLabel("Ablage").selectOption({ label: `${rootName} / ${childName}` });
    await expect(form.getByText(documentFileName, { exact: true })).toBeVisible();

    await form.getByRole("button", { name: `${documentFileName} Verknüpfung lösen` }).click();
    const unlinkDialog = page.getByRole("alertdialog");
    await expect(unlinkDialog).toContainText("Sammlungen und Tags bleiben im Dokumentenmanagement bestehen");
    await unlinkDialog.getByRole("button", { name: "Verknüpfung lösen" }).click();
    await expect(form.getByText(documentFileName, { exact: true })).toHaveCount(0);

    const linksAfterUnlink = await request.get(`${apiBaseUrl}/projects/${project.id}/document-links`);
    expect(await linksAfterUnlink.json()).toEqual([]);
    const survivingContent = await request.get(`${apiBaseUrl}/documents/${document.id}/content`);
    expect(survivingContent.ok()).toBeTruthy();
    expect(await survivingContent.text()).toBe("Verknüpftes DMS-Dokument");

    await authenticatedGoto(page, `/documents?q=${encodeURIComponent(documentLabel)}`);
    await expect(page.getByRole("heading", { name: "Dokumente" })).toBeVisible();
    await expect(page.getByText(documentLabel, { exact: true })).toBeVisible();
  } finally {
    await deleteProject(request, project.id);
    if (document) {
      await request.delete(`${apiBaseUrl}/documents/${document.id}?expectedVersion=${document.version}`);
    }
    if (collection) {
      await request.delete(`${apiBaseUrl}/attachment-folders/${collection.id}?expectedVersion=${collection.version}`);
    }
  }
});

test("lokaler Windows-Ordner bleibt beim Lösen unverändert", async ({ page, request }) => {
  const project = await createProject(request, "E2E Lokaler Parent Ordner");
  const localRoot = await fs.mkdtemp(path.join(os.tmpdir(), "taskmanager-e2e-parent-local-"));
  const localName = "lokal-e2e.txt";
  const localContent = "Lokaler E2E-Inhalt";
  await fs.mkdir(path.join(localRoot, "Unterordner"));
  await fs.writeFile(path.join(localRoot, localName), localContent, "utf8");
  await fs.writeFile(path.join(localRoot, "Unterordner", "unterordner.txt"), "Unterordner", "utf8");

  try {
    const form = await openProjectFiles(page, project.id);
    await form.getByRole("button", { name: "Pfad eingeben" }).click();
    await form.getByLabel("Lokaler Windows-Ordnerpfad").fill(localRoot);
    await form.getByRole("button", { name: "Verknüpfen", exact: true }).click();
    await form.getByLabel("Ablage").selectOption({ label: `Festplatte · ${path.basename(localRoot)}` });
    await expect(form.getByText(localName, { exact: true })).toBeVisible();
    await expect(form.getByText("Unterordner", { exact: true })).toBeVisible();

    await form.getByRole("button", { name: "Ordner-Verknüpfung lösen" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("sämtliche Dateien auf der Festplatte bleiben unverändert");
    await dialog.getByRole("button", { name: "Ordner-Verknüpfung lösen" }).click();

    expect(await fs.readFile(path.join(localRoot, localName), "utf8")).toBe(localContent);
    expect(await fs.readFile(path.join(localRoot, "Unterordner", "unterordner.txt"), "utf8")).toBe("Unterordner");
  } finally {
    await deleteProject(request, project.id);
    await fs.rm(localRoot, { recursive: true, force: true });
  }
});

test("attachments-Rechte allein geben weder DMS-Navigation noch Route oder Picker frei", async ({ page, request }) => {
  const project = await createProject(request, "E2E Attachment Rechte");
  const suffix = safeFilename(uniqueTitle("attachment only role"));
  const email = `${suffix}@example.test`;
  const uploadName = `${suffix}.txt`;
  let role: { id: number } | null = null;
  let user: { id: number } | null = null;

  try {
    const roleResponse = await request.post(`${apiBaseUrl}/admin/roles`, {
      data: {
        key: suffix.replace(/-/g, "_"),
        label: uniqueTitle("Attachment ohne DMS"),
        permissions: [
          { resource: "projects", action: "read" },
          { resource: "attachments", action: "read" },
          { resource: "attachments", action: "write" },
          { resource: "attachments", action: "delete" }
        ]
      }
    });
    expect(roleResponse.ok()).toBeTruthy();
    role = await roleResponse.json() as { id: number };

    const userResponse = await request.post(`${apiBaseUrl}/admin/users`, {
      data: {
        firstName: "Attachment",
        lastName: "Ohne DMS",
        email,
        roleId: role.id,
        password: "password123"
      }
    });
    expect(userResponse.ok()).toBeTruthy();
    user = await userResponse.json() as { id: number };

    await page.getByRole("button", { name: "Abmelden" }).click();
    const loginResponse = await page.request.post(`${apiBaseUrl}/auth/login`, {
      data: { email, password: "password123" }
    });
    expect(loginResponse.ok()).toBeTruthy();

    const form = await openProjectFiles(page, project.id);
    await expect(page.getByText("Dokumente", { exact: true })).toHaveCount(0);
    await expect(form.getByRole("button", { name: "DMS-Dokument verknüpfen" })).toHaveCount(0);

    const uploadResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/projects/${project.id}/attachments`) && response.request().method() === "POST"
    );
    await form.locator('input[type="file"]').setInputFiles({
      name: uploadName,
      mimeType: "text/plain",
      buffer: Buffer.from("Attachment ohne Dokumentrecht")
    });
    expect((await uploadResponse).ok()).toBeTruthy();
    await expect(form.getByText(uploadName, { exact: true })).toBeVisible();

    await authenticatedGoto(page, "/documents");
    await expect(page.getByText("403 · Route /documents", { exact: true })).toBeVisible();
  } finally {
    if (user) {
      await request.delete(`${apiBaseUrl}/admin/users/${user.id}`);
    }
    if (role) {
      await request.delete(`${apiBaseUrl}/admin/roles/${role.id}`);
    }
    await deleteProject(request, project.id);
  }
});
