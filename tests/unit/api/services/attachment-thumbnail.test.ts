/**
 * Test Scope:
 * Kachel-Vorschaubild (Thumbnail) — Eignung eines Dateityps, Cache-Dateiname, LibreOffice-Filter.
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitaetsgrad:
 * - Echte, seiteneffektfreie Funktionen aus attachment-preview.service. Kein Prozess, keine DB,
 *   kein Dateisystem.
 *
 * Mock-Entscheidung:
 * - Keine Mocks noetig.
 *
 * Isolation:
 * - Keine (reine Funktionen).
 *
 * Abgedeckte Regeln:
 * - Ein Vorschaubild gibt es fuer PDF (direkt) sowie Office- und ODF-Dokumente (ueber die PDF-Fassung).
 * - Die Endung entscheidet auch dann, wenn der Mimetype nichtssagend ist (Browser liefern oft
 *   application/octet-stream).
 * - Der Cache-Dateiname traegt dasselbe Praefix `attachment-<id>-` wie die PDF-Vorschau, damit
 *   removeAttachmentPreviews beide Dateien beim Loeschen des Dokuments mit aufraeumt.
 * - Der LibreOffice-Aufruf gibt die Zielgroesse ueber FilterOptions vor (deshalb keine Bildbibliothek).
 *
 * Fehlerfaelle:
 * - Text, Bild, Video, Audio und Archiv bekommen KEIN Vorschaubild (Gegenbeispiele).
 * - Zwei Dokumente mit gleicher Id, aber unterschiedlicher Ablagedatei, kollidieren nicht.
 *
 * Ziel:
 * Absichern, dass genau die vorschaufaehigen Typen ein Bild anfordern und der Cache sauber
 * aufgeraeumt werden kann.
 */
import { describe, expect, it } from "vitest";
import {
  supportsThumbnail,
  thumbnailFilename,
  thumbnailFilterArgument
} from "../../../../apps/api/src/services/attachment-preview.service.js";

function source(originalName: string, mimetype: string) {
  return { originalName, mimetype, filename: "stored-1.bin" };
}

describe("supportsThumbnail", () => {
  it("erlaubt ein Vorschaubild fuer PDF, Office und ODF", () => {
    expect(supportsThumbnail(source("rechnung.pdf", "application/pdf"))).toBe(true);
    expect(supportsThumbnail(source("bericht.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))).toBe(true);
    expect(supportsThumbnail(source("notiz.odt", "application/vnd.oasis.opendocument.text"))).toBe(true);
    expect(supportsThumbnail(source("zahlen.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))).toBe(true);
    expect(supportsThumbnail(source("folien.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"))).toBe(true);
    expect(supportsThumbnail(source("alt.doc", "application/msword"))).toBe(true);
    expect(supportsThumbnail(source("text.rtf", "application/rtf"))).toBe(true);
  });

  it("entscheidet nach der Endung, wenn der Mimetype nichtssagend ist", () => {
    // Browser liefern beim Upload haeufig application/octet-stream.
    expect(supportsThumbnail(source("rechnung.pdf", "application/octet-stream"))).toBe(true);
    expect(supportsThumbnail(source("notiz.odp", "application/octet-stream"))).toBe(true);
  });

  it("verweigert ein Vorschaubild fuer Typen ohne Seitenlayout", () => {
    expect(supportsThumbnail(source("notiz.txt", "text/plain"))).toBe(false);
    expect(supportsThumbnail(source("foto.png", "image/png"))).toBe(false);
    expect(supportsThumbnail(source("film.mp4", "video/mp4"))).toBe(false);
    expect(supportsThumbnail(source("ton.mp3", "audio/mpeg"))).toBe(false);
    expect(supportsThumbnail(source("backup.zip", "application/zip"))).toBe(false);
    expect(supportsThumbnail(source("tabelle.csv", "text/csv"))).toBe(false);
  });
});

describe("thumbnailFilename", () => {
  it("traegt das Aufraeum-Praefix der Vorschau und die PNG-Endung", () => {
    const name = thumbnailFilename({ id: 42, filename: "abc.pdf" });
    // removeAttachmentPreviews loescht alles mit diesem Praefix.
    expect(name.startsWith("attachment-42-")).toBe(true);
    expect(name.endsWith("-thumb.png")).toBe(true);
  });

  it("ist stabil und unterscheidet verschiedene Ablagedateien", () => {
    const first = thumbnailFilename({ id: 7, filename: "a.pdf" });
    expect(thumbnailFilename({ id: 7, filename: "a.pdf" })).toBe(first);
    expect(thumbnailFilename({ id: 7, filename: "b.pdf" })).not.toBe(first);
  });
});

describe("thumbnailFilterArgument", () => {
  it("gibt LibreOffice die Zielgroesse vor, statt sie nachtraeglich zu skalieren", () => {
    expect(thumbnailFilterArgument(400, 566)).toBe(
      'png:draw_png_Export:{"PixelWidth":{"type":"long","value":400},"PixelHeight":{"type":"long","value":566}}'
    );
  });
});
