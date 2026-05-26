import type { Note, NoteUpdate } from "@taskmanager/shared-types";
import { Download, StickyNote, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import {
  escapeHtml,
  htmlToNoteContent,
  noteContentToEditorContent,
  noteContentToExportHtml,
  type NoteContentFormat,
} from "./noteContent";

interface NoteEditorProps {
  note: Note | null;
  open: boolean;
  onSave: (id: number, input: NoteUpdate) => Promise<unknown>;
  onClose: () => void;
}

function exportNote(note: Note, title: string, content: string, contentFormat: NoteContentFormat) {
  const blob = new Blob([`<h1>${escapeHtml(title)}</h1>\n${noteContentToExportHtml(content, contentFormat)}\n`], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `note-${note.id}.html`;
  link.click();
  URL.revokeObjectURL(url);
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
            <Button variant="ghost" icon={<Download size={16} />} onClick={() => exportNote(note, title, content, contentFormat)}>
              Export HTML
            </Button>
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
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
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
              <FormField label="Verknüpft mit">
                <select className="h-11 rounded-md border border-line bg-white px-3 text-sm text-steel-600 outline-none" disabled>
                  <option>Aktueller Kontext</option>
                </select>
              </FormField>
            </div>
            <div className="mt-4 rounded-lg border border-dashed border-line bg-shell/60 p-3 text-sm text-steel-600">Tags für Notizen werden über die Kontextlisten gepflegt.</div>
          </Section>

          <Section>
            <RichTextInlineField
              value={content}
              valueFormat={contentFormat}
              testIdPrefix="note-editor-content"
              onChange={(value) => {
                setContent(value);
                setContentFormat("html");
                setDirty(true);
              }}
            />
          </Section>
        </>
      ) : null}
    </FormModal>
  );
}
