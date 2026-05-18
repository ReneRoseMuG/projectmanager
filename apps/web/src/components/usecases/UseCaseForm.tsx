import type { Feature, FeatureStatus, UseCase, UseCaseInput } from "@taskmanager/shared-types";
import { BookOpen, LinkIcon, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { Pill } from "../ui/Pill";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Section } from "../ui/Section";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Select } from "../ui/Select";
import { TabBar, type Tab } from "../ui/TabBar";
import { useEntityComments } from "../../hooks/useEntityComments";
import { featureStatusLabels, featureStatusTones } from "../../utils/domainLabels";
import { OwnerTaskBoard } from "../tasks/OwnerTaskBoard";
import { OwnerTicketBoard } from "../tickets/OwnerTicketBoard";

interface UseCaseFormProps {
  open: boolean;
  useCase?: UseCase | null;
  featureTitle?: string;
  currentFeatureId?: number;
  features?: Feature[];
  onSubmit: (input: UseCaseInput) => Promise<void>;
  onDelete?: (useCase: UseCase) => Promise<boolean> | boolean;
  onClose: () => void;
}

const statuses: Array<{ value: FeatureStatus; label: string; activeClassName: string }> = [
  { value: "draft", label: "Entwurf", activeClassName: "data-[active=true]:bg-mustard data-[active=true]:text-mustard-dark" },
  { value: "active", label: "Aktiv", activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" },
  { value: "done", label: "Erledigt", activeClassName: "data-[active=true]:bg-violet data-[active=true]:text-white" },
  { value: "archived", label: "Archiviert", activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" }
];

type UseCaseFormTab = "details" | "tasks" | "tickets" | "comments";

export function UseCaseForm({ open, useCase, featureTitle, currentFeatureId, features = [], onSubmit, onDelete, onClose }: UseCaseFormProps) {
  const comments = useEntityComments("useCase", useCase?.id);
  const [activeTab, setActiveTab] = useState<UseCaseFormTab>("details");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<FeatureStatus>("draft");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [content, setContent] = useState("");
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(useCase?.title ?? "");
    setSlug(useCase?.slug ?? "");
    setStatus(useCase?.status ?? "draft");
    setDescription(useCase?.description ?? "");
    setSortOrder(useCase?.sortOrder ?? 0);
    setContent(useCase?.content ?? "");
    setSelectedFeatureId(useCase?.featureId ?? currentFeatureId ?? "");
    setActiveTab("details");
  }, [currentFeatureId, open, useCase]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ featureId: selectedFeatureId ? Number(selectedFeatureId) : undefined, title, slug, status, description, sortOrder, content });
      onClose();
    } catch {
      // Error feedback is handled by the page-level toast.
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrentUseCase = async () => {
    if (!useCase || !onDelete) {
      return;
    }

    setDeleting(true);
    try {
      const deleted = await onDelete(useCase);
      if (deleted) {
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  };

  const taskOwner = useCase ? { type: "useCase" as const, id: useCase.id } : null;
  const ticketOwner = useCase ? { type: "useCase" as const, id: useCase.id } : null;
  const tabs: Array<Tab<UseCaseFormTab>> = useCase
    ? [
        { value: "details", label: "Stammdaten" },
        { value: "tasks", label: "Aufgaben" },
        { value: "tickets", label: "Tickets" },
        { value: "comments", label: "Kommentare", count: comments.comments.length }
      ]
    : [{ value: "details", label: "Stammdaten" }];

  return (
    <FormModal
      open={open}
      title={useCase ? "Use Case bearbeiten" : "Use Case anlegen"}
      subtitle={featureTitle ? `Feature: ${featureTitle}` : undefined}
      icon={<BookOpen size={21} />}
      breadcrumb={["Use Cases", useCase ? useCase.title : "Neu"]}
      onSubmit={submit}
      saving={saving}
      headerMeta={<Pill tone={featureStatusTones[status]}>{featureStatusLabels[status]}</Pill>}
      footerStart={
        useCase && onDelete ? (
          <Button className="text-crimson hover:bg-crimson/10" icon={<Trash2 size={18} />} variant="ghost" disabled={deleting} onClick={() => void deleteCurrentUseCase()}>
            Löschen
          </Button>
        ) : undefined
      }
      onClose={onClose}
    >
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "details" ? (
        <>
          <Section title="Stammdaten">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Titel" required className="min-w-0">
                <Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} required />
              </FormField>
              <FormField label="Slug" required className="min-w-0">
                <Input iconLeft={<LinkIcon size={16} />} value={slug} onChange={(event) => setSlug(event.target.value)} required variant="mono" />
              </FormField>
            </div>
          </Section>

          <Section title="Zuordnung">
            <Select label="Feature" value={selectedFeatureId} onChange={(event) => setSelectedFeatureId(event.target.value ? Number(event.target.value) : "")}>
              <option value="">Ohne Feature</option>
              {features.map((feature) => (
                <option key={feature.id} value={feature.id}>
                  {feature.title}
                </option>
              ))}
            </Select>
          </Section>

          <Section title="Status & Sortierung">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
              <FormField label="Status">
                <SegmentedControl value={status} options={statuses} onChange={setStatus} />
              </FormField>
              <FormField label="Sortierung">
                <Input type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} />
              </FormField>
            </div>
          </Section>

          <Section title="Kurzbeschreibung">
            <FormField label="Kurzbeschreibung">
              <RichTextEditor content={description} placeholder="Kurze fachliche Zusammenfassung" toolbar="full" minHeight="7rem" onChange={setDescription} />
            </FormField>
          </Section>

          <Section title="Inhalt" actions={<span className="text-xs font-semibold text-slate-500">HTML</span>}>
            {/* TODO: migrate existing markdown content to HTML. */}
            <RichTextEditor content={content} placeholder="Use-Case-Inhalt" toolbar="full" onChange={setContent} />
          </Section>
        </>
      ) : null}

      {activeTab === "tasks" && taskOwner ? (
        <Section title="Aufgaben">
          <OwnerTaskBoard owner={taskOwner} />
        </Section>
      ) : null}

      {activeTab === "tickets" && ticketOwner ? (
        <Section title="Tickets">
          <OwnerTicketBoard owner={ticketOwner} />
        </Section>
      ) : null}

      {activeTab === "comments" && useCase ? (
        <Section title="Kommentare">
          {comments.error ? <div className="mb-3 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{comments.error}</div> : null}
          <CommentThread comments={comments.comments} entityLabel="Use Case" onCreate={comments.createComment} onDelete={comments.removeComment} />
        </Section>
      ) : null}
    </FormModal>
  );
}
