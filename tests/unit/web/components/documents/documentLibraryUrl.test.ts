/**
 * Test Scope:
 * DMS-Filterzustand in der URL (MS-80 / TASK-502).
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Echte URLSearchParams ohne Router-, DOM- oder Netzwerk-Mock.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; Parsing und Aktualisierung sind reine Funktionen.
 *
 * Isolation:
 * - Neue URLSearchParams je Test.
 *
 * Abgedeckte Regeln:
 * - Sammlung, mehrere Tags, Typ und Suche sind serialisierbar und nach Reload reproduzierbar.
 * - Einzelne Filter können entfernt werden, ohne andere Filter zu verlieren.
 * - Ungültige numerische Werte werden nicht als aktive Filter übernommen.
 *
 * Fehlerfälle:
 * - Ungültige Sammlung und Tags fallen kontrolliert auf den neutralen Zustand zurück.
 *
 * Ziel:
 * Geteilte URLs sowie Browser-Vor-/Zurück-Navigation erhalten einen stabilen Filterzustand.
 */

import { describe, expect, it } from "vitest";
import {
  parseDocumentLibraryUrl,
  updateDocumentLibraryUrl
} from "../../../../../apps/web/src/components/documents/documentLibraryUrl";

describe("documentLibraryUrl", () => {
  it("stellt eine kombinierte Filter-URL nach Reload vollständig wieder her", () => {
    const params = new URLSearchParams("folder=7&tags=3,2,3&type=image%2F&q=sauna");
    expect(parseDocumentLibraryUrl(new URLSearchParams(params.toString()))).toEqual({
      folderScope: 7,
      tagFilters: [3, 2],
      typeFilter: "image/",
      search: "sauna"
    });
  });

  it("entfernt einen Filter einzeln und bewahrt alle übrigen Parameter", () => {
    const current = new URLSearchParams("folder=unsorted&tags=2,5&type=text%2F&q=plan");
    const next = updateDocumentLibraryUrl(current, "tags", null);
    expect(next.get("tags")).toBeNull();
    expect(parseDocumentLibraryUrl(next)).toMatchObject({
      folderScope: "unsorted",
      typeFilter: "text/",
      search: "plan"
    });
    expect(current.get("tags")).toBe("2,5");
  });

  it("ignoriert ungültige numerische URL-Werte", () => {
    expect(parseDocumentLibraryUrl(new URLSearchParams("folder=-1&tags=2,x,-4"))).toMatchObject({
      folderScope: "all",
      tagFilters: [2]
    });
  });
});
