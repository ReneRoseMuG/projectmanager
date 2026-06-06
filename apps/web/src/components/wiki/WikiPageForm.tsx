import type { DraftComment, Note, Project, WikiPage, WikiPageInput, WikiPageRelationSummary } from "@taskmanager/shared-types";
import { ExternalLink, Pencil, Trash2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { uploadContentImage } from "../../api/content-images";
import { errorMessage } from "../../hooks/errors";
import { useAttachments } from "../../hooks/useAttachments";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useHasPermission } from "../../hooks/usePermissions";
import { useNotes } from "../../hooks/useNotes";
import type { WikiTreeNode } from "../../hooks/useWiki";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { JournalPanel } from "../journal/JournalPanel";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { FormField } from "../ui/FormField";
import { Modal } from "../ui/Modal";
import { PageHero } from "../ui/PageHero";
import { PendingCommentList } from "../ui/PendingCommentList";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { TabBar, type Tab } from "../ui/TabBar";
import { useToast } from "../ui/ToastProvider";
import { RelatedPagesSelector } from "./RelatedPagesSelector";

interface WikiPageFormProps {
  open: boolean;
  page?: WikiPage | null;
  parent?: WikiPage | null;
  tree: WikiTreeNode[];
  projects: Project[];
  onSubmit: (input: WikiPageInput, relatedPageIds: number[]) => Promise<WikiPage | void>;
  onPostCreate?: (pageId: number, pending: { comments: DraftComment[]; relatedPageIds: number[] }) => Promise<void>;
  onClose: () => void;
  onOpenInTab?: () => void;
  inline?: boolean;
  inlineChrome?: "embedded" | "standalone";
  onDelete?: (page: WikiPage) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** Controls read/edit mode for inline wiki pages. Defaults to false when inline, true otherwise. */
  editable?: boolean;
  /** Called when the user clicks the Edit button in read mode. */
  onEdit?: () => void;
  onNavigateToWikiPage?: (pageId: number) => void;
}

