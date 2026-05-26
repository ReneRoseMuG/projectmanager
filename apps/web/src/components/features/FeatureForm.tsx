import type {
  DraftComment,
  DraftTask,
  DraftTicket,
  DraftUseCase,
  Feature,
  FeatureInput,
  FeatureStatus,
  Priority,
  Project,
  TaskStatus,
  TicketStatus,
  TicketType,
} from "@taskmanager/shared-types";
import {
  BookOpen,
  Bug,
  FileText,
  ListTodo,
  Trash2,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { DraftFile, ViewMode } from "../../types";
import { assetUrl } from "../../api/client";
import { errorMessage } from "../../hooks/errors";
import { useAttachments } from "../../hooks/useAttachments";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useFeatureProjectLinks } from "../../hooks/useDocLinks";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useProjects } from "../../hooks/useProjects";
import { useTasks } from "../../hooks/useTasks";
import { useTickets } from "../../hooks/useTickets";
import { useUseCases } from "../../hooks/useUseCases";
import { objectReference } from "../../lib/references";
import {
  catalogEntriesByKind,
  catalogColor,
  catalogLabel,
  countOpenStatusItems,
  resolveCatalogEntryKey,
} from "../../utils/catalogs";
import { formatHumanDate } from "../../utils/date";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { JournalPanel } from "../journal/JournalPanel";
import type { TaskOwner } from "../../api/tasks";
import { TaskLinkDialog } from "../tasks/TaskLinkDialog";
import { OwnerTaskBoard } from "../tasks/OwnerTaskBoard";
import { OwnerTicketBoard } from "../tickets/OwnerTicketBoard";
import type { TicketOwner } from "../../api/tickets";
import { TicketLinkDialog } from "../tickets/TicketLinkDialog";
import { UseCaseListBoardView } from "../usecases/UseCaseListBoardView";
import { Button } from "../ui/Button";
import { CommentThread } from "../ui/CommentThread";
import { useConfirm } from "../ui/ConfirmDialogProvider";
import { FormField } from "../ui/FormField";
import { FormModal } from "../ui/FormModal";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { PendingCommentList } from "../ui/PendingCommentList";
import { PendingFileList } from "../ui/PendingFileList";
import { PendingRelationList } from "../ui/PendingRelationList";
import { PrioritySelect } from "../ui/PrioritySelect";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { Section } from "../ui/Section";
import { Select } from "../ui/Select";
import { SelectParent, type SelectParentItem } from "../ui/SelectParent";
import { TaskListSkeleton } from "../ui/Skeleton";
import { StatusToggle } from "../ui/StatusToggle";
import { TabBar, type Tab } from "../ui/TabBar";
import { useToast } from "../ui/ToastProvider";
import { useHasPermission } from "../../hooks/usePermissions";

interface FeatureFormProps {
  open: boolean;
  feature?: Feature | null;
  onSubmit: (input: FeatureInput) => Promise<Feature | void>;
  onClose: () => void;
  onDelete?: (feature: Feature) => Promise<boolean>;
  savingLabel?: string;
  initialProjectId?: number;
  initialTab?: FeatureFormTab;
  variant?: "modal" | "page";
  closeOnSubmit?: boolean;
  onOpenInTab?: () => void;
  onPostCreate?: (
    featureId: number,
    pending: {
      tasks: DraftTask[];
      tickets: DraftTicket[];
      useCases: DraftUseCase[];
      projectIds: number[];
      comments: DraftComment[];
      files: DraftFile[];
    },
  ) => Promise<void>;
}

export type FeatureFormTab =
  | "details"
  | "useCases"
  | "tasks"
  | "tickets"
  | "comments"
  | "attachments"
  | "journal";

const tabs: Array<Tab<FeatureFormTab>> = [
  { value: "details", label: "Details" },
  { value: "useCases", label: "Use Cases" },
  { value: "tasks", label: "Aufgaben" },
  { value: "tickets", label: "Tickets" },
  { value: "comments", label: "Kommentare" },
  { value: "attachments", label: "Dateien" },
  { value: "journal", label: "Journal" },
];

