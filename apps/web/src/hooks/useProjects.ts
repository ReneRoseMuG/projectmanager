import type { Project, ProjectInput, ProjectUpdate } from "@taskmanager/shared-types";
import { useCallback, useEffect, useState } from "react";
import {
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  getProject,
  getProjects,
  setProjectTags,
  updateProject as updateProjectRequest
} from "../api/projects";
import { errorMessage } from "./errors";

export function useProjects(projectId?: number) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getProjects();
      setProjects(items);
      if (projectId) {
        setProject(await getProject(projectId));
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createProject = useCallback(
    async (input: ProjectInput, tagIds: number[] = []) => {
      const created = await createProjectRequest(input);
      if (tagIds.length > 0) {
        await setProjectTags(created.id, tagIds);
      }
      await load();
      return created;
    },
    [load]
  );

  const updateProject = useCallback(
    async (id: number, input: ProjectUpdate, tagIds?: number[]) => {
      const updated = await updateProjectRequest(id, input);
      if (tagIds) {
        await setProjectTags(id, tagIds);
      }
      await load();
      return updated;
    },
    [load]
  );

  const removeProject = useCallback(
    async (id: number) => {
      await deleteProjectRequest(id);
      await load();
    },
    [load]
  );

  return { projects, project, loading, error, reload: load, createProject, updateProject, removeProject };
}
