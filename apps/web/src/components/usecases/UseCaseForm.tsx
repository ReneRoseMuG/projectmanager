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
import { BookOpen, Bug, Layers3, ListChecks, ListTodo, Trash2, Users } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAutoSave } from "../../hooks/useAutoSave";
import { SaveStatus } from "../ui/SaveStatus";
import { useLocation, useNavigate } from "react-router-dom";
import { uploadContentImage } from "../../api/content-images";
import { useAuth } from "../../hooks/useAuth";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useTasks } from "../../hooks/useTasks";
import { useTickets } from "../../hooks/useTickets";
import { objectReference } from "../../lib/references";
import {
  catalogEntriesByKind,
  catalogColor,
  catalogLabel,
  countOpenStatusItems,
  resolveCatalogEntryKey,
} from "../../utils/catalogs";
import type { TaskOwner } from "../../api/tasks";
import { TaskLinkDialog } from "../tasks/TaskLinkDialog";
import { JournalPanel } from "../journal/JournalPanel";
import { OwnerTaskBoard } from "../tasks/OwnerTaskBoard";
import { OwnerTicketBoard } from "../tickets/OwnerTicketBoard";
import type { TicketOwner } from "../../api/tickets";
import { TicketLinkDialog } from "../tickets/TicketLinkDialog";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { FormSidebar } from "../ui/FormSidebar";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { ParentContextField } from "../ui/ParentContextField";
import { PendingCommentList } from "../ui/PendingCommentList";
import { PendingRelationList } from "../ui/PendingRelationList";
import { CatalogSelect } from "../ui/CatalogSelect";
import { PrioritySelect } from "../ui/PrioritySelect";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { DetailBoardShell } from "../ui/DetailBoardShell";
import { Section } from "../ui/Section";
import { Select } from "../ui/Select";
import { StatusPill } from "../ui/StatusPill";
import { StatusToggle } from "../ui/StatusToggle";
import { TabBar, type Tab } from "../ui/TabBar";
import { UserSelectField } from "../users/UserSelectField";
import { useHasPermission } from "../../hooks/usePermissions";

interface UseCaseFormProps {
  open: boolean;
  useCase?: UseCase | null;
  currentFeatureId?: number;
  features?: Feature[];
  onSubmit: (input: UseCaseInput) => Promise<UseCase | void>;
  onAutoSave?: (input: UseCaseInput) => Promise<void>;
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
  initialTab?: UseCaseFormTab;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
  onOpenInTab?: () => void;
}

export type UseCaseFormTab = "details" | "tasks" | "tickets" | "comments" | "journal";

const tabs: Array<Tab<UseCaseFormTab>> = [
  { value: "details", label: "Details" },
  { value: "tasks", label: "Aufgaben" },
  { value: "tickets", label: "Tickets" },
  { value: "comments", label: "Kommentare" },
  { value: "journal", label: "Journal" },
];

export function parseUseCaseFormTab(
  value: string | null | undefined,
): UseCaseFormTab | undefined {
  return tabs.some((tab) => tab.value === value)
    ? (value as UseCaseFormTab)
    : undefined;
}

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

function ticketTypeValue(
  entries: Parameters<typeof resolveCatalogEntryKey>[0],
  value: string,
  preferredKey = "bug",
) {
  return (
    resolveCatalogEntryKey(entries, "ticketType", value, preferredKey) ??
    preferredKey
  );
}

