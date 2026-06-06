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
  onCreateNote?: (title: string, contentJson: Note["contentJson"]) => Promise<unknown>;
  onClose: () => void;
  variant?: "modal" | "page";
  onOpenInTab?: () => void;
}

export function NoteEditor({ note, open, onSave, onCreateNote, onClose, variant = "modal", onOpenInTab }: NoteEditorProps) {
  const { confirm } = useConfirm();
  const [title, setTitle] = useState("Ohne Titel");
  const [content, setContent] = useState("");
  const [contentFormat, setContentFormat] = useState<NoteContentFormat>("html");
  const [localVersion, setLocalVersion] = useState<number | null>(null);
  const [lastSavedContentJson, setLastSavedContentJson] = useState<Note["contentJson"] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (note) {
      const nextContent = noteContentToEditorContent(note.contentJson);
      setTitle(note.title);
      setContent(nextContent.value);
      setContentFormat(nextContent.format);
      setLocalVersion(note.version);
      setLastSavedContentJson(note.contentJson);
    } else {
      setTitle("Ohne Titel");
      setContent("");
      setContentFormat("html");
      setLocalVersion(null);
      setLastSavedContentJson(null);
    }
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
      const updated = await onSave(note.id, {
        title,
        contentJson: contentFormat === "html" ? htmlToNoteContent(content) : (lastSavedContentJson ?? note.contentJson),
        expectedVersion: localVersion ?? note.version
      });
      if (updated && typeof updated === "object" && "version" in updated && typeof updated.version === "number") {
        setLocalVersion(updated.version);
        if ("contentJson" in updated && updated.contentJson && typeof updated.contentJson === "object" && !Array.isArray(updated.contentJson)) {
          setLastSavedContentJson(updated.contentJson as Note["contentJson"]);
        }
      }
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!note && onCreateNote) {
      setSaving(true);
      try {
        await onCreateNote(title, htmlToNoteContent(content));
        onClose();
      } finally {
        setSaving(false);
      }
    } else {
      await save();
      onClose();
    }
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

  const isCreateMode = !note && Boolean(onCreateNote);
  return (
    <FormModal
      open={open && (Boolean(note) || isCreateMode)}
      title={title || "Ohne Titel"}
      icon={<StickyNote size={20} />}
      breadcrumb={["Notizen", isCreateMode ? "Anlegen" : "Bearbeiten"]}
      onSubmit={submit}
      onClose={() => void requestClose()}
      saving={saving}
      submitLabel={isCreateMode ? "Anlegen" : "Speichern"}
      cancelLabel="Schließen"
      variant={variant}
      onOpenInTab={isCreateMode ? undefined : onOpenInTab}
      footerStart={
        !isCreateMode && note ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="text-crimson hover:bg-crimson/10" icon={<Trash2 size={16} />} disabled>
              Löschen
            </Button>
          </div>
        ) : null
      }
    >
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
          key={note ? `${note.id}-${contentFormat}` : "create"}
          value={content}
          valueFormat={contentFormat}
          testIdPrefix="note-editor-content"
          minRows={12}
          onChange={(value) => {
            setContent(value);
            setContentFormat("html");
            setDirty(true);
          }}
          onImageUpload={uploadContentImage}
        />
      </Section>
    </FormModal>
  );
}
