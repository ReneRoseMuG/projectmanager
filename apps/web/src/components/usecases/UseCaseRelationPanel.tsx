import type { UseCase } from "@taskmanager/shared-types";
import { FileText } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "../ui/EmptyState";
import { RelationPanel } from "../ui/RelationPanel";
import { StatusPill } from "../ui/StatusPill";

interface UseCaseRelationPanelProps {
  useCases: UseCase[];
  selectedIds: number[];
  onChange: (useCaseIds: number[]) => void;
  onSave: () => Promise<void>;
  saving?: boolean;
  title?: string;
  emptyAvailable?: ReactNode;
  emptySelected?: ReactNode;
  groupLabel?: (featureId: unknown) => string;
  showSave?: boolean;
}

/** Use-case-specific wrapper around the generic RelationPanel. */
export function UseCaseRelationPanel({
  useCases,
  selectedIds,
  onChange,
  onSave,
  saving,
  title = "Use Cases",
  emptyAvailable = <EmptyState icon={<FileText size={22} />} title="Keine Use Cases vorhanden" body="Für die gewählten Features sind noch keine Use Cases verfügbar." tone="fern" variant="tinted" />,
  emptySelected,
  groupLabel = (featureId) => `Feature #${String(featureId)}`,
  showSave = true
}: UseCaseRelationPanelProps) {
  return (
    <RelationPanel
      items={useCases}
      selectedIds={selectedIds}
      onChange={onChange}
      onSave={onSave}
      saving={saving}
      title={title}
      searchKeys={["title", "description"]}
      groupBy="featureId"
      groupLabel={groupLabel}
      emptyAvailable={emptyAvailable}
      emptySelected={emptySelected}
      showSave={showSave}
      renderItem={(useCase) => (
        <span className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto]">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-fern/10 text-fern" aria-hidden="true">
            <FileText size={17} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold text-ink">{useCase.title}</span>
          </span>
          <span className="hidden md:inline-flex">
            <StatusPill kind="featureStatus" value={useCase.status} />
          </span>
        </span>
      )}
    />
  );
}
