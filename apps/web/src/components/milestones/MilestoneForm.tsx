import type { CalendarEvent, EventInput, Feature, Milestone, MilestoneInput, Note, Project, ProjectStatus, Tag } from "@taskmanager/shared-types";
import { CalendarClock, Edit3, Flag, FolderKanban, Paperclip, StickyNote, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ViewMode } from "../../types";
import { errorMessage } from "../../hooks/errors";
import { useAttachments } from "../../hooks/useAttachments";
import { useCalendarTasks } from "../../hooks/useCalendarTasks";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useEvents } from "../../hooks/useEvents";
import { useFeatures } from "../../hooks/useFeatures";
import { useMilestoneFeatureLinks } from "../../hooks/useDocLinks";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useMilestones } from "../../hooks/useMilestones";
import { useNotes } from "../../hooks/useNotes";
import { useTasks } from "../../hooks/useTasks";
import { useTickets } from "../../hooks/useTickets";
import { formatHumanDate } from "../../utils/date";
import { countOpenStatusItems } from "../../utils/catalogs";
import { richTextToPlainText } from "../../utils/richText";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { EventForm } from "../calendar/EventForm";
import { NoteEditor } from "../notes/NoteEditor";
import { NoteList } from "../notes/NoteList";
import { TagPicker } from "../tags/TagPicker";
import { OwnerTaskBoard } from "../tasks/OwnerTaskBoard";
import { OwnerTicketBoard } from "../tickets/OwnerTicketBoard";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ColorPicker } from "../ui/ColorPicker";
import { CommentThread } from "../ui/CommentThread";
import { DatePicker } from "../ui/DatePicker";
import { EmptyState } from "../ui/EmptyState";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { ItemRow } from "../ui/ItemRow";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { SectionHeader } from "../ui/SectionHeader";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Select } from "../ui/Select";
import { TaskListSkeleton } from "../ui/Skeleton";
import { StatusPill } from "../ui/StatusPill";
import { StatusToggle } from "../ui/StatusToggle";
import { TabBar, type Tab } from "../ui/TabBar";
import { useToast } from "../ui/ToastProvider";

interface MilestoneFormProps {
  open: boolean;
  milestone?: Milestone | null;
  projects: Project[];
  initialProjectId?: number;
  onSubmit: (input: MilestoneInput, tagIds: number[]) => Promise<Milestone | void>;
  onClose: () => void;
  onDelete?: (milestone: Milestone) => Promise<boolean>;
  savingLabel?: string;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
  onOpenInTab?: () => void;
}

type MilestoneFormTab = "details" | "features" | "tasks" | "tickets" | "comments" | "notes" | "attachments" | "events";

const tabs: Array<Tab<MilestoneFormTab>> = [
  { value: "details", label: "Stammdaten" },
  { value: "features", label: "Features" },
  { value: "tasks", label: "Aufgaben" },
  { value: "tickets", label: "Tickets" },
  { value: "comments", label: "Kommentare" },
  { value: "notes", label: "Notizen" },
  { value: "attachments", label: "Dateien" },
  { value: "events", label: "Events" }
];

const swatches = [
  "var(--color-teal)",
  "var(--color-steel-700)",
  "var(--color-crimson)",
  "var(--color-tangerine)",
  "var(--color-mustard)",
  "var(--color-fern)",
  "var(--color-violet)",
  "var(--color-magenta)",
  "var(--color-ink)"
];

