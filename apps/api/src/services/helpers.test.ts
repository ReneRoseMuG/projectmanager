import { describe, expect, it } from "vitest";
import { AppError } from "../utils/errors.js";
import { parseJsonObject, requireNonEmpty, stringifyJsonObject } from "./helpers.js";

/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - contentJson wird als JSON serialisiert und deserialisiert.
 * - Pflichtfelder werden als getrimmte Strings validiert.
 *
 * Fehlerfälle:
 * - Leere Pflichtfelder werfen BAD_REQUEST.
 *
 * Ziel:
 * Die gemeinsam genutzten Service-Hilfen bleiben unabhängig von SQLite stabil.
 */
describe("service helpers", () => {
  it("serializes and parses JSON objects", () => {
    const value = { type: "doc", content: [{ type: "paragraph" }] };

    expect(parseJsonObject(stringifyJsonObject(value))).toEqual(value);
  });

  it("trims required strings", () => {
    expect(requireNonEmpty("  Aufgabe  ", "title")).toBe("Aufgabe");
  });

  it("rejects empty required strings", () => {
    expect(() => requireNonEmpty("  ", "title")).toThrow(AppError);
  });
});
