/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Markdown-Inhalte werden ausschließlich über den ContentService geschrieben, gelesen, gelöscht und umbenannt.
 * - Fehlende Dateien beim Lesen oder Löschen werden kontrolliert behandelt.
 * - Content-Pfade bleiben innerhalb des konfigurierten Basisverzeichnisses.
 *
 * Fehlerfälle:
 * - readContent auf fehlende Datei liefert leeren String.
 * - deleteContent auf fehlende Datei wirft keinen Fehler.
 *
 * Ziel:
 * Absicherung der Dateisystem-Abstraktion für Features, Use Cases und Wiki-Seiten.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildFilename,
  deleteContent,
  readContent,
  renameContent,
  resolveContentPath,
  setContentBaseDir,
  writeContent
} from "../../../../apps/api/src/services/content.service.js";

describe("ContentService", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "content-test-"));
    setContentBaseDir(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writeContent erstellt Datei mit korrektem Inhalt", () => {
    const filePath = resolveContentPath("features", "feature-1-test.md");

    writeContent(filePath, "# Test");

    expect(fs.readFileSync(filePath, "utf8")).toBe("# Test");
  });

  it("readContent liest Datei korrekt", () => {
    const filePath = resolveContentPath("features", "feature-1-test.md");
    fs.writeFileSync(filePath, "# Gelesen", "utf8");

    expect(readContent(filePath)).toBe("# Gelesen");
  });

  it("readContent gibt leeren String zurück wenn Datei nicht existiert", () => {
    const filePath = path.join(tmpDir, "missing.md");

    expect(readContent(filePath)).toBe("");
  });

  it("deleteContent entfernt Datei", () => {
    const filePath = resolveContentPath("features", "feature-1-test.md");
    fs.writeFileSync(filePath, "# Löschen", "utf8");

    deleteContent(filePath);

    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("deleteContent wirft keinen Fehler wenn Datei fehlt", () => {
    expect(() => deleteContent(path.join(tmpDir, "missing.md"))).not.toThrow();
  });

  it("renameContent benennt Datei um und gibt neuen Pfad zurück", () => {
    const oldPath = resolveContentPath("features", "feature-1-alt.md");
    const newPath = resolveContentPath("features", "feature-1-neu.md");
    fs.writeFileSync(oldPath, "# Inhalt", "utf8");

    const result = renameContent(oldPath, newPath);

    expect(result).toBe(newPath);
    expect(fs.existsSync(oldPath)).toBe(false);
    expect(fs.readFileSync(newPath, "utf8")).toBe("# Inhalt");
  });

  it("buildFilename generiert korrekten Dateinamen", () => {
    expect(buildFilename("feature", 42, "ft-01-projektanlage")).toBe("feature-42-ft-01-projektanlage.md");
  });

  it("writeContent erstellt Verzeichnisse automatisch", () => {
    const filePath = path.join(tmpDir, "wiki", "einfuehrung", "installation.md");

    writeContent(filePath, "# Installation");

    expect(fs.readFileSync(filePath, "utf8")).toBe("# Installation");
  });

  it("resolveContentPath verhindert Pfade außerhalb des Content-Verzeichnisses", () => {
    expect(() => resolveContentPath("wiki", "../escape.md")).toThrow("Content path must stay inside");
  });
});
