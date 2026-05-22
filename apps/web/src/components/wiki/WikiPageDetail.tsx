import type { WikiPage, WikiPageUpdate } from "@taskmanager/shared-types";
import { Edit3, Save, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { JournalPanel } from "../journal/JournalPanel";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { TabBar, type Tab } from "../ui/TabBar";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useHasPermission } from "../../hooks/usePermissions";

interface WikiPageDetailProps {
  page: WikiPage;
  onSave: (id: number, input: WikiPageUpdate) => Promise<void>;
  onDelete: (page: WikiPage) => void;
  onEditMetadata: () => void;
}

export function WikiPageDetail({ page, onSave, onDelete, onEditMetadata }: WikiPageDetailProps) {
  const comments = useEntityComments("wikiPage", page.id);
  const canReadJournal = useHasPermission("journal", "read");
  const [content, setContent] = useState(page.content ?? "");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "comments" | "journal">("content");

  useEffect(() => {
    setContent(page.content ?? "");
  }, [page]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(page.id, { content, expectedVersion: page.version });
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<Tab<"content" | "comments" | "journal">> = [
    { value: "content", label: "Inhalt", count: 0 },
    { value: "comments", label: "Kommentare", count: comments.comments.length },
    ...(canReadJournal ? [{ value: "journal" as const, label: "Journal" }] : [])
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{page.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" icon={<Edit3 size={16} />} onClick={onEditMetadata}>
            Metadaten
          </Button>
        </div>
      </div>
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
      <div className="p-5">
        {activeTab === "content" ? (
          <form id="wiki-page-detail-form" className="grid gap-5" onSubmit={submit}>
            <RichTextInlineField value={content} placeholder="Wiki-Inhalt" testIdPrefix="wiki-page-detail-content" onChange={setContent} />
            <footer className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/95 p-4 shadow-panel backdrop-blur">
              <Button className="text-crimson hover:bg-crimson/10" icon={<Trash2 size={18} />} variant="ghost" onClick={() => onDelete(page)}>
                Löschen
              </Button>
              <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
                Speichern
              </Button>
            </footer>
          </form>
        ) : null}
        {activeTab === "comments" ? (
          <Section title="Kommentare">
            {comments.error ? <div className="mb-3 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{comments.error}</div> : null}
            <CommentThread comments={comments.comments} entityLabel="Wiki-Seite" onCreate={comments.createComment} onDelete={comments.removeComment} />
          </Section>
        ) : null}
        {activeTab === "journal" ? (
          <Section title="Journal" fill>
            <JournalPanel objectType="wikiPage" objectId={page.id} />
          </Section>
        ) : null}
      </div>
    </section>
  );
}
