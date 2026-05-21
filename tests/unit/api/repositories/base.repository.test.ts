/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Versionen werden vor Updates geprüft.
 * - Veraltete Versionen erzeugen einen dedizierten Konfliktfehler.
 *
 * Fehlerfälle:
 * - Abweichende erwartete Version wirft `VersionConflictError`.
 *
 * Ziel:
 * Die Repository-Basis für Optimistic Locking isoliert absichern.
 */
import { describe, expect, it } from "vitest";
import { assertVersion, VersionConflictError } from "../../../../apps/api/src/repositories/base.repository.js";

describe("base repository version guard", () => {
  it("akzeptiert identische Versionen", () => {
    expect(() => assertVersion(2, 2)).not.toThrow();
  });

  it("wirft VersionConflictError bei abweichender Version", () => {
    expect(() => assertVersion(3, 2)).toThrow(VersionConflictError);

    try {
      assertVersion(3, 2);
    } catch (error) {
      expect(error).toBeInstanceOf(VersionConflictError);
      expect((error as VersionConflictError).expected).toBe(2);
      expect((error as VersionConflictError).actual).toBe(3);
    }
  });
});
