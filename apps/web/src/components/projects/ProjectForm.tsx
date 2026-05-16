import type { Project, ProjectInput, ProjectStatus, Tag } from "@taskmanager/shared-types";
import { Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { TagPicker } from "../tags/TagPicker";

interface ProjectFormProps {
  open: boolean;
  project?: Project | null;
  onSubmit: (input: ProjectInput, tagIds: number[]) => Promise<void>;
  onClose: () => void;
}

const statuses: Array<{ value: ProjectStatus; label: string }> = [
  { value: "active", label: "Aktiv" },
  { value: "on_hold", label: "Pausiert" },
  { value: "completed", label: "Abgeschlossen" },
  { value: "archived", label: "Archiviert" }
];

export function ProjectForm({ open, project, onSubmit, onClose }: ProjectFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [color, setColor] = useState("#6366f1");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setStatus(project?.status ?? "active");
    setColor(project?.color ?? "#6366f1");
    setSelectedTags(project?.tags ?? []);
  }, [open, project]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(
        {
          name,
          description,
          status,
          color
        },
        selectedTags.map((tag) => tag.id)
      );
      onClose();
    } catch {
      // Error feedback is handled by the page-level toast.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={project ? "Projekt bearbeiten" : "Neues Projekt"} onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-1 text-sm font-medium">
          Name
          <input className="h-10 rounded-md border border-line px-3 outline-none focus:border-teal" value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Beschreibung
          <textarea
            className="min-h-28 rounded-md border border-line px-3 py-2 outline-none focus:border-teal"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <label className="grid gap-1 text-sm font-medium">
            Farbe
            <input className="h-10 w-24 rounded-md border border-line bg-white p-1" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
        </div>
        <TagPicker selected={selectedTags} onChange={setSelectedTags} />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={saving}>
            Speichern
          </Button>
        </div>
      </form>
    </Modal>
  );
}
