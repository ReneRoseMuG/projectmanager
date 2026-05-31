import type { Note, NoteUpdate } from "@taskmanager/shared-types";
import { StickyNote, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { uploadContentImage } from "../../api/content-images";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { htmlToNoteContent, noteContentToEditorContent, type NoteContentFormat } from "./noteContent";

interface NoteEditorProps {
  note: Note | null;
  open: boolean;
  onSave: (id: number, input: NoteUpdate) => Promise<unknown>;
  onClose: () => void;
}

export function NoteEditor({ note, open, onSave, onClose }: NoteEditorProps) {
  const { confirm } = useConfirm();
  const [title, setTitle] = useState("Ohne Titel");
  const [content, setContent] = useState("");
  const [contentFormat, setContentFormat] = useState<NoteContentFormat>("html");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !note) {
      return;
    }
    const nextContent = noteContentToEditorContent(note.contentJson);
    setTitle(note.title);
    setContent(nextContent.value);
    setContentFormat(nextContent.format);
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
  }, [content, contentFormat, dirty, note, open, title]);

  const save = async () => {
    if (!note) {
      return;
    }
    setSaving(true);
    try {
      await onSave(note.id, {
        title,
        contentJson: contentFormat === "html" ? htmlToNoteContent(content) : note.contentJson,
        expectedVersion: note.version
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    await save();
    onClose();
  };

  const requestClose = async () => {
    if (!dirty) {
      onClose();
      return;
    }
    const approved = await confirm({
      title: "Änderungen verwerfen?",
      body: "Die Notiz enthält ungespeicherte Änderungen.",
      severity: "warn",
      confirmLabel: "Verwerfen"
    });
    if (approved) {
      onClose();
    }
  };

  return (
    <FormModal
      open={open && Boolean(note)}
      title={title || "Ohne Titel"}
      icon={<StickyNote size={20} />}
      breadcrumb={["Notizen", "Bearbeiten"]}
      onSubmit={submit}
      onClose={() => void requestClose()}
      saving={saving}
      submitLabel="Speichern"
      cancelLabel="Schließen"
      footerStart={
        note ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="text-crimson hover:bg-crimson/10" icon={<Trash2 size={16} />} disabled>
              Löschen
            </Button>
          </div>
        ) : null
      }
    >
      {note ? (
        <>
          <Section>
            <FormField label="Titel">
              <input
                className="h-11 rounded-md border border-line bg-white px-3 text-lg font-semibold outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
                value={title}
                required
                onChange={(event) => {
                  setTitle(event.target.value);
                  setDirty(true);
                }}
              />
            </FormField>
          </Section>

          <Section>
            <RichTextInlineField
              key={`${note.id}-${contentFormat}`}
              value={content}
              valueFormat={contentFormat}
              testIdPrefix="note-editor-content"
              onChange={(value) => {
                setContent(value);
                setContentFormat("html");
                setDirty(true);
              }}
              onImageUpload={uploadContentImage}
            />
          </Section>
        </>
      ) : null}
    </FormModal>
  );
}
