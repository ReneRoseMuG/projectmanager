import type {
  DraftComment,
  DraftNote,
  Feature,
  Milestone,
  MilestoneInput,
  Note,
  Project,
  ProjectStatus,
  Tag,
} from "@taskmanager/shared-types";
import {
  Flag,
  FolderKanban,
  Link2,
  Trash2,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { DraftFile, ViewMode } from "../../types";
import { uploadContentImage } from "../../api/content-images";
import { errorMessage } from "../../hooks/errors";
import { useAttachments } from "../../hooks/useAttachments";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useFeatures } from "../../hooks/useFeatures";
import { useMilestoneFeatureLinks } from "../../hooks/useDocLinks";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useNotes } from "../../hooks/useNotes";
import { useTasks } from "../../hooks/useTasks";
import { useTickets } from "../../hooks/useTickets";
import { objectReference } from "../../lib/references";
import {
  countOpenStatusItems,
  resolveCatalogEntryKey,
} from "../../utils/catalogs";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { MilestoneDashboard } from "../dashboard/DashboardView";
import { ProjectFeaturePanel } from "../features/ProjectFeaturePanel";
import { JournalPanel } from "../journal/JournalPanel";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { TagPicker } from "../tags/TagPicker";
import { OwnerTaskBoard } from "../tasks/OwnerTaskBoard";
import { OwnerTicketBoard } from "../tickets/OwnerTicketBoard";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { DatePicker } from "../ui/DatePicker";
import { EmptyState } from "../ui/EmptyState";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { PendingCommentList } from "../ui/PendingCommentList";
import { PendingFileList } from "../ui/PendingFileList";
import { PendingNoteList } from "../ui/PendingNoteList";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { Select } from "../ui/Select";
import { TaskListSkeleton } from "../ui/Skeleton";
import { StatusToggle } from "../ui/StatusToggle";
import { TabBar, type Tab } from "../ui/TabBar";
import { useToast } from "../ui/ToastProvider";
import { useHasPermission } from "../../hooks/usePermissions";

interface MilestoneFormProps {
  open: boolean;
  milestone?: Milestone | null;
  projects: Project[];
  initialProjectId?: number;
  lockProjectSelection?: boolean;
  onSubmit: (
    input: MilestoneInput,
    tagIds: number[],
  ) => Promise<Milestone | void>;
  onClose: () => void;
  onDelete?: (milestone: Milestone) => Promise<boolean>;
  savingLabel?: string;
  initialTab?: MilestoneFormTab;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
  onOpenInTab?: () => void;
  onPostCreate?: (
    milestoneId: number,
    pending: {
      comments: DraftComment[];
      notes: DraftNote[];
      files: DraftFile[];
    },
  ) => Promise<void>;
}
function workStatusValue(
  entries: Parameters<typeof resolveCatalogEntryKey>[0],
  value: string,
  preferredKey = "active",
) {
  return (
    resolveCatalogEntryKey(entries, "workStatus", value, preferredKey) ??
    preferredKey
  );
}

export type MilestoneFormTab =
  | "overview"
  | "details"
  | "features"
  | "tasks"
  | "tickets"
  | "comments"
  | "notes"
  | "attachments"
  | "journal";

const tabs: Array<Tab<MilestoneFormTab>> = [
  { value: "overview", label: "Übersicht" },
  { value: "details", label: "Details" },
  { value: "tasks", label: "Aufgaben" },
  { value: "tickets", label: "Tickets" },
  { value: "features", label: "Features" },
  { value: "comments", label: "Kommentare" },
  { value: "notes", label: "Notizen" },
  { value: "attachments", label: "Dateien" },
  { value: "journal", label: "Journal" },
];

export function parseMilestoneFormTab(
  value: string | null | undefined,
): MilestoneFormTab | undefined {
  return tabs.some((tab) => tab.value === value)
    ? (value as MilestoneFormTab)
    : undefined;
}

