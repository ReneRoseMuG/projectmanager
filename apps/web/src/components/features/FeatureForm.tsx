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
  FolderKanban,
  ListTodo,
  Paperclip,
  Trash2,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { DraftFile, ViewMode } from "../../types";
import { errorMessage } from "../../hooks/errors";
import { useAttachments } from "../../hooks/useAttachments";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useFeatureProjectLinks } from "../../hooks/useDocLinks";
import { useProjects } from "../../hooks/useProjects";
import { useTasks } from "../../hooks/useTasks";
import { useTickets } from "../../hooks/useTickets";
import { useUseCases } from "../../hooks/useUseCases";
import {
  catalogEntriesByKind,
  catalogColor,
  catalogLabel,
  countOpenStatusItems,
  resolveCatalogEntryKey,
} from "../../utils/catalogs";
import { AttachmentList } from "../attachments/AttachmentList";
import { AttachmentUploader } from "../attachments/AttachmentUploader";
import { JournalPanel } from "../journal/JournalPanel";
import { TaskLinkDialog } from "../tasks/TaskLinkDialog";
import { OwnerTaskBoard } from "../tasks/OwnerTaskBoard";
import { OwnerTicketBoard } from "../tickets/OwnerTicketBoard";
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
import { SectionHeader } from "../ui/SectionHeader";
import { Select } from "../ui/Select";
import { TaskListSkeleton } from "../ui/Skeleton";
import { StatusToggle } from "../ui/StatusToggle";
import { TabBar, type Tab } from "../ui/TabBar";
import { useToast } from "../ui/ToastProvider";
import { FeatureProjectPanel } from "./FeatureProjectPanel";
import { useHasPermission } from "../../hooks/usePermissions";

