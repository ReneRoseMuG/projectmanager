import type { AutoSaveStatus } from "../../hooks/useAutoSave";

interface SaveStatusProps {
  status: AutoSaveStatus;
  errorMessage?: string | null;
}

export function SaveStatus({ status, errorMessage }: SaveStatusProps) {
  if (status === "idle") return null;
  if (status === "saving") {
    return <span className="text-xs text-white/60">Speichern…</span>;
  }
  if (status === "saved") {
    return <span className="text-xs text-white/80">Gespeichert</span>;
  }
  return (
    <span className="text-xs text-crimson/80" title={errorMessage ?? undefined}>
      Fehler beim Speichern
    </span>
  );
}