export function UseCaseForm({
  open,
  useCase,
  currentFeatureId,
  features = [],
  onSubmit,
  onAutoSave,
  onPostCreate,
  onDelete,
  onClose,
  initialTab,
  variant = "modal",
  closeOnSubmit = true,
  onOpenInTab,
}: UseCaseFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const comments = useEntityComments("useCase", useCase?.id);
  const auth = useAuth();
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
  const [status, setStatus] = useState<FeatureStatus>("draft");
  const [content, setContent] = useState("");
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | "">("");
  const [responsibleUserId, setResponsibleUserId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<DraftTask[]>([]);
  const [pendingTickets, setPendingTickets] = useState<DraftTicket[]>([]);
  const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);
  const [taskLinkOpen, setTaskLinkOpen] = useState(false);
  const [ticketLinkOpen, setTicketLinkOpen] = useState(false);
  const [taskDraftOpen, setTaskDraftOpen] = useState(false);
  const [ticketDraftOpen, setTicketDraftOpen] = useState(false);
  const prevOpenRef = useRef(false);
  const formStateRef = useRef({ title, content, status, selectedFeatureId, responsibleUserId });
  formStateRef.current = { title, content, status, selectedFeatureId, responsibleUserId };
  const autoSave = useAutoSave({
    enabled: !!useCase && !!onAutoSave,
    save: async () => {
      if (!onAutoSave) return;
      const s = formStateRef.current;
      await onAutoSave({
        featureId: s.selectedFeatureId ? Number(s.selectedFeatureId) : undefined,
        title: s.title,
        status: featureStatusValue(catalogs.entries, s.status, "draft"),
        content: s.content,
        responsibleUserId: s.responsibleUserId,
      });
    },
  });
  const af = useCase ? autoSave.flush : undefined;
  const candidateFeatureId = useCase?.featureId ?? (typeof selectedFeatureId === "number" ? selectedFeatureId : currentFeatureId);
  const taskCandidateOwner: TaskOwner | null = useCase
    ? { type: "useCase", id: useCase.id }
    : candidateFeatureId !== undefined && Number.isFinite(candidateFeatureId)
      ? { type: "feature", id: candidateFeatureId }
      : null;
  const ticketCandidateOwner: TicketOwner | null = useCase
    ? { type: "useCase", id: useCase.id }
    : candidateFeatureId !== undefined && Number.isFinite(candidateFeatureId)
      ? { type: "feature", id: candidateFeatureId }
      : null;

  const handleTabChange = (nextTab: UseCaseFormTab) => {
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
      setPendingTasks([]);
      setPendingTickets([]);
      setPendingComments([]);
      setTaskLinkOpen(false);
      setTicketLinkOpen(false);
      setTaskDraftOpen(false);
      setTicketDraftOpen(false);
      prevOpenRef.current = false;
      return;
    }
    if (!prevOpenRef.current) {
      setActiveTab(initialTab ?? "details");
    }
    prevOpenRef.current = true;
  }, [initialTab, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(useCase?.title ?? "");
    setStatus(useCase?.status ?? "draft");
    setContent(useCase?.content ?? "");
    setSelectedFeatureId(useCase?.featureId ?? currentFeatureId ?? "");
    setResponsibleUserId(useCase ? useCase.responsibleUserId : (auth.user?.id ?? null));
  }, [auth.user?.id, currentFeatureId, open, useCase]);

  useEffect(() => {
    if (open && catalogs.entries.length > 0) {
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
        status: resolveCatalogEntryKey(
          catalogs.entries,
          "featureStatus",
          status,
          "draft",
        ),
        content,
        responsibleUserId,
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
  const showParentContexts =
    currentFeatureId === undefined &&
    selectedFeatureId === "" &&
    (useCase?.parentContexts?.length ?? 0) > 0;
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
        entityTitle={useCase?.title}
        objectReference={useCase ? objectReference("useCase", useCase.id) : undefined}
        icon={<Layers3 size={20} />}
        breadcrumb={["Use Cases"]}
        onSubmit={submit}
        saving={saving}
        hideFooter={!!useCase}
        onDelete={useCase && onDelete ? () => { void deleteCurrentUseCase(); } : undefined}
        saveStatus={useCase ? <SaveStatus status={autoSave.status} errorMessage={autoSave.errorMessage} /> : undefined}
        onOpenInTab={onOpenInTab}
        headerMeta={<StatusPill kind="featureStatus" value={status} />}
        onClose={onClose}
        variant={variant}
        contentLayout={activeTab === "details" ? "flush" : "default"}
        contentClassName={
          activeTab === "details" ? "" : ""
        }
        tabBar={
          <TabBar tabs={tabItems} active={activeTab} onChange={handleTabChange} />
        }
      >
        {activeTab === "details" ? (
          <div className="flex min-h-0 w-full flex-1">
            <div className="min-w-0 flex-1 overflow-auto p-2.5">
              <div className="grid w-full gap-4">
                <Section>
                  <FormField label="Titel" required className="min-w-0">
                    <Input
                      autoFocus
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      onBlur={af}
                      required
                    />
                  </FormField>
                </Section>

                <Section
                  title="Inhalt"
                  actions={
                    <span className="text-xs font-semibold text-steel-500">
                      HTML
                    </span>
                  }
                >
                  <RichTextInlineField
                    value={content}
                    placeholder="Use-Case-Inhalt"
                    testIdPrefix="use-case-content"
                    onImageUpload={uploadContentImage}
                    onChange={(v) => {
                      setContent(v);
                      formStateRef.current = { ...formStateRef.current, content: v };
                      af?.();
                    }}
                  />
                </Section>
              </div>
            </div>

            <FormSidebar storageKey="use-case-form-sidebar">
              {showParentContexts ? <ParentContextField parents={useCase?.parentContexts} /> : null}
              <Select
                label="Feature"
                icon={<BookOpen size={14} />}
                variant="panel"
                value={selectedFeatureId}
                onChange={(event) => {
                  const v = event.target.value ? Number(event.target.value) : ("" as const);
                  setSelectedFeatureId(v);
                  formStateRef.current = { ...formStateRef.current, selectedFeatureId: v };
                  af?.();
                }}
              >
                <option value="">Ohne Feature</option>
                {features.map((feature) => (
                  <option key={feature.id} value={feature.id}>
                    {feature.title}
                  </option>
                ))}
              </Select>
              <UserSelectField
                label="Verantwortlich"
                icon={<Users size={14} />}
                variant="panel"
                value={responsibleUserId}
                selectedUser={useCase?.responsibleUser ?? null}
                onChange={(v) => { setResponsibleUserId(v); formStateRef.current = { ...formStateRef.current, responsibleUserId: v }; af?.(); }}
              />
              <CatalogSelect label="Status" icon={<ListChecks size={14} />} variant="panel" kind="featureStatus" value={status} onChange={(v) => { setStatus(v); formStateRef.current = { ...formStateRef.current, status: v }; af?.(); }} />
            </FormSidebar>
          </div>
        ) : null}

        {activeTab === "tasks" ? (
          <DetailBoardShell>
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
                          statusColor: catalogColor(
                            catalogs.entries,
                            "workStatus",
                            item.task.status,
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
                showLinkExisting={taskCandidateOwner !== null}
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
          </DetailBoardShell>
        ) : null}

        {activeTab === "tickets" ? (
          <DetailBoardShell>
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
                          statusColor: catalogColor(
                            catalogs.entries,
                            "workStatus",
                            item.ticket.status,
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
                showLinkExisting={ticketCandidateOwner !== null}
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
          </DetailBoardShell>
        ) : null}

        {activeTab === "comments" ? (
          <DetailBoardShell>
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
                  onUpdate={comments.updateComment}
                  onDelete={comments.removeComment}
                />
              </>
            ) : (
              <PendingCommentList
                comments={pendingComments}
                onAdd={(comment) =>
                  setPendingComments((items) => [...items, comment])
                }
                onUpdate={(index, comment) =>
                  setPendingComments((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index ? comment : item,
                    ),
                  )
                }
                onRemove={(index) =>
                  setPendingComments((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              />
            )}
          </DetailBoardShell>
        ) : null}

        {activeTab === "journal" && useCase ? (
          <Section fill>
            <JournalPanel objectType="useCase" objectId={useCase.id} />
          </Section>
        ) : null}
      </FormModal>

      <TaskLinkDialog
        open={taskLinkOpen}
        owner={taskCandidateOwner}
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
        owner={ticketCandidateOwner}
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
  const ticketTypeOptions = useMemo(() => catalogEntriesByKind(catalogs.entries, "ticketType"), [catalogs.entries]);

  useEffect(() => {
    if (open && catalogs.entries.length > 0) {
      setType((currentType) => ticketTypeValue(catalogs.entries, currentType));
    }
  }, [catalogs.entries, open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (!trimmedTitle) {
      return;
    }
    onCreate({
      title: trimmedTitle,
      type: ticketTypeValue(catalogs.entries, type),
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
    setType(ticketTypeValue(catalogs.entries, "bug"));
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
          {ticketTypeOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
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
