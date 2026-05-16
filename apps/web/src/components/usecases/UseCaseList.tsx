import type { UseCase } from "@taskmanager/shared-types";
import { Plus } from "lucide-react";
import { Button } from "../ui/Button";
import { Pill, type PillTone } from "../ui/Pill";

interface UseCaseListProps {
  useCases: UseCase[];
  selectedId?: number | null;
  onCreate: () => void;
  onSelect: (useCase: UseCase) => void;
}

const statusLabels: Record<UseCase["status"], string> = {
  draft: "Entwurf",
  active: "Aktiv",
  done: "Erledigt",
  archived: "Archiviert"
};

const statusTones: Record<UseCase["status"], PillTone> = {
  draft: "mustard",
  active: "fern",
  done: "violet",
  archived: "steel"
};

const useCaseTones = ["violet", "fern", "tangerine", "teal", "magenta"] as const;

const useCaseToneMap: Record<(typeof useCaseTones)[number], string> = {
  violet: "bg-violet text-white",
  fern: "bg-fern text-white",
  tangerine: "bg-tangerine text-white",
  teal: "bg-teal text-white",
  magenta: "bg-magenta text-white"
};

export function UseCaseList({ useCases, selectedId, onCreate, onSelect }: UseCaseListProps) {
  return (
    <section className="sticky top-5 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-steel-50 p-4">
        <div>
          <h2 className="text-base font-bold text-ink">Use Cases</h2>
          <p className="text-xs font-semibold text-slate-500">{useCases.length} Einträge</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={onCreate}>
          Neu
        </Button>
      </div>
      {useCases.length === 0 ? <p className="m-3 rounded-xl border border-dashed border-line p-4 text-center text-sm text-slate-500">Keine Use Cases</p> : null}
      <div className="grid max-h-[540px] gap-1.5 overflow-y-auto p-1.5">
        {useCases.map((useCase) => (
          <UseCaseRow key={useCase.id} selected={selectedId === useCase.id} useCase={useCase} onSelect={onSelect} />
        ))}
      </div>
      <div className="border-t border-line bg-steel-50 p-3">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-steel-300 bg-white/70 px-3 py-2.5 text-sm font-semibold text-steel-700 transition hover:border-steel-600 hover:bg-white"
          onClick={onCreate}
        >
          <Plus size={16} />
          Use Case hinzufügen
        </button>
      </div>
    </section>
  );
}

function UseCaseRow({ useCase, selected, onSelect }: { useCase: UseCase; selected: boolean; onSelect: (useCase: UseCase) => void }) {
  const tone = useCaseTones[useCase.sortOrder % useCaseTones.length] ?? "violet";

  return (
    <button
      type="button"
      className={`grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg border-[1.5px] px-3 py-2.5 text-left transition hover:bg-steel-50 ${
        selected ? "border-steel-700 bg-steel-700/[0.05]" : "border-transparent"
      }`}
      onClick={() => onSelect(useCase)}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold ${useCaseToneMap[tone]}`}>UC{useCase.sortOrder}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{useCase.title}</span>
        <span className="block truncate font-mono text-[11px] text-slate-500">{useCase.slug}</span>
      </span>
      <Pill tone={statusTones[useCase.status]}>{statusLabels[useCase.status]}</Pill>
    </button>
  );
}