export function MilestoneForm({ open, milestone, projects, initialProjectId, onSubmit, onClose, onDelete, savingLabel, variant = "modal", closeOnSubmit = true, onOpenInTab }: MilestoneFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const milestoneId = milestone?.id;
  const allFeatures = useFeatures();
  const allMilestones = useMilestones();
  const featureLinks = useMilestoneFeatureLinks(milestoneId);
  const taskOwner = milestoneId ? { type: "milestone" as const, id: milestoneId } : undefined;
  const tasks = useTasks(taskOwner);
  const tickets = useTickets(milestoneId ? { type: "milestone", id: milestoneId } : null);
  const catalogs = useCatalogs();
  const notes = useNotes(milestoneId ? { type: "milestone", id: milestoneId } : null);
  const attachments = useAttachments(milestoneId ? { type: "milestone", id: milestoneId } : null);
  const comments = useEntityComments("milestone", milestoneId);
  const events = useEvents();
  const calendarTasks = useCalendarTasks();
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
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | "">("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const returnTo = `${location.pathname}${location.search}`;
  const projectOptions = projects.map((project) => ({ value: project.id, label: project.name }));
  const linkedFeatureIds = new Set(featureLinks.features.map((feature) => feature.id));
  const availableFeatures = allFeatures.features.filter((feature) => !linkedFeatureIds.has(feature.id));
  const milestoneEvents = useMemo(
    () => (milestoneId ? events.events.filter((event) => event.owners.some((owner) => owner.type === "milestone" && owner.id === milestoneId)) : []),
    [events.events, milestoneId]
  );
  const initialEventOwners = useMemo(() => (milestoneId ? [{ type: "milestone" as const, id: milestoneId }] : []), [milestoneId]);

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
    setActiveTab("details");
    setSelectedFeatureId("");
    setSelectedEvent(null);
    setEventFormOpen(false);
  }, [initialProjectId, milestone, open, projects]);

  useEffect(() => {
    if (selectedFeatureId === "" && availableFeatures[0]) {
      setSelectedFeatureId(availableFeatures[0].id);
    }
  }, [availableFeatures, selectedFeatureId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (projectId === "") {
      showToast({ tone: "error", title: "Projektzuordnung fehlt" });
      return;
    }
    setSaving(true);
    try {
      await onSubmit(
        {
          projectId,
          name,
          description,
          status,
          color,
          startDate: startDate || null,
          dueDate: dueDate || null
        },
        selectedTags.map((tag) => tag.id)
      );
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
      const note = await notes.createNote({ title: "Ohne Titel", contentJson: {} });
      if (note) {
        setEditingNote(note);
        showToast({ tone: "success", title: "Notiz erstellt" });
      }
    } catch (noteError) {
      showToast({ tone: "error", title: "Notiz konnte nicht erstellt werden", message: errorMessage(noteError) });
    }
  };

  const uploadAttachment = async (file: File) => {
    try {
      const uploaded = await attachments.uploadAttachment(file);
      showToast({ tone: "success", title: "Datei hochgeladen" });
      return uploaded;
    } catch (attachmentError) {
      showToast({ tone: "error", title: "Datei konnte nicht hochgeladen werden", message: errorMessage(attachmentError) });
      throw attachmentError;
    }
  };

  const linkFeature = async () => {
    if (selectedFeatureId === "" || !milestoneId) {
      return;
    }
    try {
      await featureLinks.setFeaturesForMilestone([...featureLinks.features.map((feature) => feature.id), selectedFeatureId]);
      setSelectedFeatureId("");
      showToast({ tone: "success", title: "Feature verknüpft" });
    } catch (featureError) {
      showToast({ tone: "error", title: "Feature konnte nicht verknüpft werden", message: errorMessage(featureError) });
    }
  };

  const unlinkFeature = async (feature: Feature) => {
    try {
      await featureLinks.setFeaturesForMilestone(featureLinks.features.filter((item) => item.id !== feature.id).map((item) => item.id));
      showToast({ tone: "success", title: "Feature-Zuordnung entfernt" });
    } catch (featureError) {
      showToast({ tone: "error", title: "Feature-Zuordnung konnte nicht entfernt werden", message: errorMessage(featureError) });
    }
  };

  const submitEvent = async (input: EventInput, eventId?: number) => {
    try {
      if (eventId) {
        const expectedVersion = selectedEvent?.id === eventId ? selectedEvent.version : undefined;
        if (!expectedVersion) {
          throw new Error("Event version is missing");
        }
        await events.updateEvent(eventId, { ...input, expectedVersion });
        showToast({ tone: "success", title: "Termin aktualisiert" });
        return;
      }
      await events.createEvent(input);
      showToast({ tone: "success", title: "Termin erstellt" });
    } catch (eventError) {
      showToast({ tone: "error", title: "Termin konnte nicht gespeichert werden", message: errorMessage(eventError) });
      throw eventError;
    }
  };

  const tabItems = tabs.map((tab) => {
    if (tab.value === "details") {
      return tab;
    }
    if (tab.value === "features") {
      return { ...tab, count: milestone ? countOpenStatusItems(featureLinks.features, catalogs.entries, "featureStatus") : 0 };
    }
    if (tab.value === "tasks") {
      return { ...tab, count: milestone ? countOpenStatusItems(tasks.tasks, catalogs.entries, "workStatus") : 0 };
    }
    if (tab.value === "tickets") {
      return { ...tab, count: milestone ? countOpenStatusItems(tickets.tickets, catalogs.entries, "workStatus") : 0 };
    }
    if (tab.value === "comments") {
      return { ...tab, count: milestone ? comments.comments.length : 0 };
    }
    if (tab.value === "notes") {
      return { ...tab, count: milestone ? notes.notes.length : 0 };
    }
    if (tab.value === "attachments") {
      return { ...tab, count: milestone ? attachments.attachments.length : 0 };
    }
    if (tab.value === "events") {
      return { ...tab, count: milestone ? milestoneEvents.length : 0 };
    }
    return { ...tab, count: 0 };
  });

  return (
    <>
      <FormModal
        open={open}
        title={milestone ? "Meilenstein bearbeiten" : "Meilenstein anlegen"}
        icon={<Flag size={21} />}
        breadcrumb={["Meilensteine", milestone ? milestone.name : "Neuer Meilenstein"]}
        onSubmit={submit}
        saving={saving}
        submitLabel={saving ? savingLabel ?? "Speichern..." : milestone ? "Speichern" : "Meilenstein anlegen"}
        onOpenInTab={onOpenInTab}
        footerStart={
          milestone && onDelete ? (
            <Button className="text-crimson hover:bg-crimson/10" icon={<Trash2 size={18} />} variant="ghost" disabled={deleting} onClick={() => void deleteCurrentMilestone()}>
              Löschen
            </Button>
          ) : undefined
        }
        onClose={onClose}
        variant={variant}
      >
        <TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />

        {activeTab === "details" ? (
          <>
            <Section title="Stammdaten">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(13rem,16rem)]">
                <FormField label="Name" required className="min-w-0">
                  <Input value={name} onChange={(inputEvent) => setName(inputEvent.target.value)} required />
                </FormField>
                <Select label="Projekt" required value={projectId} onChange={(inputEvent) => setProjectId(inputEvent.target.value ? Number(inputEvent.target.value) : "")}>
                  <option value="">Projekt auswählen</option>
                  {projectOptions.map((project) => (
                    <option key={project.value} value={project.value}>
                      {project.label}
                    </option>
                  ))}
                </Select>
              </div>
              <FormField label="Beschreibung" className="mt-4">
                <RichTextInlineField value={description} onChange={setDescription} placeholder="Wofür steht dieser Meilenstein?" minRows={12} testIdPrefix="milestone-description" />
              </FormField>
            </Section>
            <Section title="Identität">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <FormField label="Farbe">
                  <ColorPicker value={color} onChange={setColor} swatches={swatches} />
                </FormField>
                <FormField label="Status">
                  <StatusToggle kind="workStatus" value={status} onChange={setStatus} />
                </FormField>
              </div>
            </Section>
            <Section title="Zeitraum">
              <div className="grid gap-4 md:grid-cols-2">
                <DatePicker label="Start" value={startDate} onChange={(inputEvent) => setStartDate(inputEvent.target.value)} />
                <DatePicker label="Fällig" value={dueDate} onChange={(inputEvent) => setDueDate(inputEvent.target.value)} />
              </div>
            </Section>
            <Section title="Tags">
              <TagPicker selected={selectedTags} onChange={setSelectedTags} />
            </Section>
          </>
        ) : null}

        {activeTab === "features" ? (
          <Section title="Features">
            {milestone ? (
              featureLinks.loading || allFeatures.loading ? (
                <TaskListSkeleton />
              ) : (
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <Select label="Feature verknüpfen" value={selectedFeatureId} onChange={(inputEvent) => setSelectedFeatureId(inputEvent.target.value ? Number(inputEvent.target.value) : "")}>
                      <option value="">Feature auswählen</option>
                      {availableFeatures.map((feature) => (
                        <option key={feature.id} value={feature.id}>
                          {feature.title}
                        </option>
                      ))}
                    </Select>
                    <Button variant="primary" disabled={selectedFeatureId === ""} onClick={() => void linkFeature()}>
                      Verknüpfen
                    </Button>
                    <Button onClick={() => navigate(`/features/new?returnTo=${encodeURIComponent(returnTo)}`)}>Neues Feature</Button>
                  </div>
                  <MilestoneFeatureList features={featureLinks.features} viewMode={featureViewMode} onViewModeChange={setFeatureViewMode} onOpen={(feature) => navigate(`/features/${feature.id}?returnTo=${encodeURIComponent(returnTo)}`)} onUnlink={(feature) => void unlinkFeature(feature)} />
                </div>
              )
            ) : (
              <EmptyState icon={<FolderKanban size={22} />} title="Features sind nach dem Speichern verfügbar." tone="violet" variant="tinted" />
            )}
          </Section>
        ) : null}

        {activeTab === "tasks" ? (
          <Section title="Aufgaben">
            {milestone ? <OwnerTaskBoard owner={{ type: "milestone", id: milestone.id }} /> : <EmptyState icon={<Flag size={22} />} title="Aufgaben sind nach dem Speichern verfügbar." tone="teal" variant="tinted" />}
          </Section>
        ) : null}

        {activeTab === "tickets" ? (
          <Section title="Tickets">
            {milestone ? <OwnerTicketBoard owner={{ type: "milestone", id: milestone.id }} /> : <EmptyState icon={<Flag size={22} />} title="Tickets sind nach dem Speichern verfügbar." tone="teal" variant="tinted" />}
          </Section>
        ) : null}

        {activeTab === "comments" ? (
          <Section title="Kommentare">
            {milestone ? <CommentThread comments={comments.comments} entityLabel="Meilenstein" onCreate={comments.createComment} onDelete={comments.removeComment} /> : <EmptyState icon={<Flag size={22} />} title="Kommentare sind nach dem Speichern verfügbar." tone="teal" variant="tinted" />}
          </Section>
        ) : null}

        {activeTab === "notes" ? (
          <Section>
            <div className="mb-4 flex items-center gap-2">
              <StickyNote size={18} className="text-fern" />
              <SectionHeader title="Notizen" />
            </div>
            {milestone ? (
              <>
                <NoteList notes={notes.notes} onCreate={createNote} onEdit={setEditingNote} onDelete={(note) => void notes.removeNote(note.id)} />
                <NoteEditor note={editingNote} open={Boolean(editingNote)} onSave={notes.updateNote} onClose={() => setEditingNote(null)} />
              </>
            ) : (
              <EmptyState icon={<StickyNote size={22} />} title="Notizen sind nach dem Speichern verfügbar." tone="fern" variant="tinted" />
            )}
          </Section>
        ) : null}

        {activeTab === "attachments" ? (
          <Section>
            <div className="mb-4 flex items-center gap-2">
              <Paperclip size={18} className="text-fern" />
              <SectionHeader title="Dateien" />
            </div>
            {milestone ? (
              <div className="grid gap-4">
                <AttachmentUploader onUpload={uploadAttachment} />
                <AttachmentList attachments={attachments.attachments} onDelete={(attachment) => void attachments.removeAttachment(attachment.id)} />
              </div>
            ) : (
              <EmptyState icon={<Paperclip size={22} />} title="Dateien sind nach dem Speichern verfügbar." tone="fern" variant="tinted" />
            )}
          </Section>
        ) : null}

        {activeTab === "events" ? (
          <Section title="Events">
            {milestone ? (
              <div className="grid gap-4">
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    icon={<CalendarClock size={16} />}
                    onClick={() => {
                      setSelectedEvent(null);
                      setEventFormOpen(true);
                    }}
                  >
                    Neuer Termin
                  </Button>
                </div>
                <MilestoneEventList
                  events={milestoneEvents}
                  onOpen={(event) => {
                    setSelectedEvent(event);
                    setEventFormOpen(true);
                  }}
                />
              </div>
            ) : (
              <EmptyState icon={<CalendarClock size={22} />} title="Events sind nach dem Speichern verfügbar." tone="teal" variant="tinted" />
            )}
          </Section>
        ) : null}
      </FormModal>

      <EventForm
        open={eventFormOpen}
        event={selectedEvent}
        initialOwners={initialEventOwners}
        projects={projects}
        milestones={allMilestones.milestones}
        tasks={calendarTasks.tasks}
        onSubmit={submitEvent}
        onDelete={async (event) => {
          try {
            await events.removeEvent(event.id);
            setEventFormOpen(false);
            showToast({ tone: "success", title: "Termin gelöscht" });
          } catch (eventError) {
            showToast({ tone: "error", title: "Termin konnte nicht gelöscht werden", message: errorMessage(eventError) });
            throw eventError;
          }
        }}
        onClose={() => setEventFormOpen(false)}
      />
    </>
  );
}

