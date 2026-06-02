import type { Tag } from "@taskmanager/shared-types";
import { Check, GitMerge, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { deleteTag, updateTag } from "../../api/tags";
import { errorMessage } from "../../hooks/errors";
import { useTags } from "../../hooks/useTags";
import { Button } from "../ui/Button";
import { ColorPicker } from "../ui/ColorPicker";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { Section } from "../ui/Section";
import { useToast } from "../ui/ToastProvider";

const defaultTagColor = "var(--color-steel-700)";

type SortMode = "usage" | "name" | "newest";

function TagRow({ tag, onReload }: { tag: Tag; onReload: () => Promise<void> }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);

  const save = async () => {
    try {
      await updateTag(tag.id, { name, color, expectedVersion: tag.version });
      await onReload();
      setEditing(false);
      showToast({ tone: "success", title: "Tag gespeichert" });
    } catch (tagError) {
      showToast({ tone: "error", title: "Tag konnte nicht gespeichert werden", message: errorMessage(tagError) });
    }
  };

  const remove = async () => {
    const approved = await confirm({
      title: "Tag löschen?",
      body: `Der Tag "${tag.name}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }
    try {
      await deleteTag(tag.id);
      await onReload();
      showToast({ tone: "info", title: "Tag gelöscht" });
    } catch (tagError) {
      showToast({ tone: "error", title: "Tag konnte nicht gelöscht werden", message: errorMessage(tagError) });
    }
  };

  const counts = tag.usageCounts;
  const totalUsage = counts ? counts.projects + counts.milestones + counts.tasks + counts.tickets : 0;
  const usageLabel = counts
    ? `${counts.projects} Projekte · ${counts.milestones} Meilensteine · ${counts.tasks} Aufgaben · ${counts.tickets} Tickets`
    : "–";

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(9rem,1fr)_7rem_auto] items-center gap-3 border-t border-line py-3 text-sm">
      <span className="h-6 w-6 rounded-full border border-white shadow-sm" style={{ backgroundColor: editing ? color : tag.color }} />
      {editing ? (
        <input className="h-9 min-w-0 rounded-md border border-line px-3 outline-none focus:border-magenta" value={name} onChange={(event) => setName(event.target.value)} />
      ) : (
        <span className="min-w-0 truncate font-semibold text-ink">{tag.name}</span>
      )}
      <span className="text-steel-500">{usageLabel}</span>
      {totalUsage === 0 ? (
        <span className="rounded-md border border-line bg-shell px-2 py-1 text-center text-xs font-semibold text-steel-500">verwaist</span>
      ) : (
        <span className="rounded-md border border-fern/30 bg-fern/10 px-2 py-1 text-center text-xs font-semibold text-fern">aktiv</span>
      )}
      <div className="flex justify-end gap-1">
        {editing ? (
          <>
            <Button aria-label="Speichern" title="Speichern" icon={<Check size={18} />} className="h-10 w-10" onClick={save} />
            <Button aria-label="Abbrechen" title="Abbrechen" icon={<X size={18} />} variant="ghost" className="h-10 w-10" onClick={() => setEditing(false)} />
          </>
        ) : (
          <>
            <Button aria-label="Bearbeiten" title="Bearbeiten" icon={<Pencil size={18} />} variant="ghost" className="h-10 w-10" onClick={() => setEditing(true)} />
            <Button aria-label="Mergen" title="Mergen" icon={<GitMerge size={18} />} variant="ghost" className="h-10 w-10" onClick={() => showToast({ tone: "info", title: "Tag-Merge ist ein Folgeauftrag" })} />
            <Button aria-label="Löschen" title="Löschen" icon={<Trash2 size={18} />} variant="ghost" className="h-10 w-10 text-crimson hover:bg-crimson/10" onClick={() => void remove()} />
          </>
        )}
      </div>
      {editing ? (
        <div className="col-span-5 pl-9">
          <ColorPicker value={color} onChange={setColor} />
        </div>
      ) : null}
    </div>
  );
}

export function TagManager() {
  const { showToast } = useToast();
  const tags = useTags();
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultTagColor);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("usage");

  const filteredTags = useMemo(() => {
    const next = tags.tags.filter((tag) => tag.name.toLowerCase().includes(query.trim().toLowerCase()));
    if (sort === "name") {
      return [...next].sort((left, right) => left.name.localeCompare(right.name));
    }
    if (sort === "newest") {
      return [...next].reverse();
    }
    return next;
  }, [query, sort, tags.tags]);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    try {
      await tags.createTag({ name: trimmed, color });
      setName("");
      showToast({ tone: "success", title: "Tag angelegt" });
    } catch (tagError) {
      showToast({ tone: "error", title: "Tag konnte nicht angelegt werden", message: errorMessage(tagError) });
    }
  };

  return (
    <div className="grid gap-4">
          <Section>
            <h2 className="mb-3 text-sm font-bold uppercase text-steel-500">Neuer Tag</h2>
            <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
              <span className="h-9 w-9 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
              <input className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-magenta" placeholder="Tag-Name" value={name} onChange={(event) => setName(event.target.value)} />
              <Button variant="primary" icon={<Plus size={16} />} onClick={create}>
                Anlegen
              </Button>
            </div>
            <div className="mt-3">
              <ColorPicker value={color} onChange={setColor} />
            </div>
          </Section>

          <Section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-ink">Alle Tags · {filteredTags.length} Einträge</h2>
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
                  <input className="h-9 w-56 rounded-md border border-line pl-8 pr-3 text-sm outline-none focus:border-magenta" placeholder="Tags suchen" value={query} onChange={(event) => setQuery(event.target.value)} />
                </label>
                <select className="h-9 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-magenta" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                  <option value="usage">Verwendung</option>
                  <option value="name">Name A-Z</option>
                  <option value="newest">Neueste</option>
                </select>
              </div>
            </div>
            <div className="hidden grid-cols-[auto_minmax(0,1fr)_minmax(9rem,1fr)_7rem_auto] gap-3 border-b border-line pb-2 text-xs font-bold uppercase text-steel-500 md:grid">
              <span>Farbe</span>
              <span>Name</span>
              <span>Verwendungen</span>
              <span>Status</span>
              <span className="text-right">Aktionen</span>
            </div>
            {tags.loading ? <div className="py-8 text-center text-sm text-steel-500">Tags werden geladen.</div> : null}
            {!tags.loading && filteredTags.length === 0 ? <div className="rounded-lg border border-dashed border-line bg-shell/60 p-8 text-center text-sm text-steel-500">Keine Tags gefunden.</div> : null}
            {!tags.loading ? filteredTags.map((tag) => <TagRow key={tag.id} tag={tag} onReload={tags.reload} />) : null}
          </Section>

          <section className="flex flex-wrap gap-2 text-xs font-semibold text-steel-500">
            <span className="rounded-md bg-steel-100 px-2 py-1">Steel: Struktur</span>
            <span className="rounded-md bg-fern/10 px-2 py-1 text-fern">Fern: aktiv</span>
            <span className="rounded-md bg-tangerine/10 px-2 py-1 text-tangerine">Tangerine: Prüfung</span>
            <span className="rounded-md bg-magenta/10 px-2 py-1 text-magenta">Magenta: Sammlung</span>
          </section>
    </div>
  );
}
