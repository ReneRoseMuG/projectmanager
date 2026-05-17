import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  getFeatureTasks,
  getProjectFeatures,
  getTaskFeatures,
  getTaskUseCases,
  getUseCaseTasks,
  setFeatureTasks as setFeatureTasksRequest,
  setProjectFeatures as setProjectFeaturesRequest,
  setTaskFeatures as setTaskFeaturesRequest,
  setTaskUseCases as setTaskUseCasesRequest,
  setUseCaseTasks as setUseCaseTasksRequest
} from "../api/doc-links";
import { getProjects } from "../api/projects";
import { getTasks } from "../api/tasks";
import { getUseCases } from "../api/use-cases";
import { invalidateFeatureScope, invalidateProjectScope, invalidateTaskScope, invalidateUseCaseScope } from "../queries/invalidation";
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

export function useTaskDocLinks(taskId?: number | null) {
  const queryClient = useQueryClient();
  const validTaskId = taskId !== null && taskId !== undefined && Number.isFinite(taskId) ? taskId : undefined;

  const featuresQuery = useQuery({
    queryKey: queryKeys.tasks.features(validTaskId ?? 0),
    queryFn: () => getTaskFeatures(validTaskId as number),
    enabled: validTaskId !== undefined
  });

  const useCasesQuery = useQuery({
    queryKey: queryKeys.tasks.useCases(validTaskId ?? 0),
    queryFn: () => getTaskUseCases(validTaskId as number),
    enabled: validTaskId !== undefined
  });

  const featureIds = (featuresQuery.data ?? []).map((feature) => feature.id);
  const availableUseCasesQuery = useQuery({
    queryKey: [...queryKeys.tasks.useCases(validTaskId ?? 0), "available", ...featureIds] as const,
    queryFn: async () => {
      const lists = await Promise.all(featureIds.map((featureId) => getUseCases(featureId)));
      return lists.flat();
    },
    enabled: validTaskId !== undefined && featureIds.length > 0
  });

  const reload = useCallback(async () => {
    if (validTaskId !== undefined) {
      await featuresQuery.refetch();
      await useCasesQuery.refetch();
      await availableUseCasesQuery.refetch();
    }
  }, [availableUseCasesQuery, featuresQuery, useCasesQuery, validTaskId]);

  const setFeaturesMutation = useMutation({
    mutationFn: async (nextFeatureIds: number[]) => {
      if (validTaskId === undefined) {
        throw new Error("Task id is required");
      }
      const updated = await setTaskFeaturesRequest(validTaskId, nextFeatureIds);
      const lists = await Promise.all(nextFeatureIds.map((featureId) => getUseCases(featureId)));
      const allowedIds = new Set(lists.flat().map((useCase) => useCase.id));
      const filteredUseCaseIds = (useCasesQuery.data ?? []).filter((useCase) => allowedIds.has(useCase.id)).map((useCase) => useCase.id);
      await setTaskUseCasesRequest(validTaskId, filteredUseCaseIds);
      return updated;
    },
    onSuccess: async () => {
      await invalidateTaskScope(queryClient, undefined, validTaskId);
      await invalidateFeatureScope(queryClient);
      await invalidateUseCaseScope(queryClient);
    }
  });

  const setUseCasesMutation = useMutation({
    mutationFn: (useCaseIds: number[]) => {
      if (validTaskId === undefined) {
        throw new Error("Task id is required");
      }
      return setTaskUseCasesRequest(validTaskId, useCaseIds);
    },
    onSuccess: async () => {
      await invalidateTaskScope(queryClient, undefined, validTaskId);
      await invalidateUseCaseScope(queryClient);
    }
  });

  const setFeaturesForTask = useCallback(
    async (featureIdsForTask: number[]) => {
      return setFeaturesMutation.mutateAsync(featureIdsForTask);
    },
    [setFeaturesMutation]
  );

  const setUseCasesForTask = useCallback(
    async (useCaseIds: number[]) => {
      return setUseCasesMutation.mutateAsync(useCaseIds);
    },
    [setUseCasesMutation]
  );

  return {
    features: featuresQuery.data ?? [],
    useCases: useCasesQuery.data ?? [],
    availableUseCases: availableUseCasesQuery.data ?? [],
    loading: featuresQuery.isLoading || useCasesQuery.isLoading || availableUseCasesQuery.isLoading,
    error: toQueryError(featuresQuery.error ?? useCasesQuery.error ?? availableUseCasesQuery.error),
    reload,
    setFeaturesForTask,
    setUseCasesForTask
  };
}

