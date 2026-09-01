/**
 * Test Scope:
 * Windows-Shell-Adapter zur Erzeugung echter Thumbnail-PNGs.
 *
 * Test-Ebene:
 * - Integration (Betriebssystemprozess und echtes Dateisystem).
 *
 * Realitätsgrad:
 * - Ruft Windows PowerShell, SHCreateItemFromParsingName und IShellItemImageFactory tatsächlich auf.
 * - Verwendet eine echte PNG-Datei als Format mit vorhandenem Windows-Thumbnail-Handler.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; Prozess-, COM- und Dateisystemgrenzen sind Teil des zu beweisenden Verhaltens.
 *
 * Isolation:
 * - Eigener temporärer Ordner unter dem Betriebssystem-Temp-Verzeichnis, nach der Suite gelöscht.
 *
 * Abgedeckte Regeln:
 * - Der Shell-Adapter liefert ausschließlich ein tatsächliches PNG als Erfolg zurück.
 * - Eine nicht vorhandene Quelle erzeugt keine Cache-Datei und wird als erwarteter Fehlschlag gemeldet.
 *
 * Fehlerfälle:
 * - Fehlende Quelldatei beziehungsweise fehlender Shell-Thumbnail-Handler.
 *
 * Ziel:
 * Beweisen, dass die verwendete Windows-Shell-Schnittstelle in der lokalen Windows-Laufzeit ein
 * Thumbnail erzeugt. Ein echter `.af`-Datensatz bleibt für die Affinity-spezifische Abnahme nötig.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { extractWindowsShellThumbnail } from "../../../apps/api/src/services/windows-shell-thumbnail.service.js";

const sourcePng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

let temporaryRoot: string;

beforeAll(async () => {
  temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "taskmanager-shell-thumbnail-test-"),
  );
});

afterAll(async () => {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
});

describe("extractWindowsShellThumbnail", () => {
  it("erzeugt über den echten Windows-Handler eine PNG-Datei", async () => {
    const sourcePath = path.join(temporaryRoot, "source.png");
    const targetPath = path.join(temporaryRoot, "thumbnail.png");
    await fs.writeFile(sourcePath, sourcePng);

    const created = await extractWindowsShellThumbnail({
      sourcePath,
      targetPath,
      width: 64,
      height: 64,
      timeoutMs: 10_000,
    });

    expect(created).toBe(true);
    const thumbnail = await fs.readFile(targetPath);
    expect(thumbnail.subarray(0, pngSignature.length)).toEqual(pngSignature);
    expect(thumbnail.length).toBeGreaterThan(pngSignature.length);
  });

  it("hinterlässt bei fehlender Quelle keine Zieldatei", async () => {
    const targetPath = path.join(temporaryRoot, "missing-thumbnail.png");

    const created = await extractWindowsShellThumbnail({
      sourcePath: path.join(temporaryRoot, "missing.af"),
      targetPath,
      width: 64,
      height: 64,
      timeoutMs: 10_000,
    });

    expect(created).toBe(false);
    await expect(fs.stat(targetPath)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
