import type { Project, ProjectInput, ProjectStatus, Tag } from "@taskmanager/shared-types";
import { FolderKanban } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { formatHumanDate } from "../../utils/date";
import { TagPicker } from "../tags/TagPicker";
import { ColorPicker } from "../ui/ColorPicker";
import { DatePicker } from "../ui/DatePicker";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Section } from "../ui/Section";
import { SegmentedControl } from "../ui/SegmentedControl";

interface ProjectFormProps {
  open: boolean;
  project?: Project | null;
  onSubmit: (input: ProjectInput, tagIds: number[]) => Promise<void>;
  onClose: () => void;
}

const statusOptions: Array<{ value: ProjectStatus; label: string; activeClassName: string }> = [
  { value: "active", label: "Aktiv", activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" },
  { value: "on_hold", label: "Pausiert", activeClassName: "data-[active=true]:bg-tangerine data-[active=true]:text-white" },
  { value: "completed", label: "Abgeschlossen", activeClassName: "data-[active=true]:bg-violet data-[active=true]:text-white" },
  { value: "archived", label: "Archiviert", activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" }
];

const swatches = [
  "var(--color-steel-700)",
  "var(--color-crimson)",
  "var(--color-tangerine)",
  "var(--color-mustard)",
  "var(--color-fern)",
  "var(--color-teal)",
  "var(--color-violet)",
  "var(--color-magenta)",
  "var(--color-ink)"
];

function projectCode(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 5)
    .toUpperCase();
}

export function ProjectForm({ open, project, onSubmit, onClose }: ProjectFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [color, setColor] = useState("var(--color-steel-700)");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const code = useMemo(() => projectCode(name), [name]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setStatus(project?.status ?? "active");
    setColor(project?.color ?? "var(--color-steel-700)");
    setSelectedTags(project?.tags ?? []);
    setStartDate(project?.startDate ?? "");
    setDueDate(project?.dueDate ?? "");
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
          color,
          startDate: startDate || null,
          dueDate: dueDate || null
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
    <FormModal
      open={open}
      title={project ? "Projekt bearbeiten" : "Projekt anlegen"}
      subtitle={project ? `Zuletzt aktualisiert am ${formatHumanDate(project.updatedAt)}` : "Stammdaten, Status und visuelle Identität festlegen."}
      icon={<FolderKanban size={21} />}
      breadcrumb={["Projekte", project ? project.name : "Neues Projekt"]}
      onSubmit={submit}
      saving={saving}
      submitLabel={project ? "Speichern" : "Projekt anlegen"}
      onClose={onClose}
    >
      <Section title="Stammdaten">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
          <FormField label="Projektname" required className="min-w-0">
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </FormField>
          <FormField label="Kürzel" className="min-w-0">
            <Input value={code} readOnly maxLength={5} variant="mono" className="uppercase text-slate-600" />
          </FormField>
        </div>
        <FormField label="Beschreibung" className="mt-4">
          <RichTextEditor content={description} onChange={setDescription} placeholder="Worum geht es in diesem Projekt?" minHeight="9rem" toolbar="full" />
        </FormField>
      </Section>

      <Section title="Identität">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <FormField label="Farbe">
            <ColorPicker value={color} onChange={setColor} swatches={swatches} />
          </FormField>
          <FormField label="Status">
            <SegmentedControl value={status} options={statusOptions} onChange={setStatus} />
          </FormField>
        </div>
      </Section>

      <Section title="Zeitraum">
        <div className="grid gap-4 md:grid-cols-2">
          <DatePicker label="Start" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <DatePicker label="Fällig" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
      </Section>

      <Section title="Tags">
        <TagPicker selected={selectedTags} onChange={setSelectedTags} />
      </Section>
    </FormModal>
  );
}
