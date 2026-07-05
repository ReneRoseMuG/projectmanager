// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte Richtext-Export-Utility mit DOMParser, Blob-Erzeugung und ZIP/PDF-Serialisierung.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; API, Query, DB und Browser-Download sind nicht beteiligt.
 *
 * Isolation:
 * - jsdom ohne DB-, API- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - HTML-Inhalte werden als Markdown mit Seitentitel exportiert.
 * - DOCX-Export erzeugt einen echten OOXML-ZIP-Container.
 * - PDF-Export erzeugt einen PDF-Blob.
 *
 * Fehlerfälle:
 * - Format-Erzeugung darf nicht von Serverpfaden oder Wiki-Gesamtexport abhängen.
 *
 * Ziel:
 * Den clientseitigen Einzelseiten-Dateiexport gegen Regressionsfehler absichern.
 */
import { describe, expect, it } from "vitest";
import { createRichTextExportBlob, richTextHtmlToMarkdown } from "../../../../apps/web/src/utils/richTextExport";

describe("richTextExport", () => {
  it("wandelt HTML in Markdown mit Exporttitel um", () => {
    const markdown = richTextHtmlToMarkdown(
      '<h2>Abschnitt</h2><p><strong>Fett</strong> und <a href="/wiki/2">Link</a></p><ul><li>Eins</li></ul>',
      "Wiki Alpha",
    );

    expect(markdown).toContain("# Wiki Alpha");
    expect(markdown).toContain("## Abschnitt");
    expect(markdown).toContain("**Fett**");
    expect(markdown).toContain("[Link](/wiki/2)");
    expect(markdown).toContain("- Eins");
  });

  it("erzeugt einen DOCX-Blob als ZIP-Container", async () => {
    const blob = createRichTextExportBlob("<p>Inhalt</p>", "Wiki Alpha", "docx");
    const bytes = new Uint8Array(await blob.arrayBuffer());

    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it("erzeugt einen PDF-Blob mit PDF-Signatur", async () => {
    const blob = createRichTextExportBlob("<p>Inhalt</p>", "Wiki Alpha", "pdf");
    const text = await blob.text();

    expect(blob.type).toBe("application/pdf");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
  });
});