function flattenTree(nodes: WikiTreeNode[]): WikiPage[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

type WikiPageFormTab = "details" | "comments" | "notes" | "attachments" | "journal";

const tabs: Array<Tab<WikiPageFormTab>> = [
  { value: "details", label: "Details" },
  { value: "comments", label: "Kommentare" },
  { value: "notes", label: "Notizen" },
  { value: "attachments", label: "Dateien" },
  { value: "journal", label: "Journal" }
];

export function WikiPageForm({ open, page, parent, tree, projects, onSubmit, onPostCreate, onClose, onOpenInTab, inline = false, inlineChrome = "standalone", onDelete, onDirtyChange, editable, onEdit, onNavigateToWikiPage }: WikiPageFormProps) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const pageId = page?.id ?? null;
  const canReadJournal = useHasPermission("journal", "read");
  const comments = useEntityComments("wikiPage", open ? pageId : null);
  const notes = useNotes(open && pageId !== null ? { type: "wikiPage", id: pageId } : null);
  const attachments = useAttachments(open && pageId !== null ? { type: "wikiPage", id: pageId } : null);
  const pages = useMemo(() => flattenTree(tree).filter((item) => item.id !== page?.id), [page?.id, tree]);
  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [relatedPages, setRelatedPages] = useState<WikiPageRelationSummary[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);
  const [activeTab, setActiveTab] = useState<WikiPageFormTab>("details");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const effectiveEditable = editable ?? (inline ? false : true);
  const parentPageTitle = pages.find((item) => item.id === parentId)?.title ?? parent?.title ?? null;

  useEffect(() => {
    if (!effectiveEditable) {
      setDirty(false);
      setTitle(page?.title ?? "");
      setParentId(page?.parentId ?? null);
      setContent(page?.content ?? "");
      setRelatedPages(page?.relatedPages ?? []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveEditable]);

  useEffect(() => {
    if (!open) {
      setActiveTab("details");
      setEditingNote(null);
      return;
    }
    setTitle(page?.title ?? "");
    setParentId(page?.parentId ?? parent?.id ?? null);
    setContent(page?.content ?? "");
    setRelatedPages(page?.relatedPages ?? []);
    setDirty(false);
    setActiveTab("details");
    setEditingNote(null);
    if (!page) {
      setPendingComments([]);
    }
  }, [open, page, parent]);

  useEffect(() => {
    onDirtyChange?.(open && dirty);
  }, [dirty, onDirtyChange, open]);

  const createNote = async () => {
    try {
      const note = await notes.createNote({ title: "Ohne Titel", contentJson: {} });
      if (note) {
        setEditingNote(note);
        showToast({ tone: "success", title: "Notiz erstellt" });
      }
    } catch (noteError) {
      showToast({ tone: "error", title: "Notiz konnte nicht erstellt werden", message: errorMessage(noteError) });
    }
  };

  const uploadAttachment = async (file: File) => {
    try {
      const uploaded = await attachments.uploadAttachment(file);
      showToast({ tone: "success", title: "Datei hochgeladen" });
      return uploaded;
    } catch (attachmentError) {
      showToast({ tone: "error", title: "Datei konnte nicht hochgeladen werden", message: errorMessage(attachmentError) });
      throw attachmentError;
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const relatedPageIds = relatedPages.map((relatedPage) => relatedPage.id);
      const created = await onSubmit({ title, parentId, content }, relatedPageIds);
      if (!page && created && onPostCreate) {
        await onPostCreate(created.id, { comments: pendingComments, relatedPageIds });
      }
      setDirty(false);
      if (!inline || !page) {
        onClose();
      }
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

  const visibleTabs = page
    ? tabs.filter((tab) => tab.value !== "journal" || canReadJournal)
    : tabs.filter((tab) => tab.value === "details" || tab.value === "comments");
  const tabItems = visibleTabs.map((tab) => {
    if (tab.value === "comments") {
      return { ...tab, count: page ? comments.comments.length : pendingComments.length };
    }
    if (tab.value === "notes") {
      return { ...tab, count: notes.notes.length };
    }
    if (tab.value === "attachments") {
      return { ...tab, count: attachments.attachments.length };
    }
    return tab;
  });

  if (!open) {
    return null;
  }

  const showInlineHeader = inline && inlineChrome === "standalone";
  const embeddedActionPage = inline && inlineChrome === "embedded" ? page : null;

  const form = (
      <form className={inline ? "flex h-full min-h-0 flex-col bg-shell" : "flex max-h-[calc(100vh-64px)] flex-col bg-shell"} onSubmit={submit}>
        {showInlineHeader ? (
          <PageHero
            variant="detail"
            breadcrumb={["Wiki", parentPageTitle ?? "Root"]}
            title={title || (page ? "Wiki-Seite bearbeiten" : "Wiki-Seite anlegen")}
            actions={
              <>
                {!effectiveEditable && onEdit ? (
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white" aria-label="Bearbeiten" title="Bearbeiten" onClick={onEdit}>
                    <Pencil size={18} />
                  </button>
                ) : null}
                {page && onDelete ? (
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white" aria-label="Seite löschen" title="Seite löschen" onClick={() => onDelete(page)}>
                    <Trash2 size={18} />
                  </button>
                ) : null}
              </>
            }
          />
        ) : !inline ? (
        <header className="border-b border-steel-700 bg-gradient-to-br from-steel-700 to-steel-600 px-5 py-5 text-white md:px-6">
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
        ) : null}
        {inline && inlineChrome === "embedded" && !effectiveEditable && onEdit ? (
          <div className="flex items-center justify-end border-b border-line bg-shell px-5 py-2">
            <button type="button" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-steel-600 hover:bg-line/50 hover:text-ink" onClick={onEdit}>
              <Pencil size={14} />
              Bearbeiten
            </button>
          </div>
        ) : null}
        <TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />

        <div className="flex-1 overflow-auto">
          {activeTab === "details" ? (
            <div className="grid min-h-full grid-rows-[auto_auto_minmax(0,1fr)] gap-4 p-4 md:p-5">
              <Section>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Titel">
                    <input
                      className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/15"
                      value={title}
                      onChange={(event) => {
                        setTitle(event.target.value);
                        setDirty(true);
                      }}
                      required
                    />
                  </FormField>
                  <FormField label="Übergeordnete Seite">
                    <select
                      className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-teal"
                      value={parentId ?? ""}
                      onChange={(event) => {
                        setParentId(event.target.value ? Number(event.target.value) : null);
                        setDirty(true);
                      }}
                    >
                      <option value="">Root-Seite</option>
                      {pages.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </Section>

              <Section title="Verwandte Themen" collapsible>
                <RelatedPagesSelector
                  pages={pages}
                  projects={projects}
                  currentPageId={page?.id}
                  selectedPages={relatedPages}
                  readOnly={!effectiveEditable}
                  onNavigate={onNavigateToWikiPage}
                  onChange={(nextPages) => {
                    setRelatedPages(nextPages);
                    setDirty(true);
                  }}
                />
              </Section>

              <Section fill className="min-h-0">
                <RichTextInlineField
                  value={content}
                  placeholder="Wiki-Inhalt"
                  testIdPrefix="wiki-page-form-content"
                  onImageUpload={uploadContentImage}
                  wikiPages={pages}
                  editable={effectiveEditable}
                  commitOnBlur={effectiveEditable}
                  className="min-h-[400px]"
                  fill
                  onChange={(value) => {
                    setContent(value);
                    setDirty(true);
                  }}
                />
              </Section>
            </div>
          ) : null}

          {activeTab === "comments" ? (
            <div className="p-4 md:p-5">
            <Section title="Kommentare">
              {page ? (
                <>
                  {comments.error ? <div className="mb-3 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{comments.error}</div> : null}
                  <CommentThread comments={comments.comments} entityLabel="Wiki-Seite" onCreate={comments.createComment} onUpdate={comments.updateComment} onDelete={comments.removeComment} />
                </>
              ) : (
                <PendingCommentList
                  comments={pendingComments}
                  onAdd={(comment) => {
                    setPendingComments((items) => [...items, comment]);
                    setDirty(true);
                  }}
                  onUpdate={(index, comment) => {
                    setPendingComments((items) => items.map((item, itemIndex) => (itemIndex === index ? comment : item)));
                    setDirty(true);
                  }}
                  onRemove={(index) => {
                    setPendingComments((items) => items.filter((_, itemIndex) => itemIndex !== index));
                    setDirty(true);
                  }}
                />
              )}
            </Section>
            </div>
          ) : null}

          {activeTab === "notes" && page ? (
            <div className="flex min-h-full p-4 md:p-5">
            <Section fill>
              {notes.error ? <div className="mb-3 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{notes.error}</div> : null}
              <NoteList
                notes={notes.notes}
                owner={{ type: "wikiPage", id: page.id }}
                onCreate={createNote}
                onEdit={setEditingNote}
                onDelete={(note) => {
                  void confirm({
                    title: "Notiz löschen?",
                    body: `Die Notiz "${note.title}" wird entfernt.`,
                    severity: "danger",
                    confirmLabel: "Löschen"
                  }).then((approved) => {
                    if (approved) {
                      void notes
                        .removeNote(note.id)
                        .then(() => showToast({ tone: "success", title: "Notiz gelöscht" }))
                        .catch((noteError: unknown) => showToast({ tone: "error", title: "Notiz konnte nicht gelöscht werden", message: errorMessage(noteError) }));
                    }
                  });
                }}
              />
              <NoteEditor note={editingNote} open={Boolean(editingNote)} onSave={notes.updateNote} onClose={() => setEditingNote(null)} />
            </Section>
            </div>
          ) : null}

          {activeTab === "attachments" && page ? (
            <div className="p-4 md:p-5">
            <Section title="Dateien">
              {attachments.error ? <div className="mb-3 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{attachments.error}</div> : null}
              <div className="grid gap-4">
                <AttachmentUploader size="sm" onUpload={uploadAttachment} />
                <AttachmentList
                  attachments={attachments.attachments}
                  onDelete={(attachment) => {
                    void confirm({
                      title: "Datei löschen?",
                      body: attachment.originalName,
                      severity: "danger",
                      confirmLabel: "Löschen"
                    }).then((approved) => {
                      if (approved) {
                        void attachments
                          .removeAttachment(attachment.id)
                          .then(() => showToast({ tone: "success", title: "Datei gelöscht" }))
                          .catch((attachmentError: unknown) => showToast({ tone: "error", title: "Datei konnte nicht gelöscht werden", message: errorMessage(attachmentError) }));
                      }
                    });
                  }}
                  onOpen={(attachment) => attachments.openAttachment(attachment.id)}
                  openingAttachmentId={attachments.openingAttachmentId}
                />
              </div>
            </Section>
            </div>
          ) : null}

          {activeTab === "journal" && page ? (
            <div className="flex min-h-full p-4 md:p-5">
            <Section title="Journal" fill>
              <JournalPanel objectType="wikiPage" objectId={page.id} />
            </Section>
            </div>
          ) : null}
        </div>

        {effectiveEditable ? (
          <footer className={`flex flex-wrap items-center gap-3 border-t border-line bg-white px-5 py-4 ${embeddedActionPage && onDelete ? "justify-between" : "justify-end"}`}>
            {embeddedActionPage && onDelete ? (
              <Button
                className="text-crimson hover:bg-crimson/10"
                icon={<Trash2 size={18} />}
                variant="ghost"
                onClick={() => onDelete(embeddedActionPage)}
              >
                Löschen
              </Button>
            ) : null}
            <div className="flex items-center gap-2">
              <Button onClick={() => void requestClose()}>Abbrechen</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                Speichern
              </Button>
            </div>
          </footer>
        ) : null}
      </form>
  );

  if (inline) {
    return form;
  }

  return (
    <Modal open={open} title={page ? "Wiki-Seite bearbeiten" : "Neue Wiki-Seite"} size="xl" showHeader={false} bodyClassName="p-0" onClose={() => void requestClose()}>
      {form}
    </Modal>
  );
}
