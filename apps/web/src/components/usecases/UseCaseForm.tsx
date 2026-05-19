import type {
  DraftComment,
  DraftTask,
  DraftTicket,
  Feature,
  FeatureStatus,
  Priority,
  TaskStatus,
  TicketStatus,
  TicketType,
  UseCase,
  UseCaseInput
} from "@taskmanager/shared-types";
import { BookOpen, Bug, LinkIcon, ListTodo, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useEntityComments } from "../../hooks/useEntityComments";
import {
  featureStatusLabels,
  featureStatusTones,
  priorityLabels,
  taskStatusLabels,
  taskStatusTones,
  ticketStatusLabels,
  ticketStatusTones,
  ticketTypeLabels
} from "../../utils/domainLabels";
import { TaskLinkDialog } from "../tasks/TaskLinkDialog";
import { OwnerTaskBoard } from "../tasks/OwnerTaskBoard";
import { OwnerTicketBoard } from "../tickets/OwnerTicketBoard";
import { TicketLinkDialog } from "../tickets/TicketLinkDialog";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { PendingCommentList } from "../ui/PendingCommentList";
import { PendingRelationList } from "../ui/PendingRelationList";
import { Pill } from "../ui/Pill";
import { RadioList } from "../ui/RadioList";
import { RichTextEditor } from "../ui/RichTextEditor";
import { Section } from "../ui/Section";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Select } from "../ui/Select";
import { TabBar, type Tab } from "../ui/TabBar";

interface UseCaseFormProps {
  open: boolean;
  useCase?: UseCase | null;
  featureTitle?: string;
  currentFeatureId?: number;
  features?: Feature[];
  onSubmit: (input: UseCaseInput) => Promise<UseCase | void>;
  onPostCreate?: (
    useCaseId: number,
    pending: {
      tasks: DraftTask[];
      tickets: DraftTicket[];
      comments: DraftComment[];
    }
  ) => Promise<void>;
  onDelete?: (useCase: UseCase) => Promise<boolean> | boolean;
  onClose: () => void;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
}

