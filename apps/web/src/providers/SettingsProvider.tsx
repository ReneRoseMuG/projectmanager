import type {
  DeleteSettingValueRequest,
  ResolvedSetting,
  SettingKey,
  SettingScopeType,
  SettingsResolvedResponse,
  SetSettingValueRequest
} from "@taskmanager/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useCallback, useContext } from "react";
import { deleteSettingValue as deleteSettingValueRequest, getResolvedSettings, setSettingValue as setSettingValueRequest } from "../api/settings";
import { invalidateSettings } from "../queries/invalidation";
import { queryKeys } from "../queries/queryKeys";
import { toQueryError } from "../queries/queryErrors";

type SetSettingInput = Omit<SetSettingValueRequest, "expectedVersion">;
type DeleteSettingInput = Omit<DeleteSettingValueRequest, "expectedVersion">;
type SetMutationInput = SetSettingInput & { expectedVersion: number };
type DeleteMutationInput = DeleteSettingInput & { expectedVersion: number };

interface SettingsContextValue {
  settings: ResolvedSetting[];
  loading: boolean;
  error: string | null;
  isSaving: boolean;
  setSetting: (input: SetSettingInput) => Promise<SettingsResolvedResponse>;
  resetSetting: (input: DeleteSettingInput) => Promise<SettingsResolvedResponse>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function isConflictError(error: unknown): boolean {
  const response = error instanceof Error && "response" in error ? (error as { response?: { status?: number } }).response : undefined;
  return response?.status === 409;
}

function settingByKey(response: SettingsResolvedResponse | undefined, key: SettingKey): ResolvedSetting | undefined {
  return response?.settings.find((setting) => setting.key === key);
}

function expectedVersionFor(response: SettingsResolvedResponse | undefined, input: { key: SettingKey; scopeType: SettingScopeType }): number {
  return settingByKey(response, input.key)?.values[input.scopeType]?.version ?? 0;
}

function resolveOptimisticValue(setting: ResolvedSetting): Pick<ResolvedSetting, "resolvedValue" | "resolvedScope" | "resolvedVersion"> {
  const userValue = setting.values.USER;
  const roleValue = setting.values.ROLE;
  const globalValue = setting.values.GLOBAL;
  const resolved = userValue ?? roleValue ?? globalValue;
  return {
    resolvedValue: resolved?.value ?? setting.defaultValue,
    resolvedScope: userValue ? "USER" : roleValue ? "ROLE" : globalValue ? "GLOBAL" : "DEFAULT",
    resolvedVersion: resolved?.version ?? null
  };
}

function applyOptimisticSet(response: SettingsResolvedResponse | undefined, input: SetSettingInput): SettingsResolvedResponse | undefined {
  if (!response) {
    return response;
  }
  return {
    settings: response.settings.map((setting) => {
      if (setting.key !== input.key) {
        return setting;
      }
      const currentVersion = setting.values[input.scopeType]?.version ?? 0;
      const values = {
        ...setting.values,
        [input.scopeType]: {
          value: input.value,
          version: currentVersion + 1,
          updatedAt: new Date().toISOString(),
          updatedBy: null
        }
      };
      const nextSetting = { ...setting, values };
      return { ...nextSetting, ...resolveOptimisticValue(nextSetting) };
    })
  };
}

function applyOptimisticReset(response: SettingsResolvedResponse | undefined, input: DeleteSettingInput): SettingsResolvedResponse | undefined {
  if (!response) {
    return response;
  }
  return {
    settings: response.settings.map((setting) => {
      if (setting.key !== input.key) {
        return setting;
      }
      const values = { ...setting.values };
      delete values[input.scopeType];
      const nextSetting = { ...setting, values };
      return { ...nextSetting, ...resolveOptimisticValue(nextSetting) };
    })
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.resolved(),
    queryFn: getResolvedSettings,
    retry: false
  });

  const setMutation = useMutation({
    mutationFn: async (input: SetMutationInput) => {
      try {
        return await setSettingValueRequest(input);
      } catch (error) {
        if (!isConflictError(error)) {
          throw error;
        }
        const fresh = await getResolvedSettings();
        queryClient.setQueryData(queryKeys.settings.resolved(), fresh);
        return setSettingValueRequest({ ...input, expectedVersion: expectedVersionFor(fresh, input) });
      }
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.resolved() });
      const previous = queryClient.getQueryData<SettingsResolvedResponse>(queryKeys.settings.resolved());
      queryClient.setQueryData(queryKeys.settings.resolved(), applyOptimisticSet(previous, input));
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.settings.resolved(), context.previous);
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.settings.resolved(), response);
    },
    onSettled: async () => {
      await invalidateSettings(queryClient);
    }
  });

  const resetMutation = useMutation({
    mutationFn: async (input: DeleteMutationInput) => {
      try {
        return await deleteSettingValueRequest(input);
      } catch (error) {
        if (!isConflictError(error)) {
          throw error;
        }
        const fresh = await getResolvedSettings();
        queryClient.setQueryData(queryKeys.settings.resolved(), fresh);
        return deleteSettingValueRequest({ ...input, expectedVersion: expectedVersionFor(fresh, input) });
      }
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.resolved() });
      const previous = queryClient.getQueryData<SettingsResolvedResponse>(queryKeys.settings.resolved());
      queryClient.setQueryData(queryKeys.settings.resolved(), applyOptimisticReset(previous, input));
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.settings.resolved(), context.previous);
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.settings.resolved(), response);
    },
    onSettled: async () => {
      await invalidateSettings(queryClient);
    }
  });

  const setSetting = useCallback(
    (input: SetSettingInput) => {
      const cached = queryClient.getQueryData<SettingsResolvedResponse>(queryKeys.settings.resolved());
      return setMutation.mutateAsync({ ...input, expectedVersion: expectedVersionFor(cached, input) });
    },
    [queryClient, setMutation]
  );
  const resetSetting = useCallback(
    (input: DeleteSettingInput) => {
      const cached = queryClient.getQueryData<SettingsResolvedResponse>(queryKeys.settings.resolved());
      return resetMutation.mutateAsync({ ...input, expectedVersion: expectedVersionFor(cached, input) });
    },
    [queryClient, resetMutation]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings: settingsQuery.data?.settings ?? [],
        loading: settingsQuery.isLoading,
        error: toQueryError(settingsQuery.error),
        isSaving: setMutation.isPending || resetMutation.isPending,
        setSetting,
        resetSetting
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (context) {
    return context;
  }
  return {
    settings: [],
    loading: false,
    error: null,
    isSaving: false,
    setSetting: async () => ({ settings: [] }),
    resetSetting: async () => ({ settings: [] })
  };
}

export type { DeleteSettingInput, SetSettingInput };
