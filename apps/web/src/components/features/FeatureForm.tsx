import type { Feature, FeatureInput, FeatureStatus } from "@taskmanager/shared-types";
import { BookOpen, LinkIcon } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Section } from "../ui/Section";
import { SegmentedControl } from "../ui/SegmentedControl";

interface FeatureFormProps {
  open: boolean;
  feature?: Feature | null;
  onSubmit: (input: FeatureInput) => Promise<void>;
  onProjectLinksChanged?: () => void | Promise<void>;
  onClose: () => void;
}

const statuses: Array<{ value: FeatureStatus; label: string }> = [
  { value: "draft", label: "Entwurf" },
  { value: "active", label: "Aktiv" },
  { value: "done", label: "Erledigt" },
  { value: "archived", label: "Archiviert" }
];

export function FeatureForm({ open, feature, onSubmit, onClose }: FeatureFormProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<FeatureStatus>("draft");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(feature?.title ?? "");
    setSlug(feature?.slug ?? "");
    setStatus(feature?.status ?? "draft");
    setDescription(feature?.description ?? "");
    setSortOrder(feature?.sortOrder ?? 0);
    setContent(feature?.content ?? "");
  }, [open, feature]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        title,
        slug,
        status,
        description,
        sortOrder,
        content
      });
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
      title={feature ? "Feature bearbeiten" : "Neues Feature"}
      subtitle="Feature-Inhalt und Status in einem Formular pflegen."
      icon={<BookOpen size={20} />}
      breadcrumb={["Features", feature ? "Bearbeiten" : "Neu"]}
      submitLabel={feature ? "Speichern" : "Feature anlegen"}
      saving={saving}
      onSubmit={submit}
      onClose={onClose}
    >
      <Section title="Stammdaten">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_10rem]">
          <FormField label="Titel" required className="min-w-0">
            <Input autoFocus={!feature} value={title} onChange={(event) => setTitle(event.target.value)} required />
          </FormField>
          <FormField label="Slug" required className="min-w-0">
            <Input iconLeft={<LinkIcon size={16} />} variant="mono" value={slug} onChange={(event) => setSlug(event.target.value)} required />
          </FormField>
          <FormField label="Sortierung" className="min-w-0">
            <Input type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
          </FormField>
        </div>
      </Section>

      <Section title="Status">
        <SegmentedControl value={status} options={statuses} onChange={setStatus} />
      </Section>

      <Section title="Kurzbeschreibung">
        <RichTextEditor content={description} placeholder="Kurzbeschreibung" toolbar="minimal" minHeight="8rem" onChange={setDescription} />
      </Section>

      <Section title="Inhalt">
        <RichTextEditor content={content} placeholder="Feature-Inhalt" toolbar="full" onChange={setContent} />
      </Section>
    </FormModal>
  );
}
