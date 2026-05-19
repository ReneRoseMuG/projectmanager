import type { WikiImportReport } from "@taskmanager/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { previewWikiImport, runWikiImport } from "../api/imports";
import { invalidateWikiImportData } from "../queries/invalidation";
import { errorMessage } from "./errors";

export function useWikiImport(projectId?: number) {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<WikiImportReport | null>(null);
  const [result, setResult] = useState<WikiImportReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewImport = useCallback(
    async (sourcePath: string) => {
      if (!projectId) {
        return null;
      }

      setLoading(true);
      setError(null);
      try {
        const report = await previewWikiImport(projectId, { sourcePath });
        setPreview(report);
        setResult(null);
        return report;
      } catch (previewError) {
        setError(errorMessage(previewError));
        throw previewError;
      } finally {
        setLoading(false);
      }
    },
    [projectId]
  );

  const runImport = useCallback(
    async (sourcePath: string) => {
      if (!projectId) {
        return null;
      }

      setLoading(true);
      setError(null);
      try {
        const report = await runWikiImport(projectId, { sourcePath });
        setResult(report);
        setPreview(report);
        await invalidateWikiImportData(queryClient);
        return report;
      } catch (runError) {
        setError(errorMessage(runError));
        throw runError;
      } finally {
        setLoading(false);
      }
    },
    [projectId, queryClient]
  );

  return {
    preview,
    result,
    loading,
    error,
    previewImport,
    runImport
  };
}
