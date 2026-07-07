/**
 * Test Scope:
 * Kachelgröße der Dokumente-Grid-Ansicht (documentThumbnailSize, MS-75).
 *
 * Abgedeckte Regeln:
 * - Ohne gespeicherten Wert gilt die Standardgröße M.
 * - Die gewählte Größe wird gespeichert und wieder geladen (Roundtrip).
 * - Die Mindest-Spaltenbreite steigt von S über M nach L.
 *
 * Fehlerfälle:
 * - Ein ungültiger gespeicherter Wert fällt auf die Standardgröße zurück.
 *
 * Ziel:
 * Absichern, dass die persistente Kachelgröße robust geladen wird und die Grid-Spaltenbreite steuert.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  loadThumbnailSize,
  saveThumbnailSize,
  thumbnailMinPx,
} from "../../../../../apps/web/src/components/attachments/documentThumbnailSize";

afterEach(() => {
  localStorage.clear();
});

describe("documentThumbnailSize", () => {
  it("liefert ohne gespeicherten Wert die Standardgröße M", () => {
    expect(loadThumbnailSize()).toBe("m");
  });

  it("speichert und lädt die gewählte Größe (Roundtrip)", () => {
    saveThumbnailSize("l");
    expect(loadThumbnailSize()).toBe("l");
  });

  it("fällt bei ungültigem gespeicherten Wert auf M zurück", () => {
    localStorage.setItem("ui.documents.thumbnailSize", "xl");
    expect(loadThumbnailSize()).toBe("m");
  });

  it("liefert aufsteigende Mindestbreiten für S < M < L", () => {
    expect(thumbnailMinPx("s")).toBeLessThan(thumbnailMinPx("m"));
    expect(thumbnailMinPx("m")).toBeLessThan(thumbnailMinPx("l"));
  });
});
