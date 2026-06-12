import type { DraftComment, Note, Project, WikiPage, WikiPageInput, WikiPageRelationSummary } from "@taskmanager/shared-types";
import { Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAutoSave } from "../../hooks/useAutoSave";
import { SaveStatus } from "../ui/SaveStatus";
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
import { objectReference } from "../../lib/references";
import { Button } from "../ui/Button";
import { DetailHeaderActions } from "../ui/DetailHeaderActions";
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
  onAutoSave?: (input: WikiPageInput, relatedPageIds: number[]) => Promise<void>;
  onPostCreate?: (pageId: number, pending: { comments: DraftComment[]; relatedPageIds: number[] }) => Promise<void>;
  onClose: () => void;
  onOpenInTab?: () => void;
  inline?: boolean;
  inlineChrome?: "embedded" | "standalone";
  onDelete?: (page: WikiPage) => void;
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

export function WikiPageForm({ open, page, parent, tree, projects, onSubmit, onAutoSave, onPostCreate, onClose, onOpenInTab, inline = false, inlineChrome = "standalone", onDelete, editable, onEdit, onNavigateToWikiPage }: WikiPageFormProps) {
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
  const formStateRef = useRef({ title, parentId, content, relatedPages });
  formStateRef.current = { title, parentId, content, relatedPages };
  const autoSave = useAutoSave({
    enabled: !!page && !!onAutoSave,
    save: async () => {
      if (!onAutoSave) return;
      const s = formStateRef.current;
      await onAutoSave(
        { title: s.title, parentId: s.parentId, content: s.content },
        s.relatedPages.map((p) => p.id),
      );
      setDirty(false);
    },
  });
  const af = page ? autoSave.flush : undefined;
  const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);
  const [activeTab, setActiveTab] = useState<WikiPageFormTab>("details");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const effectiveEditable = (!!page && !!onAutoSave) || (editable ?? (inline ? false : true));
  const parentPage = parentId !== null ? pages.find((item) => item.id === parentId) ?? parent ?? null : null;
  const parentPageSummary: WikiPageRelationSummary | null = parentPage
    ? { id: parentPage.id, title: parentPage.title, parentId: parentPage.parentId }
    : null;
  const parentPageTitle = parentPageSummary?.title ?? null;

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
  // Depend on identities (ids), not object references: a refetch of the same page
  // (e.g. after uploading an attachment) must not reset the active tab or form fields. TKT-98.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page?.id, parent?.id]);

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

  // Persist any pending auto-save before leaving the editor. The title only flushes
  // on blur, so navigation triggers a final flush. No discard prompt: with auto-save
  // there is nothing unsaved to guard against (TKT-95).
  const flushPendingSave = async (): Promise<void> => {
    if (page && onAutoSave && dirty) {
      await autoSave.flush();
    }
  };

  const requestClose = async () => {
    await flushPendingSave();
    onClose();
  };

  const navigateToWikiPage = onNavigateToWikiPage
    ? (pageId: number) => {
        void flushPendingSave().then(() => onNavigateToWikiPage(pageId));
      }
    : undefined;

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
              <DetailHeaderActions
                tone="onSteel"
                onEdit={!effectiveEditable && onEdit ? onEdit : undefined}
                saveStatus={page && onAutoSave ? <SaveStatus status={autoSave.status} errorMessage={autoSave.errorMessage} /> : undefined}
                objectReference={page ? objectReference("wikiPage", page.id) : undefined}
                onDelete={page && onDelete ? () => onDelete(page) : undefined}
                deleteLabel="Seite löschen"
              />
            }
          />
        ) : !inline ? (
          <PageHero
            variant="detail"
            fixedHeight={false}
            breadcrumb={["Wiki", parent?.title ?? "Root", "Bearbeiten"]}
            title={title || (page ? "Wiki-Seite bearbeiten" : "Wiki-Seite anlegen")}
            actions={
              <DetailHeaderActions
                tone="onSteel"
                saveStatus={page && onAutoSave ? <SaveStatus status={autoSave.status} errorMessage={autoSave.errorMessage} /> : undefined}
                objectReference={page ? objectReference("wikiPage", page.id) : undefined}
                onOpenInTab={onOpenInTab}
                onClose={() => void requestClose()}
              />
            }
          />
        ) : null}
        {embeddedActionPage ? (
          <div className="flex min-h-[40px] items-center justify-end gap-3 border-b border-line bg-shell px-5 py-2">
            <DetailHeaderActions
              tone="onLight"
              saveStatus={onAutoSave ? <SaveStatus status={autoSave.status} errorMessage={autoSave.errorMessage} tone="onLight" /> : undefined}
              onEdit={!effectiveEditable && onEdit ? onEdit : undefined}
              objectReference={objectReference("wikiPage", embeddedActionPage.id)}
              onOpenInTab={onOpenInTab}
              onDelete={onDelete ? () => onDelete(embeddedActionPage) : undefined}
              deleteLabel="Seite löschen"
            />
          </div>
        ) : null}
        <TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />

        <div className="flex-1 overflow-auto">
          {activeTab === "details" ? (
            <div className="grid min-h-full grid-rows-[auto_auto_minmax(0,1fr)] gap-4 p-4 md:p-5">
              <Section>
                <div className="grid gap-4">
                  <FormField label="Titel">
                    <input
                      className="h-11 rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/15"
                      value={title}
                      onChange={(event) => {
                        setTitle(event.target.value);
                        setDirty(true);
                      }}
                      onBlur={af}
                      required
                    />
                  </FormField>
                </div>
              </Section>

              <Section title="Verwandte Themen" collapsible storageKey="wiki-related-pages-collapsed">
                <RelatedPagesSelector
                  pages={pages}
                  projects={projects}
                  currentPageId={page?.id}
                  parentPage={parentPageSummary}
                  selectedPages={relatedPages}
                  readOnly={!effectiveEditable}
                  onNavigate={navigateToWikiPage}
                  onChange={(nextPages) => {
                    setRelatedPages(nextPages);
                    formStateRef.current = { ...formStateRef.current, relatedPages: nextPages };
                    setDirty(true);
                    af?.();
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
                  onBeforeNavigate={flushPendingSave}
                  className="min-h-[400px]"
                  fill
                  onChange={(value) => {
                    setContent(value);
                    formStateRef.current = { ...formStateRef.current, content: value };
                    setDirty(true);
                    af?.();
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

        {effectiveEditable && (!page || !onAutoSave) ? (
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
