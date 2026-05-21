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
  UseCaseInput,
} from "@taskmanager/shared-types";
import { BookOpen, Bug, LinkIcon, ListTodo, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useTasks } from "../../hooks/useTasks";
import { useTickets } from "../../hooks/useTickets";
import {
  catalogLabel,
  countOpenStatusItems,
  isCatalogStatusClosed,
  resolveCatalogEntryKey,
} from "../../utils/catalogs";
import { ticketTypeLabels } from "../../utils/domainLabels";
import { statusToneForKey } from "../../utils/statusTones";
import { TaskLinkDialog } from "../tasks/TaskLinkDialog";
import { JournalPanel } from "../journal/JournalPanel";
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
import { PrioritySelect } from "../ui/PrioritySelect";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { Select } from "../ui/Select";
import { StatusPill } from "../ui/StatusPill";
import { StatusToggle } from "../ui/StatusToggle";
import { TabBar, type Tab } from "../ui/TabBar";
import { useHasPermission } from "../../hooks/usePermissions";

interface UseCaseFormProps {
  open: boolean;
  useCase?: UseCase | null;
  currentFeatureId?: number;
  features?: Feature[];
  onSubmit: (input: UseCaseInput) => Promise<UseCase | void>;
  onPostCreate?: (
    useCaseId: number,
    pending: {
      tasks: DraftTask[];
      tickets: DraftTicket[];
      comments: DraftComment[];
    },
  ) => Promise<void>;
  onDelete?: (useCase: UseCase) => Promise<boolean> | boolean;
  onClose: () => void;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
  onOpenInTab?: () => void;
}

type UseCaseFormTab = "details" | "tasks" | "tickets" | "comments" | "journal";

const tabs: Array<Tab<UseCaseFormTab>> = [
  { value: "details", label: "Stammdaten" },
  { value: "tasks", label: "Aufgaben" },
  { value: "tickets", label: "Tickets" },
  { value: "comments", label: "Kommentare" },
  { value: "journal", label: "Journal" },
];

