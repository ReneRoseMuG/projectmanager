import type { DraftComment, WikiPage, WikiPageInput } from "@taskmanager/shared-types";
import { ExternalLink, Eye, History, Save, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { uploadContentImage } from "../../api/content-images";
import type { WikiTreeNode } from "../../hooks/useWiki";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { FormField } from "../ui/FormField";
import { Modal } from "../ui/Modal";
import { PendingCommentList } from "../ui/PendingCommentList";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";

interface WikiPageFormProps {
  open: boolean;
  page?: WikiPage | null;
  parent?: WikiPage | null;
  tree: WikiTreeNode[];
  onSubmit: (input: WikiPageInput) => Promise<WikiPage | void>;
  onPostCreate?: (pageId: number, pending: { comments: DraftComment[] }) => Promise<void>;
  onClose: () => void;
  onOpenInTab?: () => void;
}

function flattenTree(nodes: WikiTreeNode[]): WikiPage[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export function WikiPageForm({ open, page, parent, tree, onSubmit, onPostCreate, onClose, onOpenInTab }: WikiPageFormProps) {
  const { confirm } = useConfirm();
  const pages = useMemo(() => flattenTree(tree).filter((item) => item.id !== page?.id), [page?.id, tree]);
  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(page?.title ?? "");
    setParentId(page?.parentId ?? parent?.id ?? null);
    setSortOrder(page?.sortOrder ?? 0);
    setContent(page?.content ?? "");
    setPreview(false);
    setVersionsOpen(false);
    setDirty(false);
    if (!page) {
      setPendingComments([]);
    }
  }, [open, page, parent]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await onSubmit({ title, parentId, sortOrder, content });
      if (!page && created && onPostCreate) {
        await onPostCreate(created.id, { comments: pendingComments });
      }
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
        <header className="bg-gradient-to-br from-teal to-teal/75 px-5 py-5 text-white md:px-6">
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
            </div>
            <div className="flex items-center gap-2">
              <Button className="border-white/20 bg-white/10 text-white hover:bg-white/20" icon={<Eye size={16} />} onClick={() => setPreview((current) => !current)}>
                Vorschau
              </Button>
              <Button className="border-white/20 bg-white/10 text-white hover:bg-white/20" icon={<History size={16} />} onClick={() => setVersionsOpen((current) => !current)}>
                Versionen
              </Button>
              {onOpenInTab ? (
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white" aria-label="In neuem Tab öffnen" title="In neuem Tab öffnen" onClick={onOpenInTab}>
                  <ExternalLink size={18} />
                </button>
              ) : null}
              <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white" aria-label="Schließen" title="Schließen" onClick={() => void requestClose()}>
                <X size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-4 overflow-auto p-4 md:p-5">
          <Section>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Titel">
                <input className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/15" value={title} onChange={(event) => { setTitle(event.target.value); setDirty(true); }} required />
              </FormField>
              <FormField label="Kategorie">
                <select className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-teal" value={parentId ?? ""} onChange={(event) => { setParentId(event.target.value ? Number(event.target.value) : null); setDirty(true); }}>
                  <option value="">Root-Seite</option>
                  {pages.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
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
            <FormField label="Sortierung" className="mt-4 max-w-[10rem]">
              <input className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-teal" type="number" value={sortOrder} onChange={(event) => { setSortOrder(Number(event.target.value)); setDirty(true); }} />
            </FormField>
          </Section>

          {versionsOpen ? <Section><div className="rounded-lg border border-dashed border-line bg-shell/60 p-8 text-center text-sm text-steel-500">Noch keine Versionen vorhanden.</div></Section> : null}

          <Section>
            {preview ? (
              <div className="prose max-w-none rounded-lg border border-line bg-shell/40 p-4" dangerouslySetInnerHTML={{ __html: content || "<p>Noch kein Inhalt.</p>" }} />
            ) : (
              <>
                <RichTextInlineField value={content} placeholder="Wiki-Inhalt" testIdPrefix="wiki-page-form-content" onImageUpload={uploadContentImage} onChange={(value) => { setContent(value); setDirty(true); }} />
              </>
            )}
          </Section>

          {!page ? (
            <Section title="Kommentare">
              <PendingCommentList
                comments={pendingComments}
                onAdd={(comment) => {
                  setPendingComments((items) => [...items, comment]);
                  setDirty(true);
                }}
                onRemove={(index) => {
                  setPendingComments((items) => items.filter((_, itemIndex) => itemIndex !== index));
                  setDirty(true);
                }}
              />
            </Section>
          ) : null}
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
