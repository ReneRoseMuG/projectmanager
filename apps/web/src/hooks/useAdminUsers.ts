import type { AdminUserInput, AdminUserUpdate } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createAdminUser as createAdminUserRequest,
  deleteAdminUser as deleteAdminUserRequest,
  getAdminUser,
  getAdminUsers,
  updateAdminUser as updateAdminUserRequest
} from "../api/admin-users";
import { invalidateAdminUsers } from "../queries/invalidation";
import { queryKeys } from "../queries/queryKeys";
import { toQueryError } from "../queries/queryErrors";

export function useAdminUsers() {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({
    queryKey: queryKeys.adminUsers.list(),
    queryFn: getAdminUsers
  });

  const createMutation = useMutation({
    mutationFn: createAdminUserRequest,
    onSuccess: async () => invalidateAdminUsers(queryClient)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: AdminUserUpdate }) => updateAdminUserRequest(id, input),
    onSuccess: async () => invalidateAdminUsers(queryClient)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUserRequest,
    onSuccess: async () => invalidateAdminUsers(queryClient)
  });

  const createUser = useCallback((input: AdminUserInput) => createMutation.mutateAsync(input), [createMutation]);
  const updateUser = useCallback((id: number, input: AdminUserUpdate) => updateMutation.mutateAsync({ id, input }), [updateMutation]);
  const deleteUser = useCallback((id: number) => deleteMutation.mutateAsync(id), [deleteMutation]);

  return {
    users: usersQuery.data ?? [],
    loading: usersQuery.isLoading,
    error: toQueryError(usersQuery.error),
    createUser,
    updateUser,
    deleteUser,
    pending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    mutationError: toQueryError(createMutation.error ?? updateMutation.error ?? deleteMutation.error)
  };
}

export function useAdminUserDetail(id: number | null) {
  const queryClient = useQueryClient();
  const userQuery = useQuery({
    queryKey: id ? queryKeys.adminUsers.detail(id) : queryKeys.adminUsers.root,
    queryFn: () => getAdminUser(id ?? 0),
    enabled: Boolean(id)
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, input }: { userId: number; input: AdminUserUpdate }) => updateAdminUserRequest(userId, input),
    onSuccess: async () => invalidateAdminUsers(queryClient)
  });

  return {
    user: userQuery.data ?? null,
    loading: userQuery.isLoading,
    error: toQueryError(userQuery.error),
    updateUser: (input: AdminUserUpdate) => updateMutation.mutateAsync({ userId: id ?? 0, input }),
    pending: updateMutation.isPending,
    mutationError: toQueryError(updateMutation.error)
  };
}
