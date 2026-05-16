import type { JsonObject, Note, NoteInput } from "@taskmanager/shared-types";
import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { RichTextEditor } from "../ui/RichTextEditor";

interface NoteEditorProps {
  note: Note | null;
  open: boolean;
  onSave: (id: number, input: NoteInput) => Promise<unknown>;
  onClose: () => void;
}

export function NoteEditor({ note, open, onSave, onClose }: NoteEditorProps) {
  const [title, setTitle] = useState("Ohne Titel");
  const [contentJson, setContentJson] = useState<JsonObject>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!open || !note) {
      return;
    }
    setTitle(note.title);
    setContentJson(note.contentJson);
    setDirty(false);
  }, [note, open]);

  useEffect(() => {
    if (!open || !note || !dirty) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void save();
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [contentJson, dirty, note, open, title]);

  const save = async () => {
    if (!note) {
      return;
    }
    setSaving(true);
    try {
      await onSave(note.id, { title, contentJson });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await save();
    onClose();
  };

  return (
    <Modal open={open && Boolean(note)} title="Notiz" size={fullscreen ? "full" : "xl"} onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <input
          className="h-11 rounded-md border border-line px-3 text-lg font-semibold outline-none focus:border-teal"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setDirty(true);
          }}
        />
        <RichTextEditor
          value={contentJson}
          fullscreen={fullscreen}
          onFullscreenChange={setFullscreen}
          onChange={(value) => {
            setContentJson(value);
            setDirty(true);
          }}
        />
        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          <span className="mr-auto text-xs text-slate-500">{saving ? "Speichert" : dirty ? "Ungespeichert" : "Gespeichert"}</span>
          <Button onClick={onClose}>Schließen</Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
            Speichern
          </Button>
        </div>
      </form>
    </Modal>
  );
}