export function parseFeatureFormTab(
  value: string | null | undefined,
): FeatureFormTab | undefined {
  return tabs.some((tab) => tab.value === value)
    ? (value as FeatureFormTab)
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

function projectParentItem(project: Project): SelectParentItem {
  const metaParts = [`${project.openTaskCount} offene Aufgaben`];
  const dueDate = formatHumanDate(project.dueDate);
  if (dueDate) {
    metaParts.push(dueDate);
  }

  return {
    id: project.id,
    title: project.name,
    accentColor: project.color ?? undefined,
    statusKind: "workStatus",
    statusValue: project.status,
    meta: metaParts.join(" · "),
  };
}

export function FeatureForm({
  open,
  feature,
  onSubmit,
  onClose,
  onDelete,
  savingLabel,
  initialProjectId,
  initialTab,
  variant = "modal",
  closeOnSubmit = true,
  onOpenInTab,
  onPostCreate,
}: FeatureFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const featureId = feature?.id;
  const stableInitialProjectId =
    initialProjectId !== undefined && Number.isFinite(initialProjectId)
      ? initialProjectId
      : undefined;
  const taskCandidateOwner: TaskOwner | null = featureId
    ? { type: "feature", id: featureId }
    : stableInitialProjectId !== undefined
      ? { type: "project", id: stableInitialProjectId }
      : null;
  const ticketCandidateOwner: TicketOwner | null = featureId
    ? { type: "feature", id: featureId }
    : stableInitialProjectId !== undefined
      ? { type: "project", id: stableInitialProjectId }
      : null;
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canReadJournal = useHasPermission("journal", "read");
  const canWriteProjectRelations = useHasPermission("projects", "write");
  const projects = useProjects();
  const projectLinks = useFeatureProjectLinks(featureId);
  const useCases = useUseCases(featureId);
  const tasks = useTasks(
    featureId ? { type: "feature", id: featureId } : undefined,
  );
  const tickets = useTickets(
    featureId ? { type: "feature", id: featureId } : null,
  );
  const catalogs = useCatalogs();
  const comments = useEntityComments("feature", featureId);
  const attachments = useAttachments(
    featureId ? { type: "feature", id: featureId } : null,
  );
  const [activeTab, setActiveTab] = useState<FeatureFormTab>("details");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<FeatureStatus>("draft");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [useCaseViewMode, setUseCaseViewMode] = useState<ViewMode>("kanban");
  const [pendingUseCases, setPendingUseCases] = useState<DraftUseCase[]>([]);
  const [pendingTasks, setPendingTasks] = useState<DraftTask[]>([]);
  const [pendingTickets, setPendingTickets] = useState<DraftTicket[]>([]);
  const [pendingProjectId, setPendingProjectId] = useState<number | null>(
    stableInitialProjectId ?? null,
  );
  const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<DraftFile[]>([]);
  const [useCaseDraftOpen, setUseCaseDraftOpen] = useState(false);
  const [taskLinkOpen, setTaskLinkOpen] = useState(false);
  const [taskDraftOpen, setTaskDraftOpen] = useState(false);
  const [ticketLinkOpen, setTicketLinkOpen] = useState(false);
  const [ticketDraftOpen, setTicketDraftOpen] = useState(false);
  const prevOpenRef = useRef(false);

  const handleTabChange = (nextTab: FeatureFormTab) => {
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
      setPendingUseCases([]);
      setPendingTasks([]);
      setPendingTickets([]);
      setPendingProjectId(stableInitialProjectId ?? null);
      setPendingComments([]);
      setPendingFiles([]);
      setUseCaseDraftOpen(false);
      setTaskLinkOpen(false);
      setTaskDraftOpen(false);
      setTicketLinkOpen(false);
      setTicketDraftOpen(false);
      prevOpenRef.current = false;
      return;
    }
    if (!prevOpenRef.current) {
      setActiveTab(initialTab ?? "details");
    }
    prevOpenRef.current = true;
  }, [initialTab, open, stableInitialProjectId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(feature?.title ?? "");
    setStatus(feature?.status ?? "draft");
    setDescription(feature?.description ?? "");
    setSortOrder(feature?.sortOrder ?? 0);
    setContent(feature?.content ?? "");
  }, [feature, open]);

  useEffect(() => {
    if (open && !feature) {
      setPendingProjectId(stableInitialProjectId ?? null);
    }
  }, [feature, open, stableInitialProjectId]);

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
        title,
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
      if (!feature && created && onPostCreate) {
        await onPostCreate(created.id, {
          tasks: pendingTasks,
          tickets: pendingTickets,
          useCases: pendingUseCases,
          projectIds:
            canWriteProjectRelations && pendingProjectId
              ? [pendingProjectId]
              : [],
          comments: pendingComments,
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

  const deleteCurrentFeature = async () => {
    if (!feature || !onDelete) {
      return;
    }
    setDeleting(true);
    try {
      const deleted = await onDelete(feature);
      if (deleted) {
        onClose();
      }
    } finally {
      setDeleting(false);
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

  const uploadEditorImage = feature
    ? async (file: File): Promise<string> => {
        const uploaded = await uploadAttachment(file);
        if (!uploaded) {
          throw new Error("Image upload requires a saved feature.");
        }
        return assetUrl(uploaded.url);
      }
    : undefined;

  const projectParentItems = useMemo(
    () => projects.projects.map(projectParentItem),
    [projects.projects],
  );
  const selectedParentProject = feature
    ? (projectLinks.linkedProjects[0] ?? null)
    : (projects.projects.find((project) => project.id === pendingProjectId) ??
      null);
  const selectedParentItem = selectedParentProject
    ? projectParentItem(selectedParentProject)
    : null;
  const parentProjectDisabled =
    projects.loading ||
    Boolean(feature && projectLinks.loading) ||
    !canWriteProjectRelations;

  const changeParentProject = async (item: SelectParentItem | null) => {
    const nextProjectId = item ? Number(item.id) : null;
    if (!feature) {
      setPendingProjectId(nextProjectId);
      return;
    }

    if (!canWriteProjectRelations) {
      return;
    }

    try {
      await projectLinks.setProjectsForFeature(
        nextProjectId ? [nextProjectId] : [],
      );
      showToast({
        tone: "success",
        title: nextProjectId
          ? "Parent-Projekt gespeichert"
          : "Parent-Projekt entfernt",
      });
    } catch (projectError) {
      showToast({
        tone: "error",
        title: "Parent-Projekt konnte nicht gespeichert werden",
        message: errorMessage(projectError),
      });
      throw projectError;
    }
  };

  const visibleTabs = feature
    ? tabs.filter((tab) => tab.value !== "journal" || canReadJournal)
    : tabs.filter((tab) => tab.value !== "journal");
  const tabItems = visibleTabs.map((tab) => {
    if (tab.value === "details") {
      return tab;
    }
    if (tab.value === "useCases") {
      const pending = pendingUseCases.map((item) =>
        item.kind === "existing" ? item.useCase : item.draft,
      );
      return {
        ...tab,
        count: feature
          ? countOpenStatusItems(
              useCases.useCases,
              catalogs.entries,
              "featureStatus",
            )
          : countOpenStatusItems(pending, catalogs.entries, "featureStatus"),
      };
    }
    if (tab.value === "tasks") {
      const pending = pendingTasks.map((item) =>
        item.kind === "existing" ? item.task : item.draft,
      );
      return {
        ...tab,
        count: feature
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
        count: feature
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
        count: feature ? comments.comments.length : pendingComments.length,
      };
    }
    if (tab.value === "attachments") {
      return {
        ...tab,
        count: feature ? attachments.attachments.length : pendingFiles.length,
      };
    }
    return { ...tab, count: 0 };
  });

  return (
    <>
      <FormModal
        open={open}
        title={feature ? "Feature bearbeiten" : "Neues Feature"}
        objectReference={feature ? objectReference("feature", feature.id) : undefined}
        icon={<BookOpen size={20} />}
        breadcrumb={["Features", feature ? "Bearbeiten" : "Neu"]}
        submitLabel={
          saving
            ? (savingLabel ?? "Speichern…")
            : feature
              ? "Speichern"
              : "Feature anlegen"
        }
        saving={saving}
        footerStart={
          feature && onDelete ? (
            <Button
              className="text-crimson hover:bg-crimson/10"
              icon={<Trash2 size={18} />}
              variant="ghost"
              disabled={deleting}
              onClick={() => void deleteCurrentFeature()}
            >
              Löschen
            </Button>
          ) : undefined
        }
        onSubmit={submit}
        onClose={onClose}
        variant={variant}
        onOpenInTab={onOpenInTab}
        contentClassName={
          activeTab === "details" ? "w-full max-w-7xl self-center" : ""
        }
        tabBar={
          <TabBar tabs={tabItems} active={activeTab} onChange={handleTabChange} />
        }
      >
        {activeTab === "details" ? (
          <>
            <Section>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
                <FormField label="Titel" required className="min-w-0">
                  <Input
                    autoFocus={!feature}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Sortierung" className="min-w-0">
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
            <Section title="Status">
              <StatusToggle
                kind="featureStatus"
                value={status}
                onChange={setStatus}
              />
            </Section>
            <Section title="Parent-Projekt">
              <SelectParent
                type="project"
                label="Projekt"
                placeholder="Projekt wählen ..."
                items={projectParentItems}
                value={selectedParentItem}
                disabled={parentProjectDisabled}
                onChange={(item) => {
                  void changeParentProject(item);
                }}
              />
            </Section>
            <Section title="Kurzbeschreibung">
              <RichTextInlineField
                value={description}
                placeholder="Kurzbeschreibung"
                minRows={12}
                testIdPrefix="feature-form-description"
                onImageUpload={uploadEditorImage}
                onChange={setDescription}
              />
            </Section>
            <Section title="Inhalt">
              <RichTextInlineField
                value={content}
                placeholder="Feature-Inhalt"
                testIdPrefix="feature-form-content"
                onImageUpload={uploadEditorImage}
                onChange={setContent}
              />
            </Section>
          </>
        ) : null}

        {activeTab === "useCases" ? (
          <Section fill={Boolean(feature)}>
            {feature ? (
              useCases.loading ? (
                <TaskListSkeleton />
              ) : (
                <UseCaseListBoardView
                  useCases={useCases.useCases}
                  viewMode={useCaseViewMode}
                  onViewModeChange={setUseCaseViewMode}
                  onCreate={() =>
                    navigate(
                      `/use-cases/new?featureId=${feature.id}&returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
                    )
                  }
                  onOpen={(useCase) =>
                    navigate(
                      `/use-cases/${useCase.id}?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
                    )
                  }
                  onStatusChange={(useCase, status) => useCases.updateUseCase(useCase.id, { status, expectedVersion: useCase.version })}
                />
              )
            ) : (
              <PendingRelationList
                existingItems={[]}
                draftItems={pendingUseCases.flatMap((item) =>
                  item.kind === "new"
                    ? [{ title: item.draft.title, badge: "Wird erstellt" }]
                    : [],
                )}
                emptyIcon={<FileText size={22} />}
                emptyTitle="Keine Use Cases vorgemerkt"
                showLinkExisting={false}
                onCreateNew={() => setUseCaseDraftOpen(true)}
                onRemoveExisting={() => undefined}
                onRemoveDraft={(index) =>
                  setPendingUseCases((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              />
            )}
          </Section>
        ) : null}

        {activeTab === "tasks" ? (
          <Section fill={Boolean(feature)}>
            {feature ? (
              <OwnerTaskBoard owner={{ type: "feature", id: feature.id }} />
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
          </Section>
        ) : null}

        {activeTab === "tickets" ? (
          <Section fill={Boolean(feature)}>
            {feature ? (
              <OwnerTicketBoard owner={{ type: "feature", id: feature.id }} />
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
          </Section>
        ) : null}

        {activeTab === "comments" ? (
          <Section>
            {feature ? (
              <CommentThread
                comments={comments.comments}
                entityLabel="Feature"
                onCreate={comments.createComment}
                onUpdate={comments.updateComment}
                onDelete={comments.removeComment}
              />
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

        {activeTab === "attachments" ? (
          <Section>
            {feature ? (
              <div className="grid gap-4">
                <AttachmentUploader onUpload={uploadAttachment} />
                <AttachmentList
                  attachments={attachments.attachments}
                  onDelete={(attachment) => {
                    void confirm({
                      title: "Datei löschen?",
                      body: attachment.originalName,
                      severity: "danger",
                      confirmLabel: "Löschen",
                    }).then((approved) => {
                      if (approved) {
                        void attachments
                          .removeAttachment(attachment.id)
                          .then(() =>
                            showToast({
                              tone: "success",
                              title: "Datei gelöscht",
                            }),
                          )
                          .catch((attachmentError: unknown) =>
                            showToast({
                              tone: "error",
                              title: "Datei konnte nicht gelöscht werden",
                              message: errorMessage(attachmentError),
                            }),
                          );
                      }
                    });
                  }}
                  onOpen={(attachment) => attachments.openAttachment(attachment.id)}
                  openingAttachmentId={attachments.openingAttachmentId}
                />
              </div>
            ) : (
              <PendingFileList
                files={pendingFiles}
                onAdd={(files) =>
                  setPendingFiles((items) => [...items, ...files])
                }
                onRemove={(index) =>
                  setPendingFiles((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              />
            )}
          </Section>
        ) : null}

        {activeTab === "journal" && feature ? (
          <Section fill>
            <JournalPanel objectType="feature" objectId={feature.id} />
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
      <UseCaseDraftDialog
        open={useCaseDraftOpen}
        onCreate={(draft) =>
          setPendingUseCases((items) => [...items, { kind: "new", draft }])
        }
        onClose={() => setUseCaseDraftOpen(false)}
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

function UseCaseDraftDialog({
  open,
  onCreate,
  onClose,
}: {
  open: boolean;
  onCreate: (draft: Extract<DraftUseCase, { kind: "new" }>["draft"]) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const catalogs = useCatalogs();
  const [status, setStatus] = useState<FeatureStatus>("draft");
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
        "featureStatus",
        status,
        "draft",
      ),
    });
    setTitle("");
    setStatus(featureStatusValue(catalogs.entries, "draft", "draft"));
    onClose();
  };

  return (
    <Modal open={open} title="Use Case vormerken" size="md" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <FormField label="Titel" required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            required
          />
        </FormField>
        <FormField label="Status">
          <StatusToggle
            kind="featureStatus"
            value={status}
            onChange={setStatus}
          />
        </FormField>
        <footer className="flex justify-end gap-2">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!trimmedTitle}
          >
            Vormerken
          </Button>
        </footer>
      </form>
    </Modal>
  );
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
    if (open) {
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
