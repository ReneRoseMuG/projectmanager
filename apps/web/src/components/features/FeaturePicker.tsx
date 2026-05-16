import type { Feature } from "@taskmanager/shared-types";
import { Badge } from "../ui/Badge";

interface FeaturePickerProps {
  features: Feature[];
  selectedIds: number[];
  onChange: (featureIds: number[]) => void;
}

export function FeaturePicker({ features, selectedIds, onChange }: FeaturePickerProps) {
  const selected = new Set(selectedIds);

  const toggle = (featureId: number) => {
    const next = selected.has(featureId) ? selectedIds.filter((id) => id !== featureId) : [...selectedIds, featureId];
    onChange(next);
  };

  if (features.length === 0) {
    return <div className="rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-600">Keine Features vorhanden</div>;
  }

  return (
    <div className="grid gap-2">
      {features.map((feature) => (
        <label key={feature.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-white p-3 hover:border-teal">
          <input className="mt-1 h-4 w-4" type="checkbox" checked={selected.has(feature.id)} onChange={() => toggle(feature.id)} />
          <span className="grid min-w-0 gap-1">
            <span className="font-medium text-ink">{feature.title}</span>
            <span className="truncate text-xs text-slate-500">{feature.slug}</span>
            <span>
              <Badge muted>{feature.status}</Badge>
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
