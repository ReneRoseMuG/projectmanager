/**
 * Test Scope:
 * Startbreite des Dokument-Detail-Panels (initialDetailWidth, MS-75).
 *
 * Abgedeckte Regeln:
 * - Bilder öffnen auf der verfügbaren Maximalbreite (danach per Bild-Probe verfeinert).
 * - Typen MIT Vorschau (PDF, Text, Office, Video) öffnen auf der breiten Vorschaufläche.
 * - Typen OHNE Vorschau (Archiv/Zip, unbekannte Dateien) öffnen auf der Mindestbreite.
 *
 * Fehlerfälle:
 * - Bei sehr schmalem verfügbaren Platz wird nie unter die Mindestbreite geklemmt.
 *
 * Ziel:
 * Absichern, dass eine Zip (oder ein anderer nicht-anzeigbarer Typ) das Panel nicht auf die
 * volle Vorschaubreite aufreißt, obwohl es nichts anzuzeigen gibt.
 */
import { describe, expect, it } from "vitest";
import type { Attachment } from "@taskmanager/shared-types";
import {
  initialDetailWidth,
  MIN_DETAIL_WIDTH,
  NON_IMAGE_MAX_WIDTH,
} from "../../../../../apps/web/src/components/attachments/documentPreviewWidth";

function doc(overrides: Partial<Attachment>): Attachment {
  return {
    id: 1,
    owners: [],
    originalName: "datei.bin",
    displayName: null,
    description: null,
    filename: "stored.bin",
    mimetype: "application/octet-stream",
    size: 100,
    url: "/uploads/stored.bin",
    createdAt: "2026-07-07T08:00:00.000Z",
    updatedAt: "2026-07-07T08:00:00.000Z",
    version: 1,
    ...overrides,
  };
}

const WIDE_MAX = 1600;

describe("initialDetailWidth", () => {
  it("öffnet Bilder auf der verfügbaren Maximalbreite", () => {
    const image = doc({ originalName: "foto.png", mimetype: "image/png" });
    expect(initialDetailWidth(image, WIDE_MAX)).toBe(WIDE_MAX);
  });

  it("öffnet Typen mit Vorschau (PDF) auf der breiten Vorschaufläche", () => {
    const pdf = doc({ originalName: "bericht.pdf", mimetype: "application/pdf" });
    expect(initialDetailWidth(pdf, WIDE_MAX)).toBe(NON_IMAGE_MAX_WIDTH);
  });

  it("öffnet eine Zip auf der Mindestbreite statt der vollen Vorschaubreite", () => {
    const zip = doc({ originalName: "export.zip", mimetype: "application/zip" });
    expect(initialDetailWidth(zip, WIDE_MAX)).toBe(MIN_DETAIL_WIDTH);
  });

  it("öffnet unbekannte Dateitypen ohne Vorschau auf der Mindestbreite", () => {
    const unknown = doc({ originalName: "daten.bin", mimetype: "application/octet-stream" });
    expect(initialDetailWidth(unknown, WIDE_MAX)).toBe(MIN_DETAIL_WIDTH);
  });

  it("klemmt nie unter die Mindestbreite, auch bei sehr schmalem Platz", () => {
    const pdf = doc({ originalName: "bericht.pdf", mimetype: "application/pdf" });
    expect(initialDetailWidth(pdf, 120)).toBe(MIN_DETAIL_WIDTH);
  });
});
