import type { Paginated } from "@taskmanager/shared-types";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toQueryError } from "../queries/queryErrors";

export interface ProgressiveListOptions {
  // Blockgröße je Abruf. Klein genug, dass ein Abruf nie den Pool belastet.
  pageSize?: number;
  // Pause zwischen den sequenziellen Abrufen — gibt dem Browser Zeit zum Rendern.
  delayMs?: number;
  enabled?: boolean;
}

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_DELAY_MS = 200;

/**
 * Progressives, sequenzielles Nachladen einer paginierten Quelle statt Seitenzahl-Blättern.
 *
 * Der erste Block wird sofort geladen; danach lädt der Hook die weiteren Blöcke EINEN NACH
 * DEM ANDEREN automatisch nach (nächster Abruf erst, wenn der vorige fertig ist) und hängt
 * sie an, bis alle Datensätze geladen sind. Weil immer nur ein Abruf gleichzeitig läuft,
 * wird der DB-Pool nie geflutet; die kleine Pause hält die UI flüssig.
 *
 * `fetchPage(page, pageSize)` muss `Paginated<T>` liefern (data/total/page/pageSize).
 */
export function useProgressiveList<T>(
  queryKey: readonly unknown[],
  fetchPage: (page: number, pageSize: number) => Promise<Paginated<T>>,
  options: ProgressiveListOptions = {}
) {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;

  // Diskriminierender Marker: useInfiniteQuery legt im Cache ein { pages, pageParams }-Objekt ab,
  // ein gleichnamiger useQuery (Alt-Pfad, z. B. useFeatures/useProjects/useMilestones für die
  // Status-Chip-Counts) ein nacktes Array. Teilen sich beide denselben queryKey, überschreibt der
  // InfiniteQuery den Array-Eintrag mit seinem Objekt — der Alt-Pfad liest dann ein Objekt und
  // crasht beim clientseitigen `.filter(...)` (der Listen-Crash nach dem Skalierungs-Umbau).
  // Der Marker hält die beiden Cache-Einträge getrennt; weil er ein SUFFIX ist, bleibt der
  // Prefix-basierte Invalidierungspfad (queryKeys.<domain>.root/.list) unverändert wirksam.
  const infiniteQueryKey = [...queryKey, "__progressiveList"] as const;

  const query = useInfiniteQuery({
    queryKey: infiniteQueryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // Defensive: nur weiterblättern, wenn eine gültige paginierte Antwort vorliegt.
      // Liefert das Backend (z. B. ein Alt-Endpunkt) ein nacktes Array statt Paginated,
      // fehlen page/pageSize/total — dann NICHT weiterblättern (kein Endlos-Loop, kein NaN).
      if (
        !lastPage ||
        typeof lastPage.page !== "number" ||
        typeof lastPage.pageSize !== "number" ||
        typeof lastPage.total !== "number"
      ) {
        return undefined;
      }
      const loaded = lastPage.page * lastPage.pageSize;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const loadedPages = query.data?.pages.length ?? 0;

  // Sequenzielles Auto-Nachladen: sobald der aktuelle Block da ist und noch weitere
  // existieren, nach kurzer Pause den nächsten anfordern. Der Cleanup bricht bei
  // Filterwechsel/Unmount ab.
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }
    const timer = setTimeout(() => {
      void fetchNextPage();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [hasNextPage, isFetchingNextPage, loadedPages, delayMs, fetchNextPage]);

  // Defensive: nur echte Datensätze aufsammeln. Fehlt `page.data` (Alt-Endpunkt liefert
  // nacktes Array statt Paginated), wird die Seite als leer behandelt statt `undefined`
  // in die Liste zu schleusen (das würde beim Rendern crashen).
  const items = (query.data?.pages ?? []).flatMap((page) => (Array.isArray(page?.data) ? page.data : [])) as T[];
  const firstPage = query.data?.pages[0];
  const total = firstPage && typeof firstPage.total === "number" ? firstPage.total : items.length;

  return {
    items,
    total,
    loadedCount: items.length,
    // Erster Block lädt noch (nichts anzeigbar).
    loading: query.isLoading,
    // Weitere Blöcke werden im Hintergrund nachgeladen.
    loadingMore: isFetchingNextPage,
    // Alle Datensätze sind geladen.
    isComplete: !hasNextPage && !query.isLoading,
    error: toQueryError(query.error)
  };
}