function featureStatusValue(
  entries: Parameters<typeof resolveCatalogEntryKey>[0],
  value: string,
  preferredKey = "draft",
) {
  return (
    resolveCatalogEntryKey(entries, "featureStatus", value, preferredKey) ??
    preferredKey
  );
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

function priorityValue(
  entries: Parameters<typeof resolveCatalogEntryKey>[0],
  value: string,
  preferredKey = "medium",
) {
  return (
    resolveCatalogEntryKey(entries, "priority", value, preferredKey) ??
    preferredKey
  );
}

export function UseCaseForm({
  open,
  useCase,
  currentFeatureId,
  features = [],
  onSubmit,
  onPostCreate,
  onDelete,
  onClose,
  variant = "modal",
  closeOnSubmit = true,
  onOpenInTab,
}: UseCaseFormProps) {
  const comments = useEntityComments("useCase", useCase?.id);
  const catalogs = useCatalogs();
  const tasks = useTasks(
    useCase ? { type: "useCase", id: useCase.id } : undefined,
  );
  const tickets = useTickets(
    useCase ? { type: "useCase", id: useCase.id } : null,
  );
  const canReadJournal = useHasPermission("journal", "read");
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

  useEffect(() => {
    if (open) {
      setStatus((currentStatus) =>
        featureStatusValue(catalogs.entries, currentStatus, "draft"),
      );
    }
  }, [catalogs.entries, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await onSubmit({
        featureId: selectedFeatureId ? Number(selectedFeatureId) : undefined,
        title,
        slug,
        status: resolveCatalogEntryKey(
          catalogs.entries,
          "featureStatus",
          status,
          "draft",
        ),
        description,
        sortOrder,
        content,
      });
      if (!useCase && created && onPostCreate) {
        await onPostCreate(created.id, {
          tasks: pendingTasks,
          tickets: pendingTickets,
          comments: pendingComments,
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

  const taskOwner = useCase
    ? { type: "useCase" as const, id: useCase.id }
    : null;
  const ticketOwner = useCase
    ? { type: "useCase" as const, id: useCase.id }
    : null;
  const visibleTabs = useCase
    ? tabs.filter((tab) => tab.value !== "journal" || canReadJournal)
    : tabs.filter((tab) => tab.value !== "journal");
  const tabItems = visibleTabs.map((tab) => {
    if (tab.value === "details") {
      return tab;
    }
    if (tab.value === "tasks") {
      const pending = pendingTasks.map((item) =>
        item.kind === "existing" ? item.task : item.draft,
      );
      return {
        ...tab,
        count: useCase
          ? countOpenStatusItems(tasks.tasks, catalogs.entries, "workStatus")
          : countOpenStatusItems(pending, catalogs.entries, "workStatus"),
      };
    }
    if (tab.value === "tickets") {
      const pending = pendingTickets.map((item) =>
        item.kind === "existing" ? item.ticket : item.draft,
      );
      return {
        ...tab,
        count: useCase
          ? countOpenStatusItems(
              tickets.tickets,
              catalogs.entries,
              "workStatus",
            )
          : countOpenStatusItems(pending, catalogs.entries, "workStatus"),
      };
    }
    if (tab.value === "comments") {
      return {
        ...tab,
        count: useCase ? comments.comments.length : pendingComments.length,
      };
    }
    return { ...tab, count: 0 };
  });

  return (
    <>
      <FormModal
        open={open}
        title={useCase ? "Use Case bearbeiten" : "Use Case anlegen"}
        icon={<BookOpen size={21} />}
        breadcrumb={["Use Cases", useCase ? useCase.title : "Neu"]}
        onSubmit={submit}
        saving={saving}
        onOpenInTab={onOpenInTab}
        headerMeta={<StatusPill kind="featureStatus" value={status} />}
        footerStart={
          useCase && onDelete ? (
            <Button
              className="text-crimson hover:bg-crimson/10"
              icon={<Trash2 size={18} />}
              variant="ghost"
              disabled={deleting}
              onClick={() => void deleteCurrentUseCase()}
            >
              Löschen
            </Button>
          ) : undefined
        }
        onClose={onClose}
        variant={variant}
        contentClassName={
          activeTab === "details" ? "w-full max-w-7xl self-center" : ""
        }
        tabBar={
          <TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />
        }
      >
        {activeTab === "details" ? (
          <>
            <Section title="Stammdaten">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Titel" required className="min-w-0">
                  <Input
                    autoFocus
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Slug" required className="min-w-0">
                  <Input
                    iconLeft={<LinkIcon size={16} />}
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                    required
                    variant="mono"
                  />
                </FormField>
              </div>
            </Section>

            <Section title="Zuordnung">
              <Select
                label="Feature"
                value={selectedFeatureId}
                onChange={(event) =>
                  setSelectedFeatureId(
                    event.target.value ? Number(event.target.value) : "",
                  )
                }
              >
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
                  <StatusToggle
                    kind="featureStatus"
                    value={status}
                    onChange={setStatus}
                  />
                </FormField>
                <FormField label="Sortierung">
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(event) =>
                      setSortOrder(Number(event.target.value))
                    }
                  />
                </FormField>
              </div>
            </Section>

            <Section title="Kurzbeschreibung">
              <FormField label="Kurzbeschreibung">
                <RichTextInlineField
                  value={description}
                  placeholder="Kurze fachliche Zusammenfassung"
                  minRows={12}
                  testIdPrefix="use-case-description"
                  onChange={setDescription}
                />
              </FormField>
            </Section>

            <Section
              title="Inhalt"
              actions={
                <span className="text-xs font-semibold text-slate-500">
                  HTML
                </span>
              }
            >
              <RichTextInlineField
                value={content}
                placeholder="Use-Case-Inhalt"
                testIdPrefix="use-case-content"
                onChange={setContent}
              />
            </Section>
          </>
        ) : null}

        {activeTab === "tasks" ? (
          <Section title="Aufgaben" fill={Boolean(taskOwner)}>
            {taskOwner ? (
              <OwnerTaskBoard owner={taskOwner} />
            ) : (
              <PendingRelationList
                existingItems={pendingTasks.flatMap((item) =>
                  item.kind === "existing"
                    ? [
                        {
                          id: item.task.id,
                          title: item.task.title,
                          statusLabel: catalogLabel(
                            catalogs.entries,
                            "workStatus",
                            item.task.status,
                          ),
                          statusTone: statusToneForKey(
                            "workStatus",
                            item.task.status,
                            isCatalogStatusClosed(
                              catalogs.entries,
                              "workStatus",
                              item.task.status,
                            ),
                          ),
                        },
                      ]
                    : [],
                )}
                draftItems={pendingTasks.flatMap((item) =>
                  item.kind === "new"
                    ? [{ title: item.draft.title, badge: "Wird erstellt" }]
                    : [],
                )}
                emptyIcon={<ListTodo size={22} />}
                emptyTitle="Keine Aufgaben vorgemerkt"
                onLinkExisting={() => setTaskLinkOpen(true)}
                onCreateNew={() => setTaskDraftOpen(true)}
                onRemoveExisting={(index) =>
                  setPendingTasks((items) =>
                    removeDraftByKindIndex(items, "existing", index),
                  )
                }
                onRemoveDraft={(index) =>
                  setPendingTasks((items) =>
                    removeDraftByKindIndex(items, "new", index),
                  )
                }
              />
            )}
          </Section>
        ) : null}

        {activeTab === "tickets" ? (
          <Section title="Tickets" fill={Boolean(ticketOwner)}>
            {ticketOwner ? (
              <OwnerTicketBoard owner={ticketOwner} />
            ) : (
              <PendingRelationList
                existingItems={pendingTickets.flatMap((item) =>
                  item.kind === "existing"
                    ? [
                        {
                          id: item.ticket.id,
                          title: item.ticket.title,
                          statusLabel: catalogLabel(
                            catalogs.entries,
                            "workStatus",
                            item.ticket.status,
                          ),
                          statusTone: statusToneForKey(
                            "workStatus",
                            item.ticket.status,
                            isCatalogStatusClosed(
                              catalogs.entries,
                              "workStatus",
                              item.ticket.status,
                            ),
                          ),
                        },
                      ]
                    : [],
                )}
                draftItems={pendingTickets.flatMap((item) =>
                  item.kind === "new"
                    ? [{ title: item.draft.title, badge: "Wird erstellt" }]
                    : [],
                )}
                emptyIcon={<Bug size={22} />}
                emptyTitle="Keine Tickets vorgemerkt"
                onLinkExisting={() => setTicketLinkOpen(true)}
                onCreateNew={() => setTicketDraftOpen(true)}
                onRemoveExisting={(index) =>
                  setPendingTickets((items) =>
                    removeDraftByKindIndex(items, "existing", index),
                  )
                }
                onRemoveDraft={(index) =>
                  setPendingTickets((items) =>
                    removeDraftByKindIndex(items, "new", index),
                  )
                }
              />
            )}
          </Section>
        ) : null}

        {activeTab === "comments" ? (
          <Section title="Kommentare">
            {useCase ? (
              <>
                {comments.error ? (
                  <div className="mb-3 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">
                    {comments.error}
                  </div>
                ) : null}
                <CommentThread
                  comments={comments.comments}
                  entityLabel="Use Case"
                  onCreate={comments.createComment}
                  onDelete={comments.removeComment}
                />
              </>
            ) : (
              <PendingCommentList
                comments={pendingComments}
                onAdd={(comment) =>
                  setPendingComments((items) => [...items, comment])
                }
                onRemove={(index) =>
                  setPendingComments((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              />
            )}
          </Section>
        ) : null}

        {activeTab === "journal" && useCase ? (
          <Section title="Journal" fill>
            <JournalPanel objectType="useCase" objectId={useCase.id} />
          </Section>
        ) : null}
      </FormModal>

      <TaskLinkDialog
        open={taskLinkOpen}
        currentTasks={pendingTasks.flatMap((item) =>
          item.kind === "existing" ? [item.task] : [],
        )}
        onLink={async (task) => {
          setPendingTasks((items) => [...items, { kind: "existing", task }]);
          setTaskLinkOpen(false);
        }}
        onClose={() => setTaskLinkOpen(false)}
      />
      <TicketLinkDialog
        open={ticketLinkOpen}
        currentTickets={pendingTickets.flatMap((item) =>
          item.kind === "existing" ? [item.ticket] : [],
        )}
        onLink={async (ticket) => {
          setPendingTickets((items) => [
            ...items,
            { kind: "existing", ticket },
          ]);
          setTicketLinkOpen(false);
        }}
        onClose={() => setTicketLinkOpen(false)}
      />
      <TaskDraftDialog
        open={taskDraftOpen}
        onCreate={(draft) =>
          setPendingTasks((items) => [...items, { kind: "new", draft }])
        }
        onClose={() => setTaskDraftOpen(false)}
      />
      <TicketDraftDialog
        open={ticketDraftOpen}
        onCreate={(draft) =>
          setPendingTickets((items) => [...items, { kind: "new", draft }])
        }
        onClose={() => setTicketDraftOpen(false)}
      />
    </>
  );
}

function removeDraftByKindIndex<TItem extends { kind: "new" | "existing" }>(
  items: TItem[],
  kind: TItem["kind"],
  removeIndex: number,
): TItem[] {
  let currentIndex = -1;
  return items.filter((item) => {
    if (item.kind !== kind) {
      return true;
    }
    currentIndex += 1;
    return currentIndex !== removeIndex;
  });
}

function TaskDraftDialog({
  open,
  onCreate,
  onClose,
}: {
  open: boolean;
  onCreate: (draft: Extract<DraftTask, { kind: "new" }>["draft"]) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const catalogs = useCatalogs();
  const [status, setStatus] = useState<TaskStatus>("active");
  const [priority, setPriority] = useState<Priority>("medium");
  const trimmedTitle = title.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    onCreate({
      title: trimmedTitle,
      status: resolveCatalogEntryKey(
        catalogs.entries,
        "workStatus",
        status,
        "active",
      ),
      priority: resolveCatalogEntryKey(
        catalogs.entries,
        "priority",
        priority,
        "medium",
      ),
    });
    setTitle("");
    setStatus(workStatusValue(catalogs.entries, "active", "active"));
    setPriority(priorityValue(catalogs.entries, "medium", "medium"));
    onClose();
  };

  return (
    <Modal open={open} title="Aufgabe vormerken" size="md" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <FormField label="Titel" required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            required
          />
        </FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Status">
            <StatusToggle
              kind="workStatus"
              value={status}
              onChange={setStatus}
            />
          </FormField>
          <FormField label="Priorität">
            <PrioritySelect value={priority} onChange={setPriority} />
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

function TicketDraftDialog({
  open,
  onCreate,
  onClose,
}: {
  open: boolean;
  onCreate: (draft: Extract<DraftTicket, { kind: "new" }>["draft"]) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TicketType>("bug");
  const catalogs = useCatalogs();
  const [status, setStatus] = useState<TicketStatus>("open");
  const [priority, setPriority] = useState<Priority>("medium");
  const trimmedTitle = title.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    onCreate({
      title: trimmedTitle,
      type,
      status: resolveCatalogEntryKey(
        catalogs.entries,
        "workStatus",
        status,
        "open",
      ),
      priority: resolveCatalogEntryKey(
        catalogs.entries,
        "priority",
        priority,
        "medium",
      ),
    });
    setTitle("");
    setType("bug");
    setStatus(workStatusValue(catalogs.entries, "open", "open"));
    setPriority(priorityValue(catalogs.entries, "medium", "medium"));
    onClose();
  };

  return (
    <Modal open={open} title="Ticket vormerken" size="md" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <FormField label="Titel" required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            required
          />
        </FormField>
        <Select
          label="Typ"
          value={type}
          onChange={(event) => setType(event.target.value as TicketType)}
        >
          <option value="bug">{ticketTypeLabels.bug}</option>
          <option value="improvement">{ticketTypeLabels.improvement}</option>
          <option value="question">{ticketTypeLabels.question}</option>
          <option value="task">{ticketTypeLabels.task}</option>
        </Select>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Status">
            <StatusToggle
              kind="workStatus"
              value={status}
              onChange={setStatus}
            />
          </FormField>
          <FormField label="Priorität">
            <PrioritySelect value={priority} onChange={setPriority} />
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
