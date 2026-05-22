import type { Tag } from "@taskmanager/shared-types";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTags } from "../../hooks/useTags";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { TagBadge } from "./TagBadge";

interface TagPickerProps {
  selected: Tag[];
  onChange: (tags: Tag[]) => void;
}

const colors = [
  "var(--color-steel-600)",
  "var(--color-crimson)",
  "var(--color-tangerine)",
  "var(--color-mustard)",
  "var(--color-fern)",
  "var(--color-teal)",
  "var(--color-violet)",
  "var(--color-magenta)"
];

export function TagPicker({ selected, onChange }: TagPickerProps) {
  const { tags, createTag } = useTags();
  const [name, setName] = useState("");
  const [color, setColor] = useState(colors[0] ?? "var(--color-steel-600)");

  const selectedIds = useMemo(() => new Set(selected.map((tag) => tag.id)), [selected]);

  const toggle = (tag: Tag) => {
    if (selectedIds.has(tag.id)) {
      onChange(selected.filter((item) => item.id !== tag.id));
      return;
    }
    onChange([...selected, tag]);
  };

  const addTag = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const tag = await createTag({ name: trimmed, color });
    onChange([...selected, tag]);
    setName("");
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={`rounded transition ${selectedIds.has(tag.id) ? "ring-2 ring-ink ring-offset-2" : "opacity-80 hover:opacity-100"}`}
            onClick={() => toggle(tag)}
          >
            <TagBadge tag={tag} />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <FormField label="Tag" className="min-w-44 flex-1">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10 rounded-md border border-line px-3 outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
          />
        </FormField>
        <div className="flex gap-1">
          {colors.map((item) => (
            <button
              key={item}
              type="button"
              title={item}
              aria-label={item}
              className={`h-8 w-8 rounded border border-white shadow-panel ${item === color ? "ring-2 ring-ink ring-offset-2" : ""}`}
              style={{ backgroundColor: item }}
              onClick={() => setColor(item)}
            />
          ))}
        </div>
        <Button icon={<Plus size={16} />} onClick={addTag}>
          Neu
        </Button>
      </div>
    </div>
  );
}
