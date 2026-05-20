import type { RoleInput, RoleUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createAdminRole as createAdminRoleRequest,
  deleteAdminRole as deleteAdminRoleRequest,
  getAdminRole,
  getAdminRoles,
  getPermissionCatalog,
  updateAdminRole as updateAdminRoleRequest
} from "../api/admin-roles";
import { invalidateAdminRoles } from "../queries/invalidation";
import { queryKeys } from "../queries/queryKeys";
import { toQueryError } from "../queries/queryErrors";

export function useAdminRoles() {
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({
    queryKey: queryKeys.adminRoles.list(),
    queryFn: getAdminRoles
  });
  const catalogQuery = useQuery({
    queryKey: queryKeys.adminRoles.permissionCatalog(),
    queryFn: getPermissionCatalog
  });

  const createMutation = useMutation({
    mutationFn: createAdminRoleRequest,
    onSuccess: async () => invalidateAdminRoles(queryClient)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: RoleUpdate }) => updateAdminRoleRequest(id, input),
    onSuccess: async () => invalidateAdminRoles(queryClient)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminRoleRequest,
    onSuccess: async () => invalidateAdminRoles(queryClient)
  });

  const createRole = useCallback((input: RoleInput) => createMutation.mutateAsync(input), [createMutation]);
  const updateRole = useCallback((id: number, input: RoleUpdate) => updateMutation.mutateAsync({ id, input }), [updateMutation]);
  const deleteRole = useCallback((id: number) => deleteMutation.mutateAsync(id), [deleteMutation]);

  return {
    roles: rolesQuery.data ?? [],
    permissionCatalog: catalogQuery.data ?? null,
    loading: rolesQuery.isLoading || catalogQuery.isLoading,
    error: toQueryError(rolesQuery.error ?? catalogQuery.error),
    createRole,
    updateRole,
    deleteRole,
    pending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    mutationError: toQueryError(createMutation.error ?? updateMutation.error ?? deleteMutation.error)
  };
}

export function useAdminRoleDetail(id: number | null) {
  const queryClient = useQueryClient();
  const roleQuery = useQuery({
    queryKey: id ? queryKeys.adminRoles.detail(id) : queryKeys.adminRoles.root,
    queryFn: () => getAdminRole(id ?? 0),
    enabled: Boolean(id)
  });

  const updateMutation = useMutation({
    mutationFn: ({ roleId, input }: { roleId: number; input: RoleUpdate }) => updateAdminRoleRequest(roleId, input),
    onSuccess: async () => invalidateAdminRoles(queryClient)
  });

  return {
    role: roleQuery.data ?? null,
    loading: roleQuery.isLoading,
    error: toQueryError(roleQuery.error),
    updateRole: (input: RoleUpdate) => updateMutation.mutateAsync({ roleId: id ?? 0, input }),
    pending: updateMutation.isPending,
    mutationError: toQueryError(updateMutation.error)
  };
}
