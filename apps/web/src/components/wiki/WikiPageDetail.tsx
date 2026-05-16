import type { WikiPage, WikiPageUpdate } from "@taskmanager/shared-types";
import { Edit3, Save, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { MarkdownEditor } from "../ui/MarkdownEditor";

interface WikiPageDetailProps {
  page: WikiPage;
  onSave: (id: number, input: WikiPageUpdate) => Promise<void>;
  onDelete: (page: WikiPage) => void;
  onEditMetadata: () => void;
}

export function WikiPageDetail({ page, onSave, onDelete, onEditMetadata }: WikiPageDetailProps) {
  const [content, setContent] = useState(page.content ?? "");
  const [saving, setSaving] = useState(false);

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

  return (
    <form className="grid gap-5 rounded-lg border border-line bg-white p-5 shadow-sm" onSubmit={submit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
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
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
            Speichern
          </Button>
        </div>
      </div>
      <MarkdownEditor initialContent={content} placeholder="Wiki-Inhalt" onChange={setContent} />
    </form>
  );
}
