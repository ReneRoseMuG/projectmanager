import type { WikiPage, WikiPageInput } from "@taskmanager/shared-types";
import { Eye, History, Save, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { WikiTreeNode } from "../../hooks/useWiki";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { MarkdownEditor } from "../ui/MarkdownEditor";
import { Modal } from "../ui/Modal";

interface WikiPageFormProps {
  open: boolean;
  page?: WikiPage | null;
  parent?: WikiPage | null;
  tree: WikiTreeNode[];
  onSubmit: (input: WikiPageInput) => Promise<void>;
  onClose: () => void;
}

const cardClass = "rounded-lg border border-line bg-white p-4 shadow-[0_10px_28px_rgba(31,43,56,0.06)]";

function flattenTree(nodes: WikiTreeNode[]): WikiPage[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export function WikiPageForm({ open, page, parent, tree, onSubmit, onClose }: WikiPageFormProps) {
  const { confirm } = useConfirm();
  const pages = useMemo(() => flattenTree(tree).filter((item) => item.id !== page?.id), [page?.id, tree]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(page?.title ?? "");
    setSlug(page?.slug ?? (parent ? `${parent.slug}/` : ""));
    setParentId(page?.parentId ?? parent?.id ?? null);
    setSortOrder(page?.sortOrder ?? 0);
    setContent(page?.content ?? "");
    setPreview(false);
    setVersionsOpen(false);
    setDirty(false);
  }, [open, page, parent]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ title, slug, parentId, sortOrder, content });
      setDirty(false);
      onClose();
    } catch {
      // Error feedback is handled by the page-level toast.
    } finally {
      setSaving(false);
    }
  };

  const requestClose = async () => {
    if (!dirty) {
      onClose();
      return;
    }
    const approved = await confirm({
      title: "Änderungen verwerfen?",
      body: "Die Wiki-Seite enthält ungespeicherte Änderungen.",
      severity: "warn",
      confirmLabel: "Verwerfen"
    });
    if (approved) {
      onClose();
    }
  };

  return (
    <Modal open={open} title={page ? "Wiki-Seite bearbeiten" : "Neue Wiki-Seite"} size="xl" showHeader={false} bodyClassName="p-0" onClose={() => void requestClose()}>
      <form className="flex max-h-[calc(100vh-64px)] flex-col bg-shell" onSubmit={submit}>
        <header className="bg-gradient-to-br from-teal to-[#3fa9b1] px-5 py-5 text-white md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-white/75">
                <span>Wiki</span>
                <span>›</span>
                <span>{parent?.title ?? "Root"}</span>
                <span>›</span>
                <span>Bearbeiten</span>
              </div>
              <h2 className="text-2xl font-bold tracking-normal">{title || (page ? "Wiki-Seite bearbeiten" : "Wiki-Seite anlegen")}</h2>
              <p className="text-sm text-white/75">Inhalte strukturieren, Slug pflegen und veröffentlichen.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button className="border-white/20 bg-white/10 text-white hover:bg-white/20" icon={<Eye size={16} />} onClick={() => setPreview((current) => !current)}>
                Vorschau
              </Button>
              <Button className="border-white/20 bg-white/10 text-white hover:bg-white/20" icon={<History size={16} />} onClick={() => setVersionsOpen((current) => !current)}>
                Versionen
              </Button>
              <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white" aria-label="Schließen" title="Schließen" onClick={() => void requestClose()}>
                <X size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-4 overflow-auto p-4 md:p-5">
          <section className={cardClass}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-ink">
                Titel
                <input className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/15" value={title} onChange={(event) => { setTitle(event.target.value); setDirty(true); }} required />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-ink">
                Kategorie
                <select className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-teal" value={parentId ?? ""} onChange={(event) => { setParentId(event.target.value ? Number(event.target.value) : null); setDirty(true); }}>
                  <option value="">Root-Seite</option>
                  {pages.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.slug}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-4 grid gap-1 text-sm font-semibold text-ink">
              Slug
              <span className="grid grid-cols-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-line bg-white focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/15">
                <span className="flex h-11 items-center border-r border-line bg-shell px-3 font-mono text-xs text-slate-500">/wiki/</span>
                <input className="h-11 min-w-0 px-3 font-mono text-sm outline-none" value={slug} onChange={(event) => { setSlug(event.target.value); setDirty(true); }} required />
              </span>
            </label>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-shell/60 p-3 text-sm font-semibold text-ink">
                In Navigation anzeigen
                <input type="checkbox" checked disabled className="h-4 w-4" />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border border-line bg-shell/60 p-3 text-sm font-semibold text-ink" title="Für Single-User wirkungslos">
                Nur intern
                <input type="checkbox" checked disabled className="h-4 w-4" />
              </label>
            </div>
            <label className="mt-4 grid max-w-[10rem] gap-1 text-sm font-semibold text-ink">
              Sortierung
              <input className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-teal" type="number" value={sortOrder} onChange={(event) => { setSortOrder(Number(event.target.value)); setDirty(true); }} />
            </label>
          </section>

          {versionsOpen ? <section className={cardClass}><div className="rounded-lg border border-dashed border-line bg-shell/60 p-8 text-center text-sm text-slate-500">Noch keine Versionen vorhanden.</div></section> : null}

          <section className={cardClass}>
            {preview ? (
              <div className="prose max-w-none rounded-lg border border-line bg-shell/40 p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm text-ink">{content || "Noch kein Inhalt."}</pre>
              </div>
            ) : (
              <MarkdownEditor initialContent={content} placeholder="Wiki-Inhalt" onChange={(value) => { setContent(value); setDirty(true); }} />
            )}
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white px-5 py-4">
          <div className="flex items-center gap-2">
            <Button onClick={() => void requestClose()}>Verwerfen</Button>
            <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
              Veröffentlichen
            </Button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
