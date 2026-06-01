import type { ProjectInput, ProjectUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  getProject,
  getProjects,
  setProjectTags,
  updateProject as updateProjectRequest
} from "../api/projects";
import { invalidateProjectScope, invalidateProjects } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useProjects(projectId?: number) {
  const queryClient = useQueryClient();
  const validProjectId = projectId !== undefined && Number.isFinite(projectId) ? projectId : undefined;

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: getProjects
  });

  const projectQuery = useQuery({
    queryKey: queryKeys.projects.detail(validProjectId ?? 0),
    queryFn: () => getProject(validProjectId as number),
    enabled: validProjectId !== undefined
  });

  const reload = useCallback(async () => {
    await projectsQuery.refetch();
    if (validProjectId !== undefined) {
      await projectQuery.refetch();
    }
  }, [projectQuery, projectsQuery, validProjectId]);

  const createProjectMutation = useMutation({
    mutationFn: async ({ input, tagIds }: { input: ProjectInput; tagIds: number[] }) => {
      const created = await createProjectRequest(input);
      if (tagIds.length > 0) {
        await setProjectTags(created.id, tagIds);
      }
      return created;
    },
    onSuccess: (created) => {
      void invalidateProjectScope(queryClient, created.id);
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, input, tagIds }: { id: number; input: ProjectUpdate; tagIds?: number[] }) => {
      const [updated] = await Promise.all([
        updateProjectRequest(id, input),
        tagIds !== undefined ? setProjectTags(id, tagIds) : Promise.resolve(undefined),
      ]);
      return updated;
    },
    onSuccess: (updated) => {
      void invalidateProjectScope(queryClient, updated.id);
    }
  });

  const updateProjectTagsMutation = useMutation({
    mutationFn: async ({ id, tagIds }: { id: number; tagIds: number[] }) => {
      return setProjectTags(id, tagIds);
    },
    onSuccess: (_tags, variables) => {
      void invalidateProjectScope(queryClient, variables.id);
    }
  });

  const removeProjectMutation = useMutation({
    mutationFn: deleteProjectRequest,
    onSuccess: () => {
      void invalidateProjects(queryClient);
    }
  });

  const createProject = useCallback(
    async (input: ProjectInput, tagIds: number[] = []) => {
      return createProjectMutation.mutateAsync({ input, tagIds });
    },
    [createProjectMutation]
  );

  const updateProject = useCallback(
    async (id: number, input: ProjectUpdate, tagIds?: number[]) => {
      return updateProjectMutation.mutateAsync({ id, input, tagIds });
    },
    [updateProjectMutation]
  );

  const updateProjectTags = useCallback(
    async (id: number, tagIds: number[]) => {
      await updateProjectTagsMutation.mutateAsync({ id, tagIds });
    },
    [updateProjectTagsMutation]
  );

  const removeProject = useCallback(
    async (id: number) => {
      await removeProjectMutation.mutateAsync(id);
    },
    [removeProjectMutation]
  );

  return {
    projects: projectsQuery.data ?? [],
    project: projectQuery.data ?? null,
    loading: projectsQuery.isLoading || projectQuery.isLoading,
    error: toQueryError(projectsQuery.error ?? projectQuery.error),
    reload,
    createProject,
    updateProject,
    updateProjectTags,
    removeProject
  };
}
