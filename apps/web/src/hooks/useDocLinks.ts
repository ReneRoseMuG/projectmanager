import type { Feature, Project, Task, UseCase } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
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
import { errorMessage } from "./errors";

export function useProjectFeatureLinks(projectId?: number) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(Boolean(projectId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setFeatures([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setFeatures(await getProjectFeatures(projectId));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFeaturesForProject = useCallback(
    async (featureIds: number[]) => {
      if (!projectId) {
        throw new Error("Project id is required");
      }
      const updated = await setProjectFeaturesRequest(projectId, featureIds);
      setFeatures(updated);
      return updated;
    },
    [projectId]
  );

  return { features, loading, error, reload: load, setFeaturesForProject };
}

export function useFeatureProjectLinks(featureId?: number) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [linkedProjects, setLinkedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(Boolean(featureId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!featureId) {
      setProjects([]);
      setLinkedProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const allProjects = await getProjects();
      const projectFeaturePairs = await Promise.all(
        allProjects.map(async (project) => ({
          project,
          features: await getProjectFeatures(project.id)
        }))
      );
      setProjects(allProjects);
      setLinkedProjects(projectFeaturePairs.filter((pair) => pair.features.some((feature) => feature.id === featureId)).map((pair) => pair.project));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [featureId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addProjectToFeature = useCallback(
    async (projectId: number) => {
      if (!featureId) {
        throw new Error("Feature id is required");
      }
      const currentFeatures = await getProjectFeatures(projectId);
      const featureIds = currentFeatures.map((feature) => feature.id);
      if (!featureIds.includes(featureId)) {
        await setProjectFeaturesRequest(projectId, [...featureIds, featureId]);
      }
      await load();
    },
    [featureId, load]
  );

  const removeProjectFromFeature = useCallback(
    async (projectId: number) => {
      if (!featureId) {
        throw new Error("Feature id is required");
      }
      const currentFeatures = await getProjectFeatures(projectId);
      await setProjectFeaturesRequest(
        projectId,
        currentFeatures.filter((feature) => feature.id !== featureId).map((feature) => feature.id)
      );
      await load();
    },
    [featureId, load]
  );

  const setProjectsForFeature = useCallback(
    async (projectIds: number[]) => {
      if (!featureId) {
        throw new Error("Feature id is required");
      }

      const selectedProjectIds = new Set(projectIds);
      for (const project of projects) {
        const currentFeatures = await getProjectFeatures(project.id);
        const currentFeatureIds = currentFeatures.map((feature) => feature.id);
        const isLinked = currentFeatureIds.includes(featureId);
        const shouldBeLinked = selectedProjectIds.has(project.id);

        if (shouldBeLinked && !isLinked) {
          await setProjectFeaturesRequest(project.id, [...currentFeatureIds, featureId]);
        }
        if (!shouldBeLinked && isLinked) {
          await setProjectFeaturesRequest(
            project.id,
            currentFeatureIds.filter((id) => id !== featureId)
          );
        }
      }

      await load();
    },
    [featureId, load, projects]
  );

  return { projects, linkedProjects, loading, error, reload: load, addProjectToFeature, removeProjectFromFeature, setProjectsForFeature };
}

export function useTaskDocLinks(taskId?: number | null) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [availableUseCases, setAvailableUseCases] = useState<UseCase[]>([]);
  const [loading, setLoading] = useState(Boolean(taskId));
  const [error, setError] = useState<string | null>(null);

  const loadAvailableUseCases = useCallback(async (featureIds: number[]) => {
    if (featureIds.length === 0) {
      setAvailableUseCases([]);
      return [];
    }
    const lists = await Promise.all(featureIds.map((featureId) => getUseCases(featureId)));
    const merged = lists.flat();
    setAvailableUseCases(merged);
    return merged;
  }, []);

  const load = useCallback(async () => {
    if (!taskId) {
      setFeatures([]);
      setUseCases([]);
      setAvailableUseCases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [loadedFeatures, loadedUseCases] = await Promise.all([getTaskFeatures(taskId), getTaskUseCases(taskId)]);
      setFeatures(loadedFeatures);
      setUseCases(loadedUseCases);
      await loadAvailableUseCases(loadedFeatures.map((feature) => feature.id));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [loadAvailableUseCases, taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFeaturesForTask = useCallback(
    async (featureIds: number[]) => {
      if (!taskId) {
        throw new Error("Task id is required");
      }
      const updated = await setTaskFeaturesRequest(taskId, featureIds);
      setFeatures(updated);
      const nextUseCases = await loadAvailableUseCases(featureIds);
      const allowedIds = new Set(nextUseCases.map((useCase) => useCase.id));
      const filteredUseCaseIds = useCases.filter((useCase) => allowedIds.has(useCase.id)).map((useCase) => useCase.id);
      const updatedUseCases = await setTaskUseCasesRequest(taskId, filteredUseCaseIds);
      setUseCases(updatedUseCases);
      return updated;
    },
    [loadAvailableUseCases, taskId, useCases]
  );

  const setUseCasesForTask = useCallback(
    async (useCaseIds: number[]) => {
      if (!taskId) {
        throw new Error("Task id is required");
      }
      const updated = await setTaskUseCasesRequest(taskId, useCaseIds);
      setUseCases(updated);
      return updated;
    },
    [taskId]
  );

  return { features, useCases, availableUseCases, loading, error, reload: load, setFeaturesForTask, setUseCasesForTask };
}

export function useFeatureTaskLinks(featureId?: number | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(Boolean(featureId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!featureId) {
      setTasks([]);
      setLinkedTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [allTasks, relatedTasks] = await Promise.all([getTasks(), getFeatureTasks(featureId)]);
      setTasks(allTasks);
      setLinkedTasks(relatedTasks);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [featureId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setTasksForFeature = useCallback(
    async (taskIds: number[]) => {
      if (!featureId) {
        throw new Error("Feature id is required");
      }
      const updated = await setFeatureTasksRequest(featureId, taskIds);
      setLinkedTasks(updated);
      return updated;
    },
    [featureId]
  );

  return { tasks, linkedTasks, loading, error, reload: load, setTasksForFeature };
}

export function useUseCaseTaskLinks(useCaseId?: number | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(Boolean(useCaseId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!useCaseId) {
      setTasks([]);
      setLinkedTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [allTasks, relatedTasks] = await Promise.all([getTasks(), getUseCaseTasks(useCaseId)]);
      setTasks(allTasks);
      setLinkedTasks(relatedTasks);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [useCaseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setTasksForUseCase = useCallback(
    async (taskIds: number[]) => {
      if (!useCaseId) {
        throw new Error("Use case id is required");
      }
      const updated = await setUseCaseTasksRequest(useCaseId, taskIds);
      setLinkedTasks(updated);
      return updated;
    },
    [useCaseId]
  );

  return { tasks, linkedTasks, loading, error, reload: load, setTasksForUseCase };
}
