/**
 * Test Scope:
 * Rich-Text-Surface-CSS für Inline-Formatierung im HTML-Editor.
 *
 * Test-Ebene:
 * Unit / CSS-Contract.
 *
 * Realitätsgrad:
 * Liest die echte CSS-Quelldatei und prüft die konkrete Regelstruktur.
 *
 * Mock-Entscheidung:
 * Keine Mocks; Browser-Cascade wird hier nicht simuliert.
 *
 * Isolation:
 * Read-only Zugriff auf apps/web/src/styles.css.
 *
 * Abgedeckte Regeln:
 * Inline-strong bleibt als Inline-Mark formatiert; Absätze werden nicht wegen
 * eines einzelnen strong-Elements blockweit fett dargestellt.
 *
 * Fehlerfaelle:
 * Die alte p:has(> strong:only-child)-Regel darf nicht zurückkehren.
 *
 * Ziel:
 * Die langfristige Regression verhindern, dass Bold auf einer Auswahl optisch
 * den gesamten Absatz fett erscheinen lässt.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("rich text surface CSS", () => {
  it("formatiert strong inline statt den umgebenden Absatz blockweit fett zu setzen", () => {
    expect(styles).toMatch(/\.rich-text-surface\s+strong\s*{[^}]*font-weight:\s*700;[^}]*}/);
    expect(styles).not.toContain(".rich-text-surface p:has(> strong:only-child)");
  });
});
