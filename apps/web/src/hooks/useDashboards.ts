import type {
  DashboardContext,
  DashboardDefaultScope,
  DashboardInput,
  DashboardOwner,
  DashboardUpdate,
  DashboardWidgetLayout,
} from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createDashboard as createDashboardRequest,
  deleteDashboard as deleteDashboardRequest,
  getDashboard as getDashboardRequest,
  getDashboardWidgetData,
  listDashboards,
  setDashboardDefault,
  updateDashboard as updateDashboardRequest,
} from "../api/dashboard";
import { invalidateDashboards } from "../queries/invalidation";
import { toQueryError } from "../queries/queryErrors";
import { queryKeys } from "../queries/queryKeys";

export function dashboardOwnerKey(owner?: DashboardOwner): string {
  return owner ? `${owner.type}:${owner.id}` : "global";
}

export function useDashboards(context: DashboardContext, enabled = true) {
  const queryClient = useQueryClient();
  const dashboardsQuery = useQuery({
    queryKey: queryKeys.dashboards.list(context),
    queryFn: () => listDashboards(context),
    enabled,
  });

  const createDashboardMutation = useMutation({
    mutationFn: createDashboardRequest,
    onSuccess: async () => {
      await invalidateDashboards(queryClient);
    },
  });

  const updateDashboardMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: DashboardUpdate }) => updateDashboardRequest(id, input),
    onSuccess: async () => {
      await invalidateDashboards(queryClient);
    },
  });

  const deleteDashboardMutation = useMutation({
    mutationFn: deleteDashboardRequest,
    onSuccess: async () => {
      await invalidateDashboards(queryClient);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: ({ id, scopeType, expectedVersion }: { id: number; scopeType: DashboardDefaultScope; expectedVersion: number }) =>
      setDashboardDefault(id, scopeType, expectedVersion),
    onSuccess: async () => {
      await invalidateDashboards(queryClient);
    },
  });

  const createDashboard = useCallback(
    async (input: DashboardInput) => createDashboardMutation.mutateAsync(input),
    [createDashboardMutation],
  );

  const updateDashboard = useCallback(
    async (id: number, input: DashboardUpdate) => updateDashboardMutation.mutateAsync({ id, input }),
    [updateDashboardMutation],
  );

  const removeDashboard = useCallback(
    async (id: number) => deleteDashboardMutation.mutateAsync(id),
    [deleteDashboardMutation],
  );

  const setDefault = useCallback(
    async (id: number, scopeType: DashboardDefaultScope, expectedVersion: number) => setDefaultMutation.mutateAsync({ id, scopeType, expectedVersion }),
    [setDefaultMutation],
  );

  const response = dashboardsQuery.data;
  const selectedDefaultId = response?.userDefaultDashboardId ?? response?.globalDefaultDashboardId ?? response?.dashboards[0]?.id ?? null;

  return {
    dashboards: response?.dashboards ?? [],
    selectedDefaultId,
    globalDefaultDashboardId: response?.globalDefaultDashboardId ?? null,
    globalDefaultVersion: response?.globalDefaultVersion ?? 0,
    userDefaultDashboardId: response?.userDefaultDashboardId ?? null,
    userDefaultVersion: response?.userDefaultVersion ?? 0,
    loading: dashboardsQuery.isLoading,
    saving: createDashboardMutation.isPending || updateDashboardMutation.isPending || deleteDashboardMutation.isPending || setDefaultMutation.isPending,
    error: toQueryError(dashboardsQuery.error),
    reload: dashboardsQuery.refetch,
    createDashboard,
    updateDashboard,
    removeDashboard,
    setDefault,
  };
}

export function useDashboardDetail(id: number | null | undefined) {
  const validId = id !== null && id !== undefined && Number.isFinite(id) ? id : undefined;
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboards.detail(validId ?? 0),
    queryFn: () => getDashboardRequest(validId as number),
    enabled: validId !== undefined,
  });

  return {
    dashboard: dashboardQuery.data ?? null,
    loading: dashboardQuery.isLoading,
    error: toQueryError(dashboardQuery.error),
    reload: dashboardQuery.refetch,
  };
}

export function useDashboardWidgetData(widget: DashboardWidgetLayout, owner?: DashboardOwner, enabled = true) {
  const ownerKey = dashboardOwnerKey(owner);
  const dataQuery = useQuery({
    queryKey: queryKeys.dashboards.widgetData(widget.widgetId, ownerKey, widget.params),
    queryFn: () => getDashboardWidgetData(widget.widgetId, owner, widget.params),
    enabled,
  });

  return {
    data: dataQuery.data,
    loading: dataQuery.isLoading,
    error: toQueryError(dataQuery.error),
    reload: dataQuery.refetch,
  };
}
