/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Reine Gruppierungs- und Fehlerklassifikationslogik ohne Datenbank oder Dateisystem.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; die Funktionen erhalten vollständig kontrollierte Eingaben.
 *
 * Isolation:
 * - Keine externe Ressource und kein geteilter Zustand.
 *
 * Abgedeckte Regeln:
 * - Nur identische SHA-256-Hashes erzeugen Duplikatgruppen.
 * - Einzeldateien und gleiche Namen mit unterschiedlichem Inhalt werden nicht gruppiert.
 * - Gruppen und Dokumente werden stabil nach ID sortiert.
 *
 * Fehlerfälle:
 * - ENOENT wird als fehlend, andere Dateifehler werden als nicht lesbar klassifiziert.
 *
 * Ziel:
 * Deterministische Diagnosegruppen ohne dateinamenbasierte Fehlalarme.
 */

import type { DocumentDuplicateCheckDocument } from "@taskmanager/shared-types";
import { describe, expect, it } from "vitest";
import {
  classifyDuplicateCheckFileError,
  groupDuplicateCandidates
} from "../../../apps/api/src/services/document-duplicate-check.service.js";

function document(id: number, originalName: string): DocumentDuplicateCheckDocument {
  return {
    id,
    originalName,
    displayName: null,
    size: 4,
    createdAt: "2026-07-19T12:00:00.000Z",
    folder: null,
    owners: []
  };
}

describe("document duplicate check", () => {
  it("gruppiert nur gleiche Inhalts-Hashes und sortiert das Ergebnis stabil", () => {
    const groups = groupDuplicateCandidates([
      { hash: "hash-b", document: document(8, "gleich.txt") },
      { hash: "hash-a", document: document(4, "anders.txt") },
      { hash: "hash-b", document: document(3, "anderer-name.txt") },
      { hash: "hash-c", document: document(2, "gleich.txt") },
      { hash: "hash-a", document: document(1, "noch-anders.txt") }
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.hash)).toEqual(["hash-a", "hash-b"]);
    expect(groups[0]?.documents.map((item) => item.id)).toEqual([1, 4]);
    expect(groups[1]?.documents.map((item) => item.id)).toEqual([3, 8]);
  });

  it("klassifiziert fehlende Dateien getrennt von anderen Lesefehlern", () => {
    expect(classifyDuplicateCheckFileError(Object.assign(new Error("missing"), { code: "ENOENT" }))).toBe("missing");
    expect(classifyDuplicateCheckFileError(Object.assign(new Error("denied"), { code: "EACCES" }))).toBe("unreadable");
  });
});
