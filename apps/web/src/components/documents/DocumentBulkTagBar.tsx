import type { Tag } from "@taskmanager/shared-types";
import { Tags, X } from "lucide-react";
import { TagPicker } from "../tags/TagPicker";
import { documentBulkActionLabels } from "../../utils/domainLabels";

interface DocumentBulkTagBarProps {
  count: number;
  selectedTags: Tag[];
  onSelectedTagsChange: (tags: Tag[]) => void;
  onApply: () => void;
  onClear: () => void;
  pending: boolean;
}

export function DocumentBulkTagBar({
  count,
  selectedTags,
  onSelectedTagsChange,
  onApply,
  onClear,
  pending,
}: DocumentBulkTagBarProps) {
  return (
    <section
      aria-label={documentBulkActionLabels.selectionLabel}
      className="flex flex-col gap-3 rounded-lg border border-steel-200 bg-steel-50 p-3 shadow-sm lg:flex-row lg:items-center"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-steel-800">
        <Tags size={17} aria-hidden="true" />
        <span>{documentBulkActionLabels.selectedCount(count)}</span>
      </div>
      <div className="min-w-0 flex-1 lg:max-w-md">
        <TagPicker selected={selectedTags} onChange={onSelectedTagsChange} domain="dms" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || selectedTags.length === 0}
          onClick={onApply}
          className="rounded-md bg-steel-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-steel-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? documentBulkActionLabels.addingTags : documentBulkActionLabels.addTags}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-steel-600 transition hover:bg-shell hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={14} aria-hidden="true" />
          {documentBulkActionLabels.clearSelection}
        </button>
      </div>
    </section>
  );
}
