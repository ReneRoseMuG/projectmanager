import type { Attachment, Feature, FeatureUpdate, Task, UseCase, UseCaseInput, UseCaseUpdate } from "@taskmanager/shared-types";
import { ChevronRight, FolderKanban, ListTodo, MoreHorizontal, Paperclip, Save, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { AttachmentList } from "../components/attachments/AttachmentList";
import { AttachmentUploader } from "../components/attachments/AttachmentUploader";
import { FeatureDetail } from "../components/features/FeatureDetail";
import { Button } from "../components/ui/Button";
import { CommentThread } from "../components/ui/CommentThread";
import { useConfirm } from "../components/ui/ConfirmDialogProvider";
import { EmptyState } from "../components/ui/EmptyState";
import { Pill } from "../components/ui/Pill";
import { RelationPanel } from "../components/ui/RelationPanel";
import { TaskListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { UseCaseForm } from "../components/usecases/UseCaseForm";
import { UseCaseListBoardView } from "../components/usecases/UseCaseListBoardView";
import { errorMessage } from "../hooks/errors";
import { useAttachments } from "../hooks/useAttachments";
import { useFeatureProjectLinks, useFeatureTaskLinks } from "../hooks/useDocLinks";
import { useEntityComments } from "../hooks/useEntityComments";
import { useFeatures } from "../hooks/useFeatures";
import { useUseCases } from "../hooks/useUseCases";
import type { ViewMode } from "../types";
import { formatHumanDate } from "../utils/date";
import { featureStatusLabels, featureStatusTones, priorityLabels, priorityPillTones, projectStatusLabels, taskStatusLabels, taskStatusTones } from "../utils/domainLabels";

type FeatureTab = "details" | "useCases" | "tasks" | "projects" | "attachments" | "comments";

const featureTabs: FeatureTab[] = ["details", "useCases", "tasks", "projects", "attachments", "comments"];

const tabLabels: Record<FeatureTab, string> = {
  details: "Stammdaten",
  useCases: "Use Cases",
  tasks: "Aufgaben",
  projects: "Projekte",
  attachments: "Dateien",
  comments: "Kommentare"
};

export function FeatureDetailPage() {
  const params = useParams();
  const featureId = Number(params.id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const features = useFeatures(Number.isFinite(featureId) ? featureId : undefined);
  const useCases = useUseCases(Number.isFinite(featureId) ? featureId : undefined);
  const projectLinks = useFeatureProjectLinks(Number.isFinite(featureId) ? featureId : undefined);
  const taskLinks = useFeatureTaskLinks(Number.isFinite(featureId) ? featureId : undefined);
  const attachments = useAttachments(Number.isFinite(featureId) ? { type: "feature", id: featureId } : null);
  const featureComments = useEntityComments("feature", Number.isFinite(featureId) ? featureId : undefined);
  const [activeTab, setActiveTab] = useState<FeatureTab>("details");
  const [useCaseViewMode, setUseCaseViewMode] = useState<ViewMode>("kanban");
  const [useCaseFormOpen, setUseCaseFormOpen] = useState(false);
  const [editingUseCase, setEditingUseCase] = useState<UseCase | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [projectLinksSaving, setProjectLinksSaving] = useState(false);
  const [taskLinksSaving, setTaskLinksSaving] = useState(false);

  useEffect(() => {
    setSelectedProjectIds(projectLinks.linkedProjects.map((project) => project.id));
  }, [projectLinks.linkedProjects]);

  useEffect(() => {
    setSelectedTaskIds(taskLinks.linkedTasks.map((task) => task.id));
  }, [taskLinks.linkedTasks]);

  const saveFeature = async (id: number, input: FeatureUpdate) => {
    try {
      await features.updateFeature(id, input);
      showToast({ tone: "success", title: "Feature gespeichert" });
    } catch (featureError) {
      showToast({ tone: "error", title: "Feature konnte nicht gespeichert werden", message: errorMessage(featureError) });
      throw featureError;
    }
  };

  const saveProjectLinks = async () => {
    setProjectLinksSaving(true);
    try {
      await projectLinks.setProjectsForFeature(selectedProjectIds);
      showToast({ tone: "success", title: "Projekt-Verknüpfungen gespeichert" });
    } catch (projectError) {
      showToast({ tone: "error", title: "Projekt-Verknüpfungen konnten nicht gespeichert werden", message: errorMessage(projectError) });
    } finally {
      setProjectLinksSaving(false);
    }
  };

  const saveTaskLinks = async () => {
    setTaskLinksSaving(true);
    try {
      await taskLinks.setTasksForFeature(selectedTaskIds);
      showToast({ tone: "success", title: "Aufgaben-Verknüpfungen gespeichert" });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgaben-Verknüpfungen konnten nicht gespeichert werden", message: errorMessage(taskError) });
    } finally {
      setTaskLinksSaving(false);
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

  const deleteAttachment = async (attachment: Attachment) => {
    const approved = await confirm({
      title: "Datei löschen?",
      body: attachment.originalName,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }

    try {
      await attachments.removeAttachment(attachment.id);
      showToast({ tone: "success", title: "Datei gelöscht" });
    } catch (attachmentError) {
      showToast({ tone: "error", title: "Datei konnte nicht gelöscht werden", message: errorMessage(attachmentError) });
    }
  };

  const deleteFeature = async (feature: Feature) => {
    const approved = await confirm({
      title: "Feature löschen?",
      body: `Das Feature "${feature.title}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return;
    }
    try {
      await features.removeFeature(feature.id);
      showToast({ tone: "success", title: "Feature gelöscht" });
      navigate("/features");
    } catch (featureError) {
      showToast({ tone: "error", title: "Feature konnte nicht gelöscht werden", message: errorMessage(featureError) });
    }
  };

  const createUseCase = async (input: UseCaseInput) => {
    try {
      await useCases.createUseCase(input);
      await features.reload();
      showToast({ tone: "success", title: "Use Case erstellt" });
    } catch (useCaseError) {
      showToast({ tone: "error", title: "Use Case konnte nicht erstellt werden", message: errorMessage(useCaseError) });
      throw useCaseError;
    }
  };

  const saveUseCase = async (id: number, input: UseCaseUpdate) => {
    try {
      await useCases.updateUseCase(id, input);
      await features.reload();
      showToast({ tone: "success", title: "Use Case gespeichert" });
    } catch (useCaseError) {
      showToast({ tone: "error", title: "Use Case konnte nicht gespeichert werden", message: errorMessage(useCaseError) });
      throw useCaseError;
    }
  };

  const deleteUseCase = async (useCase: UseCase) => {
    const approved = await confirm({
      title: "Use Case löschen?",
      body: `Der Use Case "${useCase.title}" wird entfernt.`,
      severity: "danger",
      confirmLabel: "Löschen"
    });
    if (!approved) {
      return false;
    }
    try {
      await useCases.removeUseCase(useCase.id);
      await features.reload();
      setEditingUseCase(null);
      showToast({ tone: "success", title: "Use Case gelöscht" });
      return true;
    } catch (useCaseError) {
      showToast({ tone: "error", title: "Use Case konnte nicht gelöscht werden", message: errorMessage(useCaseError) });
      return false;
    }
  };

  const openCreateUseCaseForm = () => {
    setEditingUseCase(null);
    setUseCaseFormOpen(true);
  };

  const openUseCaseForm = async (useCase: UseCase) => {
    try {
      const loadedUseCase = await useCases.loadUseCase(useCase.id);
      setEditingUseCase(loadedUseCase);
      setUseCaseFormOpen(true);
    } catch (useCaseError) {
      showToast({ tone: "error", title: "Use Case konnte nicht geladen werden", message: errorMessage(useCaseError) });
    }
  };

  const submitUseCaseForm = async (input: UseCaseInput) => {
    if (editingUseCase) {
      await saveUseCase(editingUseCase.id, input);
      setEditingUseCase(null);
      return;
    }
    await createUseCase(input);
  };

  const closeUseCaseForm = () => {
    setUseCaseFormOpen(false);
    setEditingUseCase(null);
  };

  if (features.loading) {
    return <TaskListSkeleton />;
  }

  if (!features.feature) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-slate-600">Feature nicht gefunden</div>;
  }

  const feature = features.feature;
  const tabCounts: Partial<Record<FeatureTab, number>> = {
    useCases: useCases.useCases.length,
    tasks: taskLinks.linkedTasks.length,
    projects: projectLinks.linkedProjects.length,
    attachments: attachments.attachments.length,
    comments: featureComments.comments.length
  };
  const tabMeta: Record<FeatureTab, string> = {
    details: "Stammdaten",
    useCases: `${useCases.useCases.length} Use Cases · Doppelklick öffnet Detail`,
    tasks: `${taskLinks.linkedTasks.length} Aufgaben verknüpft`,
    projects: "Projekt-Relationen dieses Features",
    attachments: `${attachments.attachments.length} Dateien`,
    comments: `${featureComments.comments.length} Kommentare`
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-steel-700 via-steel-600 to-violet p-6 text-white shadow-steel">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="grid gap-3">
            <nav className="flex items-center gap-2 text-sm text-white/70">
              <Link className="hover:text-white" to="/features">
                Features
              </Link>
              <ChevronRight size={16} />
              <span className="text-white">{feature.title}</span>
            </nav>
            <div>
              <h1 className="text-[28px] font-bold text-white">{feature.title}</h1>
              <p className="mt-1 font-mono text-xs text-white/75">/features/{feature.slug}</p>
              <p className="mt-3 max-w-[760px] text-[15px] text-white/90">{feature.description || "Keine Kurzbeschreibung"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="border border-white/24 bg-white/14 text-white hover:bg-white/20"
              icon={<Trash2 size={16} />}
              variant="ghost"
              onClick={() => void deleteFeature(feature)}
            >
              Löschen
            </Button>
            <Button
              aria-label="Weitere Aktionen"
              title="Weitere Aktionen"
              className="border border-white/24 bg-white/14 text-white hover:bg-white/20"
              icon={<MoreHorizontal size={16} />}
              variant="ghost"
            />
            <Button className="bg-white text-steel-700 hover:bg-steel-50" form="feature-detail-form" icon={<Save size={16} />} type="submit" variant="ghost">
              Speichern
            </Button>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-5 border-t border-white/15 pt-4">
          <HeroStat label="Status">
            <Pill tone={featureStatusTones[feature.status]}>{featureStatusLabels[feature.status]}</Pill>
          </HeroStat>
          <HeroStat label="Use Cases">{feature.useCaseCount}</HeroStat>
          <HeroStat label="Sortierung">#{feature.sortOrder}</HeroStat>
          <HeroStat label="Aktualisiert">{formatHumanDate(feature.updatedAt)}</HeroStat>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-line bg-white p-1 shadow-sm" role="tablist" aria-label="Feature-Detail">
          {featureTabs.map((tab) => (
            <button
              key={tab}
              className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                activeTab === tab ? "bg-steel-700 text-white" : "text-slate-600 hover:bg-steel-50 hover:text-ink"
              }`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabels[tab]}
              {tabCounts[tab] !== undefined ? (
                <span className={`rounded-full px-1.5 text-[11px] ${activeTab === tab ? "bg-white/20 text-white" : "bg-steel-100 text-slate-600"}`}>
                  {tabCounts[tab]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <span className="text-xs font-semibold text-slate-500">{tabMeta[activeTab]}</span>
      </div>

      {useCases.error ? <div className="rounded-lg border border-line bg-white p-4 text-sm text-crimson">{useCases.error}</div> : null}
      {useCases.detailLoading ? <div className="rounded-lg border border-line bg-white p-4 text-sm font-semibold text-slate-500">Use Case wird geladen...</div> : null}

      {activeTab === "details" ? <FeatureDetail feature={feature} onSave={saveFeature} onDelete={deleteFeature} /> : null}
      {activeTab === "useCases" && useCases.loading ? <TaskListSkeleton /> : null}
      {activeTab === "useCases" && !useCases.loading ? (
        <UseCaseListBoardView
          useCases={useCases.useCases}
          viewMode={useCaseViewMode}
          onViewModeChange={setUseCaseViewMode}
          onCreate={openCreateUseCaseForm}
          onOpen={(useCase) => void openUseCaseForm(useCase)}
        />
      ) : null}
      {activeTab === "tasks" && taskLinks.loading ? <TaskListSkeleton /> : null}
      {activeTab === "tasks" && !taskLinks.loading ? (
        <div className="grid gap-4">
          {taskLinks.error ? <div className="rounded-lg border border-line bg-white p-4 text-sm text-crimson">{taskLinks.error}</div> : null}
          <RelationPanel
            items={taskLinks.tasks}
            selectedIds={selectedTaskIds}
            onChange={setSelectedTaskIds}
            onSave={saveTaskLinks}
            saving={taskLinksSaving}
            title="Aufgaben"
            searchKeys={["title", "description", "assignee", "status", "priority"]}
            groupBy="status"
            groupLabel={(value) => taskStatusLabels[value as Task["status"]] ?? String(value)}
            emptyAvailable={
              <EmptyState
                icon={<ListTodo size={22} />}
                title="Keine Aufgaben vorhanden"
                body="Lege zuerst Aufgaben an, um sie hier zu verknüpfen."
                tone="neutral"
                variant="tinted"
              />
            }
            renderItem={(task) => (
              <span className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-steel-100 text-steel-700" aria-hidden="true">
                  <ListTodo size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink">{task.title}</span>
                  <span className="block truncate text-[12px] text-slate-500">{task.description || task.assignee || "Keine Beschreibung"}</span>
                </span>
                <span className="hidden md:inline-flex">
                  <Pill tone={taskStatusTones[task.status]}>{taskStatusLabels[task.status]}</Pill>
                </span>
                <span className="hidden items-center gap-2 md:inline-flex">
                  <Pill tone={priorityPillTones[task.priority]}>{priorityLabels[task.priority]}</Pill>
                  <span className="text-xs font-semibold text-slate-500">{task.dueDate ? formatHumanDate(task.dueDate) : "Kein Datum"}</span>
                </span>
              </span>
            )}
          />
        </div>
      ) : null}
      {activeTab === "projects" && projectLinks.loading ? <TaskListSkeleton /> : null}
      {activeTab === "projects" && !projectLinks.loading ? (
        <div className="grid gap-4">
          {projectLinks.error ? <div className="rounded-lg border border-line bg-white p-4 text-sm text-crimson">{projectLinks.error}</div> : null}
          <RelationPanel
            items={projectLinks.projects}
            selectedIds={selectedProjectIds}
            onChange={setSelectedProjectIds}
            onSave={saveProjectLinks}
            saving={projectLinksSaving}
            title="Projekte"
            searchKeys={["name", "description", "status"]}
            emptyAvailable={
              <EmptyState
                icon={<FolderKanban size={22} />}
                title="Keine Projekte vorhanden"
                body="Lege zuerst Projekte an, um sie hier zu verknüpfen."
                tone="violet"
                variant="tinted"
              />
            }
            renderItem={(project) => (
              <span className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-violet/10 text-violet" aria-hidden="true">
                  <FolderKanban size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink">{project.name}</span>
                  <span className="block truncate text-[12px] text-slate-500">{project.description || "Keine Beschreibung"}</span>
                </span>
                <span className="hidden rounded-md bg-steel-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 md:inline-flex">{projectStatusLabels[project.status]}</span>
                <span className="hidden text-xs font-semibold text-slate-500 md:inline-flex">Aktualisiert {formatHumanDate(project.updatedAt)}</span>
              </span>
            )}
          />
        </div>
      ) : null}
      {activeTab === "attachments" ? (
        attachments.loading ? (
          <TaskListSkeleton />
        ) : (
          <div className="grid gap-4">
            {attachments.error ? <div className="rounded-lg border border-line bg-white p-4 text-sm text-crimson">{attachments.error}</div> : null}
            <div className="flex items-center gap-2 rounded-lg border border-line bg-white p-4 shadow-sm">
              <Paperclip size={18} className="text-steel-700" />
              <span className="text-sm font-bold uppercase tracking-wide text-ink">Dateien</span>
            </div>
            <AttachmentUploader onUpload={uploadAttachment} />
            <AttachmentList attachments={attachments.attachments} onDelete={(attachment) => void deleteAttachment(attachment)} />
          </div>
        )
      ) : null}
      {activeTab === "comments" ? (
        featureComments.loading ? (
          <TaskListSkeleton />
        ) : (
          <div className="grid gap-4">
            {featureComments.error ? <div className="rounded-lg border border-line bg-white p-4 text-sm text-crimson">{featureComments.error}</div> : null}
            <CommentThread
              comments={featureComments.comments}
              entityLabel="Feature"
              onCreate={async (input) => {
                try {
                  await featureComments.createComment(input);
                  showToast({ tone: "success", title: "Kommentar erstellt" });
                } catch (commentError) {
                  showToast({ tone: "error", title: "Kommentar konnte nicht erstellt werden", message: errorMessage(commentError) });
                  throw commentError;
                }
              }}
              onDelete={async (id) => {
                try {
                  await featureComments.removeComment(id);
                  showToast({ tone: "success", title: "Kommentar gelöscht" });
                } catch (commentError) {
                  showToast({ tone: "error", title: "Kommentar konnte nicht gelöscht werden", message: errorMessage(commentError) });
                  throw commentError;
                }
              }}
            />
          </div>
        )
      ) : null}

      <UseCaseForm
        open={useCaseFormOpen}
        useCase={editingUseCase}
        featureTitle={feature.title}
        currentFeatureId={feature.id}
        features={features.features}
        onSubmit={submitUseCaseForm}
        onDelete={deleteUseCase}
        onClose={closeUseCaseForm}
      />
    </div>
  );
}

function HeroStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-white/65">{label}</span>
      <span className="text-lg font-bold text-white">{children}</span>
    </div>
  );
}