function MilestoneFeatureList({
  features,
  viewMode,
  onViewModeChange,
  onOpen,
  onUnlink
}: {
  features: Feature[];
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onOpen: (feature: Feature) => void;
  onUnlink: (feature: Feature) => void;
}) {
  if (features.length === 0) {
    return <EmptyState icon={<FolderKanban size={22} />} title="Keine Features" body="Für diesen Meilenstein sind noch keine Features verknüpft." tone="violet" variant="tinted" />;
  }

  return (
    <div className="grid gap-3">
      <div className="flex justify-end">
        <SegmentedControl
          value={viewMode}
          options={[
            { value: "list", label: "Liste", activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" },
            { value: "kanban", label: "Board", activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" }
          ]}
          onChange={onViewModeChange}
        />
      </div>
      <div className={viewMode === "kanban" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-2"}>
        {features.map((feature) => (
          <ItemRow
            key={feature.id}
            accentColor="var(--color-steel-600)"
            title={feature.title}
            description={richTextToPlainText(feature.description)}
            pills={
              <>
                <StatusPill kind="featureStatus" value={feature.status} />
                <Badge tone="steel">{feature.useCaseCount} Use Cases</Badge>
              </>
            }
            actions={
              <>
                <Button aria-label="Öffnen" title="Öffnen" className="h-10 w-10" icon={<Edit3 size={18} />} variant="ghost" onClick={() => onOpen(feature)} />
                <Button aria-label="Zuordnung entfernen" title="Zuordnung entfernen" className="h-10 w-10" icon={<Trash2 size={18} />} variant="ghost" onClick={() => onUnlink(feature)} />
              </>
            }
            onOpen={() => onOpen(feature)}
          />
        ))}
      </div>
    </div>
  );
}

function MilestoneEventList({ events, onOpen }: { events: CalendarEvent[]; onOpen: (event: CalendarEvent) => void }) {
  if (events.length === 0) {
    return <EmptyState icon={<CalendarClock size={22} />} title="Keine Events" body="Termine mit Meilensteinbezug erscheinen hier." tone="teal" variant="tinted" />;
  }

  return (
    <div className="grid gap-2">
      {events.map((event) => (
        <ItemRow
          key={event.id}
          accentColor={event.color ?? "var(--color-teal)"}
          title={event.title}
          description={richTextToPlainText(event.description)}
          pills={
            <>
              <Badge tone={event.isAllDay ? "violet" : "teal"}>{event.isAllDay ? "Ganztägig" : "Termin"}</Badge>
              <Badge tone="steel">{formatHumanDate(event.startTime)}</Badge>
            </>
          }
          actions={<Button aria-label="Bearbeiten" title="Bearbeiten" className="h-10 w-10" icon={<Edit3 size={18} />} variant="ghost" onClick={() => onOpen(event)} />}
          onOpen={() => onOpen(event)}
        />
      ))}
    </div>
  );
}
