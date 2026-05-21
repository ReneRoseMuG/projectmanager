import type { Feature } from "@taskmanager/shared-types";
import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "../ui/EmptyState";
import { RelationPanel } from "../ui/RelationPanel";
import { StatusPill } from "../ui/StatusPill";

interface FeatureRelationPanelProps {
  features: Feature[];
  selectedIds: number[];
  onChange: (featureIds: number[]) => void;
  onSave: () => Promise<void>;
  saving?: boolean;
  title?: string;
  emptyAvailable?: ReactNode;
  emptySelected?: ReactNode;
  showSave?: boolean;
}

const featureTones = ["violet", "tangerine", "teal", "fern", "magenta"] as const;

const featureToneMap: Record<(typeof featureTones)[number], string> = {
  violet: "bg-violet/10 text-violet",
  tangerine: "bg-tangerine/10 text-tangerine",
  teal: "bg-teal/10 text-teal",
  fern: "bg-fern/10 text-fern",
  magenta: "bg-magenta/10 text-magenta"
};

/** Feature-specific wrapper around the generic RelationPanel. */
export function FeatureRelationPanel({
  features,
  selectedIds,
  onChange,
  onSave,
  saving,
  title = "Features",
  emptyAvailable = <EmptyState icon={<BookOpen size={22} />} title="Keine Features vorhanden" body="Lege zuerst Features an, um sie hier zu verknüpfen." tone="violet" variant="tinted" />,
  emptySelected,
  showSave = true
}: FeatureRelationPanelProps) {
  return (
    <RelationPanel
      items={features}
      selectedIds={selectedIds}
      onChange={onChange}
      onSave={onSave}
      saving={saving}
      title={title}
      searchKeys={["title", "slug", "description"]}
      emptyAvailable={emptyAvailable}
      emptySelected={emptySelected}
      showSave={showSave}
      renderItem={(feature) => {
        const tone = featureTones[feature.id % featureTones.length] ?? "violet";

        return (
          <span className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
            <span className={`flex h-[38px] w-[38px] items-center justify-center rounded-xl ${featureToneMap[tone]}`} aria-hidden="true">
              <BookOpen size={17} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold text-ink">{feature.title}</span>
            </span>
            <span className="hidden md:inline-flex">
              <StatusPill kind="featureStatus" value={feature.status} />
            </span>
            <span className="hidden rounded-md bg-steel-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 md:inline-flex">{feature.useCaseCount} UCs</span>
          </span>
        );
      }}
    />
  );
}
