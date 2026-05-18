import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getProjectFeatures, setProjectFeatures as setProjectFeaturesRequest } from "../api/doc-links";
import { getProjects } from "../api/projects";
import { invalidateFeatureScope, invalidateProjectScope } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function useProjectFeatureLinks(projectId?: number) {
  const queryClient = useQueryClient();
  const validProjectId = projectId !== undefined && Number.isFinite(projectId) ? projectId : undefined;

  const featuresQuery = useQuery({
    queryKey: queryKeys.projects.features(validProjectId ?? 0),
    queryFn: () => getProjectFeatures(validProjectId as number),
    enabled: validProjectId !== undefined
  });

  const reload = useCallback(async () => {
    if (validProjectId !== undefined) {
      await featuresQuery.refetch();
    }
  }, [featuresQuery, validProjectId]);

  const setFeaturesMutation = useMutation({
    mutationFn: (featureIds: number[]) => {
      if (validProjectId === undefined) {
        throw new Error("Project id is required");
      }
      return setProjectFeaturesRequest(validProjectId, featureIds);
    },
    onSuccess: async () => {
      if (validProjectId !== undefined) {
        await invalidateProjectScope(queryClient, validProjectId);
      }
      await invalidateFeatureScope(queryClient);
    }
  });

  const setFeaturesForProject = useCallback(
    async (featureIds: number[]) => {
      return setFeaturesMutation.mutateAsync(featureIds);
    },
    [setFeaturesMutation]
  );

  return {
    features: featuresQuery.data ?? [],
    loading: featuresQuery.isLoading,
    error: toQueryError(featuresQuery.error),
    reload,
    setFeaturesForProject
  };
}

export function useFeatureProjectLinks(featureId?: number) {
  const queryClient = useQueryClient();
  const validFeatureId = featureId !== undefined && Number.isFinite(featureId) ? featureId : undefined;

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: getProjects,
    enabled: validFeatureId !== undefined
  });

  const linkedProjectsQuery = useQuery({
    queryKey: queryKeys.features.projects(validFeatureId ?? 0),
    queryFn: async () => {
      const allProjects = await getProjects();
      const projectFeaturePairs = await Promise.all(
        allProjects.map(async (project) => ({
          project,
          features: await getProjectFeatures(project.id)
        }))
      );
      return projectFeaturePairs.filter((pair) => pair.features.some((feature) => feature.id === validFeatureId)).map((pair) => pair.project);
    },
    enabled: validFeatureId !== undefined
  });

  const reload = useCallback(async () => {
    await projectsQuery.refetch();
    if (validFeatureId !== undefined) {
      await linkedProjectsQuery.refetch();
    }
  }, [linkedProjectsQuery, projectsQuery, validFeatureId]);

  const addProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      if (validFeatureId === undefined) {
        throw new Error("Feature id is required");
      }
      const currentFeatures = await getProjectFeatures(projectId);
      const featureIds = currentFeatures.map((feature) => feature.id);
      if (!featureIds.includes(validFeatureId)) {
        await setProjectFeaturesRequest(projectId, [...featureIds, validFeatureId]);
      }
    },
    onSuccess: async (_result, projectId) => {
      await invalidateProjectScope(queryClient, projectId);
      await invalidateFeatureScope(queryClient, validFeatureId);
    }
  });

  const removeProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      if (validFeatureId === undefined) {
        throw new Error("Feature id is required");
      }
      const currentFeatures = await getProjectFeatures(projectId);
      await setProjectFeaturesRequest(
        projectId,
        currentFeatures.filter((feature) => feature.id !== validFeatureId).map((feature) => feature.id)
      );
    },
    onSuccess: async (_result, projectId) => {
      await invalidateProjectScope(queryClient, projectId);
      await invalidateFeatureScope(queryClient, validFeatureId);
    }
  });

  const setProjectsMutation = useMutation({
    mutationFn: async (projectIds: number[]) => {
      if (validFeatureId === undefined) {
        throw new Error("Feature id is required");
      }

      const selectedProjectIds = new Set(projectIds);
      for (const project of projectsQuery.data ?? []) {
        const currentFeatures = await getProjectFeatures(project.id);
        const currentFeatureIds = currentFeatures.map((feature) => feature.id);
        const isLinked = currentFeatureIds.includes(validFeatureId);
        const shouldBeLinked = selectedProjectIds.has(project.id);

        if (shouldBeLinked && !isLinked) {
          await setProjectFeaturesRequest(project.id, [...currentFeatureIds, validFeatureId]);
        }
        if (!shouldBeLinked && isLinked) {
          await setProjectFeaturesRequest(
            project.id,
            currentFeatureIds.filter((id) => id !== validFeatureId)
          );
        }
      }
    },
    onSuccess: async () => {
      await invalidateProjectScope(queryClient);
      await invalidateFeatureScope(queryClient, validFeatureId);
    }
  });

  const addProjectToFeature = useCallback(
    async (projectId: number) => {
      await addProjectMutation.mutateAsync(projectId);
    },
    [addProjectMutation]
  );

  const removeProjectFromFeature = useCallback(
    async (projectId: number) => {
      await removeProjectMutation.mutateAsync(projectId);
    },
    [removeProjectMutation]
  );

  const setProjectsForFeature = useCallback(
    async (projectIds: number[]) => {
      await setProjectsMutation.mutateAsync(projectIds);
    },
    [setProjectsMutation]
  );

  return {
    projects: projectsQuery.data ?? [],
    linkedProjects: linkedProjectsQuery.data ?? [],
    loading: projectsQuery.isLoading || linkedProjectsQuery.isLoading,
    error: toQueryError(projectsQuery.error ?? linkedProjectsQuery.error),
    reload,
    addProjectToFeature,
    removeProjectFromFeature,
    setProjectsForFeature
  };
}
