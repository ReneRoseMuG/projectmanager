import type { BackupProgressEvent, RealtimeInvalidationEvent, RealtimeInvalidationScope } from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiBaseUrl, getClientTabId } from "../api/client";
import { publishBackupProgress } from "./useBackupProgress";
import {
  invalidateAdminRoles,
  invalidateAdminUsers,
  invalidateCatalogs,
  invalidateDashboards,
  invalidateEvents,
  invalidateFeatureScope,
  invalidateMilestones,
  invalidateProjectScope,
  invalidateProjects,
  invalidateSettings,
  invalidateTags,
  invalidateTaskScope,
  invalidateTicketScope,
  invalidateUseCaseScope,
  invalidateWiki,
  invalidateWikiImportData
} from "../queries/invalidation";

async function invalidateRealtimeScope(queryClient: ReturnType<typeof useQueryClient>, scope: RealtimeInvalidationScope): Promise<void> {
  switch (scope) {
    case "projects":
      await invalidateProjectScope(queryClient);
      return;
    case "milestones":
      await invalidateMilestones(queryClient);
      return;
    case "tasks":
      await invalidateTaskScope(queryClient);
      return;
    case "tickets":
      await invalidateTicketScope(queryClient);
      return;
    case "features":
      await invalidateFeatureScope(queryClient);
      return;
    case "useCases":
      await invalidateUseCaseScope(queryClient);
      return;
    case "wiki":
      await invalidateWiki(queryClient);
      return;
    case "tags":
      await invalidateTags(queryClient);
      return;
    case "catalogs":
      await invalidateCatalogs(queryClient);
      return;
    case "events":
      await invalidateEvents(queryClient);
      return;
    case "dashboards":
      await invalidateDashboards(queryClient);
      return;
    case "settings":
      await invalidateSettings(queryClient);
      return;
    case "adminUsers":
      await invalidateAdminUsers(queryClient);
      return;
    case "adminRoles":
      await invalidateAdminRoles(queryClient);
      return;
    case "backlog":
    case "comments":
    case "notes":
    case "attachments":
    case "dumps":
    case "all":
      await invalidateWikiImportData(queryClient);
      return;
    default:
      await invalidateProjects(queryClient);
  }
}

function parseRealtimeEvent(data: string): RealtimeInvalidationEvent | null {
  try {
    const parsed = JSON.parse(data) as Partial<RealtimeInvalidationEvent>;
    if (parsed.type === "invalidate" && typeof parsed.scope === "string") {
      return parsed as RealtimeInvalidationEvent;
    }
  } catch {
    return null;
  }
  return null;
}

function parseBackupProgressEvent(data: string): BackupProgressEvent | null {
  try {
    const parsed = JSON.parse(data) as Partial<BackupProgressEvent>;
    if (
      parsed.type === "backup_progress" &&
      (parsed.operation === "full_backup" || parsed.operation === "import") &&
      typeof parsed.phase === "string" &&
      typeof parsed.current === "number" &&
      typeof parsed.total === "number"
    ) {
      return parsed as BackupProgressEvent;
    }
  } catch {
    return null;
  }
  return null;
}

export function useRealtimeSync(enabled: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") {
      return;
    }

    const ownTabId = getClientTabId();
    const streamUrl = `${apiBaseUrl.replace(/\/$/, "")}/realtime/stream`;
    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    eventSource.onopen = () => {
      void invalidateWikiImportData(queryClient);
    };

    const handleInvalidate = (message: MessageEvent<string>) => {
      const event = parseRealtimeEvent(message.data);
      if (!event || event.sourceTabId === ownTabId) {
        return;
      }
      void invalidateRealtimeScope(queryClient, event.scope);
    };

    eventSource.addEventListener("invalidate", handleInvalidate as EventListener);
    const handleBackupProgress = (message: MessageEvent<string>) => {
      const event = parseBackupProgressEvent(message.data);
      if (event) {
        publishBackupProgress(event);
      }
    };

    eventSource.addEventListener("backup_progress", handleBackupProgress as EventListener);

    return () => {
      eventSource.removeEventListener("invalidate", handleInvalidate as EventListener);
      eventSource.removeEventListener("backup_progress", handleBackupProgress as EventListener);
      eventSource.close();
    };
  }, [enabled, queryClient]);
}
