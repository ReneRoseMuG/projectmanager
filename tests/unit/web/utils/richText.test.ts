// @vitest-environment jsdom

/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte Richtext-Utility-Funktionen mit DOMParser aus jsdom.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; API, Query und DB sind nicht beteiligt.
 *
 * Isolation:
 * - jsdom ohne DB- oder Dateisystemzugriff.
 *
 * Abgedeckte Regeln:
 * - HTML-Inhalte werden als lesbarer Textauszug ohne Tags dargestellt.
 * - Markdown-nahe App-Eingaben werden vor der Vorschau in HTML normalisiert.
 * - HTML-Entities werden dekodiert.
 *
 * Fehlerfälle:
 * - Rohe Tags oder Markdown-Marker dürfen in Vorschauen nicht sichtbar bleiben.
 *
 * Ziel:
 * Die zentrale Richtext-Normalisierung gegen Preview-Regressionen absichern.
 */
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { richTextToHtml, richTextToPreviewText } from "../../../../apps/web/src/utils/richText";

describe("richText utils", () => {
  it("erstellt Plaintext-Vorschau aus HTML ohne rohe Tags", () => {
    expect(richTextToPreviewText("<p><strong>Fett</strong> &amp; sauber</p>")).toBe("Fett & sauber");
  });

  it("normalisiert Markdown-nahe Eingaben zu HTML und Vorschau ohne Marker", () => {
    const html = richTextToHtml("## Titel\n\n**fett** und `code`\n\n- eins\n- zwei");

    expect(html).toContain("<h2>Titel</h2>");
    expect(html).toContain("<strong>fett</strong>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<ul><li>eins</li><li>zwei</li></ul>");
    expect(richTextToPreviewText("**fett** und `code`")).toBe("fett und code");
  });
});
