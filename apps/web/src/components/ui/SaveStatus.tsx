import type { AutoSaveStatus } from "../../hooks/useAutoSave";

type SaveStatusTone = "onDark" | "onLight";

interface SaveStatusProps {
  status: AutoSaveStatus;
  errorMessage?: string | null;
  /** Color scheme: "onDark" for the gradient hero header, "onLight" for light surfaces. */
  tone?: SaveStatusTone;
}

const toneClasses: Record<SaveStatusTone, { saving: string; saved: string; error: string }> = {
  onDark: { saving: "text-white/60", saved: "text-white/80", error: "text-crimson/80" },
  onLight: { saving: "text-steel-500", saved: "text-fern", error: "text-crimson" },
};

export function SaveStatus({ status, errorMessage, tone = "onDark" }: SaveStatusProps) {
  if (status === "idle") return null;
  const classes = toneClasses[tone];
  if (status === "saving") {
    return <span className={`text-xs ${classes.saving}`}>Speichern…</span>;
  }
  if (status === "saved") {
    return <span className={`text-xs ${classes.saved}`}>Gespeichert</span>;
  }
  return (
    <span className={`text-xs ${classes.error}`} title={errorMessage ?? undefined}>
      Fehler beim Speichern
    </span>
  );
}