const statuses: Array<{ value: FeatureStatus; label: string; activeClassName: string }> = [
  { value: "draft", label: "Entwurf", activeClassName: "data-[active=true]:bg-mustard data-[active=true]:text-mustard-dark" },
  { value: "active", label: "Aktiv", activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" },
  { value: "done", label: "Erledigt", activeClassName: "data-[active=true]:bg-violet data-[active=true]:text-white" },
  { value: "archived", label: "Archiviert", activeClassName: "data-[active=true]:bg-steel-700 data-[active=true]:text-white" }
];

const taskStatuses: Array<{ value: TaskStatus; label: string; activeColor: "fern" | "tangerine" | "crimson" | "violet" }> = [
  { value: "todo", label: taskStatusLabels.todo, activeColor: "crimson" },
  { value: "in_progress", label: taskStatusLabels.in_progress, activeColor: "tangerine" },
  { value: "done", label: taskStatusLabels.done, activeColor: "fern" }
];

const ticketStatuses: Array<{ value: TicketStatus; label: string; activeColor: "fern" | "tangerine" | "crimson" | "violet" }> = [
  { value: "open", label: ticketStatusLabels.open, activeColor: "crimson" },
  { value: "in_progress", label: ticketStatusLabels.in_progress, activeColor: "tangerine" },
  { value: "in_review", label: ticketStatusLabels.in_review, activeColor: "violet" },
  { value: "resolved", label: ticketStatusLabels.resolved, activeColor: "fern" },
  { value: "closed", label: ticketStatusLabels.closed, activeColor: "fern" }
];

const priorityOptions: Array<{ value: Priority; label: string; activeColor: "fern" | "tangerine" | "crimson" | "violet" }> = [
  { value: "low", label: priorityLabels.low, activeColor: "fern" },
  { value: "medium", label: priorityLabels.medium, activeColor: "violet" },
  { value: "high", label: priorityLabels.high, activeColor: "tangerine" },
  { value: "urgent", label: priorityLabels.urgent, activeColor: "crimson" }
];

type UseCaseFormTab = "details" | "tasks" | "tickets" | "comments";

const tabs: Array<Tab<UseCaseFormTab>> = [
  { value: "details", label: "Stammdaten" },
  { value: "tasks", label: "Aufgaben" },
  { value: "tickets", label: "Tickets" },
  { value: "comments", label: "Kommentare" }
];

export function UseCaseForm({ open, useCase, featureTitle, currentFeatureId, features = [], onSubmit, onPostCreate, onDelete, onClose, variant = "modal", closeOnSubmit = true }: UseCaseFormProps) {
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
  const [pendingTasks, setPendingTasks] = useState<DraftTask[]>([]);
  const [pendingTickets, setPendingTickets] = useState<DraftTicket[]>([]);
  const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);
  const [taskLinkOpen, setTaskLinkOpen] = useState(false);
  const [ticketLinkOpen, setTicketLinkOpen] = useState(false);
  const [taskDraftOpen, setTaskDraftOpen] = useState(false);
  const [ticketDraftOpen, setTicketDraftOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setPendingTasks([]);
      setPendingTickets([]);
      setPendingComments([]);
      setTaskLinkOpen(false);
      setTicketLinkOpen(false);
      setTaskDraftOpen(false);
      setTicketDraftOpen(false);
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
      const created = await onSubmit({ featureId: selectedFeatureId ? Number(selectedFeatureId) : undefined, title, slug, status, description, sortOrder, content });
      if (!useCase && created && onPostCreate) {
        await onPostCreate(created.id, { tasks: pendingTasks, tickets: pendingTickets, comments: pendingComments });
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
  const tabItems = tabs.map((tab) => {
    if (tab.value === "tasks") {
      return { ...tab, count: useCase ? undefined : pendingTasks.length };
    }
    if (tab.value === "tickets") {
      return { ...tab, count: useCase ? undefined : pendingTickets.length };
    }
    if (tab.value === "comments") {
      return { ...tab, count: useCase ? comments.comments.length : pendingComments.length };
    }
    return tab;
  });

  return (
    <>
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
        variant={variant}
      >
        <TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />

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
              <RichTextEditor content={content} placeholder="Use-Case-Inhalt" toolbar="full" onChange={setContent} />
            </Section>
          </>
        ) : null}

        {activeTab === "tasks" ? (
          <Section title="Aufgaben">
            {taskOwner ? (
              <OwnerTaskBoard owner={taskOwner} />
            ) : (
              <PendingRelationList
                existingItems={pendingTasks.flatMap((item) =>
                  item.kind === "existing" ? [{ id: item.task.id, title: item.task.title, statusLabel: taskStatusLabels[item.task.status], statusTone: taskStatusTones[item.task.status] }] : []
                )}
                draftItems={pendingTasks.flatMap((item) => (item.kind === "new" ? [{ title: item.draft.title, badge: "Wird erstellt" }] : []))}
                emptyIcon={<ListTodo size={22} />}
                emptyTitle="Keine Aufgaben vorgemerkt"
                onLinkExisting={() => setTaskLinkOpen(true)}
                onCreateNew={() => setTaskDraftOpen(true)}
                onRemoveExisting={(index) => setPendingTasks((items) => removeDraftByKindIndex(items, "existing", index))}
                onRemoveDraft={(index) => setPendingTasks((items) => removeDraftByKindIndex(items, "new", index))}
              />
            )}
          </Section>
        ) : null}

        {activeTab === "tickets" ? (
          <Section title="Tickets">
            {ticketOwner ? (
              <OwnerTicketBoard owner={ticketOwner} />
            ) : (
              <PendingRelationList
                existingItems={pendingTickets.flatMap((item) =>
                  item.kind === "existing"
                    ? [{ id: item.ticket.id, title: item.ticket.title, statusLabel: ticketStatusLabels[item.ticket.status], statusTone: ticketStatusTones[item.ticket.status] }]
                    : []
                )}
                draftItems={pendingTickets.flatMap((item) => (item.kind === "new" ? [{ title: item.draft.title, badge: "Wird erstellt" }] : []))}
                emptyIcon={<Bug size={22} />}
                emptyTitle="Keine Tickets vorgemerkt"
                onLinkExisting={() => setTicketLinkOpen(true)}
                onCreateNew={() => setTicketDraftOpen(true)}
                onRemoveExisting={(index) => setPendingTickets((items) => removeDraftByKindIndex(items, "existing", index))}
                onRemoveDraft={(index) => setPendingTickets((items) => removeDraftByKindIndex(items, "new", index))}
              />
            )}
          </Section>
        ) : null}

        {activeTab === "comments" ? (
          <Section title="Kommentare">
            {useCase ? (
              <>
                {comments.error ? <div className="mb-3 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{comments.error}</div> : null}
                <CommentThread comments={comments.comments} entityLabel="Use Case" onCreate={comments.createComment} onDelete={comments.removeComment} />
              </>
            ) : (
              <PendingCommentList comments={pendingComments} onAdd={(comment) => setPendingComments((items) => [...items, comment])} onRemove={(index) => setPendingComments((items) => items.filter((_, itemIndex) => itemIndex !== index))} />
            )}
          </Section>
        ) : null}
      </FormModal>

      <TaskLinkDialog
        open={taskLinkOpen}
        currentTasks={pendingTasks.flatMap((item) => (item.kind === "existing" ? [item.task] : []))}
        onLink={async (task) => {
          setPendingTasks((items) => [...items, { kind: "existing", task }]);
          setTaskLinkOpen(false);
        }}
        onClose={() => setTaskLinkOpen(false)}
      />
      <TicketLinkDialog
        open={ticketLinkOpen}
        currentTickets={pendingTickets.flatMap((item) => (item.kind === "existing" ? [item.ticket] : []))}
        onLink={async (ticket) => {
          setPendingTickets((items) => [...items, { kind: "existing", ticket }]);
          setTicketLinkOpen(false);
        }}
        onClose={() => setTicketLinkOpen(false)}
      />
      <TaskDraftDialog
        open={taskDraftOpen}
        onCreate={(draft) => setPendingTasks((items) => [...items, { kind: "new", draft }])}
        onClose={() => setTaskDraftOpen(false)}
      />
      <TicketDraftDialog
        open={ticketDraftOpen}
        onCreate={(draft) => setPendingTickets((items) => [...items, { kind: "new", draft }])}
        onClose={() => setTicketDraftOpen(false)}
      />
    </>
  );
}

function removeDraftByKindIndex<TItem extends { kind: "new" | "existing" }>(items: TItem[], kind: TItem["kind"], removeIndex: number): TItem[] {
  let currentIndex = -1;
  return items.filter((item) => {
    if (item.kind !== kind) {
      return true;
    }
    currentIndex += 1;
    return currentIndex !== removeIndex;
  });
}

function TaskDraftDialog({ open, onCreate, onClose }: { open: boolean; onCreate: (draft: Extract<DraftTask, { kind: "new" }>["draft"]) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const trimmedTitle = title.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    onCreate({ title: trimmedTitle, status, priority });
    setTitle("");
    setStatus("todo");
    setPriority("medium");
    onClose();
  };

  return (
    <Modal open={open} title="Aufgabe vormerken" size="md" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <FormField label="Titel" required>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required />
        </FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Status">
            <RadioList value={status} options={taskStatuses} onChange={setStatus} />
          </FormField>
          <FormField label="Priorität">
            <RadioList value={priority} options={priorityOptions} onChange={setPriority} />
          </FormField>
        </div>
        <footer className="flex justify-end gap-2">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!trimmedTitle}>
            Vormerken
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function TicketDraftDialog({ open, onCreate, onClose }: { open: boolean; onCreate: (draft: Extract<DraftTicket, { kind: "new" }>["draft"]) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TicketType>("bug");
  const [status, setStatus] = useState<TicketStatus>("open");
  const [priority, setPriority] = useState<Priority>("medium");
  const trimmedTitle = title.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    onCreate({ title: trimmedTitle, type, status, priority });
    setTitle("");
    setType("bug");
    setStatus("open");
    setPriority("medium");
    onClose();
  };

  return (
    <Modal open={open} title="Ticket vormerken" size="md" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <FormField label="Titel" required>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus required />
        </FormField>
        <Select label="Typ" value={type} onChange={(event) => setType(event.target.value as TicketType)}>
          <option value="bug">{ticketTypeLabels.bug}</option>
          <option value="improvement">{ticketTypeLabels.improvement}</option>
          <option value="question">{ticketTypeLabels.question}</option>
          <option value="task">{ticketTypeLabels.task}</option>
        </Select>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Status">
            <RadioList value={status} options={ticketStatuses} onChange={setStatus} />
          </FormField>
          <FormField label="Priorität">
            <RadioList value={priority} options={priorityOptions} onChange={setPriority} />
          </FormField>
        </div>
        <footer className="flex justify-end gap-2">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!trimmedTitle}>
            Vormerken
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
