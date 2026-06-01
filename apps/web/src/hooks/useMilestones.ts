import type { MilestoneInput, MilestoneUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createMilestone as createMilestoneRequest,
  createProjectMilestone as createProjectMilestoneRequest,
  deleteMilestone as deleteMilestoneRequest,
  getMilestone,
  getMilestones,
  getProjectMilestones,
  setMilestoneTags,
  updateMilestone as updateMilestoneRequest
} from "../api/milestones";
import { invalidateMilestoneScope, invalidateMilestones } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

interface UseMilestonesOptions {
  enabled?: boolean;
}

export function useMilestones(milestoneId?: number | null, projectId?: number | null, options: UseMilestonesOptions = {}) {
  const queryClient = useQueryClient();
  const enabled = options.enabled ?? true;
  const validMilestoneId = milestoneId !== null && milestoneId !== undefined && Number.isFinite(milestoneId) ? milestoneId : undefined;
  const validProjectId = projectId !== null && projectId !== undefined && Number.isFinite(projectId) ? projectId : undefined;

  const milestonesQuery = useQuery({
    queryKey: validProjectId !== undefined ? queryKeys.milestones.byProject(validProjectId) : queryKeys.milestones.list(),
    queryFn: () => (validProjectId !== undefined ? getProjectMilestones(validProjectId) : getMilestones()),
    enabled
  });

  const milestoneQuery = useQuery({
    queryKey: queryKeys.milestones.detail(validMilestoneId ?? 0),
    queryFn: () => getMilestone(validMilestoneId as number),
    enabled: enabled && validMilestoneId !== undefined
  });

  const reload = useCallback(async () => {
    await milestonesQuery.refetch();
    if (validMilestoneId !== undefined) {
      await milestoneQuery.refetch();
    }
  }, [milestoneQuery, milestonesQuery, validMilestoneId]);

  const createMilestoneMutation = useMutation({
    mutationFn: async ({ input, tagIds }: { input: MilestoneInput; tagIds: number[] }) => {
      const created =
        validProjectId !== undefined && input.projectId === validProjectId
          ? await createProjectMilestoneRequest(validProjectId, {
              name: input.name,
              description: input.description,
              status: input.status,
              color: input.color,
              startDate: input.startDate,
              dueDate: input.dueDate
            })
          : await createMilestoneRequest(input);
      if (tagIds.length > 0) {
        await setMilestoneTags(created.id, tagIds);
      }
      return created;
    },
    onSuccess: (created) => {
      void invalidateMilestoneScope(queryClient, created.id, created.projectId);
    }
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, input, tagIds }: { id: number; input: MilestoneUpdate; tagIds?: number[] }) => {
      const [updated] = await Promise.all([
        updateMilestoneRequest(id, input),
        tagIds !== undefined ? setMilestoneTags(id, tagIds) : Promise.resolve(undefined),
      ]);
      return updated;
    },
    onSuccess: (updated) => {
      void invalidateMilestoneScope(queryClient, updated.id, updated.projectId);
    }
  });

  const updateMilestoneTagsMutation = useMutation({
    mutationFn: async ({ id, tagIds }: { id: number; tagIds: number[] }) => {
      return setMilestoneTags(id, tagIds);
    },
    onSuccess: (_tags, variables) => {
      void invalidateMilestoneScope(queryClient, variables.id);
    }
  });

  const removeMilestoneMutation = useMutation({
    mutationFn: deleteMilestoneRequest,
    onSuccess: () => {
      void invalidateMilestones(queryClient);
    }
  });

  const createMilestone = useCallback(
    async (input: MilestoneInput, tagIds: number[] = []) => {
      return createMilestoneMutation.mutateAsync({ input, tagIds });
    },
    [createMilestoneMutation]
  );

  const updateMilestone = useCallback(
    async (id: number, input: MilestoneUpdate, tagIds?: number[]) => {
      return updateMilestoneMutation.mutateAsync({ id, input, tagIds });
    },
    [updateMilestoneMutation]
  );

  const updateMilestoneTags = useCallback(
    async (id: number, tagIds: number[]) => {
      await updateMilestoneTagsMutation.mutateAsync({ id, tagIds });
    },
    [updateMilestoneTagsMutation]
  );

  const removeMilestone = useCallback(
    async (id: number) => {
      await removeMilestoneMutation.mutateAsync(id);
    },
    [removeMilestoneMutation]
  );

  return {
    milestones: milestonesQuery.data ?? [],
    milestone: milestoneQuery.data ?? null,
    loading: milestonesQuery.isLoading || milestoneQuery.isLoading,
    error: toQueryError(milestonesQuery.error ?? milestoneQuery.error),
    reload,
    createMilestone,
    updateMilestone,
    updateMilestoneTags,
    removeMilestone
  };
}
