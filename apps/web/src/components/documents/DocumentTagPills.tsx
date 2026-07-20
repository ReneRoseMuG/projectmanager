import type { Tag } from "@taskmanager/shared-types";

interface DocumentTagPillsProps {
  tags: Tag[];
  maxVisible?: number;
}

export function DocumentTagPills({ tags, maxVisible = 3 }: DocumentTagPillsProps) {
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenTags = tags.slice(maxVisible);
  return (
    <div className="flex min-w-0 flex-wrap gap-1" aria-label={tags.length > 0 ? "Dokument-Tags" : "Keine Dokument-Tags"}>
      {visibleTags.map((tag) => (
        <span
          key={tag.id}
          className="flex min-w-0 max-w-36 items-center gap-1 rounded-md border border-line bg-white px-2 py-0.5 text-xs text-steel-700"
          title={tag.name}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full border border-black/10"
            style={{ backgroundColor: tag.color }}
            aria-hidden="true"
          />
          <span className="truncate">{tag.name}</span>
        </span>
      ))}
      {hiddenTags.length > 0 ? (
        <span
          className="rounded-md border border-line bg-steel-50 px-2 py-0.5 text-xs font-medium text-steel-600"
          title={hiddenTags.map((tag) => tag.name).join(", ")}
          aria-label={`${hiddenTags.length} weitere Tags: ${hiddenTags.map((tag) => tag.name).join(", ")}`}
        >
          +{hiddenTags.length}
        </span>
      ) : null}
    </div>
  );
}
