/**
 * Test Scope:
 * Drag-&-Drop-Auflösung der Dokumentenbibliothek (Ablageziel, Drag-Nutzlast).
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte, reine Funktionen ohne DOM, ohne dnd-kit.
 *
 * Mock-Entscheidung:
 * - Keine Mocks nötig; die Funktionen sind seiteneffektfrei.
 *
 * Isolation:
 * - Keine (reine Funktionen).
 *
 * Abgedeckte Regeln:
 * - Sammlungs- und Kategorieziele werden anhand ihres Präfixes unterschieden.
 * - „Alle Dokumente"/„Nicht einsortiert" und ein Drop ins Leere ergeben kein Ziel.
 * - Wird eine markierte Kachel gezogen, wandert die gesamte Auswahl mit; eine unmarkierte allein.
 * - Die Drag-Nutzlast wird defensiv gelesen (keine Fremd-IDs, kein Absturz bei Unsinn).
 *
 * Fehlerfälle:
 * - Unbekanntes Präfix, Nicht-String-ID, ungültige/negative Zahl, fehlende oder falsch getypte Nutzlast.
 *
 * Ziel:
 * Absichern, dass ein Drop nur dann eine Schreiboperation auslöst, wenn er ein echtes Ziel trifft,
 * und dass genau die beabsichtigten Dokumente betroffen sind.
 */
import { describe, expect, it } from "vitest";
import {
  categoryDropId,
  dragDocumentIds,
  dragIdsFromData,
  folderDropId,
  parseDropTarget,
} from "../../../../../apps/web/src/components/attachments/documentDnd";

describe("parseDropTarget", () => {
  it("erkennt eine Sammlung an ihrer Drop-ID", () => {
    expect(parseDropTarget(folderDropId(7))).toEqual({ kind: "folder", id: 7 });
  });

  it("erkennt eine Kategorie an ihrer Drop-ID", () => {
    expect(parseDropTarget(categoryDropId(42))).toEqual({
      kind: "category",
      id: 42,
    });
  });

  it("liefert kein Ziel für Filterzeilen, leere Drops und Unsinn", () => {
    // „Alle Dokumente"/„Nicht einsortiert" sind keine Ablageziele und tragen keine Drop-ID.
    expect(parseDropTarget(undefined)).toBeNull();
    expect(parseDropTarget(null)).toBeNull();
    expect(parseDropTarget(123)).toBeNull();
    expect(parseDropTarget("dms-doc-3")).toBeNull();
    expect(parseDropTarget("alle-dokumente")).toBeNull();
  });

  it("weist ungültige IDs im Präfix ab", () => {
    expect(parseDropTarget("dms-folder-abc")).toBeNull();
    expect(parseDropTarget("dms-folder-0")).toBeNull();
    expect(parseDropTarget("dms-category--5")).toBeNull();
  });
});

describe("dragDocumentIds", () => {
  it("zieht die gesamte Auswahl, wenn die gezogene Kachel markiert ist", () => {
    const selected = new Set([1, 2, 3]);
    expect(dragDocumentIds(2, selected).sort()).toEqual([1, 2, 3]);
  });

  it("zieht nur die eine Kachel, wenn sie nicht markiert ist", () => {
    const selected = new Set([1, 2, 3]);
    expect(dragDocumentIds(9, selected)).toEqual([9]);
  });

  it("zieht die einzelne Kachel, wenn gar nichts markiert ist", () => {
    expect(dragDocumentIds(5, new Set())).toEqual([5]);
  });
});

describe("dragIdsFromData", () => {
  it("liest die Dokument-IDs aus der Nutzlast", () => {
    expect(dragIdsFromData({ ids: [4, 5] })).toEqual([4, 5]);
  });

  it("verwirft Nicht-Zahlen und fehlerhafte Nutzlasten", () => {
    expect(dragIdsFromData({ ids: [1, "zwei", null, 3] })).toEqual([1, 3]);
    expect(dragIdsFromData({ ids: "keine liste" })).toEqual([]);
    expect(dragIdsFromData({})).toEqual([]);
    expect(dragIdsFromData(undefined)).toEqual([]);
    expect(dragIdsFromData("unsinn")).toEqual([]);
  });
});
