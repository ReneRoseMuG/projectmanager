import type { Tag } from "@taskmanager/shared-types";
import { Check, GitMerge, Pencil, Plus, Search, Tag as TagIcon, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { deleteTag, updateTag } from "../../api/tags";
import { errorMessage } from "../../hooks/errors";
import { useTags } from "../../hooks/useTags";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { useToast } from "../ui/ToastProvider";

const palette = ["#2E5984", "#D9416A", "#ED8C3A", "#E2BA2C", "#4D9359", "#2F8E96", "#6A40BE", "#C13D9A"];
const defaultTagColor = "#2E5984";
const cardClass = "rounded-lg border border-line bg-white p-4 shadow-[0_10px_28px_rgba(31,43,56,0.06)]";

type SortMode = "usage" | "name" | "newest";

function TagRow({ tag, onReload }: { tag: Tag; onReload: () => Promise<void> }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);

  const save = async () => {
    try {
      await updateTag(tag.id, { name, color });
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

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(9rem,1fr)_7rem_auto] items-center gap-3 border-t border-line py-3 text-sm">
      <span className="h-6 w-6 rounded-full border border-white shadow-sm" style={{ backgroundColor: editing ? color : tag.color }} />
      {editing ? (
        <input className="h-9 min-w-0 rounded-md border border-line px-3 outline-none focus:border-magenta" value={name} onChange={(event) => setName(event.target.value)} />
      ) : (
        <span className="min-w-0 truncate font-semibold text-ink">{tag.name}</span>
      )}
      <span className="text-slate-500">0 · Projekte 0 · Tasks 0 · Notizen 0</span>
      <span className="rounded-full border border-line bg-shell px-2 py-1 text-center text-xs font-semibold text-slate-500">verwaist</span>
      <div className="flex justify-end gap-1">
        {editing ? (
          <>
            <Button aria-label="Speichern" title="Speichern" icon={<Check size={15} />} className="h-8 w-8" onClick={save} />
            <Button aria-label="Abbrechen" title="Abbrechen" icon={<X size={15} />} variant="ghost" className="h-8 w-8" onClick={() => setEditing(false)} />
          </>
        ) : (
          <>
            <Button aria-label="Bearbeiten" title="Bearbeiten" icon={<Pencil size={15} />} variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)} />
            <Button aria-label="Mergen" title="Mergen" icon={<GitMerge size={15} />} variant="ghost" className="h-8 w-8" onClick={() => showToast({ tone: "info", title: "Tag-Merge ist ein Folgeauftrag" })} />
            <Button aria-label="Löschen" title="Löschen" icon={<Trash2 size={15} />} variant="ghost" className="h-8 w-8 text-crimson hover:bg-crimson/10" onClick={() => void remove()} />
          </>
        )}
      </div>
      {editing ? (
        <div className="col-span-5 flex flex-wrap gap-2 pl-9">
          {palette.map((swatch) => (
            <button key={swatch} type="button" className={`h-7 w-7 rounded-full border-2 ${color === swatch ? "border-steel-900" : "border-white"}`} style={{ backgroundColor: swatch }} onClick={() => setColor(swatch)} aria-label={`Farbe ${swatch}`} />
          ))}
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
    <div className="mx-auto grid max-w-[920px] gap-4">
      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
        <header className="bg-gradient-to-br from-magenta to-[#d558aa] px-5 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/12">
              <TagIcon size={21} />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-normal">Tags verwalten</h1>
              <p className="text-sm text-white/75">{tags.tags.length} Tags · genutzt in 0 Projekten, 0 Tasks, 0 Notizen</p>
            </div>
          </div>
        </header>
        <div className="grid gap-4 p-4 md:p-5">
          <section className={cardClass}>
            <h2 className="mb-3 text-sm font-bold uppercase text-slate-500">Neuer Tag</h2>
            <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
              <span className="h-9 w-9 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
              <input className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-magenta" placeholder="Tag-Name" value={name} onChange={(event) => setName(event.target.value)} />
              <Button variant="primary" icon={<Plus size={16} />} onClick={create}>
                Anlegen
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {palette.map((swatch) => (
                <button key={swatch} type="button" className={`h-8 w-8 rounded-full border-2 ${color === swatch ? "border-steel-900" : "border-white"}`} style={{ backgroundColor: swatch }} onClick={() => setColor(swatch)} aria-label={`Farbe ${swatch}`} />
              ))}
            </div>
          </section>

          <section className={cardClass}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-ink">Alle Tags · {filteredTags.length} Einträge</h2>
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="h-9 w-56 rounded-md border border-line pl-8 pr-3 text-sm outline-none focus:border-magenta" placeholder="Tags suchen" value={query} onChange={(event) => setQuery(event.target.value)} />
                </label>
                <select className="h-9 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-magenta" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                  <option value="usage">Verwendung</option>
                  <option value="name">Name A-Z</option>
                  <option value="newest">Neueste</option>
                </select>
              </div>
            </div>
            <div className="hidden grid-cols-[auto_minmax(0,1fr)_minmax(9rem,1fr)_7rem_auto] gap-3 border-b border-line pb-2 text-xs font-bold uppercase text-slate-500 md:grid">
              <span>Farbe</span>
              <span>Name</span>
              <span>Verwendungen</span>
              <span>Status</span>
              <span className="text-right">Aktionen</span>
            </div>
            {tags.loading ? <div className="py-8 text-center text-sm text-slate-500">Tags werden geladen.</div> : null}
            {!tags.loading && filteredTags.length === 0 ? <div className="rounded-lg border border-dashed border-line bg-shell/60 p-8 text-center text-sm text-slate-500">Keine Tags gefunden.</div> : null}
            {!tags.loading ? filteredTags.map((tag) => <TagRow key={tag.id} tag={tag} onReload={tags.reload} />) : null}
          </section>

          <section className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full bg-steel-100 px-2 py-1">Steel: Struktur</span>
            <span className="rounded-full bg-fern/10 px-2 py-1 text-fern">Fern: aktiv</span>
            <span className="rounded-full bg-tangerine/10 px-2 py-1 text-tangerine">Tangerine: Prüfung</span>
            <span className="rounded-full bg-magenta/10 px-2 py-1 text-magenta">Magenta: Sammlung</span>
          </section>
        </div>
      </section>
    </div>
  );
}