interface FeatureFormProps {
  open: boolean;
  feature?: Feature | null;
  onSubmit: (input: FeatureInput) => Promise<Feature | void>;
  onClose: () => void;
  onDelete?: (feature: Feature) => Promise<boolean>;
  savingLabel?: string;
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

type FeatureFormTab =
  | "details"
  | "useCases"
  | "tasks"
  | "tickets"
  | "projects"
  | "comments"
  | "attachments"
  | "journal";

const tabs: Array<Tab<FeatureFormTab>> = [
  { value: "details", label: "Details" },
  { value: "useCases", label: "Use Cases" },
  { value: "tasks", label: "Aufgaben" },
  { value: "tickets", label: "Tickets" },
  { value: "projects", label: "Projekte" },
  { value: "comments", label: "Kommentare" },
  { value: "attachments", label: "Dateien" },
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

export function FeatureForm({
  open,
  feature,
  onSubmit,
  onClose,
  onDelete,
  savingLabel,
  variant = "modal",
  closeOnSubmit = true,
  onOpenInTab,
  onPostCreate,
}: FeatureFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const featureId = feature?.id;
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canReadJournal = useHasPermission("journal", "read");
  const projects = useProjects();
  const useCases = useUseCases(featureId);
  const tasks = useTasks(
    featureId ? { type: "feature", id: featureId } : undefined,
  );
  const tickets = useTickets(
    featureId ? { type: "feature", id: featureId } : null,
  );
  const catalogs = useCatalogs();
  const projectLinks = useFeatureProjectLinks(featureId);
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
  const [projectViewMode, setProjectViewMode] = useState<ViewMode>("kanban");
  const [pendingUseCases, setPendingUseCases] = useState<DraftUseCase[]>([]);
  const [pendingTasks, setPendingTasks] = useState<DraftTask[]>([]);
  const [pendingTickets, setPendingTickets] = useState<DraftTicket[]>([]);
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
  const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<DraftFile[]>([]);
  const [useCaseDraftOpen, setUseCaseDraftOpen] = useState(false);
  const [taskLinkOpen, setTaskLinkOpen] = useState(false);
  const [taskDraftOpen, setTaskDraftOpen] = useState(false);
  const [ticketLinkOpen, setTicketLinkOpen] = useState(false);
  const [ticketDraftOpen, setTicketDraftOpen] = useState(false);
  const [projectLinkOpen, setProjectLinkOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setPendingUseCases([]);
      setPendingTasks([]);
      setPendingTickets([]);
      setPendingProjects([]);
      setPendingComments([]);
      setPendingFiles([]);
      setUseCaseDraftOpen(false);
      setTaskLinkOpen(false);
      setTaskDraftOpen(false);
      setTicketLinkOpen(false);
      setTicketDraftOpen(false);
      setProjectLinkOpen(false);
      return;
    }
    setTitle(feature?.title ?? "");
    setStatus(feature?.status ?? "draft");
    setDescription(feature?.description ?? "");
    setSortOrder(feature?.sortOrder ?? 0);
    setContent(feature?.content ?? "");
    setActiveTab("details");
  }, [feature, open]);

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
          projectIds: pendingProjects.map((project) => project.id),
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
    if (tab.value === "projects") {
      return {
        ...tab,
        count: feature
          ? countOpenStatusItems(
              projectLinks.linkedProjects,
              catalogs.entries,
              "workStatus",
            )
          : countOpenStatusItems(
              pendingProjects,
              catalogs.entries,
              "workStatus",
            ),
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
          <TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />
        }
      >
        {activeTab === "details" ? (
          <>
            <Section title="Stammdaten">
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
            <Section title="Kurzbeschreibung">
              <RichTextInlineField
                value={description}
                placeholder="Kurzbeschreibung"
                minRows={12}
                testIdPrefix="feature-form-description"
                onChange={setDescription}
              />
            </Section>
            <Section title="Inhalt">
              <RichTextInlineField
                value={content}
                placeholder="Feature-Inhalt"
                testIdPrefix="feature-form-content"
                onChange={setContent}
              />
            </Section>
          </>
        ) : null}

        {activeTab === "useCases" ? (
          <Section title="Use Cases" fill={Boolean(feature)}>
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
          <Section title="Aufgaben" fill={Boolean(feature)}>
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
          <Section title="Tickets" fill={Boolean(feature)}>
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

        {activeTab === "projects" ? (
          <Section title="Projekte" fill={Boolean(feature)}>
            {feature ? (
              <FeatureProjectPanel
                projects={projectLinks.linkedProjects}
                availableProjects={projectLinks.projects}
                viewMode={projectViewMode}
                onViewModeChange={setProjectViewMode}
                onAddProject={(project) =>
                  projectLinks.addProjectToFeature(project.id)
                }
                onRemoveProject={(project) =>
                  projectLinks.removeProjectFromFeature(project.id)
                }
                onOpen={(project) =>
                  navigate(
                    `/projects/${project.id}?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
                  )
                }
              />
            ) : (
              <PendingRelationList
                existingItems={pendingProjects.map((project) => ({
                  id: project.id,
                  title: project.name,
                }))}
                draftItems={[]}
                emptyIcon={<FolderKanban size={22} />}
                emptyTitle="Keine Projekte vorgemerkt"
                showCreateNew={false}
                onLinkExisting={() => setProjectLinkOpen(true)}
                onRemoveExisting={(index) =>
                  setPendingProjects((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                onRemoveDraft={() => undefined}
              />
            )}
          </Section>
        ) : null}

        {activeTab === "comments" ? (
          <Section title="Kommentare">
            {feature ? (
              <CommentThread
                comments={comments.comments}
                entityLabel="Feature"
                onCreate={comments.createComment}
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
            <div className="mb-4 flex items-center gap-2">
              <Paperclip size={18} className="text-fern" />
              <SectionHeader title="Dateien" />
            </div>
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
          <Section title="Journal" fill>
            <JournalPanel objectType="feature" objectId={feature.id} />
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
      <ProjectLinkDialog
        open={projectLinkOpen}
        projects={projects.projects}
        excludeIds={pendingProjects.map((project) => project.id)}
        onLink={(project) => setPendingProjects((items) => [...items, project])}
        onClose={() => setProjectLinkOpen(false)}
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

function ProjectLinkDialog({
  open,
  projects,
  excludeIds,
  onLink,
  onClose,
}: {
  open: boolean;
  projects: Project[];
  excludeIds: number[];
  onLink: (project: Project) => void;
  onClose: () => void;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const availableProjects = projects.filter(
    (project) => !excludeIds.includes(project.id),
  );
  const firstProjectId = availableProjects[0]?.id ?? "";

  useEffect(() => {
    if (open) {
      setSelectedProjectId(firstProjectId);
    }
  }, [firstProjectId, open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const project = availableProjects.find(
      (item) => item.id === selectedProjectId,
    );
    if (!project) {
      return;
    }
    onLink(project);
    onClose();
  };

  return (
    <Modal open={open} title="Projekt verknüpfen" size="md" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <Select
          label="Projekt"
          value={selectedProjectId}
          onChange={(event) =>
            setSelectedProjectId(
              event.target.value ? Number(event.target.value) : "",
            )
          }
        >
          {availableProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        <footer className="flex justify-end gap-2">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button type="submit" variant="primary" disabled={!selectedProjectId}>
            Verknüpfen
          </Button>
        </footer>
      </form>
    </Modal>
  );
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
