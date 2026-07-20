/**
 * Test Scope:
 * DMS-Sammlungshierarchie: flache Baumdarstellung und Nachfahrenbestimmung (MS-80 / TASK-500).
 *
 * Test-Ebene:
 * - Unit
 *
 * Realitätsgrad:
 * - Reine Frontend-Logik mit realistischen Sammlungsdatensätzen, ohne DOM oder Netzwerk.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; die Funktionen sind deterministisch und ohne Seiteneffekte.
 *
 * Isolation:
 * - In-Memory-Testdaten pro Test.
 *
 * Abgedeckte Regeln:
 * - Beliebig tiefe Sammlungen werden in Eltern-vor-Kind-Reihenfolge mit Pfad dargestellt.
 * - Nachfahren werden rekursiv und ohne Selbstbezug oder Duplikate geliefert.
 *
 * Fehlerfälle:
 * - Verwaiste Parents bleiben als Wurzel sichtbar; zyklische Restdaten führen nicht zu Endlosschleifen.
 *
 * Ziel:
 * Die Navigation und die Parent-Auswahl erhalten eine stabile, vollständige Baumreihenfolge.
 */

import type { AttachmentFolder } from "@taskmanager/shared-types";
import { describe, expect, it } from "vitest";
import {
  documentFolderDescendantIds,
  flattenDocumentFolders
} from "../../../../../apps/web/src/components/documents/documentFolderTree";

function folder(id: number, name: string, parentId: number | null): AttachmentFolder {
  return { id, name, parentId, projectId: null, childCount: 0, directDocumentCount: 0, version: 1 };
}

describe("documentFolderTree", () => {
  it("ordnet drei Ebenen und erzeugt verständliche Pfade", () => {
    const result = flattenDocumentFolders([
      folder(3, "Details", 2),
      folder(1, "Sauna", null),
      folder(2, "Oval Sauna", 1),
      folder(4, "Außenbereich", null)
    ]);

    expect(result.map((item) => [item.folder.id, item.depth, item.path])).toEqual([
      [4, 0, "Außenbereich"],
      [1, 0, "Sauna"],
      [2, 1, "Sauna / Oval Sauna"],
      [3, 2, "Sauna / Oval Sauna / Details"]
    ]);
  });

  it("liefert alle Nachfahren ohne die gewählte Sammlung selbst", () => {
    const folders = [folder(1, "Sauna", null), folder(2, "Oval", 1), folder(3, "Details", 2)];
    expect([...documentFolderDescendantIds(folders, 1)]).toEqual([2, 3]);
  });

  it("bleibt bei verwaisten oder zyklischen Restdaten vollständig und endlich", () => {
    const result = flattenDocumentFolders([
      folder(1, "Verwaist", 999),
      folder(2, "Zyklus A", 3),
      folder(3, "Zyklus B", 2)
    ]);
    expect(result.map((item) => item.folder.id).sort()).toEqual([1, 2, 3]);
  });
});
