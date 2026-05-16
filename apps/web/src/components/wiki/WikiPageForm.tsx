import type { WikiPage, WikiPageInput } from "@taskmanager/shared-types";
import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { WikiTreeNode } from "../../hooks/useWiki";
import { Button } from "../ui/Button";
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

function flattenTree(nodes: WikiTreeNode[]): WikiPage[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export function WikiPageForm({ open, page, parent, tree, onSubmit, onClose }: WikiPageFormProps) {
  const pages = useMemo(() => flattenTree(tree).filter((item) => item.id !== page?.id), [page?.id, tree]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(page?.title ?? "");
    setSlug(page?.slug ?? (parent ? `${parent.slug}/` : ""));
    setParentId(page?.parentId ?? parent?.id ?? null);
    setSortOrder(page?.sortOrder ?? 0);
    setContent(page?.content ?? "");
  }, [open, page, parent]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ title, slug, parentId, sortOrder, content });
      onClose();
    } catch {
      // Error feedback is handled by the page-level toast.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={page ? "Wiki-Seite bearbeiten" : "Neue Wiki-Seite"} size="xl" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Titel
            <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-teal" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Slug
            <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-teal" value={slug} onChange={(event) => setSlug(event.target.value)} required />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_10rem]">
          <label className="grid gap-1 text-sm font-medium">
            Elternseite
            <select className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-teal" value={parentId ?? ""} onChange={(event) => setParentId(event.target.value ? Number(event.target.value) : null)}>
              <option value="">Root-Seite</option>
              {pages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.slug}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Sortierung
            <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-teal" type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
          </label>
        </div>
        <div className="grid gap-1 text-sm font-medium">
          Inhalt
          <MarkdownEditor initialContent={content} placeholder="Wiki-Inhalt" onChange={setContent} />
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
            Speichern
          </Button>
        </div>
      </form>
    </Modal>
  );
}