export function useFeatureTaskLinks(featureId?: number | null) {
  const queryClient = useQueryClient();
  const validFeatureId = featureId !== null && featureId !== undefined && Number.isFinite(featureId) ? featureId : undefined;

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: getTasks,
    enabled: validFeatureId !== undefined
  });

  const linkedTasksQuery = useQuery({
    queryKey: queryKeys.features.tasks(validFeatureId ?? 0),
    queryFn: () => getFeatureTasks(validFeatureId as number),
    enabled: validFeatureId !== undefined
  });

  const reload = useCallback(async () => {
    await tasksQuery.refetch();
    if (validFeatureId !== undefined) {
      await linkedTasksQuery.refetch();
    }
  }, [linkedTasksQuery, tasksQuery, validFeatureId]);

  const setTasksMutation = useMutation({
    mutationFn: (taskIds: number[]) => {
      if (validFeatureId === undefined) {
        throw new Error("Feature id is required");
      }
      return setFeatureTasksRequest(validFeatureId, taskIds);
    },
    onSuccess: async () => {
      await invalidateFeatureScope(queryClient, validFeatureId);
      await invalidateTaskScope(queryClient);
    }
  });

  const setTasksForFeature = useCallback(
    async (taskIds: number[]) => {
      return setTasksMutation.mutateAsync(taskIds);
    },
    [setTasksMutation]
  );

  return {
    tasks: tasksQuery.data ?? [],
    linkedTasks: linkedTasksQuery.data ?? [],
    loading: tasksQuery.isLoading || linkedTasksQuery.isLoading,
    error: toQueryError(tasksQuery.error ?? linkedTasksQuery.error),
    reload,
    setTasksForFeature
  };
}

export function useUseCaseTaskLinks(useCaseId?: number | null) {
  const queryClient = useQueryClient();
  const validUseCaseId = useCaseId !== null && useCaseId !== undefined && Number.isFinite(useCaseId) ? useCaseId : undefined;

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: getTasks,
    enabled: validUseCaseId !== undefined
  });

  const linkedTasksQuery = useQuery({
    queryKey: queryKeys.useCases.tasks(validUseCaseId ?? 0),
    queryFn: () => getUseCaseTasks(validUseCaseId as number),
    enabled: validUseCaseId !== undefined
  });

  const reload = useCallback(async () => {
    await tasksQuery.refetch();
    if (validUseCaseId !== undefined) {
      await linkedTasksQuery.refetch();
    }
  }, [linkedTasksQuery, tasksQuery, validUseCaseId]);

  const setTasksMutation = useMutation({
    mutationFn: (taskIds: number[]) => {
      if (validUseCaseId === undefined) {
        throw new Error("Use case id is required");
      }
      return setUseCaseTasksRequest(validUseCaseId, taskIds);
    },
    onSuccess: async () => {
      await invalidateUseCaseScope(queryClient, undefined, validUseCaseId);
      await invalidateTaskScope(queryClient);
    }
  });

  const setTasksForUseCase = useCallback(
    async (taskIds: number[]) => {
      return setTasksMutation.mutateAsync(taskIds);
    },
    [setTasksMutation]
  );

  return {
    tasks: tasksQuery.data ?? [],
    linkedTasks: linkedTasksQuery.data ?? [],
    loading: tasksQuery.isLoading || linkedTasksQuery.isLoading,
    error: toQueryError(tasksQuery.error ?? linkedTasksQuery.error),
    reload,
    setTasksForUseCase
  };
}
