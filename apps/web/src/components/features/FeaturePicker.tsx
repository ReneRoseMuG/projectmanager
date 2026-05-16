import type { Feature } from "@taskmanager/shared-types";
import { BookOpen, Check } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { Pill, type PillTone } from "../ui/Pill";

interface FeaturePickerProps {
  features: Feature[];
  selectedIds: number[];
  onChange: (featureIds: number[]) => void;
}

const statusLabels: Record<Feature["status"], string> = {
  draft: "Entwurf",
  active: "Aktiv",
  done: "Erledigt",
  archived: "Archiviert"
};

const statusTone: Record<Feature["status"], PillTone> = {
  draft: "mustard",
  active: "fern",
  done: "violet",
  archived: "steel"
};

const featureTones = ["violet", "tangerine", "teal", "fern", "magenta"] as const;

const featureToneMap: Record<(typeof featureTones)[number], string> = {
  violet: "bg-violet/10 text-violet",
  tangerine: "bg-tangerine/10 text-tangerine",
  teal: "bg-teal/10 text-teal",
  fern: "bg-fern/10 text-fern",
  magenta: "bg-magenta/10 text-magenta"
};

export function FeaturePicker({ features, selectedIds, onChange }: FeaturePickerProps) {
  const selected = new Set(selectedIds);

  const toggle = (featureId: number) => {
    const next = selected.has(featureId) ? selectedIds.filter((id) => id !== featureId) : [...selectedIds, featureId];
    onChange(next);
  };

  if (features.length === 0) {
    return <EmptyState icon={<BookOpen size={22} />} title="Keine Features vorhanden" body="Lege zuerst Features an, um sie hier zu verknüpfen." tone="violet" variant="tinted" />;
  }

  return (
    <div className="grid gap-2">
      {features.map((feature) => {
        const checked = selected.has(feature.id);
        const tone = featureTones[feature.id % featureTones.length] ?? "violet";

        return (
          <label
            key={feature.id}
            className={`grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3.5 rounded-xl border-[1.5px] bg-white px-4 py-3.5 transition hover:border-steel-500 md:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] ${
              checked ? "border-steel-700 bg-steel-700/[0.04]" : "border-line"
            }`}
          >
            <input className="peer sr-only" type="checkbox" checked={checked} onChange={() => toggle(feature.id)} />
            <span
              className={`flex h-[22px] w-[22px] items-center justify-center rounded-md border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-steel-500 ${
                checked ? "border-steel-700 bg-steel-700 text-white" : "border-steel-400 bg-white"
              }`}
              aria-hidden="true"
            >
              {checked ? <Check size={15} strokeWidth={3} /> : null}
            </span>
            <span className={`flex h-[38px] w-[38px] items-center justify-center rounded-xl ${featureToneMap[tone]}`} aria-hidden="true">
              <BookOpen size={17} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold text-ink">{feature.title}</span>
              <span className="block truncate font-mono text-[11px] text-slate-500">{feature.slug}</span>
            </span>
            <span className="hidden md:inline-flex">
              <Pill tone={statusTone[feature.status]}>{statusLabels[feature.status]}</Pill>
            </span>
            <span className="hidden rounded-md bg-steel-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 md:inline-flex">{feature.useCaseCount} UCs</span>
          </label>
        );
      })}
    </div>
  );
}
