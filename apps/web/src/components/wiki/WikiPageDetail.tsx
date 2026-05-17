import type { WikiPage, WikiPageUpdate } from "@taskmanager/shared-types";
import { Edit3, Save, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Section } from "../ui/Section";
import { TabBar, type Tab } from "../ui/TabBar";
import { useEntityComments } from "../../hooks/useEntityComments";

interface WikiPageDetailProps {
  page: WikiPage;
  onSave: (id: number, input: WikiPageUpdate) => Promise<void>;
  onDelete: (page: WikiPage) => void;
  onEditMetadata: () => void;
}

export function WikiPageDetail({ page, onSave, onDelete, onEditMetadata }: WikiPageDetailProps) {
  const comments = useEntityComments("wikiPage", page.id);
  const [content, setContent] = useState(page.content ?? "");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "comments">("content");

  useEffect(() => {
    setContent(page.content ?? "");
  }, [page]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(page.id, { content });
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<Tab<"content" | "comments">> = [
    { value: "content", label: "Inhalt" },
    { value: "comments", label: "Kommentare" }
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{page.title}</h1>
          <p className="text-sm text-slate-600">{page.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" icon={<Edit3 size={16} />} onClick={onEditMetadata}>
            Metadaten
          </Button>
          <Button variant="ghost" icon={<Trash2 size={16} />} onClick={() => onDelete(page)}>
            Löschen
          </Button>
          {activeTab === "content" ? (
            <Button type="submit" form="wiki-page-detail-form" variant="primary" icon={<Save size={16} />} disabled={saving}>
              Speichern
            </Button>
          ) : null}
        </div>
      </div>
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
      <div className="p-5">
        {activeTab === "content" ? (
          <form id="wiki-page-detail-form" className="grid gap-5" onSubmit={submit}>
            {/* TODO: migrate existing markdown content to HTML. */}
            <RichTextEditor content={content} placeholder="Wiki-Inhalt" toolbar="full" onChange={setContent} />
          </form>
        ) : null}
        {activeTab === "comments" ? (
          <Section title="Kommentare">
            {comments.error ? <div className="mb-3 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{comments.error}</div> : null}
            <CommentThread comments={comments.comments} entityLabel="Wiki-Seite" onCreate={comments.createComment} onDelete={comments.removeComment} />
          </Section>
        ) : null}
      </div>
    </section>
  );
}
