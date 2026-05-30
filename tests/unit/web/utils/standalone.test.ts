/**
 * Test Scope:
 * Standalone-Routen-Hilfsfunktionen
 *
 * Abgedeckte Regeln:
 * - Standalone-Routen erhalten den Query-Parameter standalone=1.
 * - Bestehende Query-Parameter und Hash-Fragmente bleiben erhalten.
 *
 * Fehlerfälle:
 * - Ein vorhandener standalone-Wert wird überschrieben.
 *
 * Ziel:
 * Die zentrale Tab-URL-Erzeugung gegen Regressionsfehler absichern.
 */
import { describe, expect, it } from "vitest";
import { isStandaloneSearch, withStandaloneView } from "../../../../apps/web/src/utils/standalone";

describe("standalone route helpers", () => {
  it("ergänzt standalone=1 an einfache Routen", () => {
    expect(withStandaloneView("/tickets")).toBe("/tickets?standalone=1");
  });

  it("erhält vorhandene Query-Parameter und Hash-Fragmente", () => {
    expect(withStandaloneView("/tasks?projectId=7#board")).toBe("/tasks?projectId=7&standalone=1#board");
  });

  it("überschreibt vorhandene standalone-Werte", () => {
    expect(withStandaloneView("/projects?standalone=0&projectId=4")).toBe("/projects?standalone=1&projectId=4");
  });

  it("erkennt ausschließlich standalone=1 als Standalone-Ansicht", () => {
    expect(isStandaloneSearch("?standalone=1")).toBe(true);
    expect(isStandaloneSearch("?standalone=0")).toBe(false);
  });
});
