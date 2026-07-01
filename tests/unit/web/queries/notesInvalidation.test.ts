/**
 * Test Scope:
 * Notes query invalidation
 *
 * Test-Ebene:
 * - Unit mit echtem TanStack QueryClient.
 *
 * Realitätsgrad:
 * - Echte Query-Keys und echte Invalidierungsfunktionen, keine API- oder DOM-Zugriffe.
 *
 * Mock-Entscheidung:
 * - Keine Mocks; der Test prüft reine Cache-Invalidierung.
 *
 * Isolation:
 * - Frischer QueryClient pro Test, keine DB- oder Dateisystemzugriffe.
 *
 * Abgedeckte Regeln:
 * - Die globale Notizenliste hat einen stabilen Query-Key.
 * - Owner- und Detail-Invalidierungen markieren die globale Notizenliste als stale.
 *
 * Fehlerfälle:
 * - Die neue Hauptansicht darf nach Note-Erstellung, -Update oder -Löschung nicht mit altem Cache stehen bleiben.
 *
 * Ziel:
 * Den Cache-Vertrag der neuen Notizen-Hauptansicht absichern.
 */
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { invalidateNoteDetail, invalidateNotes } from "../../../../apps/web/src/queries/invalidation";
import { queryKeys } from "../../../../apps/web/src/queries/queryKeys";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });
}

describe("Notes query invalidation", () => {
  it("definiert einen stabilen globalen Notes-List-Key", () => {
    expect(queryKeys.notes.list()).toEqual(["notes", "list"]);
  });

  it("invalidiert die globale Notes-Liste bei Owner- und Detailänderungen", async () => {
    const queryClient = createQueryClient();
    const listKey = queryKeys.notes.list();

    queryClient.setQueryData(listKey, []);
    await invalidateNotes(queryClient, "project", 1);
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);

    queryClient.clear();
    queryClient.setQueryData(listKey, []);
    await invalidateNoteDetail(queryClient, 2);
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
  });
});
