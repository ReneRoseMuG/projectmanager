import type { Project } from "@taskmanager/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { updateProject as updateProjectRequest } from "../api/projects";
import { invalidateProjectScope } from "../queries/invalidation";
import { queryKeys } from "../queries/queryKeys";

export function useProjectWikiRelation(project?: Project | null) {
  const queryClient = useQueryClient();
  const [wikiPageId, setWikiPageId] = useState<number | null>(
    project?.wikiPageId ?? null,
  );
  const [version, setVersion] = useState<number | null>(
    project?.version ?? null,
  );

  useEffect(() => {
    setWikiPageId(project?.wikiPageId ?? null);
    setVersion(project?.version ?? null);
  }, [project?.id, project?.version, project?.wikiPageId]);

  const updateWikiPageMutation = useMutation({
    mutationFn: async (nextWikiPageId: number | null) => {
      if (!project || version === null) {
        throw new Error("A saved project is required.");
      }
      return updateProjectRequest(project.id, {
        wikiPageId: nextWikiPageId,
        expectedVersion: version,
      });
    },
    onSuccess: async (updatedProject) => {
      setWikiPageId(updatedProject.wikiPageId);
      setVersion(updatedProject.version);
      queryClient.setQueryData(
        queryKeys.projects.detail(updatedProject.id),
        updatedProject,
      );
      queryClient.setQueryData<Project[]>(
        queryKeys.projects.list(),
        (projects) =>
          projects?.map((item) =>
            item.id === updatedProject.id ? updatedProject : item,
          ),
      );
      await invalidateProjectScope(queryClient, updatedProject.id);
    },
  });

  const setProjectWikiPageId = useCallback(
    async (nextWikiPageId: number | null) => {
      return updateWikiPageMutation.mutateAsync(nextWikiPageId);
    },
    [updateWikiPageMutation],
  );

  return {
    wikiPageId,
    saving: updateWikiPageMutation.isPending,
    setProjectWikiPageId,
  };
}
