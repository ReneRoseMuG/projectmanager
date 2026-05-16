import type { UseCase } from "@taskmanager/shared-types";
import { Badge } from "../ui/Badge";

interface UseCasePickerProps {
  useCases: UseCase[];
  selectedIds: number[];
  onChange: (useCaseIds: number[]) => void;
}

export function UseCasePicker({ useCases, selectedIds, onChange }: UseCasePickerProps) {
  const selected = new Set(selectedIds);

  const toggle = (useCaseId: number) => {
    const next = selected.has(useCaseId) ? selectedIds.filter((id) => id !== useCaseId) : [...selectedIds, useCaseId];
    onChange(next);
  };

  if (useCases.length === 0) {
    return <div className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-600">Keine Use Cases für die gewählten Features vorhanden</div>;
  }

  return (
    <div className="grid gap-2">
      {useCases.map((useCase) => (
        <label key={useCase.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-white p-3 hover:border-teal">
          <input className="mt-1 h-4 w-4" type="checkbox" checked={selected.has(useCase.id)} onChange={() => toggle(useCase.id)} />
          <span className="grid min-w-0 gap-1">
            <span className="font-medium text-ink">{useCase.title}</span>
            <span className="truncate text-xs text-slate-500">{useCase.slug}</span>
            <span>
              <Badge muted>{useCase.status}</Badge>
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
