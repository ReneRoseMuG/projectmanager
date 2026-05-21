import type { JournalListResponse, JournalObjectType } from "@taskmanager/shared-types";
import { useQuery } from "@tanstack/react-query";
import { getJournalEntries, getObjectJournalEntries, type JournalQueryParams } from "../api/journal";
import { queryKeys } from "../queries/queryKeys";
import { toQueryError } from "../queries/queryErrors";
import { useHasPermission } from "./usePermissions";

const emptyJournalResponse: JournalListResponse = {
  entries: [],
  nextCursor: null
};

export function useJournalEntries(filters: JournalQueryParams = {}) {
  const canReadJournal = useHasPermission("journal", "read");
  const query = useQuery({
    queryKey: queryKeys.journal.list(filters),
    queryFn: () => getJournalEntries(filters),
    enabled: canReadJournal
  });

  return {
    entries: query.data?.entries ?? [],
    nextCursor: query.data?.nextCursor ?? null,
    loading: query.isLoading,
    error: toQueryError(query.error),
    canReadJournal,
    reload: query.refetch
  };
}

export function useObjectJournalEntries(objectType: JournalObjectType, objectId: number | null | undefined, filters: JournalQueryParams = {}) {
  const canReadJournal = useHasPermission("journal", "read");
  const validObjectId = objectId !== undefined && objectId !== null && Number.isFinite(objectId) ? objectId : undefined;
  const query = useQuery({
    queryKey: queryKeys.journal.object(objectType, validObjectId ?? 0, filters),
    queryFn: () => getObjectJournalEntries(objectType, validObjectId as number, filters),
    enabled: canReadJournal && validObjectId !== undefined,
    placeholderData: emptyJournalResponse
  });

  return {
    entries: query.data?.entries ?? [],
    nextCursor: query.data?.nextCursor ?? null,
    loading: query.isLoading,
    error: toQueryError(query.error),
    canReadJournal,
    reload: query.refetch
  };
}
