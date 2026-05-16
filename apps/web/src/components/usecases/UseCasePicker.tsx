import type { UseCase } from "@taskmanager/shared-types";
import { Check, FileText } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { Pill, type PillTone } from "../ui/Pill";

interface UseCasePickerProps {
  useCases: UseCase[];
  selectedIds: number[];
  onChange: (useCaseIds: number[]) => void;
}

const statusLabels: Record<UseCase["status"], string> = {
  draft: "Entwurf",
  active: "Aktiv",
  done: "Erledigt",
  archived: "Archiviert"
};

const statusTone: Record<UseCase["status"], PillTone> = {
  draft: "mustard",
  active: "fern",
  done: "violet",
  archived: "steel"
};

export function UseCasePicker({ useCases, selectedIds, onChange }: UseCasePickerProps) {
  const selected = new Set(selectedIds);

  const toggle = (useCaseId: number) => {
    const next = selected.has(useCaseId) ? selectedIds.filter((id) => id !== useCaseId) : [...selectedIds, useCaseId];
    onChange(next);
  };

  if (useCases.length === 0) {
    return <EmptyState icon={<FileText size={22} />} title="Keine Use Cases vorhanden" body="Für die gewählten Features sind noch keine Use Cases verfügbar." tone="fern" variant="tinted" />;
  }

  return (
    <div className="grid gap-2">
      {useCases.map((useCase) => {
        const checked = selected.has(useCase.id);
        return (
          <label
            key={useCase.id}
            className={`grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3.5 rounded-xl border-[1.5px] bg-white px-4 py-3.5 transition hover:border-steel-500 md:grid-cols-[auto_auto_minmax(0,1fr)_auto] ${
              checked ? "border-steel-700 bg-steel-700/[0.04]" : "border-line"
            }`}
          >
            <input className="peer sr-only" type="checkbox" checked={checked} onChange={() => toggle(useCase.id)} />
            <span
              className={`flex h-[22px] w-[22px] items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-steel-500 ${
                checked ? "border-steel-700 bg-steel-700 text-white" : "border-steel-400 bg-white"
              }`}
              aria-hidden="true"
            >
              {checked ? <Check size={15} strokeWidth={3} /> : null}
            </span>
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-fern/10 text-fern" aria-hidden="true">
              <FileText size={17} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold text-ink">{useCase.title}</span>
              <span className="block truncate font-mono text-[11px] text-slate-500">{useCase.slug}</span>
            </span>
            <span className="hidden md:inline-flex">
              <Pill tone={statusTone[useCase.status]}>{statusLabels[useCase.status]}</Pill>
            </span>
          </label>
        );
      })}
    </div>
  );
}
