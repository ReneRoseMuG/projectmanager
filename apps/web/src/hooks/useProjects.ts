import type { ProjectInput, ProjectUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  getProject,
  getProjects,
  getProjectsPage,
  setProjectTags,
  updateProject as updateProjectRequest,
  type ProjectListFilter
} from "../api/projects";
import { invalidateProjectScope, invalidateProjects } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";
import { useProgressiveList } from "./useProgressiveList";

// Progressiv nachladende Projektliste: statt Seitenzahl-Blättern werden die Blöcke
// sequenziell nachgeladen und angehängt (siehe useProgressiveList). Status und Suche
// bleiben serverseitig und gehen je Block als Filter mit. `total` ist die Gesamtzahl
// nach Filter/Suche.
export function useProjectLibrary(filter: ProjectListFilter) {
  const { items, total, loadedCount, loading, loadingMore, error } = useProgressiveList(
    queryKeys.projects.list(filter as object),
    (page, pageSize) => getProjectsPage(filter, { page, pageSize })
  );
  return {
    projects: items,
    total,
    loadedCount,
    loading,
    loadingMore,
    // useProgressiveList liefert error bereits als string | null.
    error
  };
}

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
    // Array-Guard: schützt die Status-Chip-Counts (projects.filter(...)) selbst dann, wenn der
    // Cache-Eintrag versehentlich mit einer Nicht-Array-Form belegt würde (siehe useProgressiveList).
    projects: Array.isArray(projectsQuery.data) ? projectsQuery.data : [],
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
