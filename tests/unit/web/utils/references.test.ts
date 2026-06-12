/**
 * Test Scope:
 *
 * Abgedeckte Regeln:
 * - Objekt-Referenzen verwenden die fest definierte Präfix-Konvention.
 *
 * Fehlerfälle:
 * - Falsche oder uneinheitliche Präfixe würden direkte MCP-Referenzen unauffindbar machen.
 *
 * Ziel:
 * Die zentrale Referenzlogik bleibt für alle unterstützten Domänenobjekte stabil.
 */
import { describe, expect, it } from "vitest";
import { objectReference } from "../../../../apps/web/src/lib/references";

describe("objectReference", () => {
  it.each([
    ["project", 1, "PROJ-1"],
    ["milestone", 2, "MS-2"],
    ["task", 10, "TASK-10"],
    ["ticket", 12, "TKT-12"],
    ["feature", 26, "FEAT-26"],
    ["useCase", 7, "UC-7"],
    ["note", 3, "NOTE-3"],
    ["wikiPage", 5, "WIKI-5"],
  ] as const)("erzeugt %s-Referenzen", (type, id, expected) => {
    expect(objectReference(type, id)).toBe(expected);
  });
});
