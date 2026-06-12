import type { Tag } from "@taskmanager/shared-types";
import { Minus, Plus, Tag as TagIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColorPicker } from "../ui/ColorPicker";
import { useTags } from "../../hooks/useTags";

interface TagPickerProps {
  selected: Tag[];
  onChange: (tags: Tag[]) => void;
  variant?: "default" | "panel";
}

const DEFAULT_TAG_COLOR = "var(--color-steel-600)";

function tagPillStyle(color: string) {
  return {
    borderColor: `color-mix(in srgb, ${color} 42%, white)`,
    backgroundColor: `color-mix(in srgb, ${color} 14%, white)`,
    color,
  };
}

function TagPill({ tag, onRemove }: { tag: Tag; onRemove: (id: number) => void }) {
  return (
    <span
      className="inline-flex min-w-0 max-w-[8rem] items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-5"
      style={tagPillStyle(tag.color)}
      title={tag.name}
    >
      <span className="min-w-0 truncate">{tag.name}</span>
      <button
        type="button"
        aria-label={`Tag "${tag.name}" entfernen`}
        className="ml-0.5 shrink-0 opacity-60 transition hover:opacity-100"
        onClick={() => onRemove(tag.id)}
      >
        <Minus size={10} />
      </button>
    </span>
  );
}

export function TagPicker({ selected, onChange, variant }: TagPickerProps) {
  const { tags, createTag } = useTags();
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_TAG_COLOR);
  const [listMaxHeight, setListMaxHeight] = useState(280);
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(() => new Set(selected.map((t) => t.id)), [selected]);
  const availableTags = useMemo(
    () =>
      tags.filter(
        (t) =>
          !selectedIds.has(t.id) &&
          t.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [tags, selectedIds, search],
  );

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (portalRef.current?.contains(target)) return;
      setOpen(false);
      setSearch("");
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Position des Dropdowns und nutzbare Listenhöhe an die reale Lage koppeln.
  // listMaxHeight nutzt den verfügbaren Platz statt einer festen Höhe, damit das
  // Panel nicht zu früh in den Scrollmodus schaltet (TKT-126 Punkt 1).
  const syncPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    const willDropUp = below < 300;
    setAnchorRect(rect);
    setDropUp(willDropUp);
    const space = willDropUp ? rect.top : below;
    // Suchfeld + Neues-Tag-Zeile + Ränder reservieren, sinnvolles Min/Max.
    setListMaxHeight(Math.max(140, Math.min(space - 140, 420)));
  }, []);

  useEffect(() => {
    if (!open) return;
    syncPosition();
    window.addEventListener("scroll", syncPosition, true);
    window.addEventListener("resize", syncPosition);
    return () => {
      window.removeEventListener("scroll", syncPosition, true);
      window.removeEventListener("resize", syncPosition);
    };
  }, [open, syncPosition]);

  // Nach dem Anlegen/Hinzufügen eines Tags wächst das Panel; die Portal-Position
  // muss neu berechnet werden, sonst bleibt das Dropdown stehen und wirkt
  // "nicht aktualisiert" (TKT-126 Punkt 2).
  useEffect(() => {
    if (open) syncPosition();
  }, [open, selected, syncPosition]);

  const removeTag = (tagId: number) => {
    onChange(selected.filter((t) => t.id !== tagId));
  };

  const addTag = (tag: Tag) => {
    onChange([...selected, tag]);
    setSearch("");
  };

  const createAndAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const tag = await createTag({ name: trimmed, color: newColor });
    onChange([...selected, tag]);
    setNewName("");
    setNewColor(DEFAULT_TAG_COLOR);
  };

  const openPicker = () => {
    if (!open) syncPosition();
    setOpen((v) => !v);
  };

  const addButton = (
    <button
      type="button"
      aria-label="Tag hinzufügen"
      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-line bg-white text-steel-500 transition hover:bg-shell hover:text-ink"
      onClick={openPicker}
    >
      <Plus size={13} />
    </button>
  );

  const dropdownContent = (
    <>
      <div className="p-2">
        <input
          className="h-8 w-full rounded border border-line px-2 text-sm outline-none focus:border-steel-600"
          placeholder="Suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: listMaxHeight }}>
        {availableTags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-shell"
            onClick={() => addTag(tag)}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            {tag.name}
          </button>
        ))}
        {availableTags.length === 0 && (
          <div className="px-3 py-2 text-xs text-steel-500">
            {search ? "Kein Tag gefunden" : "Alle Tags bereits ausgewählt"}
          </div>
        )}
      </div>
      <div className="border-t border-line p-2">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5">
          <ColorPicker value={newColor} onChange={setNewColor} />
          <input
            className="h-7 min-w-0 rounded border border-line px-2 text-xs outline-none focus:border-steel-600"
            placeholder="Neues Tag…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void createAndAdd();
              }
            }}
          />
          <button
            type="button"
            disabled={!newName.trim()}
            className="h-7 rounded border border-steel-300 px-2 text-xs font-medium text-steel-600 transition hover:border-steel-500 hover:text-ink disabled:opacity-50"
            onClick={() => void createAndAdd()}
          >
            Neu
          </button>
        </div>
      </div>
    </>
  );

  if (variant === "panel") {
    // Compute portal position: align dropdown right edge to container right edge, open below or above.
    const portalStyle: React.CSSProperties | undefined = anchorRect
      ? {
          position: "fixed",
          zIndex: 9999,
          width: 256,
          right: window.innerWidth - anchorRect.right,
          ...(dropUp
            ? { bottom: window.innerHeight - anchorRect.top + 4 }
            : { top: anchorRect.bottom + 4 }),
        }
      : undefined;

    return (
      <div ref={containerRef} className="relative rounded-lg border border-line bg-white shadow-sm">
        <div className="flex h-9 items-center gap-2 border-b border-line px-2.5">
          <TagIcon size={14} className="shrink-0 text-steel-500" />
          <span className="flex-1 text-xs font-bold uppercase tracking-wide text-steel-700">Tags</span>
          {addButton}
        </div>
        <div className="flex min-h-[2.5rem] flex-wrap items-start gap-1.5 p-2.5">
          {selected.map((tag) => (
            <TagPill key={tag.id} tag={tag} onRemove={removeTag} />
          ))}
        </div>
        {open && portalStyle
          ? createPortal(
              <div
                ref={portalRef}
                style={portalStyle}
                className="rounded-md border border-line bg-white shadow-md"
              >
                {dropdownContent}
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  }

  const dropdownPositionClass = dropUp ? "bottom-full mb-1" : "top-full mt-1";

  return (
    <div ref={containerRef} className="grid gap-1">
      <div className="flex items-center gap-1.5">
        <TagIcon size={12} className="shrink-0 text-steel-400" />
        <span className="text-xs font-bold uppercase tracking-wide text-steel-700">Tags</span>
      </div>
      <div className="relative min-h-[2.5rem] rounded-md border border-line bg-white px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {selected.map((tag) => (
            <TagPill key={tag.id} tag={tag} onRemove={removeTag} />
          ))}
          {addButton}
        </div>
        {open ? (
          <div className={`absolute right-0 ${dropdownPositionClass} z-50 w-64 rounded-md border border-line bg-white shadow-md`}>
            {dropdownContent}
          </div>
        ) : null}
      </div>
    </div>
  );
}
