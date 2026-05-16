import type { UseCase } from "@taskmanager/shared-types";
import { Plus } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

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

export function UseCaseList({ useCases, selectedId, onCreate, onSelect }: UseCaseListProps) {
  return (
    <section className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Use Cases</h2>
        <Button variant="primary" icon={<Plus size={16} />} onClick={onCreate}>
          Neu
        </Button>
      </div>
      {useCases.length === 0 ? <p className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-600">Keine Use Cases</p> : null}
      <div className="grid gap-2">
        {useCases.map((useCase) => (
          <button
            key={useCase.id}
            type="button"
            className={`grid gap-2 rounded-md border p-3 text-left transition ${
              selectedId === useCase.id ? "border-teal bg-teal/5" : "border-line hover:border-teal"
            }`}
            onClick={() => onSelect(useCase)}
          >
            <span className="font-medium text-ink">{useCase.title}</span>
            <span className="text-xs text-slate-500">{useCase.slug}</span>
            <span>
              <Badge muted>{statusLabels[useCase.status]}</Badge>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
