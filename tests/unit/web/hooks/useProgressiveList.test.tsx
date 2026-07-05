/**
 * Test Scope:
 *
 * Test-Ebene:
 * - Unit (Hook useProgressiveList mit echtem QueryClient, gemockter fetchPage-Funktion)
 *
 * Realitätsgrad:
 * - Echte Hook-Logik + echter TanStack InfiniteQuery. Die fetchPage-Callback (Netzwerkgrenze)
 *   ist als vi.fn gemockt — zulässiger Unit-Mock eines externen Seiteneffekts.
 *
 * Mock-Entscheidung:
 * - Gemockt: fetchPage (liefert kontrollierte Paginated- bzw. bewusst fehlerhafte Antworten).
 *   Nicht gemockt: useInfiniteQuery/Akkumulations-/getNextPageParam-Logik (Prüfgegenstand).
 *
 * Isolation:
 * - Frischer QueryClient je Test; jsdom.
 *
 * Abgedeckte Regeln:
 * - Sequenzielle Akkumulation: der Hook lädt Block für Block nach und hängt die Datensätze an,
 *   bis `total` erreicht ist; `items`/`total`/`isComplete` sind konsistent.
 * - Defensive gegen Nicht-Paginated-Antworten: liefert der (Alt-)Endpunkt ein nacktes Array
 *   statt Paginated, wird die Seite als leer behandelt (kein Crash, kein `undefined` in items)
 *   und es wird NICHT endlos weitergeblättert (getNextPageParam stoppt ohne page/pageSize/total).
 *
 * Fehlerfälle:
 * - Eine Nicht-Paginated-Antwort darf weder crashen noch eine Endlosschleife auslösen.
 *
 * Ziel:
 * Sichert das Herzstück des progressiven Nachladens (Akkumulation + Robustheit) isoliert ab.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Paginated } from "@taskmanager/shared-types";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useProgressiveList } from "../../../../apps/web/src/hooks/useProgressiveList";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

interface Row {
  id: number;
}

describe("useProgressiveList", () => {
  it("akkumuliert paginierte Blöcke sequenziell bis total erreicht ist", async () => {
    const all: Row[] = Array.from({ length: 5 }, (_, index) => ({ id: index + 1 }));
    const fetchPage = vi.fn(
      async (page: number, pageSize: number): Promise<Paginated<Row>> => ({
        data: all.slice((page - 1) * pageSize, page * pageSize),
        total: all.length,
        page,
        pageSize,
      }),
    );

    const { result } = renderHook(
      () => useProgressiveList<Row>(["test", "accumulate"], fetchPage, { pageSize: 2, delayMs: 0 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isComplete).toBe(true));

    expect(result.current.items).toHaveLength(5);
    expect(result.current.items.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
    expect(result.current.total).toBe(5);
    expect(result.current.loadedCount).toBe(5);
    // 5 Einträge / pageSize 2 = 3 Blöcke, sequenziell geladen.
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("behandelt eine Nicht-Paginated-Antwort (nacktes Array) defensiv: kein Crash, keine Endlosschleife", async () => {
    // Simuliert einen Alt-Endpunkt, der versehentlich ein nacktes Array statt Paginated liefert.
    const fetchPage = vi.fn(async () => [{ id: 1 }, { id: 2 }] as unknown as Paginated<Row>);

    const { result } = renderHook(
      () => useProgressiveList<Row>(["test", "defensive"], fetchPage, { pageSize: 2, delayMs: 0 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Die Nicht-Paginated-Seite wird als leer behandelt statt undefined durchzureichen.
    expect(result.current.items).toEqual([]);
    // page/pageSize/total fehlen -> getNextPageParam stoppt -> genau ein Abruf, kein Endlos-Loop.
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
