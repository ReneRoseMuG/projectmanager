import type { Tag } from "@taskmanager/shared-types";
import { FileText, MessageCircle, Paperclip, Plus, Tag as TagIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type TagLabelMode = "full" | "short";

interface CardFooterBarProps {
  tags: Tag[];
  allTags?: Tag[];
  onTagsChange?: (tagIds: number[]) => void | Promise<void>;
  attachmentCount?: number;
  noteCount?: number;
  commentCount?: number;
  bordered?: boolean;
}

interface TagPillProps {
  tag: Tag;
}

export function abbreviateTag(name: string, mode: TagLabelMode): string {
  const trimmed = name.trim();
  if (mode === "full" || trimmed.length === 0) {
    return trimmed;
  }

  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    return words
      .map((word) => word[0]?.toLocaleUpperCase("de-DE") ?? "")
      .join("")
      .slice(0, 4);
  }

  if (trimmed.length <= 4) {
    return trimmed;
  }

  return trimmed.slice(0, Math.min(4, Math.ceil(trimmed.length / 2)));
}

function tagStyle(color: string) {
  return {
    borderColor: `color-mix(in srgb, ${color} 42%, white)`,
    backgroundColor: `color-mix(in srgb, ${color} 14%, white)`,
    color
  };
}

function TagPill({ tag }: TagPillProps) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [abbreviated, setAbbreviated] = useState(false);

  useEffect(() => {
    const label = labelRef.current;
    const measure = measureRef.current;
    if (!label || !measure || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateLabel = () => {
      setAbbreviated(label.clientWidth > 0 && measure.scrollWidth > label.clientWidth);
    };
    updateLabel();

    const resizeObserver = new ResizeObserver(updateLabel);
    resizeObserver.observe(label);
    return () => resizeObserver.disconnect();
  }, [tag.name]);

  return (
    <span
      className="relative inline-flex min-w-0 max-w-[6.5rem] items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-5"
      style={tagStyle(tag.color)}
      title={tag.name}
    >
      <span ref={labelRef} className="min-w-0 truncate">
        {abbreviateTag(tag.name, abbreviated ? "short" : "full")}
      </span>
      <span ref={measureRef} className="pointer-events-none absolute -left-[9999px] top-0 whitespace-nowrap text-[11px] font-semibold">
        {tag.name}
      </span>
    </span>
  );
}

function Counter({ icon, value, label }: { icon: JSX.Element; value: number; label: string }) {
  const counterClass = value > 0 ? "text-steel-500" : "text-steel-300";
  return (
    <span className={`inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-semibold ${counterClass}`} aria-label={`${value} ${label}`}>
      {icon}
      <span>{value}</span>
    </span>
  );
}

export function CardFooterBar({
  tags,
  allTags,
  onTagsChange,
  attachmentCount = 0,
  noteCount = 0,
  commentCount = 0,
  bordered = true
}: CardFooterBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const propTagIds = useMemo(() => tags.map((tag) => tag.id), [tags]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(propTagIds);
  const canEditTags = Boolean(onTagsChange && allTags && allTags.length > 0);
  const visibleTags = useMemo(() => {
    if (!allTags || allTags.length === 0) {
      return tags;
    }

    const allTagsById = new Map(allTags.map((tag) => [tag.id, tag]));
    return selectedTagIds.map((tagId) => allTagsById.get(tagId) ?? tags.find((tag) => tag.id === tagId)).filter((tag): tag is Tag => Boolean(tag));
  }, [allTags, selectedTagIds, tags]);

  useEffect(() => {
    setSelectedTagIds(propTagIds);
  }, [propTagIds]);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) {
        return;
      }
      setPickerOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPickerOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [pickerOpen]);

  const toggleTag = async (tagId: number) => {
    if (!onTagsChange || pending) {
      return;
    }

    const previousIds = selectedTagIds;
    const nextIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((selectedTagId) => selectedTagId !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(nextIds);
    setPending(true);

    try {
      await onTagsChange(nextIds);
    } catch {
      setSelectedTagIds(previousIds);
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`relative flex min-w-0 flex-wrap items-center justify-between gap-2 ${bordered ? "border-t border-line pt-2" : ""}`}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {visibleTags.map((tag) => (
          <TagPill key={tag.id} tag={tag} />
        ))}
        {canEditTags ? (
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-white text-steel-600 shadow-sm transition hover:border-steel-300 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Tags bearbeiten"
            title="Tags bearbeiten"
            aria-expanded={pickerOpen}
            disabled={pending}
            onClick={() => setPickerOpen((open) => !open)}
          >
            <Plus size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Counter icon={<Paperclip size={14} aria-hidden="true" />} value={attachmentCount} label="Anhänge" />
        <Counter icon={<FileText size={14} aria-hidden="true" />} value={noteCount} label="Notizen" />
        <Counter icon={<MessageCircle size={14} aria-hidden="true" />} value={commentCount} label="Kommentare" />
      </div>

      {canEditTags && pickerOpen ? (
        <div className="absolute bottom-full left-0 z-40 mb-2 grid w-56 gap-1 rounded-lg border border-line bg-white p-2 shadow-panel">
          {allTags?.map((tag) => {
            const checked = selectedTagIds.includes(tag.id);
            return (
              <label key={tag.id} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-steel-700 hover:bg-shell">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line text-fern accent-fern"
                  checked={checked}
                  disabled={pending}
                  onChange={() => void toggleTag(tag.id)}
                />
                <TagIcon size={14} className="shrink-0 text-steel-400" aria-hidden="true" />
                <span className="min-w-0 truncate">{tag.name}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
