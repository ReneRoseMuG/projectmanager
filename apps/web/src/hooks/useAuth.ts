import type { LoginRequest, SetPasswordRequest } from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getCurrentUser, login as loginRequest, logout as logoutRequest, setInitialPassword as setInitialPasswordRequest } from "../api/auth";
import { queryKeys } from "../queries/queryKeys";
import { toQueryError } from "../queries/queryErrors";

interface UseAuthOptions {
  enabled?: boolean;
}

export function useAuth(options: UseAuthOptions = {}) {
  const queryClient = useQueryClient();
  const authQueryEnabled = options.enabled ?? true;
  const meQuery = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: getCurrentUser,
    enabled: authQueryEnabled,
    retry: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false
  });

  const loginMutation = useMutation({
    mutationFn: (input: LoginRequest) => loginRequest(input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me(), user);
    }
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: async () => {
      queryClient.removeQueries();
    }
  });

  const setPasswordMutation = useMutation({
    mutationFn: (input: SetPasswordRequest) => setInitialPasswordRequest(input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me(), user);
    }
  });

  const login = useCallback((input: LoginRequest) => loginMutation.mutateAsync(input), [loginMutation]);
  const logout = useCallback(() => logoutMutation.mutateAsync(), [logoutMutation]);
  const setInitialPassword = useCallback((input: SetPasswordRequest) => setPasswordMutation.mutateAsync(input), [setPasswordMutation]);

  return {
    user: authQueryEnabled ? meQuery.data ?? null : null,
    loading: authQueryEnabled ? meQuery.isPending : false,
    authenticated: authQueryEnabled ? Boolean(meQuery.data) : false,
    requiresPasswordSetup: authQueryEnabled ? Boolean(meQuery.data?.requiresPasswordSetup) : false,
    error: authQueryEnabled ? toQueryError(meQuery.error) : null,
    login,
    logout,
    setInitialPassword,
    loginPending: loginMutation.isPending,
    logoutPending: logoutMutation.isPending,
    setPasswordPending: setPasswordMutation.isPending,
    loginError: toQueryError(loginMutation.error),
    setPasswordError: toQueryError(setPasswordMutation.error)
  };
}
