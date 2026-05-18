import type { DraftNote } from "@taskmanager/shared-types";
import { Plus, StickyNote, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { FormField } from "./FormField";
import { Input } from "./Input";
import { Modal } from "./Modal";

interface PendingNoteListProps {
  notes: DraftNote[];
  onAdd: (note: DraftNote) => void;
  onRemove: (index: number) => void;
}

export function PendingNoteList({ notes, onAdd, onRemove }: PendingNoteListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const trimmedTitle = title.trim();

  const closeDialog = () => {
    setDialogOpen(false);
    setTitle("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    onAdd({ title: trimmedTitle, contentJson: {} });
    closeDialog();
  };

  return (
    <>
      <div className="grid gap-4">
        <div className="flex justify-end">
          <Button variant="primary" icon={<Plus size={17} />} onClick={() => setDialogOpen(true)}>
            Neue Notiz
          </Button>
        </div>

        {notes.length === 0 ? (
          <EmptyState icon={<StickyNote size={22} />} title="Keine Notizen vorgemerkt" body="Notizen werden lokal gesammelt." tone="fern" variant="tinted" />
        ) : (
          <div className="grid gap-2">
            {notes.map((note, index) => (
              <div key={`${note.title}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-line bg-white p-3 shadow-sm">
                <span className="min-w-0 truncate text-sm font-semibold text-ink">{note.title}</span>
                <Button aria-label={`${note.title} entfernen`} title="Entfernen" variant="ghost" icon={<Trash2 size={16} />} onClick={() => onRemove(index)} />
              </div>
            ))}
          </div>
        )}

        <p className="rounded-md border border-line bg-shell px-3 py-2 text-xs font-semibold text-slate-600">Notizen werden nach dem Speichern angelegt.</p>
      </div>

      <Modal open={dialogOpen} title="Neue Notiz" size="md" onClose={closeDialog}>
        <form className="grid gap-4" onSubmit={submit}>
          <FormField label="Titel" required>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required />
          </FormField>
          <footer className="flex justify-end gap-2">
            <Button onClick={closeDialog}>Abbrechen</Button>
            <Button type="submit" variant="primary" disabled={!trimmedTitle}>
              Hinzufügen
            </Button>
          </footer>
        </form>
      </Modal>
    </>
  );
}
