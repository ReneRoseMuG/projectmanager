interface LoadMoreIndicatorProps {
  loadedCount: number;
  total: number;
  loadingMore: boolean;
}

/**
 * Dezenter Fortschrittshinweis für progressives Nachladen (ersetzt die Seitenzahl-Leiste).
 * Zeigt „Lädt … X von Y", solange weitere Blöcke nachgeladen werden; sonst nichts.
 */
export function LoadMoreIndicator({ loadedCount, total, loadingMore }: LoadMoreIndicatorProps) {
  if (!loadingMore || total <= loadedCount) {
    return null;
  }
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-xs text-steel-500" role="status" aria-live="polite">
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-steel-300 border-t-steel-600" aria-hidden="true" />
      Lädt … {loadedCount} von {total}
    </div>
  );
}