export function MilestoneForm({
  open,
  milestone,
  projects,
  initialProjectId,
  lockProjectSelection = false,
  onSubmit,
  onClose,
  onDelete,
  savingLabel,
  initialTab,
  variant = "modal",
  closeOnSubmit = true,
  onOpenInTab,
  onPostCreate,
}: MilestoneFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const milestoneId = milestone?.id;
  const allFeatures = useFeatures();
  const featureLinks = useMilestoneFeatureLinks(milestoneId);
  const taskOwner = milestoneId
    ? { type: "milestone" as const, id: milestoneId }
    : undefined;
  const tasks = useTasks(taskOwner);
  const tickets = useTickets(
    milestoneId ? { type: "milestone", id: milestoneId } : null,
  );
  const catalogs = useCatalogs();
  const notes = useNotes(
    milestoneId ? { type: "milestone", id: milestoneId } : null,
  );
  const attachments = useAttachments(
    milestoneId ? { type: "milestone", id: milestoneId } : null,
  );
  const comments = useEntityComments("milestone", milestoneId);
  const canReadJournal = useHasPermission("journal", "read");
  const [activeTab, setActiveTab] = useState<MilestoneFormTab>("details");
  const [projectId, setProjectId] = useState<number | "">("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [color, setColor] = useState("var(--color-teal)");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [featureViewMode, setFeatureViewMode] = useState<ViewMode>("list");
  const [featureLinkOpen, setFeatureLinkOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);
  const [pendingNotes, setPendingNotes] = useState<DraftNote[]>([]);
  const [pendingFiles, setPendingFiles] = useState<DraftFile[]>([]);
  const prevOpenRef = useRef(false);
  const returnTo = `${location.pathname}${location.search}`;
  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: project.name,
  }));
  const linkedFeatureIds = new Set(
    featureLinks.features.map((feature) => feature.id),
  );
  const availableFeatures = allFeatures.features.filter(
    (feature) => !linkedFeatureIds.has(feature.id),
  );

  const handleTabChange = (nextTab: MilestoneFormTab) => {
    setActiveTab(nextTab);
    if (variant !== "page") {
      return;
    }
    const params = new URLSearchParams(location.search);
    params.set("tab", nextTab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  useEffect(() => {
    if (!open) {
      setFeatureLinkOpen(false);
      prevOpenRef.current = false;
      return;
    }

    if (!prevOpenRef.current) {
      setActiveTab(initialTab ?? "details");
      setFeatureLinkOpen(false);
      setPendingComments([]);
      setPendingNotes([]);
      setPendingFiles([]);
    }
    prevOpenRef.current = true;
  }, [initialTab, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const fallbackProjectId = initialProjectId ?? projects[0]?.id ?? "";
    setProjectId(milestone?.projectId ?? fallbackProjectId);
    setName(milestone?.name ?? "");
    setDescription(milestone?.description ?? "");
    setStatus(milestone?.status ?? "active");
    setColor(milestone?.color ?? "var(--color-teal)");
    setStartDate(milestone?.startDate ?? "");
    setDueDate(milestone?.dueDate ?? "");
    setSelectedTags(milestone?.tags ?? []);
  }, [initialProjectId, milestone, open, projects]);

  useEffect(() => {
    if (open) {
      setStatus((currentStatus) =>
        workStatusValue(catalogs.entries, currentStatus, "active"),
      );
    }
  }, [catalogs.entries, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (projectId === "") {
      showToast({ tone: "error", title: "Projektzuordnung fehlt" });
      return;
    }
    setSaving(true);
    try {
      const created = await onSubmit(
        {
          projectId,
          name,
          description,
          status: resolveCatalogEntryKey(
            catalogs.entries,
            "workStatus",
            status,
            "active",
          ),
          color,
          startDate: startDate || null,
          dueDate: dueDate || null,
        },
        selectedTags.map((tag) => tag.id),
      );
      if (!milestone && created && onPostCreate) {
        await onPostCreate(created.id, {
          comments: pendingComments,
          notes: pendingNotes,
          files: pendingFiles,
        });
      }
      if (closeOnSubmit) {
        onClose();
      }
    } catch {
      // Error feedback is handled by the page-level toast.
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrentMilestone = async () => {
    if (!milestone || !onDelete) {
      return;
    }
    setDeleting(true);
    try {
      const deleted = await onDelete(milestone);
      if (deleted) {
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  };

  const createNote = async () => {
    try {
      const note = await notes.createNote({
        title: "Ohne Titel",
        contentJson: {},
      });
      if (note) {
        setEditingNote(note);
        showToast({ tone: "success", title: "Notiz erstellt" });
      }
    } catch (noteError) {
      showToast({
        tone: "error",
        title: "Notiz konnte nicht erstellt werden",
        message: errorMessage(noteError),
      });
    }
  };

  const uploadAttachment = async (file: File) => {
    try {
      const uploaded = await attachments.uploadAttachment(file);
      showToast({ tone: "success", title: "Datei hochgeladen" });
      return uploaded;
    } catch (attachmentError) {
      showToast({
        tone: "error",
        title: "Datei konnte nicht hochgeladen werden",
        message: errorMessage(attachmentError),
      });
      throw attachmentError;
    }
  };

  const linkFeature = async (targetFeature: Feature) => {
    if (!milestoneId) {
      return false;
    }
    try {
      await featureLinks.setFeaturesForMilestone([
        ...featureLinks.features.map((feature) => feature.id),
        targetFeature.id,
      ]);
      showToast({ tone: "success", title: "Feature verknüpft" });
      return true;
    } catch (featureError) {
      showToast({
        tone: "error",
        title: "Feature konnte nicht verknüpft werden",
        message: errorMessage(featureError),
      });
      return false;
    }
  };

  const unlinkFeature = async (feature: Feature) => {
    try {
      await featureLinks.setFeaturesForMilestone(
        featureLinks.features
          .filter((item) => item.id !== feature.id)
          .map((item) => item.id),
      );
      showToast({ tone: "success", title: "Feature-Zuordnung entfernt" });
    } catch (featureError) {
      showToast({
        tone: "error",
        title: "Feature-Zuordnung konnte nicht entfernt werden",
        message: errorMessage(featureError),
      });
    }
  };

  const visibleTabs = milestone
    ? tabs.filter((tab) => tab.value !== "journal" || canReadJournal)
    : tabs.filter((tab) => tab.value !== "overview" && tab.value !== "journal");
  const tabItems = visibleTabs.map((tab) => {
    if (tab.value === "details") {
      return tab;
    }
    if (tab.value === "features") {
      return {
        ...tab,
        count: milestone
          ? countOpenStatusItems(
              featureLinks.features,
              catalogs.entries,
              "featureStatus",
            )
          : 0,
      };
    }
    if (tab.value === "tasks") {
      return {
        ...tab,
        count: milestone
          ? countOpenStatusItems(tasks.tasks, catalogs.entries, "workStatus")
          : 0,
      };
    }
    if (tab.value === "tickets") {
      return {
        ...tab,
        count: milestone
          ? countOpenStatusItems(
              tickets.tickets,
              catalogs.entries,
              "workStatus",
            )
          : 0,
      };
    }
    if (tab.value === "comments") {
      return { ...tab, count: milestone ? comments.comments.length : pendingComments.length };
    }
    if (tab.value === "notes") {
      return { ...tab, count: milestone ? notes.notes.length : pendingNotes.length };
    }
    if (tab.value === "attachments") {
      return { ...tab, count: milestone ? attachments.attachments.length : pendingFiles.length };
    }
    return { ...tab, count: 0 };
  });

  return (
    <>
      <FormModal
        open={open}
        title={milestone ? "Meilenstein bearbeiten" : "Meilenstein anlegen"}
        objectReference={milestone ? objectReference("milestone", milestone.id) : undefined}
        icon={<Flag size={21} />}
        breadcrumb={[
          "Meilensteine",
          milestone ? milestone.name : "Neuer Meilenstein",
        ]}
        onSubmit={submit}
        saving={saving}
        submitLabel={
          saving
            ? (savingLabel ?? "Speichern...")
            : milestone
              ? "Speichern"
              : "Meilenstein anlegen"
        }
        onOpenInTab={onOpenInTab}
        footerStart={
          milestone && onDelete ? (
            <Button
              className="text-crimson hover:bg-crimson/10"
              icon={<Trash2 size={18} />}
              variant="ghost"
              disabled={deleting}
              onClick={() => void deleteCurrentMilestone()}
            >
              Löschen
            </Button>
          ) : undefined
        }
        onClose={onClose}
        variant={variant}
        contentClassName={
          activeTab === "details" || activeTab === "overview" ? "w-full max-w-7xl self-center" : ""
        }
        tabBar={
          <TabBar tabs={tabItems} active={activeTab} onChange={handleTabChange} />
        }
      >
        {activeTab === "overview" && milestone ? (
          <MilestoneDashboard milestoneId={milestone.id} />
        ) : null}

        {activeTab === "details" ? (
          <>
            <Section>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(13rem,16rem)]">
                <FormField label="Name" required className="min-w-0">
                  <Input
                    value={name}
                    onChange={(inputEvent) => setName(inputEvent.target.value)}
                    required
                  />
                </FormField>
                <Select
                  label="Projekt"
                  required
                  value={projectId}
                  disabled={lockProjectSelection}
                  onChange={(inputEvent) =>
                    setProjectId(
                      inputEvent.target.value
                        ? Number(inputEvent.target.value)
                        : "",
                    )
                  }
                >
                  <option value="">Projekt auswählen</option>
                  {projectOptions.map((project) => (
                    <option key={project.value} value={project.value}>
                      {project.label}
                    </option>
                  ))}
                </Select>
              </div>
              <FormField label="Beschreibung" className="mt-4">
                <RichTextInlineField
                  value={description}
                  onChange={setDescription}
                  placeholder="Wofür steht dieser Meilenstein?"
                  minRows={12}
                  testIdPrefix="milestone-description"
                  onImageUpload={uploadContentImage}
                />
              </FormField>
            </Section>
            <Section title="Status">
              <FormField label="Status">
                <StatusToggle
                  kind="workStatus"
                  value={status}
                  onChange={setStatus}
                />
              </FormField>
            </Section>
            <Section title="Zeitraum">
              <div className="grid gap-4 md:grid-cols-2">
                <DatePicker
                  label="Start"
                  value={startDate}
                  onChange={(inputEvent) =>
                    setStartDate(inputEvent.target.value)
                  }
                />
                <DatePicker
                  label="Fällig"
                  value={dueDate}
                  onChange={(inputEvent) => setDueDate(inputEvent.target.value)}
                />
              </div>
            </Section>
            <Section title="Tags">
              <TagPicker selected={selectedTags} onChange={setSelectedTags} />
            </Section>
          </>
        ) : null}

        {activeTab === "features" ? (
          <Section fill={Boolean(milestone)}>
            {milestone ? (
              featureLinks.loading || allFeatures.loading ? (
                <TaskListSkeleton />
              ) : (
                <ProjectFeaturePanel
                  features={featureLinks.features}
                  viewMode={featureViewMode}
                  onViewModeChange={setFeatureViewMode}
                  onCreate={() =>
                    navigate(
                      `/features/new?returnTo=${encodeURIComponent(returnTo)}`,
                    )
                  }
                  onOpen={(feature) =>
                    navigate(
                      `/features/${feature.id}?returnTo=${encodeURIComponent(returnTo)}`,
                    )
                  }
                  onRemove={(feature) => void unlinkFeature(feature)}
                  removeLabel="Zuordnung entfernen"
                  secondaryAction={
                    <Button
                      aria-label="Feature verknüpfen"
                      title="Feature verknüpfen"
                      variant="secondary"
                      icon={<Link2 size={17} />}
                      className="h-9 w-9 bg-transparent px-0"
                      disabled={availableFeatures.length === 0}
                      onClick={() => setFeatureLinkOpen(true)}
                    />
                  }
                  emptyBody="Für diesen Meilenstein sind noch keine Features verknüpft."
                />
              )
            ) : (
              <EmptyState
                icon={<FolderKanban size={22} />}
                title="Features sind nach dem Speichern verfügbar."
                tone="violet"
                variant="tinted"
              />
            )}
          </Section>
        ) : null}

        {activeTab === "tasks" ? (
          <Section fill={Boolean(milestone)}>
            {milestone ? (
              <OwnerTaskBoard owner={{ type: "milestone", id: milestone.id }} />
            ) : (
              <EmptyState
                icon={<Flag size={22} />}
                title="Aufgaben sind nach dem Speichern verfügbar."
                tone="teal"
                variant="tinted"
              />
            )}
          </Section>
        ) : null}

        {activeTab === "tickets" ? (
          <Section fill={Boolean(milestone)}>
            {milestone ? (
              <OwnerTicketBoard
                owner={{ type: "milestone", id: milestone.id }}
              />
            ) : (
              <EmptyState
                icon={<Flag size={22} />}
                title="Tickets sind nach dem Speichern verfügbar."
                tone="teal"
                variant="tinted"
              />
            )}
          </Section>
        ) : null}

        {activeTab === "comments" ? (
          <Section>
            {milestone ? (
              <CommentThread
                comments={comments.comments}
                entityLabel="Meilenstein"
                onCreate={comments.createComment}
                onUpdate={comments.updateComment}
                onDelete={comments.removeComment}
              />
            ) : (
              <PendingCommentList
                comments={pendingComments}
                onAdd={(comment) => setPendingComments((items) => [...items, comment])}
                onUpdate={(index, comment) => setPendingComments((items) => items.map((item, itemIndex) => (itemIndex === index ? comment : item)))}
                onRemove={(index) => setPendingComments((items) => items.filter((_, itemIndex) => itemIndex !== index))}
              />
            )}
          </Section>
        ) : null}

        {activeTab === "notes" ? (
          <Section fill={Boolean(milestone)}>
            {milestone ? (
              <>
                <NoteList
                  notes={notes.notes}
                  onCreate={createNote}
                  onEdit={setEditingNote}
                  onDelete={(note) => void notes.removeNote(note.id)}
                />
                <NoteEditor
                  note={editingNote}
                  open={Boolean(editingNote)}
                  onSave={notes.updateNote}
                  onClose={() => setEditingNote(null)}
                />
              </>
            ) : (
              <PendingNoteList
                notes={pendingNotes}
                onAdd={(note) => setPendingNotes((items) => [...items, note])}
                onRemove={(index) => setPendingNotes((items) => items.filter((_, itemIndex) => itemIndex !== index))}
              />
            )}
          </Section>
        ) : null}

        {activeTab === "attachments" ? (
          <Section>
            {milestone ? (
              <div className="grid gap-4">
                <AttachmentUploader onUpload={uploadAttachment} />
                <AttachmentList
                  attachments={attachments.attachments}
                  onDelete={(attachment) =>
                    void attachments.removeAttachment(attachment.id)
                  }
                  onOpen={(attachment) => attachments.openAttachment(attachment.id)}
                  openingAttachmentId={attachments.openingAttachmentId}
                />
              </div>
            ) : (
              <PendingFileList
                files={pendingFiles}
                onAdd={(files) => setPendingFiles((items) => [...items, ...files])}
                onRemove={(index) =>
                  setPendingFiles((items) => {
                    const removed = items[index];
                    if (removed?.previewUrl) {
                      URL.revokeObjectURL(removed.previewUrl);
                    }
                    return items.filter((_, itemIndex) => itemIndex !== index);
                  })
                }
              />
            )}
          </Section>
        ) : null}

        {activeTab === "journal" && milestone ? (
          <Section fill>
            <JournalPanel objectType="milestone" objectId={milestone.id} />
          </Section>
        ) : null}
      </FormModal>

      <FeatureLinkDialog
        open={featureLinkOpen}
        features={availableFeatures}
        onLink={linkFeature}
        onClose={() => setFeatureLinkOpen(false)}
      />
    </>
  );
}

function FeatureLinkDialog({
  open,
  features,
  onLink,
  onClose,
}: {
  open: boolean;
  features: Feature[];
  onLink: (feature: Feature) => Promise<boolean>;
  onClose: () => void;
}) {
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | "">("");
  const firstFeatureId = features[0]?.id ?? "";

  useEffect(() => {
    if (open) {
      setSelectedFeatureId(firstFeatureId);
    }
  }, [firstFeatureId, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const feature = features.find((item) => item.id === selectedFeatureId);
    if (!feature) {
      return;
    }

    const linked = await onLink(feature);
    if (linked) {
      onClose();
    }
  };

  return (
    <Modal open={open} title="Feature verknüpfen" size="md" onClose={onClose}>
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        {features.length > 0 ? (
          <Select
            label="Feature"
            value={selectedFeatureId}
            onChange={(inputEvent) =>
              setSelectedFeatureId(
                inputEvent.target.value ? Number(inputEvent.target.value) : "",
              )
            }
          >
            {features.map((feature) => (
              <option key={feature.id} value={feature.id}>
                {feature.title}
              </option>
            ))}
          </Select>
        ) : (
          <EmptyState
            icon={<FolderKanban size={22} />}
            title="Keine Features verfügbar"
            tone="violet"
            variant="tinted"
          />
        )}
        <footer className="flex justify-end gap-2">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!selectedFeatureId}>
            Verknüpfen
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
