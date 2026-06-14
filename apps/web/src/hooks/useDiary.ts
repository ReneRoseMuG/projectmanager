import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { getProjectDiary } from "../api/diary";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

/**
 * Lädt den fortlaufenden Tagebuch-Eintrag eines Projekts. Reine Leseschicht:
 * Die Texte erzeugt der Cowork-Skill über die MCP-Tools; das Widget lädt nur.
 */
export function useDiary(projectId: number | undefined, enabled = true) {
  const diaryQuery = useQuery({
    queryKey: queryKeys.projects.diary(projectId ?? 0),
    queryFn: () => getProjectDiary(projectId as number),
    enabled: enabled && projectId !== undefined
  });

  const reload = useCallback(async () => {
    await diaryQuery.refetch();
  }, [diaryQuery]);

  return {
    diary: diaryQuery.data ?? null,
    loading: diaryQuery.isLoading,
    error: toQueryError(diaryQuery.error),
    reload
  };
}
