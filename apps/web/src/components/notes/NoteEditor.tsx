import type { JsonObject, Note, NoteInput } from "@taskmanager/shared-types";
import { Download, MoreHorizontal, Save, StickyNote, Trash2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatHumanDate } from "../../utils/date";
import { Button } from "../ui/Button";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { Modal } from "../ui/Modal";
import { RichTextEditor } from "../ui/RichTextEditor";

interface NoteEditorProps {
  note: Note | null;
  open: boolean;
  onSave: (id: number, input: NoteInput) => Promise<unknown>;
  onClose: () => void;
}

const cardClass = "rounded-lg border border-line bg-white p-4 shadow-[0_10px_28px_rgba(31,43,56,0.06)]";

function countJsonWords(value: JsonObject) {
  const text = JSON.stringify(value).replace(/[{}[\]",:]/g, " ");
  return text.split(/\s+/).filter((word) => word.length > 1).length;
}

function exportNote(note: Note, title: string, contentJson: JsonObject) {
  const blob = new Blob([`# ${title}\n\n\`\`\`json\n${JSON.stringify(contentJson, null, 2)}\n\`\`\`\n`], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `note-${note.id}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

export function NoteEditor({ note, open, onSave, onClose }: NoteEditorProps) {
  const { confirm } = useConfirm();
  const [title, setTitle] = useState("Ohne Titel");
  const [contentJson, setContentJson] = useState<JsonObject>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const wordCount = useMemo(() => countJsonWords(contentJson), [contentJson]);

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
    <Modal open={open && Boolean(note)} title="Notiz" size={fullscreen ? "full" : "xl"} showHeader={false} bodyClassName="p-0" onClose={() => void requestClose()}>
      {note ? (
        <form className="flex max-h-[calc(100vh-64px)] flex-col bg-shell" onSubmit={submit}>
          <header className="bg-gradient-to-br from-violet to-[#8459d9] px-5 py-5 text-white md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-white/75">
                  <span>Notizen</span>
                  <span>›</span>
                  <span>Bearbeiten</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/12">
                    <StickyNote size={21} />
                  </span>
                  <div>
                    <h2 className="text-2xl font-bold tracking-normal">{title || "Ohne Titel"}</h2>
                    <p className="text-sm text-white/75">
                      NOTE-{note.id} · erstellt {formatHumanDate(note.createdAt)} · {wordCount} Wörter · 1 Abschnitt
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button className="border-white/20 bg-white/10 text-white hover:bg-white/20" icon={<Download size={16} />} onClick={() => exportNote(note, title, contentJson)}>
                  Export Markdown
                </Button>
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white" aria-label="Mehr" title="Mehr">
                  <MoreHorizontal size={18} />
                </button>
                <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/12 hover:text-white" aria-label="Schließen" title="Schließen" onClick={() => void requestClose()}>
                  <X size={18} />
                </button>
              </div>
            </div>
          </header>

          <div className="grid flex-1 gap-4 overflow-auto p-4 md:p-5">
            <section className={cardClass}>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
                <label className="grid gap-1 text-sm font-semibold text-ink">
                  Titel
                  <input
                    className="h-11 rounded-md border border-line bg-white px-3 text-lg font-semibold outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/15"
                    value={title}
                    required
                    onChange={(event) => {
                      setTitle(event.target.value);
                      setDirty(true);
                    }}
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-ink">
                  Verknüpft mit
                  <select className="h-11 rounded-md border border-line bg-shell px-3 text-sm text-slate-600 outline-none" disabled>
                    <option>Aktueller Kontext</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 rounded-lg border border-dashed border-line bg-shell/60 p-3 text-sm text-slate-600">Tags für Notizen werden über die Kontextlisten gepflegt.</div>
            </section>

            <section className={cardClass}>
              <RichTextEditor
                value={contentJson}
                fullscreen={fullscreen}
                onFullscreenChange={setFullscreen}
                onChange={(value) => {
                  setContentJson(value);
                  setDirty(true);
                }}
              />
            </section>
          </div>

          <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white px-5 py-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="text-crimson hover:bg-crimson/10" icon={<Trash2 size={16} />} disabled>
                Löschen
              </Button>
              <Button onClick={() => void requestClose()}>Schließen</Button>
              <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
                Speichern
              </Button>
            </div>
          </footer>
        </form>
      ) : null}
    </Modal>
  );
}
